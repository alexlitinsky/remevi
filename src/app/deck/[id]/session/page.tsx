"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStudySessionStore } from "@/stores/useStudySessionStore";
import { ErrorState, LoadingState, ProcessingState } from "@/components/session/StudyDeckStates";
import { NoDueCardsScreen } from "@/components/session/NoDueCardsScreen";
import { DeckCompletionScreen } from "@/components/session/DeckCompletionScreen";
import { StudyDeckHeader } from "@/components/session/StudyDeckHeader";
import { FlashcardContainer } from "@/components/session/FlashcardContainer";
import { StudyActionButtons } from "@/components/session/StudyActionButtons";
import { SettingsModal } from "@/components/session/StudyModals";

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
    newCardCount,
    dueCardCount,
    sessionTime,
    sessionPoints,
    streak,
    isLoading,
    isLoadingCards,
    error,
    showSettings,
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

  // Add polling for deck updates during processing with client-side timeout
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let processingStartTime: Date | null = null;

    if (deck?.isProcessing) {
      processingStartTime = deck.processingStartTime ? new Date(deck.processingStartTime) : new Date(); // Use existing start time or now

      pollInterval = setInterval(async () => {
        try {
          // Client-side timeout check (2 minutes)
          if (processingStartTime && (new Date().getTime() - processingStartTime.getTime()) > 120000) {
            console.warn(`Client-side timeout: Deck ${deckId} still processing after 3 minutes. Forcing study session.`);
            if (pollInterval) clearInterval(pollInterval);
            // Force stop processing state and attempt to load cards
            useStudySessionStore.setState(state => ({
              ...state,
              deck: state.deck ? { ...state.deck, isProcessing: false, processingStage: 'CLIENT_TIMEOUT' } : undefined,
              isLoading: false, // Ensure loading state is off
            }));
            // Optionally, try re-initializing to fetch any available cards
            // initSession(); // Uncomment if you want to force a card fetch after timeout
            return;
          }

          // Regular polling
          const response = await fetch(`/api/deck-processing/${deckId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch deck status: ${response.statusText}`);
          }
          const updatedDeck = await response.json();

          // If processing finished on the server
          if (!updatedDeck.isProcessing) {
            if (pollInterval) clearInterval(pollInterval);
            setDeckId(deckId);
            initSession(); // Reload cards and session data
          } else {
            // Update processing progress
            useStudySessionStore.setState(state => ({
              ...state,
              deck: state.deck ? {
                ...state.deck,
                processingProgress: updatedDeck.processingProgress,
                processingStage: updatedDeck.processingStage,
                processedChunks: updatedDeck.processedChunks,
                totalChunks: updatedDeck.totalChunks,
                isProcessing: true,
                // Update start time if it wasn't set before
                processingStartTime: state.deck.processingStartTime || updatedDeck.processingStartTime || processingStartTime?.toISOString(),
              } : undefined
            }));
          }
        } catch (error) {
          console.error('Error polling deck status:', error);
          // Consider stopping polling on error or implementing backoff
          // if (pollInterval) clearInterval(pollInterval);
        }
      }, 5000); // Poll every 5 seconds
    }

    // Cleanup function
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [deck?.isProcessing, deck?.processingStartTime, deckId, setDeckId, initSession]);

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
        sessionTime={sessionTime}
        pointsEarned={sessionPoints}
        cardsReviewed={cardsReviewed}
        onRestartDeck={restartDeck}
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
        title={deck?.title || "Study Session"}
        deckId={deckId}
        newCardCount={newCardCount}
        dueCardCount={dueCardCount}
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

{/* Floating Action Buttons */}
<StudyActionButtons
  onShowSettings={() => toggleSettings(true)}
/>

      </main>


      {/* Modals */}
      <SettingsModal
        isVisible={showSettings}
        onClose={() => toggleSettings(false)}
        onRefreshCards={initSession}
        deckId={deckId}
      />

    </div>
  );
} 