import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Extract the ID from the URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const id = pathParts[pathParts.length - 1]

    if (!id) {
      return new NextResponse("Missing deck ID", { status: 400 })
    }

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