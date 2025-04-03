'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { useEffect } from "react";
import { QuizContent } from "./QuizContent";
import { QuizResults } from "./QuizResults";
import { QuizHeader } from "./QuizHeader";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { QuizConfigModal } from "./QuizConfigModal";

interface QuizLayoutProps {
  className?: string;
}

export function QuizLayout({ className }: QuizLayoutProps) {
  const { 
    activeSession,
    questions,
    ui: { view, showConfig },
    actions: { toggleConfig },
    endQuiz,
    achievements,
  } = useQuizStore();
  const { toast } = useToast();

  // Handle initial state and loading
  useEffect(() => {
    const state = useQuizStore.getState();
    
    // If we're in a completed state but have no questions, clean up
    if (activeSession.status === 'completed' && (!questions.all.length || !questions.current)) {
      console.log('[QuizLayout] Cleaning up invalid completed state');
      state.cleanupSession();
      return;
    }

    // If we have an active session but no current question, try to recover
    if ((activeSession.status === 'active' || activeSession.status === 'paused') && !questions.current) {
      console.log('[QuizLayout] Attempting to recover active session');
      state.recoverSession();
      return;
    }

    // If we're showing results but the session isn't completed, fix the state
    if (view === 'results' && activeSession.status !== 'completed') {
      console.log('[QuizLayout] Fixing inconsistent results view state');
      useQuizStore.setState(state => ({
        ui: {
          ...state.ui,
          view: 'quiz'
        }
      }));
    }
  }, []);

  // Handle session completion
  useEffect(() => {
    if (activeSession.status === 'completed' && activeSession.endTime && view !== 'results') {
      console.log('[QuizLayout] Quiz completed, transitioning to results');
      
      // Get the deck ID from URL if not already set
      let deckId = activeSession.deckId;
      if (!deckId) {
        const pathParts = window.location.pathname.split('/');
        const deckIndex = pathParts.indexOf('deck');
        if (deckIndex !== -1 && deckIndex + 1 < pathParts.length) {
          deckId = pathParts[deckIndex + 1];
        }
      }
      
      useQuizStore.setState(state => ({
        activeSession: {
          ...state.activeSession,
          deckId: deckId || state.activeSession.deckId
        },
        ui: {
          ...state.ui,
          view: 'results',
          isLoading: false,
        }
      }));
    }
  }, [activeSession.status, activeSession.endTime, view]);

  // Cleanup on unmount
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
        onSubmit={(config) => {
          toggleConfig();
          useQuizStore.getState().startQuiz({
            ...config,
            deckId: activeSession.deckId || ''
          });
        }}
        deckId={activeSession.deckId || ''}
      />
    </div>
  );
} 