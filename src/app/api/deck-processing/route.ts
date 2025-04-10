// src/app/api/deck-processing/route.ts
import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"; // Try nextjs path
import { db } from '@/lib/db';
import { getFileFromStorage } from '@/lib/storage';
import * as Sentry from '@sentry/nextjs';
import {
  splitPdfIntoChunks,
  processChunk,
  generateMindMap,
  ChunkResult,
  buildDifficultyPrompt,
  getDifficultyFromUserSelection
} from '@/lib/deck-processor';

async function handler(request: NextRequest) {
  // Received request from QStash

  let deckId: string | undefined; // Keep track of deckId for error handling

  try {
    const body = await request.json();
    // Request body received

    // Extract job data from the request body sent by QStash
    const {
      deckId: currentDeckId,
      studyMaterialId, // <-- Get studyMaterialId from body
      filePath,
      metadata,
      pageRange,
      aiModel,
      difficulty
    } = body;

    deckId = currentDeckId; // Assign for use in catch block

    if (!deckId || !studyMaterialId || !filePath || !metadata || !aiModel || !difficulty) { // Added studyMaterialId check
      // Invalid job data received
      return new Response("Invalid job data", { status: 400 });
    }

    // Starting processing for deck ${deckId}

    // --- Start of the moved generation logic ---
    // Fetch the associated study material using the ID from the job body
    const studyMaterial = await db.studyMaterial.findUnique({
        where: { id: studyMaterialId }
    });
 
    if (!studyMaterial) {
        // Could not find study material with ID ${studyMaterialId} for deck ${deckId}
        // Update deck status to error
        await db.deck.update({
            where: { id: deckId },
            data: { isProcessing: false, processingStage: 'ERROR', error: 'Internal error: Study material not found' },
        });
        return new Response("Study material not found", { status: 404 });
    }

    // Get file buffer from storage
    let fileBuffer: Buffer;
    try {
        // Getting file from storage: ${filePath}
        const fileData = await getFileFromStorage(filePath);
        const arrayBuffer = await fileData.arrayBuffer();
        fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));
        // File buffer retrieved successfully for deck ${deckId}
    } catch (storageError) {
        // Error accessing file from storage for deck ${deckId}
        Sentry.captureException(storageError);
        await db.deck.update({
            where: { id: deckId },
            data: { isProcessing: false, processingStage: 'ERROR', error: 'Failed to access uploaded file' },
        });
        return new Response('Failed to access file', { status: 500 });
    }

    // --- Core Processing Logic (Adapted from generate-chunks) ---
    try {
        // Starting generation logic for deck ${deckId}

        // Build the prompt using the utility function
        const difficultyPrompt = buildDifficultyPrompt(
          difficulty,
          pageRange,
          metadata.type
        );

        // Split PDF into chunks
        // Splitting PDF into chunks for deck ${deckId}
        await db.deck.update({ where: { id: deckId }, data: { processingStage: 'CHUNKING', processingProgress: 10 } });
        const chunks = await splitPdfIntoChunks(fileBuffer, pageRange);
        // Split PDF into ${chunks.length} chunks for deck ${deckId}

        // Update total chunks count
        await db.deck.update({
          where: { id: deckId },
          data: {
            totalChunks: chunks.length,
            processingProgress: 15, // Slightly more progress
            processingStage: 'GENERATING'
          }
        });

        // Process chunks for flashcards
        const chunkResults: ChunkResult[] = [];
        const batchSize = 3; // Keep batching
        let successfulChunks = 0;

        // Processing chunks in batches of ${batchSize} for deck ${deckId}
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const batchPromises = batch.map((chunk, idx) => {
            const currentChunkIndex = i + idx;
            return processChunk(chunk, currentChunkIndex, chunks.length, difficultyPrompt, aiModel);
          });

          // Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)} for deck ${deckId}
          const results = await Promise.all(batchPromises);
          const validResults = results.filter(r => r && (r.flashcards?.length > 0 || r.mcqs?.length > 0 || r.frqs?.length > 0)); // Check if result is valid
          chunkResults.push(...validResults);
          successfulChunks += validResults.length;

          // Optional: Add delay between batches if needed to avoid rate limits
          // if (i + batchSize < chunks.length) {
          //   await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          // }

          // Calculate progress (e.g., 15% to 85% for chunk processing)
          const progress = 15 + ((successfulChunks / chunks.length) * 70);

          await db.deck.update({
            where: { id: deckId },
            data: {
              isProcessing: true, // Ensure this stays true
              processedChunks: successfulChunks,
              processingProgress: Math.min(progress, 85), // Cap progress for this stage
              // Optional: Update error field with intermediate progress for debugging
              // error: `Processed ${successfulChunks}/${chunks.length} chunks...`
            }
          });
        }

        if (chunkResults.length === 0) {
          // No valid content generated from chunks for deck ${deckId}
          throw new Error('Failed to generate any valid content from the document');
        }

        // Combine results
        // Combining results for deck ${deckId}
        const allFlashcards = chunkResults.flatMap(result => result.flashcards || []);
        const allMCQs = chunkResults.flatMap(result => result.mcqs || []);
        const allFRQs = chunkResults.flatMap(result => result.frqs || []);
        // Combined ${allFlashcards.length} flashcards, ${allMCQs.length} MCQs, ${allFRQs.length} FRQs for deck ${deckId}

        // Use the imported utility function for difficulty mapping
        const difficultyLevel = getDifficultyFromUserSelection(difficulty);

        // Determine category and prepare variables needed after transaction
        const categoryCounts = chunkResults
          .map(r => r.category || 'unknown')
          .reduce((acc: Record<string, number>, curr: string) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
          }, {});
        const finalCategory = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';

        // Save chunkResults for mindmap generation after transaction
        const savedChunkResults = [...chunkResults];

        // Create content in database
        // Creating DB entries for deck ${deckId}
        await db.deck.update({ where: { id: deckId }, data: { processingStage: 'SAVING', processingProgress: 85 } });

        // Use Prisma transaction with increased timeout for atomicity
        await db.$transaction(async (tx) => {
            // Delete existing content for this deck first? Or assume it's a new deck.
            // If re-processing is possible, add deletion logic here:
            // await tx.deckContent.deleteMany({ where: { deckId: deckId } });
            // await tx.studyContent.deleteMany({ where: { studyMaterialId: studyMaterial.id }}); // Careful with shared studyMaterial

            let orderIndex = 0;

            // Create flashcard content
            for (const card of allFlashcards) {
                const studyContent = await tx.studyContent.create({
                    data: {
                        studyMaterialId: studyMaterial.id,
                        type: 'flashcard',
                        flashcardContent: { create: { front: card.front, back: card.back } }
                    }
                });
                await tx.deckContent.create({
                    data: { deckId: deckId!, studyContentId: studyContent.id, order: orderIndex++ } // Use non-null assertion
                });
            }

            // Create MCQ content
            for (const mcq of allMCQs) {
                const studyContent = await tx.studyContent.create({
                    data: {
                        studyMaterialId: studyMaterial.id,
                        type: 'mcq',
                        difficultyLevel: mcq.difficulty || difficultyLevel,
                        mcqContent: { create: { question: mcq.question, options: mcq.options, correctOptionIndex: mcq.correctOptionIndex, explanation: mcq.explanation } }
                    }
                });
                await tx.deckContent.create({
                    data: { deckId: deckId!, studyContentId: studyContent.id, order: orderIndex++ } // Use non-null assertion
                });
            }

            // Create FRQ content
            for (const frq of allFRQs) {
                const studyContent = await tx.studyContent.create({
                    data: {
                        studyMaterialId: studyMaterial.id,
                        type: 'frq',
                        difficultyLevel: frq.difficulty || difficultyLevel,
                        frqContent: { create: { question: frq.question, answers: frq.answers, caseSensitive: frq.caseSensitive, explanation: frq.explanation } }
                    }
                });
                await tx.deckContent.create({
                    data: { deckId: deckId!, studyContentId: studyContent.id, order: orderIndex++ } // Use non-null assertion
                });
            }
        }, {
            maxWait: 30000, // Maximum time Prisma will wait for a transaction
            timeout: 30000 // Maximum time the transaction can run
        });
        // Successfully created DB entries for deck ${deckId}

        // Update study material status
        await db.studyMaterial.update({
          where: { id: studyMaterial.id },
          data: { status: 'completed' } // Mark associated material as completed
        });

        // Update deck status after successful content creation
        await db.deck.update({
          where: { id: deckId },
          data: {
            category: finalCategory,
            isProcessing: false, // Mark as complete
            processingProgress: 100,
            processingStage: 'COMPLETED',
            error: null // Clear any previous errors
          }
        });

        // Generate mind map outside transaction since it's not critical
        // Generating mind map for deck ${deckId}
        try {
          const mindMap = await generateMindMap(savedChunkResults, aiModel);
          // Mind map generation completed for deck ${deckId}

          // Update deck with mind map if successful
          await db.deck.update({
            where: { id: deckId },
            data: {
              mindMap: mindMap ? { nodes: mindMap.nodes, connections: mindMap.connections } : { nodes: [], connections: [] }
            }
          });
        } catch (mindMapError) {
          // Error generating mind map for deck ${deckId}
          Sentry.captureException(mindMapError);
          // Mind map failure is non-critical, just log it
        }

        // Processing completed successfully for deck ${deckId}
        // --- End of the moved generation logic ---

        // Return success response to QStash
        return new Response("Success", { status: 200 });

    } catch (processingError) {
        // Error during core processing for deck ${deckId}
        Sentry.captureException(processingError);

        // Update deck status to error
        await db.deck.update({
            where: { id: deckId },
            data: {
                isProcessing: false,
                processingStage: 'ERROR',
                error: processingError instanceof Error ? processingError.message : 'Failed to generate study materials',
                processingProgress: 0 // Reset progress on failure? Or keep last known?
            },
        });
        // Also update study material status?
        await db.studyMaterial.update({
            where: { id: studyMaterial.id },
            data: { status: 'error', processingError: 'Failed during background generation' },
        }); // Best effort

        // Return error response to QStash
        return new Response("Error processing deck", { status: 500 });
    }

  } catch (error) {
    // General error in deck processing
    Sentry.captureException(error);

    // If we know the deckId, try to update its status
    if (deckId) {
      await db.deck.update({
        where: { id: deckId },
        data: {
          isProcessing: false,
          processingStage: 'ERROR',
          error: 'Unexpected error in processing handler',
        },
      }); // Best effort
    }

    // Return error response to QStash
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Wrap the handler with QStash verification
export const POST = verifySignatureAppRouter(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY
});

// Add edge runtime if preferred and compatible with dependencies (pdf-lib might require node)
// export const runtime = 'edge';