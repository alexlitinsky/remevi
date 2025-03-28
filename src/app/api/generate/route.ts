import { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { generateObject} from 'ai';
import { openai4oResponsesProvider, openai4oMiniResponsesProvider} from '@/lib/ai/providers';
import { z } from 'zod';
import { getFileFromStorage } from '@/lib/storage';
import { getUserSubscriptionStatus, isSubscribed } from '@/lib/stripe';
import { FREEMIUM_LIMITS } from '@/lib/constants';
import { AiModel } from '@/types/ai';
import { Difficulty } from '@/types/difficulty';
// Helper function to remove file extension
function removeFileExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

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

    let fileBuffer: Buffer;
    let metadata: { originalName: string; type: string; size: number };

    // Handle both direct uploads and Supabase storage
    // Handle uploaded file from Supabase storage
    const { uploadId, filePath, metadata: fileMetadata, pageRange, aiModel, difficulty } = await request.json();

    const subscription = await getUserSubscriptionStatus(user.id);
    const subscribed = isSubscribed(subscription);
    
    const limits = subscribed ? FREEMIUM_LIMITS.PRO : FREEMIUM_LIMITS.FREE;

    const { error } = await validateFreemiumLimits({
      userId: user.id,
      fileMetadata,
      pageRange,
      aiModel: aiModel as AiModel,
      difficulty: difficulty as Difficulty,
      subscribed,
      limits
    });

    if (error) {
      return new Response(error, { status: 400 });
    }

    if (!uploadId || !filePath) {
      return new Response('Invalid upload data provided', { status: 400 });
    }

    try {
      // Get file from Supabase storage
      const fileData = await getFileFromStorage(filePath);
      // Convert Blob to Buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      fileBuffer = Buffer.from(uint8Array);
      metadata = fileMetadata;
    } catch (error) {
      console.error('Error accessing file from storage:', error);
      return new Response('Upload not found or expired', { status: 404 });
    }

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
      },
    });

    // Process in background
    (async () => {
      try {
        // Build the prompt based on parameters
        const pageRangePrompt = pageRange && metadata.type.includes('pdf')
          ? `Focus only on pages ${pageRange.start} to ${pageRange.end} of the PDF.`
          : '';
        
        const difficultyPrompt = `You are an expert study material creator. Generate a comprehensive set of flashcards based on the following difficulty level:

        ${difficulty === 'low' ? `LOW DIFFICULTY:
        - Generate 30-50 flashcards focusing on foundational concepts
        - Each card should cover a single, essential concept
        - Front: Simple, direct questions or key terms
        - Back: Clear, concise explanations with basic examples
        - Focus on: Core terminology, main ideas, basic principles` 
        
        : difficulty === 'moderate' ? `MODERATE DIFFICULTY:
        - Generate 50-100 flashcards with balanced depth
        - Mix of basic and intermediate concepts
        - Front: Combination of terms, concepts, and application questions
        - Back: Detailed explanations with examples and relationships
        - Focus on: Key concepts, supporting details, relationships between ideas`
        
        : `HIGH DIFFICULTY:
        - Generate 100-200 flashcards for comprehensive coverage
        - Include basic, intermediate, and advanced concepts
        - Front: Complex scenarios, analytical questions, and interconnected concepts
        - Back: In-depth explanations with examples, edge cases, and connections
        - Focus on: Deep understanding, nuanced details, practical applications, and theoretical foundations`}

        IMPORTANT GUIDELINES:
        1. Prioritize quality and comprehensiveness over arbitrary limits
        2. Each flashcard must be self-contained and valuable on its own
        3. Ensure progressive difficulty within the selected level
        4. Include practical examples and real-world applications where relevant
        5. Break down complex topics into digestible chunks
        
        ${pageRangePrompt}`;

        const result = await generateObject({
          model: aiModel === 'advanced' ? openai4oResponsesProvider : openai4oMiniResponsesProvider,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: difficultyPrompt
                },
                {
                  type: 'file',
                  data: fileBuffer,
                  mimeType: metadata.type
                }
              ]
            }
          ],
          schema: z.object({
            flashcards: z.array(z.object({ front: z.string(), back: z.string() })),
            mindMap: z.object({ 
              nodes: z.array(z.object({ id: z.string(), label: z.string() })), 
              connections: z.array(z.object({ source: z.string(), target: z.string(), label: z.string() })) 
            }),
            category: z.string()
          }),
        });

        const object = result.object;

        // Add coordinates to mind map nodes
        const centerX = 500;
        const centerY = 300;
        const radius = 200;
        const nodes = object.mindMap.nodes.map((node: { id: string; label: string }, index: number) => {
          const angle = (2 * Math.PI * index) / object.mindMap.nodes.length;
          return {
            ...node,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        });

        // Create flashcard content for each flashcard
        const flashcardPromises = object.flashcards.map(async (card: { front: string; back: string }, index: number) => {
          // First create the study content
          const studyContent = await db.studyContent.create({
            data: {
              studyMaterialId: studyMaterial.id,
              type: 'flashcard',
              flashcardContent: {
                create: {
                  front: card.front,
                  back: card.back
                }
              }
            },
            include: {
              flashcardContent: true
            }
          });

          // Then add it to the deck
          await db.deckContent.create({
            data: {
              deckId: deck.id,
              studyContentId: studyContent.id,
              order: index
            }
          });

          return studyContent;
        });

        // Wait for all flashcards to be created
        await Promise.all(flashcardPromises);

        // Update study material status
        await db.studyMaterial.update({
          where: { id: studyMaterial.id },
          data: {
            status: 'completed'
          }
        });

        // Update deck with mind map, category and processing status
        await db.deck.update({
          where: { id: deck.id },
          data: {
            mindMap: {
              nodes,
              connections: object.mindMap.connections,
            },
            category: object.category,
            isProcessing: false,
          },
        });
      } catch (error) {
        console.error('Error processing study materials:', error);
        
        // Update study material status
        await db.studyMaterial.update({
          where: { id: studyMaterial.id },
          data: {
            status: 'error',
            processingError: 'Failed to generate study materials'
          }
        });
        
        // Update deck with error
        await db.deck.update({
          where: { id: deck.id },
          data: {
            error: 'Failed to generate study materials',
            isProcessing: false,
          },
        });
      }
    })();

    return Response.json({
      deckId: deck.id,
    });
  } catch (error) {
    console.error('Error generating study materials:', error);
    return new Response('Error processing file', { status: 500 });
  }
}

async function validateFreemiumLimits({
  userId,
  fileMetadata,
  pageRange,
  aiModel,
  difficulty,
  subscribed,
  limits
}: {
  userId: string,
  fileMetadata: { size: number },
  pageRange?: { start: number, end: number },
  aiModel: AiModel,
  difficulty: Difficulty,
  subscribed: boolean,
  limits: typeof FREEMIUM_LIMITS.FREE | typeof FREEMIUM_LIMITS.PRO
}) {
  // Validate file size
  if (fileMetadata.size > limits.maxFileSize) {
    return { error: 'File size exceeds your plan limit' };
  }

  // Validate page range
  if (pageRange && (pageRange.end - pageRange.start + 1) > limits.maxPages) {
    return { error: 'Page count exceeds your plan limit' };
  }

  // Validate AI model
  if (!limits.allowedAiModels.includes(aiModel)) {
    return { error: 'AI model not available in your plan' };
  }

  // Validate difficulty
  if (!limits.allowedDifficulties.includes(difficulty)) {
    return { error: 'Difficulty level not available in your plan' };
  }

  // Check deck count for free users
  if (!subscribed) {
    const deckCount = await db.deck.count({
      where: { userId }
    });
    
    if (deckCount >= limits.maxDecks) {
      return { error: 'You have reached the maximum number of decks for your plan' };
    }
  }

  return { error: null };
}
