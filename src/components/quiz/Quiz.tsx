'use client'
import { useQuizStore } from '@/stores/useQuizStore';
import { QuizConfigModal } from './QuizConfigModal';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface QuizProps {
  deckId: string;
}

export function Quiz({ deckId }: QuizProps) {
  const view = useQuizStore(state => state.view);
  const cleanupSession = useQuizStore(state => state.cleanupSession);
  const [hasStarted, setHasStarted] = useState(false);
  const [deckTitle, setDeckTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();

  // Fetch deck title
  useEffect(() => {
    const fetchDeckTitle = async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch deck');
        }
        const data = await response.json();
        setDeckTitle(data.title);
      } catch (error) {
        console.error('Error fetching deck:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeckTitle();
  }, [deckId]);

  // When the component mounts, ensure we're using the correct deckId
  useEffect(() => {
    const currentDeckId = useQuizStore.getState().deckId;
    
    // If there's a mismatch between the current deckId and the one
    // we're supposed to be using, clean up the session
    if (currentDeckId && currentDeckId !== deckId) {
      cleanupSession();
    }
  }, [deckId, cleanupSession]);

  // Set hasStarted to true when view changes to 'quiz'
  useEffect(() => {
    if (view === 'quiz') {
      setHasStarted(true);
    }
  }, [view]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      {view === 'config' && <QuizConfigModal deckId={params!.id as string} hasStarted={hasStarted} />}
      {view === 'quiz' && <QuizQuestion deckTitle={deckTitle} deckId={params!.id as string} />}
      {view === 'results' && <QuizResults />}
    </div>
  );
} 