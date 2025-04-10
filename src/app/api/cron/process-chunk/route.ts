// src/app/api/cron/process-chunk/route.ts
import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { processChunk, generateMindMap, ChunkResult, getDifficultyFromUserSelection } from '@/lib/deck-processor';

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
          
          // Calculate progress (20% to 85% for chunk processing)
          const chunkProgress = ((chunkIndex + 1) / totalChunks) * 65;
          const progress = Math.floor(20 + chunkProgress);
          
          console.log(`Progress calculation details:
            - Base: 20%
            - Increment: ${chunkProgress.toFixed(2)}% (${chunkIndex + 1}/${totalChunks} chunks)
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
    
    // If this is the last chunk, validate all chunks are processed before generating mind map
    if (isLastChunk) {
      console.log('Last chunk received - checking if all chunks processed');
      // Ensure all chunks have been processed
      const currentDeck = await db.deck.findUnique({
        where: { id: deckId },
        select: { processedChunks: true, totalChunks: true }
      });
      
      if (currentDeck?.processedChunks !== currentDeck?.totalChunks) {
        return new Response("Waiting for all chunks to complete", { status: 200 });
      }
      
      // Fetch all study contents for mind map generation
      const studyContents = await db.studyContent.findMany({
        where: { studyMaterialId },
        include: {
          flashcardContent: true,
          mcqContent: true,
          frqContent: true
        }
      });
      
      // Convert to chunk results format with proper type assertions
      const chunkResults: ChunkResult = {
        summary: studyContents
          .filter(c => c.type === 'flashcard' && c.flashcardContent)
          .map(c => `${c.flashcardContent!.front}: ${c.flashcardContent!.back}`)
          .join('\n\n')
          .slice(0, 2000), // Limit length
        flashcards: studyContents
          .filter(c => c.type === 'flashcard' && c.flashcardContent)
          .map(c => ({
            front: c.flashcardContent!.front,
            back: c.flashcardContent!.back,
            topic: extractTopic(c.flashcardContent!.front)
          })),
        mcqs: studyContents
          .filter(c => c.type === 'mcq' && c.mcqContent)
          .map(c => ({
            question: c.mcqContent!.question,
            options: c.mcqContent!.options as string[], // Type assertion
            correctOptionIndex: c.mcqContent!.correctOptionIndex,
            explanation: c.mcqContent!.explanation || '',
            topic: extractTopic(c.mcqContent!.question),
            difficulty: (c.difficultyLevel || 'medium') as 'easy' | 'medium' | 'hard'
          })),
        frqs: studyContents
          .filter(c => c.type === 'frq' && c.frqContent)
          .map(c => ({
            question: c.frqContent!.question,
            answers: c.frqContent!.answers as string[], // Type assertion
            caseSensitive: c.frqContent!.caseSensitive,
            explanation: c.frqContent!.explanation || '',
            topic: extractTopic(c.frqContent!.question),
            difficulty: (c.difficultyLevel || 'medium') as 'easy' | 'medium' | 'hard'
          })),
        category: 'general'
      };
      
      // Validate content before mind map generation
      if (studyContents.length === 0) {
        throw new Error('No study content available for mind map generation');
      }

      if (chunkResults.flashcards.length + chunkResults.mcqs.length + chunkResults.frqs.length === 0) {
        throw new Error('No valid flashcards, MCQs or FRQs found for mind map');
      }

      console.log('Starting mind map generation with:', {
        studyContentsCount: studyContents.length,
        flashcards: chunkResults.flashcards.length,
        mcqs: chunkResults.mcqs.length,
        frqs: chunkResults.frqs.length
      });

      // Generate mind map
      try {
        console.log('Starting mind map generation at:', new Date().toISOString());
        const mindMap = await generateMindMap([chunkResults], aiModel);
        console.log('Mind map generation completed at:', new Date().toISOString());
        
        // Update deck with mind map
        await db.deck.update({
          where: { id: deckId },
          data: {
            mindMap: mindMap ? { nodes: mindMap.nodes, connections: mindMap.connections } : { nodes: [], connections: [] },
            isProcessing: false,
            processingProgress: 100,
            processingStage: 'COMPLETED',
            error: null
          }
        });
        console.log('Deck status updated to COMPLETED at:', new Date().toISOString());
        
        // Update study material status
        await db.studyMaterial.update({
          where: { id: studyMaterialId },
          data: { status: 'completed' }
        });
      } catch (mindMapError) {
        console.error('MindMap Generation Failed:', mindMapError);
        Sentry.captureException(mindMapError);
        await db.deck.update({
          where: { id: deckId },
          data: {
            isProcessing: false,
            processingProgress: 100, // Force completion
            processingStage: 'COMPLETED_WITH_WARNINGS',
            error: `Mind map failed: ${mindMapError instanceof Error ? mindMapError.message : 'Unknown error'}`
          }
        });
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

// Helper function to extract a meaningful topic from text
function extractTopic(text: string): string {
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'is', 'are'];
  const words = text
    .replace(/[^\w\s]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  return words.slice(0, 3).join(' ') || text.slice(0, 15);
}

export const POST = verifySignatureAppRouter(handler);
