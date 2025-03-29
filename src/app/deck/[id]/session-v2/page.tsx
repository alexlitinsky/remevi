"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudySessionStore } from "@/stores/useStudySessionStore";
import { ErrorState, LoadingState, ProcessingState } from "@/components/session-v2/StudyDeckStates";
import { NoDueCardsScreen } from "@/components/session-v2/NoDueCardsScreen";
import { DeckCompletionScreen } from "@/components/session-v2/DeckCompletionScreen";
import { StudyDeckHeader } from "@/components/session-v2/StudyDeckHeader";
import { FlashcardContainer } from "@/components/session-v2/FlashcardContainer";
import { StudyActionButtons } from "@/components/session-v2/StudyActionButtons";
import { SettingsModal, MindMapModal } from "@/components/session-v2/StudyModals";

// Client-side wrapper component that doesn't receive params directly
export default function DeckStudyPage() {
  // Get params from the useParams() hook
  const params = useParams();
  const deckId = params.id as string;
  
  const router = useRouter();
  const {
    deck,
    orderedCards,
    currentCardIndex,
    showBack,
    deckCompleted,
    totalCardsInDeck,
    newCardCount,
    dueCardCount,
    completedCardIds,
    originalNewCount,
    originalDueCount,
    sessionTime,
    sessionPoints,
    streak,
    isLoading,
    isLoadingCards,
    error,
    showSettings,
    showMindMap,
    lastEarnedPoints,
    calculateProgress,
    getCardsReviewed,
    
    // Actions
    setDeckId,
    initSession,
    flipCard,
    rateCard,
    moveToNextCard,
    moveToPrevCard,
    restartDeck,
    endSession,
    toggleSettings,
    toggleMindMap
  } = useStudySessionStore();

  // Set deck ID and initialize session when the component mounts
  useEffect(() => {
    setDeckId(deckId);
    initSession();
    
    // Cleanup on unmount
    return () => {
      endSession();
    };
  }, [deckId, setDeckId, initSession, endSession]);

  // Handle different states
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        description="There was an error loading your study session."
        onReturnToHome={() => router.push("/")}
      />
    );
  }

  if (deck?.isProcessing) {
    return <ProcessingState progress="Generating flashcards..." />;
  }

  if (deckCompleted && orderedCards.length === 0) {
    return (
      <NoDueCardsScreen
        onRestartDeck={restartDeck}
        onReturnToDashboard={() => router.push(`/deck/${deckId}`)}
      />
    );
  }

  if (deckCompleted) {
    // Get the accurate count of cards reviewed
    const cardsReviewed = getCardsReviewed();
    
    return (
      <DeckCompletionScreen
        totalPoints={sessionPoints}
        sessionTime={sessionTime}
        pointsEarned={sessionPoints}
        cardsReviewed={cardsReviewed}
        onRestartDeck={restartDeck}
        onSeePerformance={() => router.push(`/deck/${deckId}/stats`)}
        onReturnToDashboard={() => router.push(`/deck/${deckId}`)}
        onReturnToHome={() => router.push('/')}
      />
    );
  }

  // Check if we have cards to study
  if (orderedCards.length === 0) {
    if (isLoadingCards) {
      return <LoadingState message="Loading flashcards..." />;
    }
    
    return (
      <NoDueCardsScreen
        onRestartDeck={restartDeck}
        onReturnToDashboard={() => router.push(`/deck/${deckId}`)}
      />
    );
  }

  // Main study session view
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <StudyDeckHeader
        title={deck?.name || "Study Session"}
        deckId={deckId}
        newCardCount={newCardCount}
        dueCardCount={dueCardCount}
        totalCardCount={totalCardsInDeck}
        currentCardIndex={currentCardIndex}
        originalNewCount={originalNewCount}
        originalDueCount={originalDueCount}
        streak={streak}
        pointsEarned={sessionPoints}
        sessionTime={sessionTime}
        progress={calculateProgress()}
      />

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <FlashcardContainer
          cards={orderedCards}
          currentCardIndex={currentCardIndex}
          showBack={showBack}
          pointsEarned={lastEarnedPoints}
          onFlip={flipCard}
          onRate={rateCard}
          onNext={moveToNextCard}
          onPrev={moveToPrevCard}
        />
      </main>

      {/* Floating Action Buttons */}
      <StudyActionButtons
        onShowSettings={() => toggleSettings(true)}
        onToggleMindMap={() => toggleMindMap(true)}
        mindMapAvailable={true} // You may need to implement logic to determine when mind map is available
      />

      {/* Modals */}
      <SettingsModal
        isVisible={showSettings}
        onClose={() => toggleSettings(false)}
        onRefreshCards={initSession}
        deckId={deckId}
      />

      <MindMapModal
        isVisible={showMindMap}
        onClose={() => toggleMindMap(false)}
        nodes={[
          // This is sample data. In a real app, you'd fetch the mind map data from an API
          { id: '1', label: 'Main Concept', x: 300, y: 200 },
          { id: '2', label: 'Related Idea 1', x: 150, y: 100 },
          { id: '3', label: 'Related Idea 2', x: 450, y: 100 },
          { id: '4', label: 'Subtopic 1', x: 150, y: 300 },
          { id: '5', label: 'Subtopic 2', x: 450, y: 300 }
        ]}
        connections={[
          { source: '1', target: '2' },
          { source: '1', target: '3' },
          { source: '1', target: '4' },
          { source: '1', target: '5' },
          { source: '2', target: '3', label: 'connected to' }
        ]}
      />
    </div>
  );
} 