'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  HelpCircleIcon,
  InfoIcon
} from "lucide-react";

export function QuizControls() {
  const {
    questions,
    currentQuestionIndex,
    status,
    isLoading,
    nextQuestion,
  } = useQuizStore();

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          disabled={isFirstQuestion || isLoading || status !== 'active'}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={nextQuestion}
          disabled={isLastQuestion || isLoading || status !== 'active'}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={isLoading || status !== 'active'}
        >
          <HelpCircleIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={isLoading || status !== 'active'}
        >
          <InfoIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 