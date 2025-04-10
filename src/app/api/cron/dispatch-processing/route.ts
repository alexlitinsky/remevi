// src/app/api/cron/dispatch-processing/route.ts
import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from '@/lib/db';
import { getFileFromStorage } from '@/lib/storage';
import * as Sentry from '@sentry/nextjs';
import { splitPdfIntoChunks, buildDifficultyPrompt } from '@/lib/deck-processor';
import { Client } from "@upstash/qstash";

async function handler(request: NextRequest) {
  let deckId: string | undefined;

  try {
    const body = await request.json();
    const {
      deckId: currentDeckId,
      studyMaterialId,
      filePath,
      metadata,
      pageRange,
      aiModel,
      difficulty
    } = body;

    deckId = currentDeckId;

    if (!deckId || !studyMaterialId || !filePath || !metadata || !aiModel || !difficulty) {
      return new Response("Invalid job data", { status: 400 });
    }

    // Fetch the study material
    const studyMaterial = await db.studyMaterial.findUnique({
      where: { id: studyMaterialId }
    });

    if (!studyMaterial) {
      await db.deck.update({
        where: { id: deckId },
        data: { isProcessing: false, processingStage: 'ERROR', error: 'Study material not found' },
      });
      return new Response("Study material not found", { status: 404 });
    }

    // Get file buffer from storage
    let fileBuffer: Buffer;
    try {
      const fileData = await getFileFromStorage(filePath);
      const arrayBuffer = await fileData.arrayBuffer();
      fileBuffer = Buffer.from(new Uint8Array(arrayBuffer));
    } catch (storageError) {
      Sentry.captureException(storageError);
      await db.deck.update({
        where: { id: deckId },
        data: { isProcessing: false, processingStage: 'ERROR', error: 'Failed to access uploaded file' },
      });
      return new Response('Failed to access file', { status: 500 });
    }

    // Split PDF into chunks
    await db.deck.update({ 
      where: { id: deckId }, 
      data: { processingStage: 'CHUNKING', processingProgress: 10 } 
    });
    
    const chunks = await splitPdfIntoChunks(fileBuffer, pageRange);
    
    // Update total chunks count
    await db.deck.update({
      where: { id: deckId },
      data: {
        totalChunks: chunks.length,
        processingProgress: 15,
        processingStage: 'QUEUING_CHUNKS'
      }
    });

    // Build the difficulty prompt
    const difficultyPrompt = buildDifficultyPrompt(
      difficulty,
      pageRange,
      metadata.type
    );

    // Queue each chunk for processing
    const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    
    if (!appUrl) {
      await db.deck.update({
        where: { id: deckId },
        data: { isProcessing: false, processingStage: 'ERROR', error: 'Configuration error: App URL not set.' },
      });
      return new Response('Server configuration error: App URL not set', { status: 500 });
    }
    
    const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    const targetUrl = `${baseUrl}/api/cron/process-chunk`;

    // Queue each chunk as a separate job
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Convert Buffer to base64 string for transmission
      const base64Chunk = chunk.toString('base64');
      
      const isLast = i === chunks.length - 1;
      console.log(`Queueing chunk ${i + 1}/${chunks.length} for deck ${deckId}. Last chunk: ${isLast}`);
      
      await qstashClient.publishJSON({
        url: targetUrl,
        headers: {
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET!
        },
        body: {
          deckId: deckId,
          studyMaterialId: studyMaterial.id,
          chunkIndex: i,
          totalChunks: chunks.length,
          chunk: base64Chunk,
          difficultyPrompt: difficultyPrompt,
          aiModel: aiModel,
          isLastChunk: isLast
        },
        retries: 3,
      });
    }

    // Update deck status to indicate chunks are queued
    await db.deck.update({
      where: { id: deckId },
      data: {
        processingStage: 'PROCESSING_CHUNKS',
        processingProgress: 20,
      }
    });

    return new Response("Success", { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    
    if (deckId) {
      await db.deck.update({
        where: { id: deckId },
        data: {
          isProcessing: false,
          processingStage: 'ERROR',
          error: error instanceof Error ? error.message : 'Failed to dispatch chunk processing',
        },
      });
    }
    
    return new Response("Internal Server Error", { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);