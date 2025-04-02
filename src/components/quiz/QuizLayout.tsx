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
    restartQuiz,
    achievements,
  } = useQuizStore();

  const { toast } = useToast();

  // Handle session completion logic
  useEffect(() => {
    // Debug current state
    console.log('[QuizLayout] Checking view state:', {
      activeSessionStatus: activeSession.status,
      currentView: view,
      endTime: activeSession.endTime,
      questionsCount: questions.all.length,
      deckId: activeSession.deckId,
      shouldShowResults: 
        (activeSession.status === 'completed' && view !== 'results') ||
        (activeSession.endTime !== null && view !== 'results')
    });

    // More comprehensive check for when to show results
    if (
      // Status is completed and not already showing results
      (activeSession.status === 'completed' && view !== 'results') ||
      // Has end time and not showing results
      (activeSession.endTime !== null && view !== 'results') ||
      // All questions answered but not showing results
      (questions.all.length > 0 && 
       Object.keys(questions.answered).length === questions.all.length && 
       view !== 'results')
    ) {
      console.log('[QuizLayout] Quiz completed, forcing results view');
      
      // Get the deck ID from URL if not already set
      let deckId = activeSession.deckId;
      if (!deckId) {
        const pathParts = window.location.pathname.split('/');
        const deckIndex = pathParts.indexOf('deck');
        if (deckIndex !== -1 && deckIndex + 1 < pathParts.length) {
          deckId = pathParts[deckIndex + 1];
        }
      }
      
      // Force the view to results
      useQuizStore.setState(state => ({
        activeSession: {
          ...state.activeSession,
          status: 'completed', // Ensure status is completed
          endTime: state.activeSession.endTime || Date.now(), // Ensure end time exists
          deckId: deckId || state.activeSession.deckId // Ensure deck ID is set
        },
        ui: {
          ...state.ui,
          view: 'results',
          isLoading: false,
        }
      }));
    }
  }, [activeSession.status, activeSession.endTime, view, questions]);

  // Force cleanup on unmount if needed
  useEffect(() => {
    return () => {
      if (activeSession?.id && 
          (activeSession.status === 'active' || activeSession.status === 'paused')) {
        console.log('[QuizLayout] Component unmounting, ending quiz');
        endQuiz().catch(err => {
          console.error('[QuizLayout] Error ending quiz on unmount:', err);
        });
      }
    };
  }, [activeSession?.id, activeSession?.status, endQuiz]);

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

  // Check if all questions are answered
  useEffect(() => {
    const allQuestionsAnswered = questions.all.length > 0 && 
      Object.keys(questions.answered).length === questions.all.length;
      
    if (allQuestionsAnswered && view !== 'results') {
      console.log('[QuizLayout] All questions answered, forcing results view');
      useQuizStore.setState(state => ({
        activeSession: {
          ...state.activeSession,
          status: 'completed',
          endTime: state.activeSession.endTime || Date.now()
        },
        ui: {
          ...state.ui,
          view: 'results',
          isLoading: false
        }
      }));
    }
  }, [questions.all.length, questions.answered, view]);

  if (error || activeSession.status === 'error') {
    // Extract the deck ID from the URL to enable fresh start
    const getDeckIdFromUrl = () => {
      if (typeof window === 'undefined') return '';
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const deckIndex = pathParts.indexOf('deck');
      return (deckIndex !== -1 && pathParts.length > deckIndex + 1) ? pathParts[deckIndex + 1] : '';
    };
    
    // Function to start a fresh quiz when recovery isn't possible
    const startFreshQuiz = async () => {
      const deckId = getDeckIdFromUrl();
      if (!deckId) {
        toast({
          title: "Error",
          description: "Could not determine deck ID from URL",
          variant: "destructive"
        });
        return;
      }
      
      console.log('[QuizLayout] Starting fresh quiz with deck ID:', deckId);
      // Clean up any existing session
      useQuizStore.getState().cleanupSession();
      
      // Start a new quiz with this deck
      try {
        await useQuizStore.getState().startQuiz({
          deckId,
          type: 'mixed',
          questionCount: 10
        });
      } catch (err) {
        console.error('[QuizLayout] Error starting fresh quiz:', err);
        toast({
          title: "Error starting quiz",
          description: "Please try again or return to the deck page",
          variant: "destructive"
        });
      }
    };

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
        <div className="space-y-4">
          <Button 
            onClick={() => recoverSession()}
            className="w-full"
          >
            Recover Session
          </Button>
          <Button 
            onClick={startFreshQuiz}
            variant="outline"
            className="w-full"
          >
            Start New Quiz
          </Button>
        </div>
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