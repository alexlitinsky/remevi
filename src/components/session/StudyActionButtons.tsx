import { Brain, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StudyActionButtonsProps {
  onShowSettings: () => void
  onToggleMindMap: () => void
}

export function StudyActionButtons({ onShowSettings, onToggleMindMap }: StudyActionButtonsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onShowSettings}
              className="rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
            >
              <Lightbulb className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Study Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleMindMap}
              className="rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
            >
              <Brain className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>View Mind Map</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
} 