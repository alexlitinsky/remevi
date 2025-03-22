'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDeck } from '@/hooks/deck/useDeck';
import { StudyDeckHeader } from '@/components/deck/StudyDeckHeader';
import { FlashcardContainer } from '@/components/deck/FlashcardContainer';
import { DeckCompletionScreen } from '@/components/deck/DeckCompletionScreen';
import { LoadingState, ErrorState, ProcessingState } from '@/components/deck/StudyDeckStates';
import { MindMapModal } from '@/components/deck/MindMapModal';
import { SettingsModal } from '@/components/deck/SettingsModal';
import { StudyActionButtons } from '@/components/deck/StudyActionButtons';

export default function StudyDeckPage() {
  const params = useParams();
  const router = useRouter();
  const [showMindMap, setShowMindMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
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

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state - no deck found
  // if (!deck) {
  //   return <ErrorState onReturnToDashboard={handleReturnToDashboard} />;
  // }

  // Processing state - deck is being generated
  if (deck?.isProcessing) {
    return <ProcessingState />;
  }
  
  // Cards loading state - transitioning from processing to ready
  if (isLoadingCards) {
    return <LoadingState message="Loading your cards..." />;
  }

  // Completion state - all cards reviewed
  if (deckCompleted) {
    return (
      <DeckCompletionScreen
        totalPoints={totalPoints}
        onRestartDeck={handleRestartDeck}
        onSeePerformance={handleSeePerformance}
        onReturnToDashboard={handleReturnToDashboard}
      />
    );
  }

  // Main study interface
  return (
    <main className="h-screen pt-16 bg-background overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header with card counts */}
        <StudyDeckHeader
          title={deck?.title || ''}
          newCardCount={newCardCount}
          dueCardCount={dueCardCount}
          totalCardCount={totalCardsInDeck}
        />
        
        {/* Flashcard container */}
        <div className="flex-1 flex items-center justify-center px-6">
          <FlashcardContainer
            cards={orderedCards}
            currentCardIndex={currentCardIndex}
            showBack={showBack}
            pointsEarned={pointsEarned}
            onFlip={flipCard}
            onRate={handleCardRate}
            onNext={currentCardIndex < orderedCards.length - 1 ? () => moveToNextCard(currentCardIndex + 1) : undefined}
            onPrev={currentCardIndex > 0 ? () => moveToPrevCard(currentCardIndex - 1) : undefined}
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