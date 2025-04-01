'use client';

import { useQuizStore } from "@/stores/useQuizStore";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface QuizProviderProps {
  children: React.ReactNode;
  deckId: string;
  quizType?: 'mcq' | 'frq' | 'mixed';
  questionCount?: number;
}

export function QuizProvider({ 
  children, 
  deckId,
  quizType = 'mixed',
  questionCount = 10
}: QuizProviderProps) {
  const {
    startQuiz,
    recoverSession,
    activeSession,
    cleanupSession,
    checkForExistingSession,
  } = useQuizStore();

  const { toast } = useToast();

  useEffect(() => {
    // Only try to recover if there's an error session
    if (activeSession.status === 'error') {
      recoverSession().catch((err) => {
        toast({
          title: "Error recovering session",
          description: "Failed to recover your quiz session. Please try starting a new quiz.",
          variant: "destructive"
        });
      });
    }
  }, [activeSession.status, recoverSession, toast]);

  // Handle beforeunload to save session state
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeSession.status === 'active') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeSession.status]);

  // Cleanup session on unmount if not completed
  useEffect(() => {
    return () => {
      if (activeSession.status === 'active' || activeSession.status === 'paused') {
        cleanupSession();
      }
    };
  }, [activeSession.status, cleanupSession]);

  // Auto-start quiz on mount if no active session
  useEffect(() => {
    const autoStartQuiz = async () => {
      if (!checkForExistingSession()) {
        console.log('[QuizProvider] Auto-starting quiz');
        try {
          await startQuiz({
            deckId,
            type: quizType,
            questionCount
          });
        } catch (err) {
          console.error('Error auto-starting quiz:', err);
          toast({
            title: "Error starting quiz",
            description: "Could not start quiz. Trying to generate questions...",
            variant: "destructive"
          });
          
          try {
            // Try to generate questions and start quiz again
            const response = await fetch(`/api/decks/${deckId}/quiz/generate-questions`, {
              method: 'POST'
            });
            
            if (response.ok) {
              // Wait for questions to be generated
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Try to start quiz again
              await startQuiz({
                deckId,
                type: quizType,
                questionCount
              });
            } else {
              throw new Error("Failed to generate questions");
            }
          } catch (genErr) {
            console.error('Error generating questions:', genErr);
            toast({
              title: "Error generating questions",
              description: "Could not generate questions from your flashcards.",
              variant: "destructive"
            });
          }
        }
      }
    };
    
    // Small delay to allow for initialization
    const timer = setTimeout(autoStartQuiz, 300);
    return () => clearTimeout(timer);
  }, [deckId, quizType, questionCount, checkForExistingSession, startQuiz, toast]);

  return (
    <>
      {children}
    </>
  );
} 