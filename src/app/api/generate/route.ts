import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse file content based on type
    let text = '';
    try {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      if (file.type === 'application/pdf') {
        const pdfData = await pdfParse(Buffer.from(uint8Array));
        text = pdfData.text;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For now, just try to read as text
        text = await file.text();
      } else {
        // Plain text files
        text = await file.text();
      }

      if (!text.trim()) {
        return NextResponse.json(
          { error: 'No text content found in file' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      return NextResponse.json(
        { error: 'Failed to parse file content' },
        { status: 400 }
      );
    }

    // Generate flashcards using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating educational flashcards. Given some text content, create a set of flashcards that effectively test the key concepts. 
          Rules:
          1. Create concise, clear questions for the front
          2. Provide comprehensive but focused answers for the back
          3. Break down complex topics into multiple cards
          4. Include important definitions, concepts, and relationships
          5. Format response as a JSON object with a 'flashcards' array containing objects with 'front' and 'back' properties
          6. Generate at least 5 flashcards, but no more than 15
          7. Ensure questions are specific and unambiguous`
        },
        {
          role: "user",
          content: `Create flashcards from this content: ${text}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const flashcards = JSON.parse(completion.choices[0].message.content || '{"flashcards": []}').flashcards;

    // TODO: Save flashcards to database (requires user authentication)
    
    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Error processing file' },
      { status: 500 }
    );
  }
} 