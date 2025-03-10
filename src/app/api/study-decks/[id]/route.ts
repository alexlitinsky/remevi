import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await context.params
    const studyDeck = await db.studyDeck.findUnique({
      where: {
        id,
        userId: user.id
      }
    })

    if (!studyDeck) {
      return new NextResponse("Study deck not found", { status: 404 })
    }

    return NextResponse.json(studyDeck)
  } catch (error) {
    console.error("Error fetching study deck:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 