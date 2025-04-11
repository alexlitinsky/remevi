'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StudyStats } from '@/components/deck/StudyStats';
import { QuizStats } from '@/components/deck/QuizStats';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, Sparkles, Clock, Calendar, Trash2, ArrowLeft, BarChart3, Network } from 'lucide-react'; // Added Network icon
import { MindMapModal } from '@/components/session/StudyModals'; // Import MindMapModal
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner';
import { useSessionStats } from '@/hooks/deck/useSessionStats';

interface MindMapData {
  nodes: { id: string; label: string; type: 'main' | 'subtopic' | 'detail' }[];
  connections: { source: string; target: string; label?: string; type: string }[];
}

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
  mindMap?: MindMapData; // Added mindMap property
}

export default function DeckPage() {
  const params = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false); // State for mind map modal

  // const deckId = params ? (typeof params.id === 'string' ? params.id : (Array.isArray(params.id) ? params.id[0] : '')) : '';
  const deckId = params!.id as string;
  
  // Add useSessionStats hook
  const { streak } = useSessionStats(deckId);

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const [deckResponse, statsResponse] = await Promise.all([
          fetch(`/api/decks/${deckId}`),
          fetch(`/api/decks/${deckId}/stats`, {
            headers: {
              'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          })
        ]);

        if (deckResponse.ok && statsResponse.ok) {
          const deckData = await deckResponse.json();
          const statsData = await statsResponse.json();
          
          // Filter to count only flashcards, not MCQ or FRQ
          const flashcardCount = deckData.flashcardCount || statsData.flashcardCount || 0;
          
          // Merge deck data with stats
          setDeck({
            ...deckData,
            dueCards: statsData.dueCards,
            flashcardCount: flashcardCount,
            totalProgress: Math.round(statsData.masteryLevel || 0),
            lastStudied: statsData.reviewsByDate
              ? Object.keys(statsData.reviewsByDate).sort().pop()
              : undefined,
            mindMap: deckData.mindMap // Include mindMap data
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete deck');
      }

      toast.success('Deck deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error('Failed to delete deck');
      setIsDeleting(false);
    }
  };

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
          We couldn&apos;t find the deck you&apos;re looking for. It may have been deleted or you might not have access to it.
        </p>
        <Button size="lg" onClick={() => router.push('/deck')} className="mt-4">
          Return to Decks
        </Button>
      </div>
    );
  }

  // Calculate days since last studied
  const daysSinceLastStudied = deck.lastStudied
    ? Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(deck.lastStudied).setHours(0, 0, 0, 0)) / (1000 * 3600 * 24))
    : null;

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto px-4 py-12 md:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/')} 
            className="mb-2 -ml-2 gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>

          {/* Header Section */}
          <div className="flex flex-col gap-6">
            {/* Title and Metadata */}
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
            
            {/* Action Buttons - Moved below title/metadata */}
            <div className="flex flex-wrap justify-center gap-3 mt-3"> {/* Reduced spacing: mt-6 pt-6 -> mt-3 */}
              <Button
                size="lg"
                onClick={() => router.push(`/deck/${deckId}/session`)}
                className="gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
              >
                <BookOpen className="h-4 w-4" />
                Start Studying
              </Button>
              <Button
                size="lg"
                onClick={() => router.push(`/deck/${deckId}/quiz`)}
                className="gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
              >
                <BarChart3 className="h-4 w-4" />
                Start Quiz
              </Button>
              {/* Mind Map Button */}
              {!deck.isProcessing && deck.mindMap && deck.mindMap.nodes.length > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowMindMap(true)}
                  className="gap-2 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white border-purple-700" // Added purple color
                >
                  <Network className="h-4 w-4" />
                  View Mind Map
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white border-red-700" // Changed to red background
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="fixed inset-0 m-auto h-fit max-h-[90vh] max-w-[400px] overflow-y-auto p-0 bg-black">
                  <div className="px-6 pt-6">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-center text-2xl font-bold tracking-tight">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-center mt-2">
                        This action cannot be undone. This will permanently delete your deck
                        and all associated study materials.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                  </div>

                  <div className="p-6">
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                      <AlertDialogCancel className="sm:mt-0">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Deck'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
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
                    <div className="text-3xl font-bold">{streak} days</div>
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
                    We&apos;re analyzing your cards and preparing your study materials. This may take a few minutes.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Study Stats Section */}
          {!deck.isProcessing && <StudyStats deckId={deckId} />}
          
          {/* Quiz Stats Section */}
          {!deck.isProcessing && <QuizStats deckId={deckId} />}
        </div>
      </div>
      
      {/* Mind Map Modal */}
      <MindMapModal
        isVisible={showMindMap}
        onClose={() => setShowMindMap(false)}
        nodes={deck?.mindMap?.nodes || []}
        connections={deck?.mindMap?.connections || []}
      />
    </main>
  );
}
