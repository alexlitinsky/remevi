'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PauseIcon, PlayIcon, TimerIcon, Settings } from "lucide-react";
import { formatTime } from "@/lib/utils";

export function QuizHeader() {
  const {
    questions,
    progress: { currentQuestionIndex, totalQuestions },
    timing: { startTime, totalPausedTime },
    ui: { isPaused },
    actions: { togglePause, toggleConfig }
  } = useQuizStore();

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!startTime || isPaused) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime - (totalPausedTime || 0);
      setElapsedTime(elapsed);
    }, 1000);

    return () => {
      clearInterval(interval);
      setElapsedTime(0);
    };
  }, [startTime, totalPausedTime, isPaused]);

  const progressPercentage = (currentQuestionIndex / totalQuestions) * 100;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TimerIcon className="h-4 w-4" />
            {formatTime(elapsedTime)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleConfig}
            className="relative"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePause}
            className="relative"
          >
            <motion.div
              initial={false}
              animate={{ scale: isPaused ? 1 : 0, opacity: isPaused ? 1 : 0 }}
              className="absolute"
            >
              <PlayIcon className="h-4 w-4" />
            </motion.div>
            <motion.div
              initial={false}
              animate={{ scale: isPaused ? 0 : 1, opacity: isPaused ? 0 : 1 }}
              className="absolute"
            >
              <PauseIcon className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      {isPaused && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-muted p-4 rounded-lg text-center"
        >
          <p className="text-sm font-medium">Quiz Paused</p>
          <p className="text-xs text-muted-foreground">Press ESC or click the button to resume</p>
        </motion.div>
      )}
    </div>
  );
} 