import React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface FlashcardProps {
  front: string
  back: string
  showBack: boolean
  onFlip: () => void
  onNext?: () => void
  onPrev?: () => void
  className?: string
}

export function Flashcard({
  front,
  back,
  showBack,
  onFlip,
  onNext,
  onPrev,
  className,
}: FlashcardProps) {
  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <Card
        className={cn(
          "min-h-[300px] cursor-pointer transition-all duration-500",
          showBack && "bg-secondary"
        )}
        onClick={onFlip}
      >
        <CardContent className="flex items-center justify-center p-8 text-center min-h-[300px]">
          <div className="text-lg">{showBack ? back : front}</div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-4">
        {onPrev && (
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {onNext && (
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="ml-auto"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
} 