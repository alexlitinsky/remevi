// src/app/api/cron/generate-mind-map/route.ts
import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';
import { generateMindMap, ChunkResult } from '@/lib/deck-processor';

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { deckId, studyMaterialId, aiModel } = body;

    if (!deckId || !studyMaterialId || !aiModel) {
      return new Response("Invalid mind map generation data", { status: 400 });
    }

    // Log the start of mind map generation
    console.log(`Starting mind map generation for deck ${deckId}`);

    // Fetch all study contents for mind map generation
    const studyContents = await db.studyContent.findMany({
      where: { studyMaterialId },
      include: {
        flashcardContent: true,
        mcqContent: true,
        frqContent: true
      }
    });
    
    // Convert to chunk results format
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
          options: c.mcqContent!.options as string[],
          correctOptionIndex: c.mcqContent!.correctOptionIndex,
          explanation: c.mcqContent!.explanation || '',
          topic: extractTopic(c.mcqContent!.question),
          difficulty: (c.difficultyLevel || 'medium') as 'easy' | 'medium' | 'hard'
        })),
      frqs: studyContents
        .filter(c => c.type === 'frq' && c.frqContent)
        .map(c => ({
          question: c.frqContent!.question,
          answers: c.frqContent!.answers as string[],
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
      
      // Update deck with mind map only (deck is already marked as complete)
      await db.deck.update({
        where: { id: deckId },
        data: {
          mindMap: mindMap ? { nodes: mindMap.nodes, connections: mindMap.connections } : { nodes: [], connections: [] }
        }
      });
      console.log('Mind map added to deck at:', new Date().toISOString());
      
      return new Response("Mind map generated successfully", { status: 200 });
    } catch (mindMapError) {
      console.error('MindMap Generation Failed:', mindMapError);
      Sentry.captureException(mindMapError);
      
      // Don't change the deck status, just log the error
      // The deck is already marked as complete, and users can use it without the mind map
      return new Response("Mind map generation failed, but deck remains usable", { status: 200 });
    }
  } catch (error) {
    Sentry.captureException(error);
    
    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }
    
    return new Response("Error generating mind map", { status: 500 });
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