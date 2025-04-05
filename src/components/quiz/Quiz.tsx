'use client'
import { useQuizStore } from '@/stores/useQuizStore';
import { QuizConfigModal } from './QuizConfigModal';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import { useEffect, useState } from 'react';

interface QuizProps {
  deckId: string;
  deckTitle: string;
}

export function Quiz({ deckId, deckTitle }: QuizProps) {
  const view = useQuizStore(state => state.view);
  const cleanupSession = useQuizStore(state => state.cleanupSession);
  const [hasStarted, setHasStarted] = useState(false);

  // When the component mounts, ensure we're using the correct deckId
  useEffect(() => {
    const currentDeckId = useQuizStore.getState().deckId;
    
    // If there's a mismatch between the current deckId and the one
    // we're supposed to be using, clean up the session
    if (currentDeckId && currentDeckId !== deckId) {
      console.log('Quiz component detected deck mismatch:', currentDeckId, 'vs', deckId);
      cleanupSession();
    }
  }, [deckId, cleanupSession]);

  // Set hasStarted to true when view changes to 'quiz'
  useEffect(() => {
    if (view === 'quiz') {
      setHasStarted(true);
    }
  }, [view]);

  return (
    <div className="container mx-auto py-8">
      {view === 'config' && <QuizConfigModal deckId={deckId} hasStarted={hasStarted} />}
      {view === 'quiz' && <QuizQuestion deckTitle={deckTitle} deckId={deckId} />}
      {view === 'results' && <QuizResults />}
    </div>
  );
} 