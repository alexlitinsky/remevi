import { Metadata } from 'next';
import { QuizLayout } from '@/components/quiz/QuizLayout';
import { QuizProvider } from '@/components/quiz/QuizProvider';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Quiz',
  description: 'Test your knowledge with interactive quizzes',
};

async function getDeck(deckId: string, userId: string) {
  const deck = await db.deck.findUnique({
    where: {
      id: deckId,
      userId,
    },
  });

  if (!deck) {
    redirect('/decks');
  }

  return deck;
}

export default async function QuizPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) {
    redirect('/');
  }
  const awaitedParams = await params;

  const deck = await getDeck(awaitedParams.id, user.id);

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{deck.title}</h1>
          <p className="text-sm text-muted-foreground">
            Test your knowledge with interactive questions
          </p>
        </div>
      </div>

      <QuizProvider deckId={awaitedParams.id}>
        <QuizLayout className="mt-6" />
      </QuizProvider>
    </div>
  );
} 