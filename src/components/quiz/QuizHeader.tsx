'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Settings, TimerIcon } from "lucide-react";
import { formatTime } from "@/lib/utils";

export function QuizHeader() {
  const {
    questions,
    currentQuestionIndex,
    startTime,
    status,
    progress,
    isLoading,
  } = useQuizStore();

  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't start timer if no start time or quiz is not active
    if (!startTime || status !== 'active') {
      return;
    }

    // Calculate initial elapsed time
    const initialElapsed = Date.now() - startTime;
    setElapsedTime(initialElapsed);

    // Start interval for updating elapsed time
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedTime(elapsed);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, status]);

  const progressPercentage = (progress.answeredQuestions / progress.totalQuestions) * 100;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TimerIcon className="h-4 w-4" />
            {formatTime(Math.max(0, elapsedTime))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            disabled={isLoading || status !== 'active'}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      {status !== 'active' && status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-muted p-4 rounded-lg text-center"
        >
          <p className="text-sm font-medium">Quiz {status === 'completed' ? 'Completed' : 'Not Started'}</p>
          <p className="text-xs text-muted-foreground">
            {status === 'completed' ? 'View your results below' : 'Start the quiz to begin'}
          </p>
        </motion.div>
      )}
    </div>
  );
} 