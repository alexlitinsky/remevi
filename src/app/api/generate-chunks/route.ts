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
import { rateLimit } from '@/lib/rate-limit';
import { checkAndUpdateUploadLimit } from '@/lib/upload-limits';

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
  const chunkPrompt = `Process part ${chunkIndex + 1} of ${totalChunks} of the document.\n\n${difficultyPrompt}`;
  
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
        summary: z.string().describe('A concise summary of this chunk\'s main concepts and their relationships'),
        flashcards: z.array(z.object({ 
          front: z.string(), 
          back: z.string(),
          topic: z.string().describe('The main topic/concept this flashcard covers')
        })),
        mcqs: z.array(z.object({
          question: z.string(),
          options: z.array(z.string()),
          correctOptionIndex: z.number(),
          explanation: z.string(),
          topic: z.string().describe('The main topic/concept this question tests'),
          difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of this question')
        })),
        frqs: z.array(z.object({
          question: z.string(),
          answers: z.array(z.string()),
          caseSensitive: z.boolean(),
          explanation: z.string(),
          topic: z.string().describe('The main topic/concept this question tests'),
          difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of this question')
        })),
        category: z.string()
      }),
      maxTokens: 4000,
      temperature: 0.7
    });

    return result.object;
  } catch (error) {
    console.error(`Error processing chunk ${chunkIndex + 1}/${totalChunks}:`, error);
    return {
      summary: '',
      flashcards: [],
      mcqs: [],
      frqs: [],
      category: 'unknown'
    };
  }
}

interface ChunkResult {
  summary: string;
  flashcards: Array<{
    front: string;
    back: string;
    topic: string;
  }>;
  mcqs: Array<{
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  frqs: Array<{
    question: string;
    answers: string[];
    caseSensitive: boolean;
    explanation: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

async function generateMindMap(chunkResults: ChunkResult[], aiModel: string) {
  try {
    // Combine summaries and extract topics
    const summaries = chunkResults.map(r => r.summary).join('\n\n');
    const topics = new Set([
      ...chunkResults.flatMap(r => r.flashcards.map(f => f.topic)),
      ...chunkResults.flatMap(r => r.mcqs.map(q => q.topic)),
      ...chunkResults.flatMap(r => r.frqs.map(q => q.topic))
    ]);

    const result = await generateObject({
      model: aiModel === 'advanced' ? openai4oResponsesProvider : openai4oMiniResponsesProvider,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Generate a comprehensive mind map based on these chunk summaries and key topics:\n\nSummaries:\n${summaries}\n\nKey Topics:\n${Array.from(topics).join('\n')}\n\nCreate a mind map that shows the relationships between these concepts.`
            }
          ]
        }
      ],
      schema: z.object({
        mindMap: z.object({ 
          nodes: z.array(z.object({ 
            id: z.string(), 
            label: z.string(),
            type: z.enum(['main', 'subtopic', 'detail']).describe('The hierarchical level of this node')
          })), 
          connections: z.array(z.object({ 
            source: z.string(), 
            target: z.string(), 
            label: z.string(),
            type: z.enum(['hierarchical', 'related', 'dependency']).describe('The type of relationship between nodes')
          })) 
        })
      }),
      maxTokens: 4000,
      temperature: 0.5
    });

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

    // Rate limiting
    const rateLimitResult = await rateLimit(user.id);
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }

    // Check upload limits before proceeding
    try {
      await checkAndUpdateUploadLimit();
    } catch (error) {
      return new Response(error instanceof Error ? error.message : 'Upload limit exceeded', { 
        status: 400 
      });
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
        processingProgress: 0,
        processingStage: 'CHUNKING',
        processedChunks: 0,
        totalChunks: 0
      },
    });

    // Process in background
    (async () => {
      try {
        // Build the prompt based on parameters
        const pageRangePrompt = pageRange && metadata.type.includes('pdf')
          ? `Focus only on pages ${pageRange.start} to ${pageRange.end} of the PDF.`
          : '';
        
        const difficultyPrompt = `You are an expert study material creator. Generate a comprehensive set of study materials based on the following difficulty level:

        ${difficulty === 'low' ? `LOW DIFFICULTY:
        - Generate per chunk:
          * 15-25 flashcards focusing on foundational concepts
          * 5-8 multiple choice questions
          * 3-5 free response questions
        - Each item should cover a single, essential concept
        - Focus on: Core terminology, main ideas, basic principles
        - MCQs: Clear questions with straightforward distractors
        - FRQs: Direct questions with specific, measurable answers` 
        
        : difficulty === 'moderate' ? `MODERATE DIFFICULTY:
        - Generate per chunk:
          * 25-35 flashcards with balanced depth
          * 8-12 multiple choice questions
          * 5-8 free response questions
        - Mix of basic and intermediate concepts
        - Focus on: Key concepts, supporting details, relationships between ideas
        - MCQs: Include application and analysis questions
        - FRQs: Questions requiring explanation and examples`
        
        : `HIGH DIFFICULTY:
        - Generate per chunk:
          * 35-45 flashcards for comprehensive coverage
          * 12-15 multiple choice questions
          * 8-12 free response questions
        - Include basic, intermediate, and advanced concepts
        - Focus on: Deep understanding, nuanced details, practical applications
        - MCQs: Complex scenarios with nuanced answer choices
        - FRQs: Questions requiring synthesis and evaluation`}

        IMPORTANT GUIDELINES:
        1. Focus on the content in this section of the document
        2. Each item must be self-contained and valuable on its own
        3. Ensure progressive difficulty within the selected level
        4. Include practical examples and real-world applications where relevant
        5. Break down complex topics into digestible chunks
        6. For MCQs:
           - All options should be plausible
           - Avoid obvious incorrect answers
           - Include clear explanations for correct answers
        7. For FRQs:
           - Provide multiple acceptable answers where appropriate
           - Include clear evaluation criteria in explanations
           - Make answers objectively assessable
        
        ${pageRangePrompt}`;

        // Split PDF into chunks
        const chunks = await splitPdfIntoChunks(fileBuffer, pageRange);
        
        // Update total chunks count
        await db.deck.update({
          where: { id: deck.id },
          data: {
            totalChunks: chunks.length,
            processingProgress: 10,
            processingStage: 'GENERATING'
          }
        });
        
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

          // Calculate progress (70% for chunk processing)
          const progress = 10 + ((successfulChunks / chunks.length) * 70);

          await db.deck.update({
            where: { id: deck.id },
            data: {
              isProcessing: true,
              processedChunks: successfulChunks,
              processingProgress: progress,
              error: `Processed ${successfulChunks}/${chunks.length} chunks (${chunkResults.flatMap(r => r.flashcards).length} flashcards, ${chunkResults.flatMap(r => r.mcqs).length} MCQs, ${chunkResults.flatMap(r => r.frqs).length} FRQs so far)` 
            }
          });
        }

        if (chunkResults.length === 0) {
          throw new Error('Failed to generate any flashcards from the document');
        }

        // Combine results
        const allFlashcards = chunkResults.flatMap(result => result.flashcards);
        const allMCQs = chunkResults.flatMap(result => result.mcqs);
        const allFRQs = chunkResults.flatMap(result => result.frqs);

        // Function to determine difficulty level based on chunk prompts
        // Defaults to the global difficulty setting from the request
        const getDifficultyFromUserSelection = () => {
          switch (difficulty) {
            case 'low': return 'easy';
            case 'moderate': return 'medium';
            case 'high': return 'hard';
            default: return 'medium';
          }
        };

        // Use the most common category
        const category = chunkResults
          .map(r => r.category)
          .reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

        const finalCategory = Object.entries(category)
          .sort((a, b) => b[1] - a[1])
          .map(([cat]) => cat)[0];

        // Create content for each type in parallel
        const [, , ] = await Promise.all([
          // Create flashcard content
          Promise.all(allFlashcards.map(async (card, index) => {
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

            await db.deckContent.create({
              data: {
                deckId: deck.id,
                studyContentId: studyContent.id,
                order: index
              }
            });

            return studyContent;
          })),

          // Create MCQ content
          Promise.all(allMCQs.map(async (mcq, index) => {
            const studyContent = await db.studyContent.create({
              data: {
                studyMaterialId: studyMaterial.id,
                type: 'mcq',
                difficultyLevel: mcq.difficulty || getDifficultyFromUserSelection(),
                mcqContent: {
                  create: {
                    question: mcq.question,
                    options: mcq.options,
                    correctOptionIndex: mcq.correctOptionIndex,
                    explanation: mcq.explanation
                  }
                }
              },
              include: {
                mcqContent: true
              }
            });

            await db.deckContent.create({
              data: {
                deckId: deck.id,
                studyContentId: studyContent.id,
                order: allFlashcards.length + index
              }
            });

            return studyContent;
          })),

          // Create FRQ content
          Promise.all(allFRQs.map(async (frq, index) => {
            const studyContent = await db.studyContent.create({
              data: {
                studyMaterialId: studyMaterial.id,
                type: 'frq',
                difficultyLevel: frq.difficulty || getDifficultyFromUserSelection(),
                frqContent: {
                  create: {
                    question: frq.question,
                    answers: frq.answers,
                    caseSensitive: frq.caseSensitive,
                    explanation: frq.explanation
                  }
                }
              },
              include: {
                frqContent: true
              }
            });

            await db.deckContent.create({
              data: {
                deckId: deck.id,
                studyContentId: studyContent.id,
                order: allFlashcards.length + allMCQs.length + index
              }
            });

            return studyContent;
          }))
        ]);

        // Update study material status
        await db.studyMaterial.update({
          where: { id: studyMaterial.id },
          data: {
            status: 'completed'
          }
        });

        // Update deck with category and stats
        await db.deck.update({
          where: { id: deck.id },
          data: {
            category: finalCategory,
            isProcessing: false,
            error: null,
            processingProgress: 80,
            processingStage: 'MINDMAP'
          }
        });

        // Generate mind map in the background
        (async () => {
          try {
            // Update progress to show mind map generation started
            await db.deck.update({
              where: { id: deck.id },
              data: {
                processingProgress: 85,
                processingStage: 'MINDMAP',
                error: 'Generating mind map...'
              }
            });
            
            const mindMap = await generateMindMap(chunkResults, aiModel);
            
            // Update deck with mind map once generated
            await db.deck.update({
              where: { id: deck.id },
              data: {
                mindMap: {
                  nodes: mindMap.nodes,
                  connections: mindMap.connections,
                },
                processingProgress: 100,
                processingStage: 'COMPLETED',
                error: null
              }
            });
          } catch (error) {
            console.error('Error generating mind map:', error);
            await db.deck.update({
              where: { id: deck.id },
              data: {
                processingProgress: 90,
                processingStage: 'ERROR',
                error: 'Failed to generate mind map'
              }
            });
          }
        })();

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
            processingProgress: 0,
            processingStage: 'ERROR'
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
