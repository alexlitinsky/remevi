"use client";

import { useState } from "react"
import { FileUpload } from "@/components/ui/file-upload"
import { Flashcard } from "@/components/ui/flashcard"
import { Spinner } from "@/components/ui/spinner"
import { MindMap } from "@/components/ui/mind-map"

interface StudyDeck {
  flashcards: Array<{
    front: string
    back: string
  }>
  mindMap: {
    nodes: Array<{
      id: string
      label: string
      x: number
      y: number
    }>
    connections: Array<{
      source: string
      target: string
      label?: string
    }>
  }
}

export default function StudyPage() {
  const [studyData, setStudyData] = useState<StudyDeck | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to generate study materials")
      }

      const data = await response.json()
      setStudyData(data)
      setCurrentCardIndex(0)
      setShowBack(false)
    } catch (error) {
      console.error("Error:", error)
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false)
    }
  }

  const nextCard = () => {
    if (studyData && currentCardIndex < studyData.flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setShowBack(false)
    }
  }

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
      setShowBack(false)
    }
  }

  return (
    <main className="container mx-auto p-4 min-h-screen">
      <div className="flex flex-col items-center gap-8">
        <FileUpload
          onFileSelect={handleFileUpload}
          buttonText="Upload Notes"
          className="w-full max-w-md"
        />

        {isLoading && (
          <div className="flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {studyData && !isLoading && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Flashcards</h2>
              <Flashcard
                front={studyData.flashcards[currentCardIndex].front}
                back={studyData.flashcards[currentCardIndex].back}
                showBack={showBack}
                onFlip={() => setShowBack(!showBack)}
                onNext={
                  currentCardIndex < studyData.flashcards.length - 1
                    ? nextCard
                    : undefined
                }
                onPrev={currentCardIndex > 0 ? prevCard : undefined}
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Mind Map</h2>
              <div className="border rounded-lg p-4 min-h-[500px]">
                <MindMap
                  nodes={studyData.mindMap.nodes}
                  connections={studyData.mindMap.connections}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
} 