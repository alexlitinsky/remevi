'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDeck } from '@/hooks/deck/useDeck';
import { useSessionStats } from '@/hooks/deck/useSessionStats';
import { type Difficulty } from '@/lib/srs';
import { calculatePoints } from '@/lib/srs';
import { StudyDeckHeader } from '@/components/session/StudyDeckHeader';
import { FlashcardContainer } from '@/components/session/FlashcardContainer';
import { DeckCompletionScreen } from '@/components/session/DeckCompletionScreen';
import { LoadingState, ErrorState, ProcessingState } from '@/components/session/StudyDeckStates';
import { MindMapModal, SettingsModal } from '@/components/session/StudyModals';
import { StudyActionButtons } from '@/components/session/StudyActionButtons';
import { NoDueCardsScreen } from '@/components/session/NoDueCardsScreen';
import { toast } from 'sonner';

export default function StudyDeckPage() {
  const params = useParams();
  const router = useRouter();
  const [showMindMap, setShowMindMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [originalNewCount, setOriginalNewCount] = useState(0);
  const [originalDueCount, setOriginalDueCount] = useState(0);
  const [hasSetOriginalCounts, setHasSetOriginalCounts] = useState(false);
  const [originalCardIds, setOriginalCardIds] = useState<string[]>([]);
  const [estimatedPoints, setEstimatedPoints] = useState(0);
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number | null>(null);

  const deckId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  const {
    deck,
    orderedCards,
    currentCardIndex,
    showBack,
    pointsEarned,
    deckCompleted,
    totalPoints,
    isLoading,
    isLoadingCards,
    totalCardsInDeck,
    newCardCount,
    dueCardCount,
    handleCardRate,
    handleRestartDeck,
    clearProgress,
    flipCard,
    moveToNextCard,
    moveToPrevCard,
    completedCardIds,
    setPointsEarned
  } = useDeck(deckId);

  const {
    sessionTime,
    streak,
    sessionPoints,
    cardsReviewed,
    addPoints,
    startSession,
    endSession,
    resetSession,
  } = useSessionStats(deckId);

  // Load original session state from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem(`session-state-${deckId}`);
    if (savedSession) {
      const { newCount, dueCount, cardIds } = JSON.parse(savedSession);
      console.log('Loading saved session state:', JSON.stringify({ newCount, dueCount, cardIds }, null, 2));
      setOriginalNewCount(newCount);
      setOriginalDueCount(dueCount);
      setOriginalCardIds(cardIds);
      setHasSetOriginalCounts(true);
    } else {
      console.log('No saved session state found');
    }
  }, [deckId]);

  // Set original counts and cards when session starts
  useEffect(() => {
    if (!hasSetOriginalCounts && !isLoading && orderedCards.length > 0) {
      const cardIds = orderedCards.map(card => card.id);
      const newCount = orderedCards.filter(card => card.isNew).length;
      const dueCount = orderedCards.filter(card => !card.isNew && card.isDue).length;

      console.log('Setting initial session state:', JSON.stringify({
        newCount,
        dueCount,
        totalCards: cardIds.length,
        cardIds
      }, null, 2));

      setOriginalNewCount(newCount);
      setOriginalDueCount(dueCount);
      setOriginalCardIds(cardIds);
      setHasSetOriginalCounts(true);
      
      // Save to localStorage
      const sessionState = {
        newCount,
        dueCount,
        cardIds
      };
      localStorage.setItem(`session-state-${deckId}`, JSON.stringify(sessionState));
      console.log('Saved session state to localStorage:', JSON.stringify(sessionState, null, 2));
    }
  }, [orderedCards, isLoading, hasSetOriginalCounts, deckId]);

  // Calculate actual progress based on original card list
  const calculateProgress = () => {
    if (orderedCards.length === 0) return 0;
    // Cap progress at 1 (100%)
    const progress = Math.min(currentCardIndex / orderedCards.length, 1);
    return progress;
  };

  // Start session effect
  useEffect(() => {
    let mounted = true;
    
    if (!hasStarted && showBack && mounted) {
      setHasStarted(true);
      startSession();
      setPointsEarned(null);
    }

    return () => {
      mounted = false;
    };
  }, [hasStarted, showBack]);

  // End session when completed
  useEffect(() => {
    let mounted = true;

    if (deckCompleted && mounted) {
      endSession();
      setHasStarted(false);
      clearProgress();
    }

    return () => {
      mounted = false;
    };
  }, [deckCompleted]);

  // Clear session state when completed or when leaving the page
  useEffect(() => {
    let mounted = true;

    const clearSessionState = () => {
      if (mounted) {
        localStorage.removeItem(`session-state-${deckId}`);
        console.log('Cleared session state');
      }
    };

    if (deckCompleted && mounted) {
      clearSessionState();
      endSession();
    }

    window.addEventListener('beforeunload', clearSessionState);
    
    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', clearSessionState);
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry?.type !== 'reload') {
        endSession();
      }
    };
  }, [deckCompleted, deckId]);

  // Show keyboard shortcuts toast for first-time users
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('has-seen-study-tutorial');
    if (!hasSeenTutorial && hasStarted) {
      toast.info(
        'Keyboard Shortcuts',
        {
          description: 'Space/Enter to flip card\nQ: Hard, W: Medium, E: Easy',
          duration: 5000,
          position: 'bottom-center'
        }
      );
      localStorage.setItem('has-seen-study-tutorial', 'true');
    }
  }, [hasStarted]);

  const handleSeePerformance = async () => {
    await endSession(); // End session before navigation
    clearProgress();
    router.push(`/deck/${deck?.id}`);
  };

  const handleReturnToDashboard = async () => {
    await endSession(); // End session before navigation
    clearProgress();
    router.push(`/deck/${deck?.id}`);
  };

  const handleReturnToHome = async () => {
    await endSession(); // End session before navigation
    clearProgress();
    router.push(`/`);
  };

  const handleRefreshCards = () => {
    setShowSettings(false);
    window.location.reload();
  };

  // Wrap handleCardRate to track session stats
  const handleCardRateWithStats = async (difficulty: Difficulty, responseTime: number) => {
    const points = calculatePoints(difficulty, responseTime);
    setLastEarnedPoints(points); // Set points for notification
    addPoints(points);
    await handleCardRate(difficulty, responseTime);
    // Reset points after a delay
    setTimeout(() => setLastEarnedPoints(null), 1500);
  };

  const handleRestartDeckWithReset = async () => {
    await handleRestartDeck();
    resetSession();
    setHasStarted(true); // Ensure timer starts
    setPointsEarned(null);
    setLastEarnedPoints(null);
  };

  // Get the next due date (earliest due date from remaining cards)
  const nextDueDate = orderedCards.length > 0 
    ? orderedCards.reduce((earliest, card) => {
      if (!card.dueDate) return earliest;
      const dueDate = new Date(card.dueDate);
      return !earliest || dueDate < earliest ? dueDate : earliest;
    }, null as Date | null)
    : null;

  // Processing state - deck is being generated
  if (deck?.isProcessing) {
    return <ProcessingState progress={deck.error} />;
  }

  // Loading states - only show if not processing
  if (!deck || isLoading || isLoadingCards) {
    return <LoadingState />;
  }

  // Error state - generation failed
  if (deck.error) {
    return <ErrorState 
      message={deck.error}
      description="There was an error generating your flashcards. Please try again or contact support if the issue persists."
      onReturnToHome={handleReturnToHome} 
    />;
  }

  // Completion state - finished all cards in this session
  if (deckCompleted) {
    return (
      <DeckCompletionScreen
        totalPoints={totalPoints}
        onRestartDeck={handleRestartDeckWithReset}
        onSeePerformance={handleSeePerformance}
        onReturnToDashboard={handleReturnToDashboard}
        onReturnToHome={handleReturnToHome}
        sessionTime={sessionTime}
        pointsEarned={sessionPoints}
        cardsReviewed={cardsReviewed}
      />
    );
  }

  // No due cards state - no cards to review
  if (!isLoading && cardsReviewed === 0 && (orderedCards.length === 0 || (newCardCount === 0 && dueCardCount === 0))) {
    return (
      <NoDueCardsScreen
        onRestartDeck={handleRestartDeckWithReset}
        onReturnToDashboard={handleReturnToDashboard}
        nextDueDate={nextDueDate || undefined}
      />
    );
  }

  // Main study interface
  return (
    <main className="h-screen bg-background overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header with card counts - fixed at top */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <StudyDeckHeader
            title={deck?.title || ''}
            deckId={deckId}
            newCardCount={newCardCount}
            dueCardCount={dueCardCount}
            originalNewCount={originalNewCount}
            originalDueCount={originalDueCount}
            totalCardCount={totalCardsInDeck}
            currentCardIndex={currentCardIndex}
            streak={streak}
            pointsEarned={sessionPoints}
            sessionTime={sessionTime}
            progress={calculateProgress()}
          />
        </div>
        
        {/* Flashcard container - add top margin to account for fixed header */}
        <div className="flex-1 flex items-center justify-center px-6 mt-[104px]">
          <FlashcardContainer
            cards={orderedCards}
            currentCardIndex={currentCardIndex}
            showBack={showBack}
            pointsEarned={lastEarnedPoints}
            onFlip={flipCard}
            onRate={handleCardRateWithStats}
            onNext={currentCardIndex < orderedCards.length - 1 ? () => moveToNextCard(currentCardIndex) : undefined}
            onPrev={currentCardIndex > 0 ? () => moveToPrevCard(currentCardIndex) : undefined}
          />
        </div>
      </div>

      {/* Floating action buttons */}
      <StudyActionButtons
        onShowSettings={() => setShowSettings(true)}
        onToggleMindMap={() => setShowMindMap(!showMindMap)}
        mindMapAvailable={!!deck?.mindMap?.nodes?.length}
      />

      {/* Settings modal */}
      <SettingsModal
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        onRefreshCards={handleRefreshCards}
        deckId={deckId}
      />

      {/* Mind map modal */}
      {deck?.mindMap?.nodes?.length && (
        <MindMapModal
          isVisible={showMindMap}
          onClose={() => setShowMindMap(false)}
          nodes={deck.mindMap.nodes}
          connections={deck.mindMap.connections}
        />
      )}
    </main>
  );
}