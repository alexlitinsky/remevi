'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDeck } from '@/hooks/deck/useDeck';
import { useSessionStats } from '@/hooks/deck/useSessionStats';
import { type Difficulty } from '@/lib/srs';
import { StudyDeckHeader } from '@/components/session/StudyDeckHeader';
import { FlashcardContainer } from '@/components/session/FlashcardContainer';
import { DeckCompletionScreen } from '@/components/session/DeckCompletionScreen';
import { LoadingState, ErrorState, ProcessingState } from '@/components/session/StudyDeckStates';
import { MindMapModal, SettingsModal } from '@/components/session/StudyModals';
import { StudyActionButtons } from '@/components/session/StudyActionButtons';
import { NoDueCardsScreen } from '@/components/session/NoDueCardsScreen';

export default function StudyDeckPage() {
  const params = useParams();
  const router = useRouter();
  const [showMindMap, setShowMindMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [originalNewCount, setOriginalNewCount] = useState(0);
  const [originalDueCount, setOriginalDueCount] = useState(0);
  const [hasSetOriginalCounts, setHasSetOriginalCounts] = useState(false);

  
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
    setDeckCompleted
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
    isActive
  } = useSessionStats(deckId);

  // End session when completed
  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      startSession();
    }
  }, [hasStarted]);

  // End session when completed
  useEffect(() => {
    if (deckCompleted) {
      endSession();
    }
  }, [deckCompleted]);

  // Set original counts when session starts
  useEffect(() => {
    if (!hasSetOriginalCounts && !isLoading && (newCardCount > 0 || dueCardCount > 0)) {
      setOriginalNewCount(newCardCount);
      setOriginalDueCount(dueCardCount);
      setHasSetOriginalCounts(true);
    }
  }, [newCardCount, dueCardCount, isLoading, hasSetOriginalCounts]);

  const handleSeePerformance = () => {
    clearProgress();
    router.push(`/deck/${deck?.id}`);
  };

  const handleReturnToDashboard = () => {
    clearProgress();
    router.push(`/deck/${deck?.id}`);
  };

  const handleRefreshCards = () => {
    setShowSettings(false);
    window.location.reload();
  };

  // Wrap handleCardRate to track session stats
  const handleCardRateWithStats = async (difficulty: Difficulty, responseTime: number) => {
    await handleCardRate(difficulty, responseTime);
    if (pointsEarned) {
      addPoints(pointsEarned);
    }
  };

  const handleRestartDeckWithReset = async () => {
    await handleRestartDeck();
    resetSession();
  };

  // Get the next due date (earliest due date from remaining cards)
  const nextDueDate = orderedCards.length > 0 
    ? orderedCards.reduce((earliest, card) => {
      if (!card.dueDate) return earliest;
      const dueDate = new Date(card.dueDate);
      return !earliest || dueDate < earliest ? dueDate : earliest;
    }, null as Date | null)
    : null;

  // Loading states - check these first
  if (isLoading || isLoadingCards || !deck) {
    return <LoadingState message={isLoadingCards ? "Loading your cards..." : "Loading..."} />;
  }

  // Error state - deck not found after loading complete
  if (!isLoading && !deck) {
    return <ErrorState onReturnToDashboard={handleReturnToDashboard} />;
  }

  // Processing state - deck is being generated
  if (deck.isProcessing) {
    return <ProcessingState />;
  }

  // Completion state - finished all cards in this session
  if (deckCompleted && cardsReviewed > 0) {
    return (
      <DeckCompletionScreen
        totalPoints={totalPoints}
        onRestartDeck={handleRestartDeckWithReset}
        onSeePerformance={handleSeePerformance}
        onReturnToDashboard={handleReturnToDashboard}
        sessionTime={sessionTime}
        pointsEarned={sessionPoints}
        cardsReviewed={cardsReviewed}
      />
    );
  }

  // No due cards state - no cards to review (not from this session)
  if (newCardCount === 0 && dueCardCount === 0) {
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
          />
        </div>
        
        {/* Flashcard container - add top margin to account for fixed header */}
        <div className="flex-1 flex items-center justify-center px-6 mt-[104px]">
          <FlashcardContainer
            cards={orderedCards}
            currentCardIndex={currentCardIndex}
            showBack={showBack}
            pointsEarned={pointsEarned}
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
      />

      {/* Settings modal */}
      <SettingsModal
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        onRefreshCards={handleRefreshCards}
        deckId={deckId}
      />

      {/* Mind map modal */}
      {deck?.mindMap && (
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