"use client";

import { Quiz } from '@/components/quiz/Quiz';
import { useParams } from 'next/navigation';

export default function QuizPage() {
  const params = useParams();
  
  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-8">
      <Quiz deckId={params.id as string} />
    </div>
  );
}