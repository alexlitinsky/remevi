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
    
    // Immediately update UI
    const estimatedPoints = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 10 : 5;
    
    // Move to next card immediately
    if (isLastCard) {
      setDeckCompleted(true);
    } else {
      setShowBack(false);
      setCurrentCardIndex(prev => prev + 1);
    }

    // Update counts immediately
    setNewCardCount(prev => prev - (currentCard.isNew ? 1 : 0));
    setDueCardCount(prev => prev - (!currentCard.isNew ? 1 : 0));

    // Submit review in background
    submitCardReview(deck.id, currentCard.id, difficulty, responseTime).then(result => {
      if (!result) return;
      // TODO: React strict mode calls it twice shouldnt be issue in prod
      setPointsEarned(result.pointsEarned);
      setTotalPoints(prev => prev + result.pointsEarned);

      // Update card data
      const updatedCards = orderedCards.map(card => 
        card.id === currentCard.id 
          ? { 
              ...card, 
              dueDate: result.cardInteraction.dueDate,
              easeFactor: result.cardInteraction.easeFactor,
              repetitions: result.cardInteraction.repetitions,
              interval: result.cardInteraction.interval,
              isNew: false
            } 
          : card
      );

      // Re-order cards in background
      // const reorderedCards = orderCardsBySRS(updatedCards);
      // setOrderedCards(reorderedCards);
    });

    // Track completed card
    setCompletedCardIds(prev => {
      if (prev.includes(currentCard.id)) return prev;
      return [...prev, currentCard.id];
    });
  };

  // Restart the deck
  const handleRestartDeck = async () => {
    if (!deck) return;
    
    try {
      // First reset all cards to be due
      const resetResponse = await fetch(`/api/decks/${deck.id}/reset`, {
        method: 'POST'
      });
      
      if (!resetResponse.ok) {
        console.error('Failed to reset deck');
        return;
      }
      
      // Then fetch the newly due cards
      const dueCardsData = await fetchDueCards();
      if (dueCardsData) {
        updateCardCounts(dueCardsData);
        setCurrentCardIndex(0);
        setShowBack(false);
        setDeckCompleted(false);
      }
    } catch (error) {
      console.error('Error restarting deck:', error);
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