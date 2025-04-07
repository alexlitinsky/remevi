import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseekProvider } from "@/lib/ai/providers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get deck with flashcards
    const deck = await db.deck.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        deckContent: {
          include: {
            studyContent: {
              include: {
                flashcardContent: true,
              },
            },
          },
        },
      },
    });

    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 });
    }

    // Get all flashcards
    const flashcards = deck.deckContent
      .filter(content => content.studyContent.flashcardContent)
      .map(content => ({
        front: content.studyContent.flashcardContent!.front,
        back: content.studyContent.flashcardContent!.back,
      }));

    if (flashcards.length === 0) {
      return new NextResponse("No flashcards found to generate questions from", { status: 404 });
    }

    // Generate questions from flashcards
    const result = await generateObject({
      model: deepseekProvider,
      messages: [
        {
          role: "user",
          content: `Generate MCQ and FRQ questions from these flashcards:
${flashcards.map(f => `Front: ${f.front}\nBack: ${f.back}`).join("\n\n")}

Create questions that test understanding of the concepts. For MCQs, create plausible but incorrect options.
For FRQs, provide multiple acceptable answers and clear evaluation criteria.`
        }
      ],
      schema: z.object({
        mcqs: z.array(z.object({
          question: z.string(),
          options: z.array(z.string()),
          correctOptionIndex: z.number(),
          explanation: z.string(),
          topic: z.string(),
          difficulty: z.enum(["easy", "medium", "hard"])
        })),
        frqs: z.array(z.object({
          question: z.string(),
          answers: z.array(z.string()),
          caseSensitive: z.boolean(),
          explanation: z.string(),
          topic: z.string(),
          difficulty: z.enum(["easy", "medium", "hard"])
        }))
      }),
      maxTokens: 4000,
      temperature: 0.7
    });

    // Create study content for each question
    const mcqPromises = result.object.mcqs.map(async mcq => {
      const studyContent = await db.studyContent.create({
        data: {
          studyMaterialId: deck.deckContent[0].studyContent.studyMaterialId,
          type: "mcq",
          difficultyLevel: mcq.difficulty,
          mcqContent: {
            create: {
              question: mcq.question,
              options: mcq.options,
              correctOptionIndex: mcq.correctOptionIndex,
              explanation: mcq.explanation
            }
          }
        }
      });

      await db.deckContent.create({
        data: {
          deckId: deck.id,
          studyContentId: studyContent.id,
          order: deck.deckContent.length + mcqPromises.length
        }
      });

      return studyContent;
    });

    const frqPromises = result.object.frqs.map(async frq => {
      const studyContent = await db.studyContent.create({
        data: {
          studyMaterialId: deck.deckContent[0].studyContent.studyMaterialId,
          type: "frq",
          difficultyLevel: frq.difficulty,
          frqContent: {
            create: {
              question: frq.question,
              answers: frq.answers,
              caseSensitive: frq.caseSensitive,
              explanation: frq.explanation
            }
          }
        }
      });

      await db.deckContent.create({
        data: {
          deckId: deck.id,
          studyContentId: studyContent.id,
          order: deck.deckContent.length + mcqPromises.length + frqPromises.length
        }
      });

      return studyContent;
    });

    await Promise.all([...mcqPromises, ...frqPromises]);

    return NextResponse.json({
      mcqCount: result.object.mcqs.length,
      frqCount: result.object.frqs.length
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 