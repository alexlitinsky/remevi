'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  HelpCircleIcon,
  InfoIcon
} from "lucide-react";

export function QuizControls() {
  const {
    progress: { currentQuestionIndex, totalQuestions },
    ui: { showHint, showExplanation, isPaused },
    toggleHint,
    toggleExplanation,
    actions: { togglePause },
    skipQuestion,
    previousQuestion,
    nextQuestion,
  } = useQuizStore();

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={previousQuestion}
          disabled={isFirstQuestion}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={nextQuestion}
          disabled={isLastQuestion}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleHint}
          className={showHint ? "text-primary" : ""}
        >
          <HelpCircleIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleExplanation}
          className={showExplanation ? "text-primary" : ""}
        >
          <InfoIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePause}
        >
          {isPaused ? (
            <PlayIcon className="h-4 w-4" />
          ) : (
            <PauseIcon className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          onClick={skipQuestion}
        >
          Skip
        </Button>
      </div>
    </div>
  );
} 