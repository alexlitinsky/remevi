import { PDFDocument, PDFPage } from 'pdf-lib';
import { generateObject } from 'ai';
import { openai4oResponsesProvider, openai4oMiniResponsesProvider } from '@/lib/ai/providers';
import { z } from 'zod';
import { AiModel } from '@/types/ai';
import { Difficulty } from '@/types/difficulty';
import { FREEMIUM_LIMITS } from '@/lib/constants';
import * as Sentry from '@sentry/nextjs';

const PAGES_PER_CHUNK = 5;

/**
 * Helper function to remove file extension from a filename
 */
export function removeFileExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Splits a PDF buffer into chunks of pages for processing
 */
export async function splitPdfIntoChunks(fileBuffer: Buffer, pageRange?: { start: number; end: number }): Promise<Buffer[]> {
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  // Determine page range
  const startPage = pageRange?.start ?? 0;
  const endPage = Math.min(pageRange?.end ?? totalPages, totalPages);
  const chunks: Buffer[] = [];


  // Process pages in chunks
  for (let i = startPage; i < endPage; i += PAGES_PER_CHUNK) {
    try {
      const chunkDoc = await PDFDocument.create();
      const chunkEnd = Math.min(i + PAGES_PER_CHUNK, endPage);
      
      const pageIndices = Array.from({ length: chunkEnd - i }, (_, idx) => i + idx);
      
      const pages = await chunkDoc.copyPages(pdfDoc, pageIndices);
      pages.forEach((page: PDFPage) => chunkDoc.addPage(page));
      
      const chunkBytes = await chunkDoc.save();
      chunks.push(Buffer.from(chunkBytes));
      
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`PDF processing failed at page ${i + 1}`);
    }
  }

  return chunks;
}

/**
 * Process a single PDF chunk with AI to generate study materials
 */
export async function processChunk(
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
    Sentry.captureException(error);
    return {
      summary: '',
      flashcards: [],
      mcqs: [],
      frqs: [],
      category: 'unknown'
    };
  }
}

/**
 * Interface for the result of processing a chunk
 */
export interface ChunkResult {
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
  category?: string;
}

/**
 * Generate a mind map from the processed chunks
 */
export async function generateMindMap(chunkResults: ChunkResult[], aiModel: string) {
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
    Sentry.captureException(error);
    return { nodes: [], connections: [] };
  }
}

/**
 * Validate user's freemium limits for deck generation
 */
export async function validateFreemiumLimits({
  fileMetadata,
  pageRange,
  aiModel,
  difficulty,
  limits
}: {
  fileMetadata: { size: number },
  pageRange?: { start: number, end: number },
  aiModel: AiModel,
  difficulty: Difficulty,
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

  return { error: null };
}

/**
 * Build the difficulty prompt based on the selected difficulty level
 */
export function buildDifficultyPrompt(difficulty: Difficulty, pageRange?: { start: number; end: number }, fileType?: string): string {
  const pageRangePrompt = pageRange && fileType?.includes('pdf')
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

  return difficultyPrompt;
}

/**
 * Determine difficulty level based on user selection
 */
export function getDifficultyFromUserSelection(difficulty: Difficulty): 'easy' | 'medium' | 'hard' {
  switch (difficulty) {
    case 'low': return 'easy';
    case 'moderate': return 'medium';
    case 'high': return 'hard';
    default: return 'medium';
  }
}