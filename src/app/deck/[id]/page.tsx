'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StudyStats } from '@/components/deck/StudyStats';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, Settings, Sparkles, Clock, Calendar } from 'lucide-react';

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
  category?: string;
  studyStreak?: number;
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
            flashcardCount: statsData.totalCards,
            totalProgress: Math.round(statsData.masteryLevel || 0),
            lastStudied: statsData.reviewsByDate 
              ? Object.keys(statsData.reviewsByDate).sort().pop()
              : undefined
          });
          console.log("deckData", deckData);
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/80">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading deck information...</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gradient-to-b from-background to-background/80">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold">Deck not found</h1>
        <p className="text-muted-foreground max-w-md text-center">
          We couldn't find the deck you're looking for. It may have been deleted or you might not have access to it.
        </p>
        <Button size="lg" onClick={() => router.push('/deck')} className="mt-4">
          Return to Decks
        </Button>
      </div>
    );
  }

  // Format dates for better display
  const formattedCreatedDate = new Date(deck.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedLastStudied = deck.lastStudied
    ? new Date(deck.lastStudied).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  // Calculate days since last studied
  const daysSinceLastStudied = deck.lastStudied
    ? Math.floor((new Date().getTime() - new Date(deck.lastStudied).getTime()) / (1000 * 3600 * 24))
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto px-4 py-12 md:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                  {deck.category || 'Uncategorized'}
                </Badge>
                {daysSinceLastStudied !== null && daysSinceLastStudied <= 2 && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                    Recently studied
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">{deck.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-muted-foreground text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formattedCreatedDate}</span>
                </div>
                {formattedLastStudied && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>Last studied {formattedLastStudied}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button size="lg" onClick={() => router.push(`/deck/${deckId}/session`)} className="gap-2">
                <BookOpen className="h-4 w-4" />
                Start Studying
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          {!deck.isProcessing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="overflow-hidden border border-primary/10 bg-card/50 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Cards Due Today</h3>
                    <div className="rounded-full bg-orange-500/10 p-1">
                      <Calendar className="h-4 w-4 text-orange-500" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-bold">{deck.dueCards || 0}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {deck.dueCards && deck.dueCards > 0
                        ? `${Math.round((deck.dueCards / deck.flashcardCount) * 100)}% of your deck`
                        : 'All caught up!'}
                    </div>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-red-500"></div>
              </Card>

              <Card className="overflow-hidden border border-primary/10 bg-card/50 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Progress</h3>
                    <div className="rounded-full bg-green-500/10 p-1">
                      <Sparkles className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-bold">{deck.totalProgress || 0}%</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {deck.totalProgress && deck.totalProgress > 80
                        ? 'Excellent progress!'
                        : deck.totalProgress && deck.totalProgress > 50
                          ? 'Good progress'
                          : 'Keep going!'}
                    </div>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
              </Card>

              <Card className="overflow-hidden border border-primary/10 bg-card/50 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Cards</h3>
                    <div className="rounded-full bg-blue-500/10 p-1">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-bold">{deck.flashcardCount}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {deck.flashcardCount > 50 ? 'Comprehensive deck' : 'Focused learning'}
                    </div>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              </Card>

              <Card className="overflow-hidden border border-primary/10 bg-card/50 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Study Streak</h3>
                    <div className="rounded-full bg-purple-500/10 p-1">
                      <ArrowRight className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-bold">{deck.studyStreak || 0} days</div>
                    <div className="mt-1 text-xs text-muted-foreground">Keep your streak going!</div>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              </Card>
            </div>
          )}

          {deck.isProcessing && (
            <Card className="p-8 border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                <div>
                  <h3 className="font-semibold text-yellow-500">Processing your deck</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    We're analyzing your cards and preparing your study materials. This may take a few minutes.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Study Stats Section */}
          {!deck.isProcessing && <StudyStats deckId={deckId} />}
        </div>
      </div>
    </main>
  );
}
