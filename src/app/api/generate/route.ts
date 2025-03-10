import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import pdfParse from "pdf-parse/lib/pdf-parse.js"
import { db } from "@/lib/db"
import { currentUser } from "@clerk/nextjs/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    const userId = user?.id
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No valid file provided" },
        { status: 400 }
      )
    }

    // Parse file content based on type
    let text = ""
    try {
      const arrayBuffer = await new Response(file).arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      if (file.type === "application/pdf") {
        const pdfData = await pdfParse(Buffer.from(uint8Array))
        text = pdfData.text
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // For now, just try to read as text
        text = await file.text()
      } else {
        // Plain text files
        text = await file.text()
      }

      if (!text.trim()) {
        return NextResponse.json(
          { error: "No text content found in file" },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error("Error parsing file:", error)
      return NextResponse.json(
        { error: "Failed to parse file content" },
        { status: 400 }
      )
    }

    // Generate study materials using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI tutor that creates study materials from text content. Generate:
1. A list of flashcards with clear questions/prompts on the front and concise answers/explanations on the back
2. A mind map showing key concepts and their relationships

Format the response as a JSON object with:
{
  "flashcards": [
    { "front": "Question/Prompt", "back": "Answer/Explanation" }
  ],
  "mindMap": {
    "nodes": [
      { "id": "unique_id", "label": "Concept Name", "x": number, "y": number }
    ],
    "connections": [
      { "source": "node_id", "target": "node_id", "label": "relationship" }
    ]
  }
}

For the mind map:
- Place the main concept at (400, 250)
- Space out related concepts around it in a circular pattern
- Keep node positions between (100,100) and (700,400)
- Use meaningful labels for connections
- Keep it clear and readable with max 8-10 nodes`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    })

    if (!completion.choices[0].message.content) {
      throw new Error("No content in response")
    }

    const result = JSON.parse(completion.choices[0].message.content)

    // Save study deck if user is authenticated
    if (userId) {
      const studyDeck = await db.studyDeck.create({
        data: {
          userId,
          title: file instanceof File ? file.name : 'Untitled Study Deck',
          flashcards: result.flashcards,
          mindMap: result.mindMap,
        },
      })
      
      return NextResponse.json({
        ...result,
        deckId: studyDeck.id,
        createdAt: studyDeck.createdAt,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    )
  }
} 