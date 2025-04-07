import { Quiz } from '@/components/quiz/Quiz';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

// export const metadata: Metadata = {
//   title: 'Quiz',
//   description: 'Test your knowledge with interactive quizzes',
// };

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
      {/* <div className="flex items-center justify-between">
        <div>
          <Link href={`/deck/${awaitedParams.id}`} className="text-2xl font-bold tracking-tight hover:text-primary transition-colors cursor-pointer">
            {deck.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            Test your knowledge with interactive questions
          </p>
        </div>
      </div> */}

      <Quiz deckId={awaitedParams.id} deckTitle={deck.title} />
    </div>
  );
} 