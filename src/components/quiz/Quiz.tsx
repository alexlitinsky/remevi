'use client'
import { useQuizStore } from '@/stores/useQuizStore';
import { QuizConfigModal } from './QuizConfigModal';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';

interface QuizProps {
  deckId: string;
}

export function Quiz({ deckId }: QuizProps) {
  const view = useQuizStore(state => state.view);

  return (
    <div className="container mx-auto py-8">
      {view === 'config' && <QuizConfigModal deckId={deckId} />}
      {view === 'quiz' && <QuizQuestion />}
      {view === 'results' && <QuizResults />}
    </div>
  );
} 