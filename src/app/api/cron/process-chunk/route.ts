// src/app/api/cron/process-chunk/route.ts
import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { processChunk, getDifficultyFromUserSelection } from '@/lib/deck-processor';
import { Client } from "@upstash/qstash";

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deckId: currentDeckId,
      studyMaterialId,
      chunkIndex: currentChunkIndex,
      totalChunks: currentTotalChunks,
      chunk: base64Chunk,
      difficultyPrompt,
      aiModel,
      isLastChunk,
      difficulty = 'moderate'
    } = body;

    // Validate required fields with type assertions
    if (!currentDeckId || !studyMaterialId || currentChunkIndex === undefined || 
        currentTotalChunks === undefined || !base64Chunk || !difficultyPrompt || !aiModel) {
      return new Response("Invalid chunk data", { status: 400 });
    }

    const deckId: string = currentDeckId;
    const chunkIndex: number = currentChunkIndex;
    const totalChunks: number = currentTotalChunks;

    // Convert base64 string back to Buffer
    const chunkBuffer = Buffer.from(base64Chunk, 'base64');

    // Process the chunk
    const result = await processChunk(chunkBuffer, chunkIndex, totalChunks, difficultyPrompt, aiModel);

    // Check if the result is valid
    const isValidResult = result && (result.flashcards?.length > 0 || result.mcqs?.length > 0 || result.frqs?.length > 0);
    
    if (!isValidResult) {
      throw new Error(`Failed to generate valid content for chunk ${chunkIndex + 1}/${totalChunks}`);
    }

    // Get the difficulty level
    const difficultyLevel = getDifficultyFromUserSelection(difficulty);

    // Save the results to the database with retry logic
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let lastError: unknown;

    while (retryCount < MAX_RETRIES) {
      try {
        await db.$transaction(async (tx) => {
          console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} for deck ${deckId}`);
          
          // Get current processed chunks count within the transaction
          const currentDeckInTx = await tx.deck.findUnique({
            where: { id: deckId },
            select: { processedChunks: true }
          });
          
          // Calculate progress based on actual processed chunks
          const processedCount = (currentDeckInTx?.processedChunks || 0) + 1; // +1 for the current chunk
          const chunkProgress = (processedCount / totalChunks) * 65; // Use 65% range (20% to 85%)
          const progress = Math.floor(20 + chunkProgress);
          
          console.log(`Progress calculation details:
            - Base: 20%
            - Processed count: ${processedCount}/${totalChunks}
            - Increment: ${chunkProgress.toFixed(2)}%
            - Total: ${progress}%
            - Current chunk: ${chunkIndex + 1}/${totalChunks}
            - isLastChunk: ${isLastChunk}
            - Current time: ${new Date().toISOString()}`);
          
          console.log(`Updating progress to ${progress}% for chunk ${chunkIndex + 1}/${totalChunks}`);
          
          // Use atomic increment operation to avoid race conditions
          await tx.deck.update({
            where: { id: deckId },
            data: {
              processedChunks: {
                increment: 1
              },
              processingProgress: Math.min(progress, 85),
            }
          });
          
          // Get the next order index
          const lastContent = await tx.deckContent.findFirst({
            where: { deckId },
            orderBy: { order: 'desc' },
            select: { order: true }
          });
          
          let nextOrder = lastContent ? lastContent.order + 1 : 0;
          
          // Create flashcard content with deckContent relationship
          for (const card of result.flashcards || []) {
            await tx.studyContent.create({
              data: {
                studyMaterialId,
                type: 'flashcard',
                flashcardContent: {
                  create: {
                    front: card.front,
                    back: card.back
                  }
                },
                deckContent: {
                  create: {
                    deckId,
                    order: nextOrder++
                  }
                }
              }
            });
          }
          
          // Create MCQ content
          for (const mcq of result.mcqs || []) {
            await tx.studyContent.create({
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
                }
              }
            });
          }
          
          // Create FRQ content with deckContent relationship
          for (const frq of result.frqs || []) {
            await tx.studyContent.create({
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
                deckContent: {
                  create: {
                    deckId,
                    order: nextOrder++
                  }
                }
              }
            });
          }
        }, {
          maxWait: 60000,
          timeout: 60000,
          isolationLevel: 'ReadCommitted' // Reduced isolation level
        });
        break; // Success - exit retry loop
      } catch (txError) {
        lastError = txError;
        retryCount++;
        console.warn(`Transaction attempt ${retryCount} failed:`, lastError);
        
        if (retryCount < MAX_RETRIES) {
          // Exponential backoff before retry
          const delay = Math.pow(2, retryCount) * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw txError;
      }
    }

    // Additional logging for last chunk
    console.log(`Chunk ${chunkIndex + 1}/${totalChunks} processed. Is last chunk: ${isLastChunk}`);
    
    // After processing any chunk, check if all chunks have been processed
    // This ensures we complete the deck as soon as all chunks are done, regardless of processing order
    console.log(`Checking if all chunks have been processed after chunk ${chunkIndex + 1}/${totalChunks}`);
    const currentDeck = await db.deck.findUnique({
      where: { id: deckId },
      select: { processedChunks: true, totalChunks: true }
    });
    
    console.log(`Processed chunks: ${currentDeck?.processedChunks}/${currentDeck?.totalChunks}`);
    
    // Only proceed with completion if ALL chunks are processed, regardless of which chunk this is
    if (currentDeck?.processedChunks === currentDeck?.totalChunks) {
      console.log(`All chunks processed. Marking deck as complete.`);
      
      // Mark the deck as COMPLETED immediately (100%)
      await db.deck.update({
        where: { id: deckId },
        data: {
          isProcessing: false,
          processingProgress: 100,
          processingStage: 'COMPLETED',
          error: null
        }
      });
      
      // Update study material status
      await db.studyMaterial.update({
        where: { id: studyMaterialId },
        data: { status: 'completed' }
      });
      
      console.log('Deck status updated to COMPLETED at:', new Date().toISOString());
      
      // Dispatch mind map generation as a separate background task
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
        
        // Even if mind map dispatch fails, the deck is already marked as complete
        // Just log the error, no need to update the deck status
      }
    } else {
      console.log(`Not all chunks processed yet (${currentDeck?.processedChunks}/${currentDeck?.totalChunks}). Waiting for remaining chunks.`);
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
