'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StudyStats } from '@/components/deck/StudyStats';
import { ArrowRightIcon, BookOpenIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface Deck {
  id: string;
  title: string;
  flashcardCount: number;
  createdAt: string;
  isProcessing?: boolean;
  lastStudied?: string;
  dueCards?: number;
  totalProgress?: number;
  error?: string;
}

export default function DeckPage() {
  const params = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const deckId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const [deckResponse, statsResponse] = await Promise.all([
          fetch(`/api/decks/${deckId}`),
          fetch(`/api/decks/${deckId}/stats`)
        ]);

        if (deckResponse.ok && statsResponse.ok) {
          const deckData = await deckResponse.json();
          const statsData = await statsResponse.json();
          
          // Merge deck data with stats
          setDeck({
            ...deckData,
            dueCards: statsData.dueCards,
            totalProgress: statsData.cardsWithProgress > 0 
              ? Math.round((statsData.cardsWithProgress / statsData.totalCards) * 100)
              : 0,
            lastStudied: statsData.reviewsByDate 
              ? Object.keys(statsData.reviewsByDate).sort().pop()
              : undefined
          });
        }
      } catch (error) {
        console.error('Failed to fetch deck:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeck();
  }, [deckId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-semibold">Deck not found</h1>
        <Button onClick={() => router.push('/deck')}>Return to Decks</Button>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-6 py-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <Card className="p-8 bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">{deck.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{deck.flashcardCount} cards</span>
                <span>•</span>
                <span>Created {new Date(deck.createdAt).toLocaleDateString()}</span>
                {deck.lastStudied && (
                  <>
                    <span>•</span>
                    <span>Last studied {new Date(deck.lastStudied).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => router.push(`/deck/${deckId}/configure`)}
              >
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                Configure
              </Button>
              <Button 
                onClick={() => router.push(`/deck/${deckId}/session`)}
              >
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Start Studying
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {!deck.isProcessing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-4 bg-zinc-800/50">
                <div className="text-sm text-muted-foreground">Cards Due Today</div>
                <div className="text-2xl font-bold mt-1">{deck.dueCards || 0}</div>
              </Card>
              <Card className="p-4 bg-zinc-800/50">
                <div className="text-sm text-muted-foreground">Total Progress</div>
                <div className="text-2xl font-bold mt-1">{deck.totalProgress || 0}%</div>
              </Card>
              <Card className="p-4 bg-zinc-800/50">
                <div className="text-sm text-muted-foreground">Total Cards</div>
                <div className="text-2xl font-bold mt-1">{deck.flashcardCount}</div>
              </Card>
            </div>
          )}

          {deck.isProcessing && (
            <div className="flex items-center justify-center p-6 bg-yellow-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-500">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-yellow-500"></div>
                <span>Processing your deck...</span>
              </div>
            </div>
          )}
        </Card>

        {/* Study Stats Section */}
        {!deck.isProcessing && (
          <StudyStats deckId={deckId} />
        )}
      </div>
    </main>
  );
}
