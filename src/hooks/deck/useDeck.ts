import { useState, useEffect } from 'react';
import type { DeckData, FlashcardData, Difficulty } from './types';
import { useDeckProgress } from './useDeckProgress';
import { useCardOrdering } from './useCardOrdering';
import { useDeckAPI } from './useDeckAPI';
import { useCardNavigation } from './useCardNavigation';

export function useDeck(deckId: string) {
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [orderedCards, setOrderedCards] = useState<FlashcardData[]>([]);
  const [deckCompleted, setDeckCompleted] = useState(false);
  const [totalCardsInDeck, setTotalCardsInDeck] = useState<number>(0);
  const [newCardCount, setNewCardCount] = useState(0);
  const [dueCardCount, setDueCardCount] = useState(0);

  // Compose hooks
  const {
    currentCardIndex,
    setCurrentCardIndex,
    totalPoints,
    setTotalPoints,
    completedCardIds,
    setCompletedCardIds,
    clearProgress
  } = useDeckProgress(deckId);

  const { orderCardsBySRS } = useCardOrdering();
  
  const {
    isLoading,
    isLoadingCards,
    wasProcessing,
    fetchDueCards,
    fetchDeck,
    submitCardReview
  } = useDeckAPI(deckId);

  const {
    showBack,
    setShowBack,
    pointsEarned,
    setPointsEarned,
    flipCard,
    moveToNextCard,
    moveToPrevCard
  } = useCardNavigation();

  // Fetch deck and due cards
  useEffect(() => {
    let mounted = true;
    let pollTimer: NodeJS.Timeout;

    const loadDeck = async () => {
      const result = await fetchDeck();
      if (!result || !mounted) return;

      const { deckData, finishedProcessing } = result;
      setDeck(deckData);

      // Only fetch due cards if not processing and not in the middle of a transition
      if (!deckData.isProcessing && !finishedProcessing) {
        const dueCardsData = await fetchDueCards();
        if (dueCardsData && mounted) {
          updateCardCounts(dueCardsData);
        }
      }

      // If still processing, poll every 2 seconds
      if (deckData.isProcessing) {
        pollTimer = setTimeout(loadDeck, 2000);
      }

      // If just finished processing, fetch due cards again
      if (finishedProcessing && mounted) {
        setTimeout(async () => {
          const dueCardsData = await fetchDueCards();
          if (dueCardsData && mounted) {
            updateCardCounts(dueCardsData);
          }
        }, 500);
      }
    };

    loadDeck();
    
    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [fetchDeck, fetchDueCards]);

  const updateCardCounts = (dueCardsData: { cards: FlashcardData[], totalCardCount: number }) => {
    const newCards = dueCardsData.cards.filter(card => card.isNew);
    const dueCards = dueCardsData.cards.filter(card => card.isDue && !card.isNew);
    
    setNewCardCount(newCards.length);
    setDueCardCount(dueCards.length);
    setOrderedCards(dueCardsData.cards);
    setTotalCardsInDeck(dueCardsData.totalCardCount);
    
    if (dueCardsData.cards.length === 0) {
      setDeckCompleted(true);
    } else {
      setDeckCompleted(false);
    }
  };

  // Handle card rating
  const handleCardRate = async (difficulty: Difficulty, responseTime: number) => {
    if (!deck || !orderedCards.length) return;

    const currentCard = orderedCards[currentCardIndex];
    const isLastCard = currentCardIndex >= orderedCards.length - 1;
    
    // Show estimated points immediately
    const estimatedPoints = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 10 : 5;
    setPointsEarned(estimatedPoints);
    
    const result = await submitCardReview(deck.id, currentCard.id, difficulty, responseTime);
    if (!result) return;

    const { pointsEarned: actualPoints, cardInteraction } = result;
    
    // Update total points
    setTotalPoints(prev => prev + actualPoints);
    
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
            dueDate: cardInteraction.dueDate,
            easeFactor: cardInteraction.easeFactor,
            repetitions: cardInteraction.repetitions,
            interval: cardInteraction.interval
          } 
        : card
    );
    
    // Re-order cards based on updated SRS data
    const reorderedCards = orderCardsBySRS(updatedCards);
    
    // Show points animation, then go directly to next card
    setTimeout(() => {
      if (isLastCard) {
        setDeckCompleted(true);
        setPointsEarned(null);
      } else {
        setShowBack(false);
        setCurrentCardIndex(prev => prev + 1);
        setPointsEarned(null);
        setOrderedCards(reorderedCards);
      }
    }, 50);
  };

  // Restart the deck
  const handleRestartDeck = async () => {
    if (!deck) return;
    
    const dueCardsData = await fetchDueCards();
    if (dueCardsData) {
      updateCardCounts(dueCardsData);
      setCurrentCardIndex(0);
      setShowBack(false);
      setDeckCompleted(false);
    }
  };

  return {
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
    moveToNextCard: (index: number) => moveToNextCard(index, orderedCards.length, setCurrentCardIndex),
    moveToPrevCard: (index: number) => moveToPrevCard(index, setCurrentCardIndex),
    setDeckCompleted
  };
} 