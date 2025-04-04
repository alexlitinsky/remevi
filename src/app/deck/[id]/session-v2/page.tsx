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

  // Add this useEffect in session-v2/page.tsx
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [endSession]);

  // Add polling for deck updates during processing
  useEffect(() => {
    if (deck?.isProcessing) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/deck-processing/${deckId}`);
          const updatedDeck = await response.json();
          
          // Only trigger full reload if processing is complete
          if (!updatedDeck.isProcessing) {
            setDeckId(deckId);
            initSession();
          } else {
            // Just update the deck processing status without reinitializing
            useStudySessionStore.setState(state => ({
              ...state,
              deck: {
                ...state.deck!,  // Assert deck exists
                name: state.deck?.name || '',  // Ensure required fields have defaults
                id: state.deck?.id || '',
                processingProgress: updatedDeck.processingProgress,
                processingStage: updatedDeck.processingStage,
                processedChunks: updatedDeck.processedChunks,
                totalChunks: updatedDeck.totalChunks,
                mindMap: updatedDeck.mindMap, // Make sure this is included
                isProcessing: true
              }
            }));

            console.log(`Processing: ${updatedDeck.processingProgress}% - ${updatedDeck.processingStage}`);

          }
        } catch (error) {
          console.error('Error polling deck status:', error);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [deck?.isProcessing, deckId, setDeckId, initSession]);

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
    return <ProcessingState deck={deck} />;
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
      nodes={deck?.mindMap?.nodes || []}
      connections={deck?.mindMap?.connections || []}
    />
    </div>
  );
} 