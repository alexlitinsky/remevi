'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStudyDeck } from '@/hooks/useStudyDeck';
import { StudyDeckHeader } from '@/components/study/StudyDeckHeader';
import { FlashcardContainer } from '@/components/study/FlashcardContainer';
import { DeckCompletionScreen } from '@/components/study/DeckCompletionScreen';
import { LoadingState, ErrorState, ProcessingState } from '@/components/study/StudyDeckStates';
import { MindMapModal } from '@/components/study/MindMapModal';
import { SettingsModal } from '@/components/study/SettingsModal';
import { StudyActionButtons } from '@/components/study/StudyActionButtons';

export default function StudyDeckPage() {
  const params = useParams();
  const router = useRouter();
  const [showMindMap, setShowMindMap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const deckId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  const {
    studyDeck,
    orderedCards,
    currentCardIndex,
    showBack,
    pointsEarned,
    deckCompleted,
    totalPoints,
    isLoading,
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
  } = useStudyDeck(deckId);

  const handleSeePerformance = () => {
    // Navigate to performance page (future enhancement)
    router.push(`/?deck=${studyDeck?.id}`);
  };

  const handleReturnToDashboard = () => {
    clearProgress();
    router.push('/');
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
  if (!studyDeck) {
    return <ErrorState onReturnToDashboard={handleReturnToDashboard} />;
  }

  // Processing state - deck is being generated
  if (studyDeck.isProcessing) {
    return <ProcessingState />;
  }

  // Completion state - all cards reviewed
  if (deckCompleted || orderedCards.length === 0) {
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
          title={studyDeck.title}
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
            onNext={currentCardIndex < orderedCards.length - 1 ? moveToNextCard : undefined}
            onPrev={currentCardIndex > 0 ? moveToPrevCard : undefined}
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
      {studyDeck.mindMap && (
        <MindMapModal
          isVisible={showMindMap}
          onClose={() => setShowMindMap(false)}
          nodes={studyDeck.mindMap.nodes}
          connections={studyDeck.mindMap.connections}
        />
      )}
    </main>
  );
}