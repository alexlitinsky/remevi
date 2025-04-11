import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { processChunk, getDifficultyFromUserSelection } from '@/lib/deck-processor';
import { Client } from "@upstash/qstash";

// Removed in-memory chunk storage logic - replaced with DB storage

async function handler(request: NextRequest) {
  // cleanupExpiredChunks(); // No longer needed with DB storage + potential separate cleanup job

  try {
    const body = await request.json();
    const {
      deckId: currentDeckId,
      studyMaterialId,
      chunkIndex: currentChunkIndex,
      totalChunks: currentTotalChunks,
      chunk: base64Chunk,
      chunkPart,
      totalParts,
      partIndex,
      difficultyPrompt,
      aiModel,
      difficulty = 'moderate'
    } = body;

    if (!currentDeckId || !studyMaterialId || currentChunkIndex === undefined ||
        currentTotalChunks === undefined || !difficultyPrompt || !aiModel) {
      return new Response("Invalid chunk data", { status: 400 });
    }

    let fullChunk: string | null = null; // Initialize as null

    // Logic for handling chunk parts using the database
    if (chunkPart !== undefined && totalParts !== undefined && partIndex !== undefined) {
      console.log(`Received part ${partIndex + 1}/${totalParts} for chunk ${currentChunkIndex + 1}/${currentTotalChunks} (Deck: ${currentDeckId})`);

      // Insert the received part into the database
      await db.chunkPartStorage.create({
        data: {
          deckId: currentDeckId,
          chunkIndex: currentChunkIndex,
          partIndex: partIndex,
          totalParts: totalParts,
          partData: chunkPart, // Store the base64 part
        },
      });

      // Check if all parts for this chunk have been received
      const receivedCount = await db.chunkPartStorage.count({
        where: {
          deckId: currentDeckId,
          chunkIndex: currentChunkIndex,
        },
      });

      console.log(`DB count for chunk ${currentChunkIndex + 1}: ${receivedCount}/${totalParts}`);

      if (receivedCount < totalParts) {
        // Not all parts received yet, acknowledge receipt
        return new Response("Chunk part received and stored", { status: 200 });
      } else if (receivedCount === totalParts) {
        // All parts potentially received, attempt assembly
        console.log(`Attempting assembly for chunk ${currentChunkIndex + 1}`);
        try {
          const assembledParts = await db.$transaction(async (tx) => {
            // Find all parts for this chunk within the transaction
            const parts = await tx.chunkPartStorage.findMany({
              where: {
                deckId: currentDeckId,
                chunkIndex: currentChunkIndex,
              },
              orderBy: {
                partIndex: 'asc', // Ensure correct order
              },
              select: { partData: true, partIndex: true } // Select only needed data
            });

            // Verify count *inside* transaction to prevent race conditions
            if (parts.length !== totalParts) {
              // Should not happen if count check outside was correct, but safety check
              console.error(`Concurrency issue? Expected ${totalParts} parts, found ${parts.length} in transaction for chunk ${currentChunkIndex + 1}.`);
              throw new Error(`Part count mismatch during assembly for chunk ${currentChunkIndex + 1}. Expected ${totalParts}, found ${parts.length}.`);
            }

            // Delete the parts now that we have them
            await tx.chunkPartStorage.deleteMany({
              where: {
                deckId: currentDeckId,
                chunkIndex: currentChunkIndex,
              },
            });

            return parts; // Return the ordered parts
          });

          // Join the parts outside the transaction
          fullChunk = assembledParts.map(p => p.partData).join('');
          console.log(`Successfully assembled chunk ${currentChunkIndex + 1} from DB parts.`);

        } catch (assemblyError) {
          console.error(`Failed to assemble chunk ${currentChunkIndex + 1} from DB:`, assemblyError);
          Sentry.captureException(assemblyError);
          // Mark deck as error? Or just let QStash retry? For now, return error.
          await db.deck.update({
            where: { id: currentDeckId },
            data: { isProcessing: false, processingStage: 'ERROR', error: `Failed to assemble chunk ${currentChunkIndex + 1} from parts.` }
          });
          return new Response(`Failed to assemble chunk ${currentChunkIndex + 1}`, { status: 500 });
        }
      } else {
        // receivedCount > totalParts - indicates a problem, maybe duplicate messages?
        console.warn(`Received more parts (${receivedCount}) than expected (${totalParts}) for chunk ${currentChunkIndex + 1}. Cleaning up and failing.`);
        await db.chunkPartStorage.deleteMany({ where: { deckId: currentDeckId, chunkIndex: currentChunkIndex } });
        await db.deck.update({
            where: { id: currentDeckId },
            data: { isProcessing: false, processingStage: 'ERROR', error: `Inconsistent part count for chunk ${currentChunkIndex + 1}.` }
        });
        return new Response(`Inconsistent part count for chunk ${currentChunkIndex + 1}`, { status: 400 });
      }
    } else if (base64Chunk) {
      // Handling for non-chunked messages (if applicable)
      console.log(`Processing non-parted chunk ${currentChunkIndex + 1}`);
      fullChunk = base64Chunk;
    } else {
      // Invalid request if neither chunkPart nor base64Chunk is present
      return new Response("Missing chunk data (part or full)", { status: 400 });
    }

    // Ensure fullChunk is not null before proceeding
    if (fullChunk === null) {
      console.error(`fullChunk is null after assembly logic for chunk ${currentChunkIndex + 1}. This should not happen.`);
      await db.deck.update({
          where: { id: currentDeckId },
          data: { isProcessing: false, processingStage: 'ERROR', error: `Internal error: Failed to prepare chunk ${currentChunkIndex + 1} for processing.` }
      });
      return new Response(`Internal error preparing chunk ${currentChunkIndex + 1}`, { status: 500 });
    }

    const deckId: string = currentDeckId;
    const chunkIndex: number = currentChunkIndex;
    const totalChunks: number = currentTotalChunks;

    let chunkBuffer: Buffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any; // Replace 'any' with your actual ChunkResult type if available

    try {
      // Attempt to decode the reassembled chunk
      chunkBuffer = Buffer.from(fullChunk, 'base64');
      console.log(`Successfully decoded base64 for chunk ${chunkIndex + 1}`);

      // Attempt to process the chunk with the AI
      result = await processChunk(chunkBuffer, chunkIndex, totalChunks, difficultyPrompt, aiModel);
      console.log(`Successfully processed chunk ${chunkIndex + 1} with AI`);

    } catch (processingError) {
      console.error(`Error during decoding or AI processing for chunk ${chunkIndex + 1} (Deck: ${deckId}):`, processingError);
      Sentry.captureException(processingError); // Log error to Sentry

      // Mark the deck as failed due to this error
      await db.deck.update({
        where: { id: deckId },
        data: {
          isProcessing: false,
          processingStage: 'ERROR',
          error: `Failed during decoding or AI processing for chunk ${chunkIndex + 1}. Error: ${processingError instanceof Error ? processingError.message : String(processingError)}`
        }
      });

      // Return an error response to QStash to prevent retries for this message
      return new Response(`Processing error for chunk ${chunkIndex + 1}`, { status: 500 });
    }

    // Check if AI result is valid (moved after the try...catch)
    const isValidResult = result && (result.flashcards?.length > 0 || result.mcqs?.length > 0 || result.frqs?.length > 0);
    if (!isValidResult) {
      console.error(`AI processing returned invalid result for chunk ${chunkIndex + 1}/${totalChunks} for deck ${deckId}`);
      await db.deck.update({
        where: { id: deckId },
        data: {
          isProcessing: false,
          processingStage: 'ERROR',
          error: `AI failed to generate valid content for chunk ${chunkIndex + 1}/${totalChunks}`
        }
      });
      return new Response(`AI failed for chunk ${chunkIndex + 1}`, { status: 500 });
    }

    const difficultyLevel = getDifficultyFromUserSelection(difficulty);

    const MAX_RETRIES = 3;
    let retryCount = 0;
    let lastError: unknown;

    while (retryCount < MAX_RETRIES) {
      try {
        await db.$transaction(async (tx) => {
          console.log(`Attempting transaction for chunk ${chunkIndex + 1}/${totalChunks} (Deck: ${deckId}, Attempt: ${retryCount + 1})`);

          // 1. Atomically increment processedChunks and get the updated deck
          const updatedDeck = await tx.deck.update({
            where: { id: deckId },
            data: {
              processedChunks: { increment: 1 },
            },
            select: { processedChunks: true } // Select the NEW count
          });

          // 2. Calculate progress based on the *new* count
          const processedCount = updatedDeck.processedChunks;
          // Base progress starts at 20 (after dispatch), max progress before completion is 85
          const chunkProgress = totalChunks > 0 ? (processedCount / totalChunks) * 65 : 0;
          const progress = Math.min(Math.floor(20 + chunkProgress), 85);

          console.log(`Chunk ${chunkIndex + 1}/${totalChunks} processed. New count: ${processedCount}. Updating progress to ${progress}%`);

          // 3. Update the progress field with the reliable value
          await tx.deck.update({
             where: { id: deckId },
             data: { processingProgress: progress }
          });

          // 4. Create study content (logic remains the same)
          const lastContent = await tx.deckContent.findFirst({
            where: { deckId },
            orderBy: { order: 'desc' },
            select: { order: true }
          });
          let nextOrder = lastContent ? lastContent.order + 1 : 0;

          // Process flashcards in batches of 10
          for (let i = 0; i < (result.flashcards || []).length; i += 10) {
            const batch = (result.flashcards || []).slice(i, i + 10);
            await Promise.all(batch.map((card: { front: string; back: string; topic: string }) =>
              tx.studyContent.create({
                data: {
                  studyMaterialId,
                  type: 'flashcard',
                  flashcardContent: { create: { front: card.front, back: card.back } },
                  deckContent: { create: { deckId, order: nextOrder++ } }
                }
              })
            ));
          }

          // Process MCQs in batches of 5
          for (let i = 0; i < (result.mcqs || []).length; i += 5) {
            const batch = (result.mcqs || []).slice(i, i + 5);
            await Promise.all(batch.map((mcq: { question: string; options: string[]; correctOptionIndex: number; explanation: string; topic: string; difficulty: 'easy' | 'medium' | 'hard'; }) =>
              tx.studyContent.create({
                data: {
                  studyMaterialId,
                  type: 'mcq',
                  difficultyLevel: mcq.difficulty || difficultyLevel,
                  mcqContent: {
                    create: {
                      question: mcq.question,
                      options: mcq.options,
                      correctOptionIndex: mcq.correctOptionIndex,
                      explanation: mcq.explanation || ''
                    }
                  },
                  deckContent: { create: { deckId, order: nextOrder++ } }
                }
              })
            ));
          }

          // Process FRQs in batches of 3
          for (let i = 0; i < (result.frqs || []).length; i += 3) {
            const batch = (result.frqs || []).slice(i, i + 3);
            await Promise.all(batch.map((frq: { question: string; answers: string[]; caseSensitive: boolean; explanation: string; topic: string; difficulty: 'easy' | 'medium' | 'hard'; }) =>
              tx.studyContent.create({
                data: {
                  studyMaterialId,
                  type: 'frq',
                  difficultyLevel: frq.difficulty || difficultyLevel,
                  frqContent: {
                    create: {
                      question: frq.question,
                      answers: frq.answers,
                      caseSensitive: frq.caseSensitive,
                      explanation: frq.explanation || ''
                    }
                  },
                  deckContent: { create: { deckId, order: nextOrder++ } }
                }
              })
            ));
          }

        }, {
          maxWait: 300000, // 5 minutes
          timeout: 300000, // 5 minutes
          isolationLevel: 'ReadCommitted'
        });

        console.log(`Transaction SUCCEEDED for chunk ${chunkIndex + 1}/${totalChunks}`);
        break; // Exit retry loop on success

      } catch (txError) {
        lastError = txError;
        retryCount++;
        console.error(`Transaction FAILED for chunk ${chunkIndex + 1}/${totalChunks} (Attempt ${retryCount}):`, txError);
        // Implement exponential backoff for retries
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000)); // Exponential backoff
        }
      }
    }

    if (retryCount === MAX_RETRIES) {
      // Log which items failed to create
      const createdCount = await db.studyContent.count({
        where: { studyMaterialId }
      });
      console.error(`Failed to create all content items. Created ${createdCount} out of expected ${
        (result.flashcards?.length || 0) +
        (result.mcqs?.length || 0) +
        (result.frqs?.length || 0)
      }`);

      await db.deck.update({
        where: { id: deckId },
        data: {
          isProcessing: false,
          processingStage: 'PARTIAL_COMPLETION',
          error: `Partial completion - some content items failed to save`
        }
      });

      return new Response("Partial completion", { status: 206 });
    }

    const currentDeck = await db.deck.findUnique({
      where: { id: deckId },
      select: { processedChunks: true, totalChunks: true }
    });
    
    if (currentDeck?.processedChunks === currentDeck?.totalChunks) {
      console.log(`All chunks processed. Marking deck ${deckId} as complete.`);
      
      await db.deck.update({
        where: { id: deckId },
        data: {
          isProcessing: false,
          processingProgress: 100,
          processingStage: 'COMPLETED',
          error: null
        }
      });
      
      await db.studyMaterial.update({
        where: { id: studyMaterialId },
        data: { status: 'completed' }
      });
      
      try {
        const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
        
        if (!appUrl) {
          throw new Error('Configuration error: App URL not set.');
        }
        
        const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
        const targetUrl = `${baseUrl}/api/cron/generate-mind-map`;
        
        console.log(`Dispatching mind map generation for deck ${deckId}`);
        
        await qstashClient.publishJSON({
          url: targetUrl,
          headers: {
            "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET!
          },
          body: {
            deckId: deckId,
            studyMaterialId: studyMaterialId,
            aiModel: aiModel
          },
          retries: 3,
        });
        
        console.log(`Mind map generation dispatched for deck ${deckId}`);
      } catch (qstashError) {
        console.error('Failed to dispatch mind map generation:', qstashError);
        Sentry.captureException(qstashError);
      }
    }

    return new Response("Success", { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    
    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }
    
    return new Response("Error processing chunk", { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
