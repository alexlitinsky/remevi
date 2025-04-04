import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

 
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    const { id } = await params;
    if (!user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const deck = await db.deck.findUnique({
      where: {
        id: id,
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        isProcessing: true,
        processingProgress: true,
        processingStage: true,
        processedChunks: true,
        totalChunks: true,
        error: true,
        mindMap: true,
      },
    });

    if (!deck) {
      return new Response('Deck not found', { status: 404 });
    }

    return Response.json(deck);
  } catch (error) {
    console.error('Error fetching deck:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}