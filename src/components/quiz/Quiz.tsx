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
  const [hasStarted, setHasStarted] = useState(false);

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