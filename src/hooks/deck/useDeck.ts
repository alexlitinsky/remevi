import { useState, useEffect } from 'react';
import type { DeckData, FlashcardData, Difficulty } from './types';
import { useDeckProgress } from './useDeckProgress';
import { useDeckAPI } from './useDeckAPI';
import { useCardNavigation } from './useCardNavigation';
import { calculatePoints } from '@/lib/srs';

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

  
  const {
    isLoading,
    isLoadingCards,
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

  // Load study progress from local storage
  useEffect(() => {
    if (!deckId) return;
    
    const savedProgress = localStorage.getItem(`study-progress-${deckId}`);
    if (savedProgress) {
      try {
        const { currentIndex, totalPointsEarned, completedCardIds, lastStudied } = JSON.parse(savedProgress);
        
        // Only restore progress if it's from the same day
        const today = new Date().toDateString();
        const lastStudyDate = lastStudied ? new Date(lastStudied).toDateString() : null;
        
        if (lastStudyDate === today) {
          setCurrentCardIndex(currentIndex || 0, orderedCards.length - 1);
          setTotalPoints(totalPointsEarned || 0);
          setCompletedCardIds(completedCardIds || []);
        } else {
          // Clear old progress
          localStorage.removeItem(`study-progress-${deckId}`);
        }
      } catch (error) {
        console.error('Error parsing saved progress:', error);
        localStorage.removeItem(`study-progress-${deckId}`);
      }
    }
  }, [deckId]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (!deck) return;
    
    // Only save if we have made some progress
    if (currentCardIndex > 0 || totalPoints > 0 || completedCardIds.length > 0) {
      localStorage.setItem(`study-progress-${deck.id}`, JSON.stringify({
        currentIndex: currentCardIndex,
        totalPointsEarned: totalPoints,
        completedCardIds,
        lastStudied: new Date().toISOString()
      }));
    }
  }, [currentCardIndex, deck?.id, deck, totalPoints, completedCardIds]);

  // Fetch deck and due cards
  useEffect(() => {
    let mounted = true;
    let pollTimer: NodeJS.Timeout;

    const loadDeck = async () => {
      const result = await fetchDeck();
      if (!result || !mounted) return;

      const { deckData, finishedProcessing, dueCardsData } = result;
      
      // Only set deck if we're mounted and have valid data
      if (mounted && deckData) {
        setDeck(deckData);

        // If we got due cards data with the initial fetch, use it
        if (dueCardsData) {
          updateCardCounts(dueCardsData);
        }
        // Otherwise, only fetch due cards if not processing and not in transition
        else if (!deckData.isProcessing && !finishedProcessing) {
          const newDueCardsData = await fetchDueCards();
          if (newDueCardsData && mounted) {
            updateCardCounts(newDueCardsData);
          }
        }

        // If still processing, poll every 2 seconds
        if (deckData.isProcessing) {
          pollTimer = setTimeout(loadDeck, 2000);
        }

        // If just finished processing, fetch due cards again
        if (finishedProcessing && mounted) {
          setTimeout(async () => {
            const newDueCardsData = await fetchDueCards();
            if (newDueCardsData && mounted) {
              updateCardCounts(newDueCardsData);
            }
          }, 500);
        }
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

    // Calculate estimated points using the same function as backend
    const estimatedPoints = calculatePoints(difficulty, responseTime);
    setPointsEarned(estimatedPoints);
    setTotalPoints(prev => prev + estimatedPoints);

    // Update UI immediately
    setCompletedCardIds(prev => {
      if (prev.includes(currentCard.id)) return prev;
      return [...prev, currentCard.id];
    });

    // Update counts immediately
    setNewCardCount(prev => prev - (currentCard.isNew ? 1 : 0));
    setDueCardCount(prev => prev - (!currentCard.isNew ? 1 : 0));

    // Move to next card or complete deck immediately
    if (isLastCard) {
      setDeckCompleted(true);
    } else {
      setShowBack(false);
      setCurrentCardIndex(prev => prev + 1, orderedCards.length - 1);
    }

    // Submit review in background
    submitCardReview(deck.id, currentCard.id, difficulty, responseTime).then(result => {
      if (!result) return;
      // Points should match exactly now, but update total if there's any difference
      if (result.pointsEarned !== estimatedPoints) {
        const pointsDiff = result.pointsEarned - estimatedPoints;
        setTotalPoints(prev => prev + pointsDiff);
      }
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
        setCurrentCardIndex(0, dueCardsData.cards.length - 1);
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
    moveToNextCard: (index: number) => moveToNextCard(index, orderedCards.length, (newIndex: number) => setCurrentCardIndex(newIndex, orderedCards.length - 1)),
    moveToPrevCard: (index: number) => moveToPrevCard(index, (newIndex: number) => setCurrentCardIndex(newIndex, orderedCards.length - 1)),
    setDeckCompleted
  };
} 