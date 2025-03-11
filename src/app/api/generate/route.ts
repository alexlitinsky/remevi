import { NextRequest } from 'next/server';
import { join } from 'path';
import { readFile, unlink } from 'fs/promises';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const TEMP_DIR = join(process.cwd(), 'tmp', 'uploads');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    let fileBuffer: Buffer;
    let metadata: { originalName: string; type: string; size: number };

    // Handle both direct uploads and temp file processing
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return new Response('No file provided', { status: 400 });
      }
      fileBuffer = Buffer.from(await file.arrayBuffer());
      metadata = {
        originalName: file.name,
        type: file.type,
        size: file.size,
      };
    } else {
      // Handle uploaded file from temp storage
      const { uploadId } = await request.json();
      if (!uploadId) {
        return new Response('No upload ID provided', { status: 400 });
      }

      const filePath = join(TEMP_DIR, uploadId);
      try {
        fileBuffer = await readFile(filePath);
        metadata = JSON.parse(await readFile(`${filePath}.json`, 'utf-8'));
        
        // Clean up temp files
        await Promise.all([
          unlink(filePath),
          unlink(`${filePath}.json`),
        ]).catch(console.error); // Don't fail if cleanup fails
      } catch (error) {
        return new Response('Upload not found or expired', { status: 404 });
      }
    }

    // Parse file content based on type
    let text = '';
    try {
      if (metadata.type === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        text = pdfData.text;
      } else if (metadata.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For now, just try to read as text
        text = fileBuffer.toString();
      } else {
        // Plain text files
        text = fileBuffer.toString();
      }

      if (!text.trim()) {
        return new Response('No text content found in file', { status: 400 });
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      return new Response('Failed to parse file content', { status: 400 });
    }

    // Create initial study deck
    const studyDeck = await db.studyDeck.create({
      data: {
        title: metadata.originalName,
        userId: user.id,
        isProcessing: true,
        flashcards: [],
        mindMap: { nodes: [], connections: [] },
      },
    });

    // Process in background
    (async () => {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI that creates study materials. Generate flashcards and a mind map from the provided text. Return a JSON object with flashcards array and mindMap object.',
            },
            {
              role: 'user',
              content: `Create study materials from this text: ${text.slice(0, 8000)}... 
              Return a JSON object with this exact structure:
              {
                "flashcards": [
                  { "front": "question", "back": "answer" }
                ],
                "mindMap": {
                  "nodes": [
                    { "id": "string", "label": "string" }
                  ],
                  "connections": [
                    { "source": "string", "target": "string", "label": "string" }
                  ]
                }
              }`,
            },
          ],
          response_format: { type: "json_object" },
        });

        if (!completion.choices[0].message.content) {
          throw new Error('No content in OpenAI response');
        }

        const content = completion.choices[0].message.content;
        const result = JSON.parse(content.replace(/^```json\n|\n```$/g, ''));

        // Add coordinates to mind map nodes
        const centerX = 500;
        const centerY = 300;
        const radius = 200;
        const nodes = result.mindMap.nodes.map((node: { id: string; label: string }, index: number) => {
          const angle = (2 * Math.PI * index) / result.mindMap.nodes.length;
          return {
            ...node,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        });

        // Update study deck with results
        await db.studyDeck.update({
          where: { id: studyDeck.id },
          data: {
            flashcards: result.flashcards,
            mindMap: {
              nodes,
              connections: result.mindMap.connections,
            },
            isProcessing: false,
          },
        });
      } catch (error) {
        console.error('Error processing study materials:', error);
        await db.studyDeck.update({
          where: { id: studyDeck.id },
          data: {
            error: 'Failed to generate study materials',
            isProcessing: false,
          },
        });
      }
    })();

    return Response.json({
      deckId: studyDeck.id,
    });
  } catch (error) {
    console.error('Error generating study materials:', error);
    return new Response('Error processing file', { status: 500 });
  }
} 