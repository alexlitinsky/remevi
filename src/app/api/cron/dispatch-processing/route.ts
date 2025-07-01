import { NextRequest } from 'next/server';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { db } from '@/lib/db';
import { getFileFromStorage } from '@/lib/storage';
import * as Sentry from '@sentry/nextjs';
import { splitPdfIntoChunks, buildDifficultyPrompt } from '@/lib/deck-processor';
import { Client } from "@upstash/qstash";

// Calculate safe message size (500KB max for parts)
const MAX_PART_SIZE = 500 * 1024; // 500KB
const MAX_RETRIES = 3;

async function publishWithRetry(
  qstashClient: Client,
  url: string,
  headers: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  attempt = 1
): Promise<void> {
  try {
    await qstashClient.publishJSON({
      url,
      headers,
      body,
      retries: 3,
    });
    console.log(`Successfully queued part ${body.partIndex + 1}/${body.totalParts} for chunk ${body.chunkIndex + 1}/${body.totalChunks}`);
  } catch (error) {
    console.error(`Failed to queue part ${body.partIndex + 1}/${body.totalParts} (attempt ${attempt}):`, error);
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      return publishWithRetry(qstashClient, url, headers, body, attempt + 1);
    }
    throw error;
  }
}

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

    // Fetch study material and get file buffer
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

    // Split PDF and update status
    await db.deck.update({ 
      where: { id: deckId }, 
      data: { processingStage: 'CHUNKING', processingProgress: 10 } 
    });
    
    const chunks = await splitPdfIntoChunks(fileBuffer, pageRange);
    
    await db.deck.update({
      where: { id: deckId },
      data: {
        totalChunks: chunks.length,
        processingProgress: 15,
        processingStage: 'QUEUING_CHUNKS'
      }
    });

    const difficultyPrompt = buildDifficultyPrompt(difficulty, pageRange, metadata.type);
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

    // Queue each chunk with improved error handling
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const base64Chunk = chunk.toString('base64');
      const isLast = i === chunks.length - 1;
      
      // Calculate safe chunk parts
      const chunkParts = [];
      let position = 0;
      while (position < base64Chunk.length) {
        const partSize = Math.min(MAX_PART_SIZE, base64Chunk.length - position);
        chunkParts.push(base64Chunk.substr(position, partSize));
        position += partSize;
      }

      console.log(`Queueing chunk ${i + 1}/${chunks.length} (${chunkParts.length} parts)`);

      // Send each part with retry logic
      for (let partIndex = 0; partIndex < chunkParts.length; partIndex++) {
        const messageBody = {
          deckId,
          studyMaterialId: studyMaterial.id,
          chunkIndex: i,
          totalChunks: chunks.length,
          chunkPart: chunkParts[partIndex],
          totalParts: chunkParts.length,
          partIndex,
          difficultyPrompt,
          aiModel,
          isLastChunk: isLast && (partIndex === chunkParts.length - 1)
        };

        try {
          await publishWithRetry(
            qstashClient,
            targetUrl,
            {
              "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET!
            },
            messageBody
          );
        } catch (error) {
          console.error(`Failed to queue part ${partIndex + 1}/${chunkParts.length} after ${MAX_RETRIES} attempts`);
          throw error;
        }
      }
    }

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