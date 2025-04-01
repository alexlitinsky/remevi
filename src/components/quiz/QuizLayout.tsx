'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { QuizHeader } from "./QuizHeader";
import { QuizContent } from "./QuizContent";
import { QuizControls } from "./QuizControls";
import { QuizResults } from "./QuizResults";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ToastOptions } from "@/components/ui/toast";

interface QuizLayoutProps {
  className?: string;
}

export function QuizLayout({ className }: QuizLayoutProps) {
  const { 
    activeSession,
    ui: { view, error, isLoading },
    questions,
    endQuiz,
    recoverSession,
    achievements,
  } = useQuizStore();

  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeSession?.id) {
        endQuiz();
      }
    };
  }, [activeSession?.id, endQuiz]);

  useEffect(() => {
    // Show achievement notifications
    achievements.forEach((achievement) => {
      if (!achievement.shown) {
        const toastOptions: ToastOptions = {
          title: "Achievement Unlocked!",
          description: achievement.description,
          icon: <Trophy className="h-4 w-4" />,
        };
        toast(toastOptions);
        achievement.shown = true;
      }
    });
  }, [achievements, toast]);

  if (error || activeSession.status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container max-w-2xl mx-auto py-8"
      >
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "There was an error with your quiz session"}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => recoverSession()}
          className="w-full"
        >
          Recover Session
        </Button>
      </motion.div>
    );
  }

  return (
    <div className={cn("flex flex-col min-h-[600px] w-full max-w-4xl mx-auto", className)}>
      <QuizHeader />
      
      <main className="flex-1 p-6">
        <AnimatePresence mode="wait">
          {view === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <QuizContent />
              <QuizControls />
            </motion.div>
          )}
          
          {view === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QuizResults />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
} 