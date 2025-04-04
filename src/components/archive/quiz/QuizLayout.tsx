'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { useEffect, useState } from "react";
import { QuizContent } from "./QuizContent";
import { QuizResults } from "../../quiz/QuizResults";
import { QuizHeader } from "./QuizHeader";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { QuizConfigModal } from "../../quiz/QuizConfigModal";

interface QuizLayoutProps {
  className?: string;
}

export function QuizLayout({ className }: QuizLayoutProps) {
  const { 
    questions,
    currentQuestionIndex,
    status,
    isLoading,
    showConfig,
    view,
    deckId,
    achievements,
    error,
    toggleConfig,
    setIsLoading,
    setError,
    endQuiz,
    clearSession,
    recoverSession,
    startQuiz
  } = useQuizStore();
  
  const { toast } = useToast();
  const [isRecovering, setIsRecovering] = useState(false);

  // Handle session recovery and state management
  useEffect(() => {
    const handleSessionRecovery = async () => {
      // Prevent multiple recovery attempts
      if (isRecovering) return;
      
      try {
        setIsRecovering(true);
        setIsLoading(true);

        // Case 1: Invalid completed state
        if (status === 'completed' && (!questions.length || !questions[currentQuestionIndex])) {
          console.log('[QuizLayout] Cleaning up invalid completed state');
          clearSession();
          return;
        }

        // Case 2: Active session without current question
        if (status === 'active' && (!questions[currentQuestionIndex] || questions.length === 0)) {
          console.log('[QuizLayout] Recovering active session');
          await recoverSession();
          
          // Verify recovery success
          const updatedState = useQuizStore.getState();
          if (!updatedState.questions[updatedState.currentQuestionIndex] || updatedState.questions.length === 0) {
            console.error('[QuizLayout] Recovery failed to restore questions');
            clearSession();
            toast({
              title: "Session Recovery Failed",
              description: "Unable to restore your previous progress. Starting fresh.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Session Recovered",
              description: "Your progress has been restored.",
            });
          }
          return;
        }

        // Case 3: Inconsistent view state
        if (view === 'results' && status !== 'completed') {
          console.log('[QuizLayout] Fixing inconsistent results view state');
          useQuizStore.setState(state => ({ ...state, view: 'quiz' }));
        }

        // Case 4: Verify question and answer consistency
        const answeredCount = questions.filter(q => q.userAnswer).length;
        if (status === 'active' && answeredCount > 0 && answeredCount !== currentQuestionIndex) {
          console.log('[QuizLayout] Detected question/answer mismatch, recovering');
          await recoverSession();
        }

      } catch (error) {
        console.error('[QuizLayout] Session recovery error:', error);
        toast({
          title: "Recovery Error",
          description: "There was a problem restoring your progress. Please try again.",
          variant: "destructive"
        });
        clearSession();
      } finally {
        setIsRecovering(false);
        setIsLoading(false);
      }
    };

    handleSessionRecovery();
  }, []);

  // Show loading state during recovery
  if (isRecovering || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Restoring your progress...</p>
        </div>
      </div>
    );
  }

  // Handle session completion
  useEffect(() => {
    if (status === 'completed' && view !== 'results') {
      console.log('[QuizLayout] Quiz completed, transitioning to results');
      useQuizStore.setState(state => ({ ...state, view: 'results' }));
    }
  }, [status, view]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (status === 'active') {
        console.log('[QuizLayout] Component unmounting, ending quiz');
        endQuiz().catch((error: Error) => {
          console.error('[QuizLayout] Error ending quiz on unmount:', error);
          setError(error.message);
        });
      }
    };
  }, [status, endQuiz, setError]);

  // Handle achievements
  useEffect(() => {
    achievements.forEach((achievement) => {
      if (!achievement.shown) {
        toast({
          title: "Achievement Unlocked!",
          description: achievement.description,
          action: <Trophy className="h-4 w-4" />,
        });
        achievement.shown = true;
      }
    });
  }, [achievements, toast]);

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="space-y-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8", className)}>
      {view === 'quiz' && (
        <>
          <QuizHeader />
          <QuizContent />
        </>
      )}
      {view === 'results' && <QuizResults />}
      <QuizConfigModal
        open={showConfig}
        onOpenChange={toggleConfig}
        deckId={deckId || ''}
      />
    </div>
  );
} 