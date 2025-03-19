'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Flashcard } from '@/components/ui/flashcard';
import { Button } from '@/components/ui/button';
import { MapIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { MindMap } from '@/components/ui/mind-map';
import { type Difficulty } from '@/lib/srs';
import { StudySettings } from '@/components/study-settings'; // Fix import path

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  dueDate?: string;
  easeFactor?: number;
  repetitions?: number;
  interval?: number;
  isNew?: boolean;
  isDue?: boolean;
}

interface StudyDeck {
  id: string;
  title: string;
  createdAt: string;
  isProcessing: boolean;
  error?: string;
  flashcards: Array<{
    id?: string;
    front: string;
    back: string;
  }>;
  mindMap: {
    nodes: Array<{
      id: string;
      label: string;
      x: number;
      y: number;
    }>;
    connections: Array<{
      source: string;
      target: string;
      label?: string;
    }>;
  };
}

export default function StudyDeckPage() {
  const params = useParams();
  const router = useRouter();
  const [studyDeck, setStudyDeck] = useState<StudyDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [deckCompleted, setDeckCompleted] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCardIds, setCompletedCardIds] = useState<string[]>([]);
  const [orderedCards, setOrderedCards] = useState<FlashcardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCardsInDeck, setTotalCardsInDeck] = useState<number>(0);
  const [newCardCount, setNewCardCount] = useState(0);
  const [dueCardCount, setDueCardCount] = useState(0);

  // Load study progress from local storage
  useEffect(() => {
    if (!params.id) return;
    
    const savedProgress = localStorage.getItem(`study-progress-${params.id}`);
    if (savedProgress) {
      try {
        const { currentIndex, totalPointsEarned, completedCardIds } = JSON.parse(savedProgress);
        setCurrentCardIndex(currentIndex || 0);
        setTotalPoints(totalPointsEarned || 0);
        setCompletedCardIds(completedCardIds || []);
      } catch (error) {
        console.error('Error parsing saved progress:', error);
        localStorage.removeItem(`study-progress-${params.id}`);
      }
    }
  }, [params.id]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (!studyDeck) return;
    
    // Only save if we have made some progress
    if (currentCardIndex > 0 || totalPoints > 0) {
      localStorage.setItem(`study-progress-${studyDeck.id}`, JSON.stringify({
        currentIndex: currentCardIndex,
        totalPointsEarned: totalPoints,
        completedCardIds,
        lastStudied: new Date().toISOString()
      }));
    }
  }, [currentCardIndex, studyDeck?.id, studyDeck, totalPoints, completedCardIds]);

  // Order cards based on SRS data
  const orderCardsBySRS = useCallback((cards: FlashcardData[]) => {
    if (!cards || !cards.length) return [];
    
    // First, separate new cards from cards with progress
    const newCards = cards.filter(card => card.isNew);
    const dueCards = cards.filter(card => !card.isNew && card.isDue);
    
    // Sort due cards by due date (earliest first)
    const sortedDueCards = dueCards.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });
    
    // Combine new cards first, then due cards
    return [...newCards, ...sortedDueCards];
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchStudyDeck = async () => {
      try {
        // First fetch the deck info
        const deckResponse = await fetch(`/api/study-decks/${params.id}`);
        if (!deckResponse.ok || !mounted) return;
        
        const deckData = await deckResponse.json();
        setStudyDeck(deckData);
        setTotalCardsInDeck(deckData.flashcards.length);
        
        // Then fetch the due cards
        const dueCardsResponse = await fetch(`/api/study-decks/${params.id}/due-cards`);
        if (!dueCardsResponse.ok || !mounted) return;
        
        const dueCardsData = await dueCardsResponse.json();
        
        // Count new and due cards
        const newCards = dueCardsData.cards.filter((card: FlashcardData) => card.isNew);
        const dueCards = dueCardsData.cards.filter((card: FlashcardData) => card.isDue && !card.isNew);
        
        setNewCardCount(newCards.length);
        setDueCardCount(dueCards.length);
        setOrderedCards(dueCardsData.cards);
        
        // If still processing, poll every 2 seconds
        if (deckData.isProcessing) {
          const pollTimer = setTimeout(fetchStudyDeck, 2000);
          return () => clearTimeout(pollTimer);
        }
      } catch (error) {
        console.error('Failed to fetch study deck:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStudyDeck();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const handleCardRate = async (difficulty: Difficulty, responseTime: number) => {
    if (!studyDeck || !orderedCards.length) return;

    try {
      const currentCard = orderedCards[currentCardIndex];
      
      // Check if this is the last card
      const isLastCard = currentCardIndex >= orderedCards.length - 1;
      
      // First, show points animation
      const response = await fetch(
        `/api/study-decks/${studyDeck.id}/cards/${currentCard.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ difficulty, responseTime, front: currentCard.front, back: currentCard.back }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const { pointsEarned, cardProgress } = await response.json();
      
      // Set points earned for the current card
      setPointsEarned(pointsEarned);
      
      // Update total points
      setTotalPoints(prev => prev + pointsEarned);
      
      // Track completed card
      setCompletedCardIds(prev => {
        if (prev.includes(currentCard.id)) return prev;
        return [...prev, currentCard.id];
      });
      
      // Update card data
      const updatedCards = orderedCards.map(card => 
        card.id === currentCard.id 
          ? { 
              ...card, 
              dueDate: cardProgress.dueDate,
              easeFactor: cardProgress.easeFactor,
              repetitions: cardProgress.repetitions,
              interval: cardProgress.interval
            } 
          : card
      );
      
      // Re-order cards based on updated SRS data
      const reorderedCards = orderCardsBySRS(updatedCards);
      
      // Show points animation, then go directly to next card
      setTimeout(() => {
        if (isLastCard) {
          // Set deck completed state
          setDeckCompleted(true);
          setPointsEarned(null);
        } else {
          // Move to next card - reset to front side
          setShowBack(false);
          setCurrentCardIndex(prev => prev + 1);
          setPointsEarned(null);
          setOrderedCards(reorderedCards);
        }
      }, 300); // Give a little time to show the points before transitioning
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const handleRestartDeck = () => {
    // Reset state for restart
    if (!studyDeck) return;
    
    // Ensure all cards have an id
    const cardsWithIds = studyDeck.flashcards.map(card => ({
      ...card,
      isNew: true,
      isDue: true
    })) as FlashcardData[];
    
    const ordered = orderCardsBySRS(cardsWithIds);
    setOrderedCards(ordered);
    setCurrentCardIndex(0);
    setShowBack(false);
    setDeckCompleted(false);
  };

  const handleSeePerformance = () => {
    // Navigate to performance page (future enhancement)
    // TODO just render performance in the finish screen
    router.push(`/?deck=${studyDeck?.id}`);
  };

  const handleReturnToDashboard = () => {
    // Clear the progress when returning to dashboard after completion
    if (studyDeck) {
      localStorage.removeItem(`study-progress-${studyDeck.id}`);
    }
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="h-screen pt-16 bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <h2 className="text-xl font-semibold text-white animate-pulse">Loading flashcards...</h2>
        </div>
      </div>
    );
  }

  if (!studyDeck) {
    return (
      <div className="h-screen pt-16 bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto p-8 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <h1 className="text-3xl font-bold text-white">Error</h1>
          <p className="text-zinc-400">
            Could not load the study deck. It may have been deleted or you may not have permission to view it.
          </p>
          <Button 
            variant="default" 
            onClick={handleReturnToDashboard}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (studyDeck.isProcessing) {
    return (
      <div className="h-screen pt-16 bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <h1 className="text-2xl font-bold text-white animate-pulse">Processing Your Deck</h1>
          <p className="text-zinc-400">
            We&apos;re generating flashcards and a mind map for your study deck. This may take a minute or two.
          </p>
        </div>
      </div>
    );
  }

  if (deckCompleted) {
    return (
      <div className="h-screen pt-16 bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto p-8 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <h1 className="text-3xl font-bold text-white">Deck Completed!</h1>
          <div className="text-5xl font-bold text-yellow-500">+{totalPoints} points</div>
          <p className="text-zinc-400">
            Great job! You&apos;ve completed all the flashcards that are due for review.
          </p>
          <div className="flex flex-col space-y-4 pt-4">
            <Button 
              onClick={handleRestartDeck}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              Study Again
            </Button>
            <Button 
              onClick={handleSeePerformance}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <ChartBarIcon className="w-5 h-5 mr-2" />
              See Performance
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReturnToDashboard}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen pt-16 bg-background overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold text-white">{studyDeck?.title}</h1>
          <div className="flex space-x-2 text-sm">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
              New: {newCardCount}
            </span>
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
              Due: {dueCardCount}
            </span>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
              Total: {totalCardsInDeck}
            </span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-4xl">
            <AnimatePresence mode="wait">
              {orderedCards.length > 0 && currentCardIndex < orderedCards.length && (
                <motion.div
                  key={`card-container-${currentCardIndex}-${orderedCards[currentCardIndex].id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Flashcard
                    key={`card-${currentCardIndex}-${orderedCards[currentCardIndex].id}`}
                    front={orderedCards[currentCardIndex].front}
                    back={orderedCards[currentCardIndex].back}
                    showBack={showBack}
                    onFlip={() => setShowBack(!showBack)}
                    onRate={handleCardRate}
                    pointsEarned={pointsEarned}
                    onNext={
                      currentCardIndex < orderedCards.length - 1
                        ? () => {
                            setCurrentCardIndex(prev => prev + 1);
                            setShowBack(false);
                            setPointsEarned(null);
                          }
                        : undefined
                    }
                    onPrev={
                      currentCardIndex > 0
                        ? () => {
                            setCurrentCardIndex(prev => prev - 1);
                            setShowBack(false);
                            setPointsEarned(null);
                          }
                        : undefined
                    }
                    progress={orderedCards.length > 1 
                      ? currentCardIndex / (orderedCards.length - 1) 
                      : 1}
                    totalCards={orderedCards.length}
                    currentCardIndex={currentCardIndex}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 flex flex-col space-y-4">
        <Button
          onClick={() => setShowSettings(true)}
          className="rounded-full w-12 h-12 p-0 bg-green-600 hover:bg-green-700 text-white shadow-lg"
          aria-label="Study Settings"
        >
          <ChartBarIcon className="h-6 w-6" />
        </Button>
        <Button
          onClick={() => setShowMindMap(!showMindMap)}
          className="rounded-full w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          aria-label="Toggle Mind Map"
        >
          <MapIcon className="h-6 w-6" />
        </Button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-8">
                <h2 className="text-xl font-bold text-white mb-4">Study Settings</h2>
                <div className="space-y-4">
                  <div>
                    <Button 
                      onClick={() => {
                        setShowSettings(false);
                        window.location.reload();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Refresh Cards
                    </Button>
                  </div>
                  <div>
                    <StudySettings />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMindMap && studyDeck && studyDeck.mindMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8"
            onClick={() => setShowMindMap(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full max-w-6xl"
            >
              <div className="w-full h-[calc(100vh-8rem)] rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-8">
                <MindMap
                  nodes={studyDeck.mindMap.nodes}
                  connections={studyDeck.mindMap.connections}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}