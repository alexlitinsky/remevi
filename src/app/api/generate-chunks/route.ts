import { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getUserSubscriptionStatus, isSubscribed } from '@/lib/stripe';
import { FREEMIUM_LIMITS } from '@/lib/constants';
import { AiModel } from '@/types/ai';
import { Difficulty } from '@/types/difficulty';
import { rateLimit } from '@/lib/rate-limit';
import { checkAndUpdateUploadLimit } from '@/lib/upload-limits';
import * as Sentry from '@sentry/nextjs';
import { Client } from "@upstash/qstash";
import { removeFileExtension, validateFreemiumLimits } from '@/lib/deck-processor';





export async function POST(request: NextRequest) {
  try {
    Sentry.init({
      environment: process.env.NODE_ENV,
      dsn: process.env.SENTRY_DSN,
    });

    const user = await currentUser();
    if (!user?.id) {
      Sentry.captureMessage('Unauthorized');
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(user.id);
    if (rateLimitResult.error) {
      Sentry.captureMessage('Rate limit exceeded');
      return rateLimitResult.error;
    }

    // Check upload limits before proceeding

    // Ensure user exists in our database
    await db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.firstName || '',
      },
      update: {},
    });

    try {
      await checkAndUpdateUploadLimit();
    } catch (error) {
      Sentry.captureException(error);
      return new Response(error instanceof Error ? error.message : 'Upload limit exceeded', { 
        status: 400 
      });
    }

    // let metadata: { originalName: string; type: string; size: number };

    // Handle both direct uploads and Supabase storage
    // Handle uploaded file from Supabase storage
    const { uploadId, filePath, metadata: fileMetadata, pageRange, aiModel, difficulty } = await request.json();

    const subscription = await getUserSubscriptionStatus(user.id);
    const subscribed = isSubscribed(subscription);
    
    const limits = subscribed ? FREEMIUM_LIMITS.PRO : FREEMIUM_LIMITS.FREE;

    const { error } = await validateFreemiumLimits({
      fileMetadata,
      pageRange,
      aiModel: aiModel as AiModel,
      difficulty: difficulty as Difficulty,
      limits
    });

    if (error) {
      return new Response(error, { status: 400 });
    }

    if (!uploadId || !filePath) {
      return new Response('Invalid upload data provided', { status: 400 });
    }
    const metadata = fileMetadata;

    // Create initial study material
    const studyMaterial = await db.studyMaterial.create({
      data: {
        title: removeFileExtension(metadata.originalName),
        userId: user.id,
        status: 'processing',
        fileType: metadata.type,
      },
    });

    // Create initial deck
    const deck = await db.deck.create({
      data: {
        title: removeFileExtension(metadata.originalName),
        userId: user.id,
        isProcessing: true,
        mindMap: { nodes: [], connections: [] },
        processingProgress: 0,
        processingStage: 'CHUNKING',
        processedChunks: 0,
        totalChunks: 0
      },
    });

    // --- QStash Integration ---
    try {
      const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });
      // Construct the absolute URL for the processing endpoint
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL; // Use VERCEL_URL as fallback if available
      if (!appUrl) {
          // Error: NEXT_PUBLIC_APP_URL or VERCEL_URL environment variable is not set. Cannot determine callback URL.
          await db.deck.update({
              where: { id: deck.id },
              data: { isProcessing: false, processingStage: 'ERROR', error: 'Configuration error: App URL not set.' },
          });
          return new Response('Server configuration error: App URL not set', { status: 500 });
      }
      // Ensure the URL starts with https://
      const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
      const targetUrl = `${baseUrl}/api/internal/deck-processing`;
 
      // Publishing job to QStash for deck ${deck.id}. Target: ${targetUrl}
 
      await qstashClient.publishJSON({
        url: targetUrl,
        body: {
          deckId: deck.id,
          studyMaterialId: studyMaterial.id, // <-- Add studyMaterialId
          filePath: filePath,
          metadata: metadata, // Pass the original metadata
          pageRange: pageRange,
          aiModel: aiModel,
          difficulty: difficulty
        },
        retries: 3,
        // QStash requires the callback URL for verification if using callback
        // callback: `${baseUrl}/api/qstash-callback`, // Example callback endpoint if needed
      });
 
      // Job published successfully for deck ${deck.id}
 
      // Update deck status to indicate queuing
      await db.deck.update({
        where: { id: deck.id },
        data: {
          processingStage: 'QUEUED',
          processingProgress: 5,
        }
      });
 
    } catch (qstashError) {
        // Error publishing job to QStash
        Sentry.captureException(qstashError);
        await db.deck.update({
          where: { id: deck.id },
          data: {
            isProcessing: false,
            processingStage: 'ERROR',
            error: 'Failed to queue generation job',
          },
        });
        return new Response('Failed to start generation process', { status: 500 });
    }
    // --- End QStash Integration ---
 
    // Return response immediately with deck ID
    // Returning immediate response for deck ${deck.id}
    return Response.json({
      deckId: deck.id,
      status: 'processing_started' // Indicate that processing has started in the background
    });
  } catch (error) {
    // Error generating study materials
    Sentry.captureException(error);
    return new Response('Error processing file', { status: 500 });
  }
}
