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
import { PDFDocument, PDFPage } from 'pdf-lib';

const PAGES_PER_CHUNK = 5;

// Helper function to remove file extension
function removeFileExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

async function splitPdfIntoChunks(fileBuffer: Buffer, pageRange?: { start: number; end: number }): Promise<Buffer[]> {
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  // Determine page range
  const startPage = pageRange?.start ?? 0;
  const endPage = Math.min(pageRange?.end ?? totalPages, totalPages);
  const chunks: Buffer[] = [];

  // Process pages in chunks
  for (let i = startPage; i < endPage; i += PAGES_PER_CHUNK) {
    const chunkDoc = await PDFDocument.create();
    const chunkEnd = Math.min(i + PAGES_PER_CHUNK, endPage);
    
    // Copy pages for this chunk
    const pageIndices = Array.from({ length: chunkEnd - i }, (_, idx) => i + idx);
    const pages = await chunkDoc.copyPages(pdfDoc, pageIndices);
    pages.forEach((page: PDFPage) => chunkDoc.addPage(page));
    
    const chunkBytes = await chunkDoc.save();
    chunks.push(Buffer.from(chunkBytes));
  }

  return chunks;
}

async function processChunk(
  chunk: Buffer, 
  chunkIndex: number, 
  totalChunks: number,
  difficultyPrompt: string,
  aiModel: string
) {
  const chunkPrompt = `Process part ${chunkIndex + 1} of ${totalChunks} of the document. Focus on generating flashcards only.\n\n${difficultyPrompt}`;
  
  try {
    const result = await generateObject({
      model: aiModel === 'advanced' ? openai4oResponsesProvider : openai4oMiniResponsesProvider,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: chunkPrompt
            },
            {
              type: 'file',
              data: chunk,
              mimeType: 'application/pdf'
            }
          ]
        }
      ],
      schema: z.object({
        flashcards: z.array(z.object({ front: z.string(), back: z.string() })),
        category: z.string()
      }),
      maxTokens: 4000,
      temperature: 0.7
    });

    console.log(`Successfully processed chunk ${chunkIndex + 1}/${totalChunks} with ${result.object.flashcards.length} flashcards`);
    return result.object;
  } catch (error) {
    console.error(`Error processing chunk ${chunkIndex + 1}/${totalChunks}:`, error);
    return {
      flashcards: [],
      category: 'unknown'
    };
  }
}

async function generateMindMap(fileBuffer: Buffer, aiModel: string) {
  try {
    const result = await generateObject({
      model: aiModel === 'advanced' ? openai4oResponsesProvider : openai4oMiniResponsesProvider,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Generate a comprehensive mind map for the entire document. Focus on key concepts and their relationships.'
            },
            {
              type: 'file',
              data: fileBuffer,
              mimeType: 'application/pdf'
            }
          ]
        }
      ],
      schema: z.object({
        mindMap: z.object({ 
          nodes: z.array(z.object({ id: z.string(), label: z.string() })), 
          connections: z.array(z.object({ source: z.string(), target: z.string(), label: z.string() })) 
        })
      }),
      maxTokens: 4000,
      temperature: 0.5 // Lower temperature for more consistent mind map
    });

    console.log('Successfully generated mind map');
    return result.object.mindMap;
  } catch (error) {
    console.error('Error generating mind map:', error);
    return { nodes: [], connections: [] };
  }
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
        - Generate 6-10 flashcards per chunk focusing on foundational concepts
        - Each card should cover a single, essential concept
        - Front: Simple, direct questions or key terms
        - Back: Clear, concise explanations with basic examples
        - Focus on: Core terminology, main ideas, basic principles` 
        
        : difficulty === 'moderate' ? `MODERATE DIFFICULTY:
        - Generate 10-20 flashcards per chunk with balanced depth
        - Mix of basic and intermediate concepts
        - Front: Combination of terms, concepts, and application questions
        - Back: Detailed explanations with examples and relationships
        - Focus on: Key concepts, supporting details, relationships between ideas`
        
        : `HIGH DIFFICULTY:
        - Generate 20-40 flashcards per chunk for comprehensive coverage
        - Include basic, intermediate, and advanced concepts
        - Front: Complex scenarios, analytical questions, and interconnected concepts
        - Back: In-depth explanations with examples, edge cases, and connections
        - Focus on: Deep understanding, nuanced details, practical applications, and theoretical foundations`}

        IMPORTANT GUIDELINES:
        1. Focus on the content in this section of the document
        2. Each flashcard must be self-contained and valuable on its own
        3. Ensure progressive difficulty within the selected level
        4. Include practical examples and real-world applications where relevant
        5. Break down complex topics into digestible chunks
        
        ${pageRangePrompt}`;

        // Split PDF into chunks
        const chunks = await splitPdfIntoChunks(fileBuffer, pageRange);
        console.log(`Split PDF into ${chunks.length} chunks`);
        
        // Process chunks for flashcards
        const chunkResults = [];
        const batchSize = 3;
        let successfulChunks = 0;
        
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const batchPromises = batch.map((chunk, idx) => {
            const currentChunkIndex = i + idx;
            return processChunk(chunk, currentChunkIndex, chunks.length, difficultyPrompt, aiModel);
          });
          
          const results = await Promise.all(batchPromises);
          const validResults = results.filter(r => r.flashcards.length > 0);
          chunkResults.push(...validResults);
          successfulChunks += validResults.length;
          
          if (i + batchSize < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          await db.deck.update({
            where: { id: deck.id },
            data: {
              isProcessing: true,
              error: `Processed ${successfulChunks}/${chunks.length} chunks (${chunkResults.flatMap(r => r.flashcards).length} flashcards so far)` 
            }
          });
        }

        if (chunkResults.length === 0) {
          throw new Error('Failed to generate any flashcards from the document');
        }

        console.log(`Successfully processed ${successfulChunks}/${chunks.length} chunks`);
        console.log(`Generated ${chunkResults.flatMap(r => r.flashcards).length} total flashcards`);

        // Generate mind map once for the entire document
        const mindMap = await generateMindMap(fileBuffer, aiModel);

        // Combine results
        const allFlashcards = chunkResults.flatMap(result => result.flashcards);

        // Use the most common category
        const category = chunkResults
          .map(r => r.category)
          .reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        const finalCategory = Object.entries(category)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];

        // Add coordinates to mind map nodes
        const centerX = 500;
        const centerY = 300;
        const radius = 200;
        const nodes = mindMap.nodes.map((node: { id: string; label: string }, index: number) => {
          const angle = (2 * Math.PI * index) / mindMap.nodes.length;
          return {
            ...node,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        });

        // Create flashcard content for each flashcard
        const flashcardPromises = allFlashcards.map(async (card: { front: string; back: string }, index: number) => {
          // Create the study content with its flashcard content
          const studyContent = await db.studyContent.create({
            data: {
              type: 'flashcard',
              studyMaterialId: studyMaterial.id,
              flashcardContent: {
                create: {
                  front: card.front,
                  back: card.back
                }
              },
              deckContent: {
                create: {
                  deck: {
                    connect: {
                      id: deck.id
                    }
                  },
                  order: index
                }
              }
            },
            include: {
              flashcardContent: true
            }
          });
          return studyContent;
        });

        // Wait for all flashcards to be created
        await Promise.all(flashcardPromises);

        // Update the deck with the mind map and category
        await db.deck.update({
          where: { id: deck.id },
          data: {
            mindMap: {
              nodes,
              connections: mindMap.connections,
            },
            category: finalCategory,
            isProcessing: false,
            error: null, // Clear the error field since processing completed successfully
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
