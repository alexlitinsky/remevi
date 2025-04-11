import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { processChunk, getDifficultyFromUserSelection } from '@/lib/deck-processor';
import { Client } from "@upstash/qstash";

// Persistent chunk storage with timeout
const chunkStorage = new Map<string, {
  parts: string[],
  received: number,
  lastUpdated: number,
  missingParts: Set<number>,
  timeout: number
}>();

const CHUNK_TIMEOUT = 60 * 60 * 1000; // 1 hour timeout

function cleanupExpiredChunks() {
  const now = Date.now();
  for (const [key, data] of chunkStorage.entries()) {
    if (now - data.lastUpdated > data.timeout) {
      console.log(`Cleaning up expired chunk parts: ${key}`);
      chunkStorage.delete(key);
    }
  }
}

// async function handleMissingParts(deckId: string, chunkIndex: number) {
//   const storageKey = `${deckId}-${chunkIndex}`;
//   const chunkData = chunkStorage.get(storageKey);
  
//   if (!chunkData) return false;
  
//   const now = Date.now();
//   if (now - chunkData.lastUpdated > 10 * 60 * 1000) {
//     console.log(`Chunk ${chunkIndex} for deck ${deckId} has missing parts: ${Array.from(chunkData.missingParts)}`);
    
//     await db.deck.update({
//       where: { id: deckId },
//       data: {
//         error: `Processing incomplete: Chunk ${chunkIndex + 1} missing ${chunkData.missingParts.size} parts`,
//         processingStage: 'ERROR',
//         isProcessing: false
//       }
//     });
    
//     return true;
//   }
  
//   return false;
// }

async function handler(request: NextRequest) {
  cleanupExpiredChunks();

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

    let fullChunk: string;
    if (chunkPart !== undefined && totalParts !== undefined && partIndex !== undefined) {
      const storageKey = `${currentDeckId}-${currentChunkIndex}`;
      let stored = chunkStorage.get(storageKey);
      
      if (!stored) {
        const missingParts = new Set<number>();
        for (let i = 0; i < totalParts; i++) missingParts.add(i);
        
        stored = {
          parts: Array(totalParts).fill(''),
          received: 0,
          lastUpdated: Date.now(),
          missingParts,
          timeout: CHUNK_TIMEOUT
        };
        chunkStorage.set(storageKey, stored);
      }

      stored.parts[partIndex] = chunkPart;
      stored.received++;
      stored.lastUpdated = Date.now();
      stored.missingParts.delete(partIndex);

      console.log(`Received part ${partIndex + 1}/${totalParts} for chunk ${currentChunkIndex + 1}/${currentTotalChunks}`);
      
      if (stored.received < totalParts) {
        return new Response("Chunk part received", { status: 200 });
      }
      
      fullChunk = stored.parts.join('');
      chunkStorage.delete(storageKey);
      console.log(`All parts received for chunk ${currentChunkIndex + 1}/${currentTotalChunks}`);
    } else if (base64Chunk) {
      fullChunk = base64Chunk;
    } else {
      return new Response("Missing chunk data", { status: 400 });
    }

    const deckId: string = currentDeckId;
    const chunkIndex: number = currentChunkIndex;
    const totalChunks: number = currentTotalChunks;

    const chunkBuffer = Buffer.from(fullChunk, 'base64');
    const result = await processChunk(chunkBuffer, chunkIndex, totalChunks, difficultyPrompt, aiModel);

    const isValidResult = result && (result.flashcards?.length > 0 || result.mcqs?.length > 0 || result.frqs?.length > 0);
    if (!isValidResult) {
      throw new Error(`Failed to generate valid content for chunk ${chunkIndex + 1}/${totalChunks}`);
    }

    const difficultyLevel = getDifficultyFromUserSelection(difficulty);

    const MAX_RETRIES = 3;
    let retryCount = 0;
    let lastError: unknown;

    while (retryCount < MAX_RETRIES) {
      try {
        await db.$transaction(async (tx) => {
          console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} for deck ${deckId}`);
          
          const currentDeckInTx = await tx.deck.findUnique({
            where: { id: deckId },
            select: { processedChunks: true }
          });
          
          const processedCount = (currentDeckInTx?.processedChunks || 0) + 1;
          const chunkProgress = (processedCount / totalChunks) * 65;
          const progress = Math.floor(20 + chunkProgress);
          
          console.log(`Updating progress to ${progress}% for chunk ${chunkIndex + 1}/${totalChunks}`);
          
          await tx.deck.update({
            where: { id: deckId },
            data: {
              processedChunks: { increment: 1 },
              processingProgress: Math.min(progress, 85),
            }
          });
          
          const lastContent = await tx.deckContent.findFirst({
            where: { deckId },
            orderBy: { order: 'desc' },
            select: { order: true }
          });
          
          let nextOrder = lastContent ? lastContent.order + 1 : 0;
          
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
          isolationLevel: 'ReadCommitted'
        });
        break;
      } catch (txError) {
        lastError = txError;
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    if (retryCount === MAX_RETRIES) {
      throw lastError;
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
