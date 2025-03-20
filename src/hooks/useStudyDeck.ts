import { useState, useEffect, useCallback } from 'react';
import { type Difficulty } from '@/lib/srs';

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  dueDate?: string;
  easeFactor?: number;
  repetitions?: number;
  interval?: number;
  isNew?: boolean;
  isDue?: boolean;
}

export interface DeckData {
  id: string;
  title: string;
  createdAt: string;
  isProcessing: boolean;
  error?: string;
  description?: string;
  mindMap?: {
    nodes: Array<{
      id: string;
      label: string;
      x: number;
      y: number;
    }>;
    connections: Array<{
      source: string;
      target: string;
      label?: string;
    }>;
  };
}

export interface StudyProgress {
  currentIndex: number;
  totalPointsEarned: number;
  completedCardIds: string[];
  lastStudied?: string;
}

export function useStudyDeck(deckId: string) {
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [deckCompleted, setDeckCompleted] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCardIds, setCompletedCardIds] = useState<string[]>([]);
  const [orderedCards, setOrderedCards] = useState<FlashcardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [totalCardsInDeck, setTotalCardsInDeck] = useState<number>(0);
  const [newCardCount, setNewCardCount] = useState(0);
  const [dueCardCount, setDueCardCount] = useState(0);
  const [wasProcessing, setWasProcessing] = useState(false);

  // Load study progress from local storage
  useEffect(() => {
    if (!deckId) return;
    
    const savedProgress = localStorage.getItem(`study-progress-${deckId}`);
    if (savedProgress) {
      try {
        const { currentIndex, totalPointsEarned, completedCardIds } = JSON.parse(savedProgress);
        setCurrentCardIndex(currentIndex || 0);
        setTotalPoints(totalPointsEarned || 0);
        setCompletedCardIds(completedCardIds || []);
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
    if (currentCardIndex > 0 || totalPoints > 0) {
      localStorage.setItem(`study-progress-${deck.id}`, JSON.stringify({
        currentIndex: currentCardIndex,
        totalPointsEarned: totalPoints,
        completedCardIds,
        lastStudied: new Date().toISOString()
      }));
    }
  }, [currentCardIndex, deck?.id, deck, totalPoints, completedCardIds]);

  // Order cards based on SRS data
  const orderCardsBySRS = useCallback((cards: FlashcardData[]) => {
    if (!cards || !cards.length) return [];
    
    // First, separate new cards from cards with progress
    const newCards = cards.filter(card => card.isNew);
    const dueCards = cards.filter(card => !card.isNew && card.isDue);
    
    // Sort due cards by due date (earliest first)
    const sortedDueCards = dueCards.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });
    
    // Combine new cards first, then due cards
    return [...newCards, ...sortedDueCards];
  }, []);

  // Fetch due cards
  const fetchDueCards = useCallback(async () => {
    if (!deckId) return;
    
    try {
      setIsLoadingCards(true);
      
      const dueCardsResponse = await fetch(`/api/study-decks/${deckId}/due-cards`);
      if (!dueCardsResponse.ok) {
        setIsLoadingCards(false);
        return;
      }
      
      const dueCardsData = await dueCardsResponse.json();
      
      // Count new and due cards
      const newCards = dueCardsData.cards.filter((card: FlashcardData) => card.isNew);
      const dueCards = dueCardsData.cards.filter((card: FlashcardData) => card.isDue && !card.isNew);
      
      setNewCardCount(newCards.length);
      setDueCardCount(dueCards.length);
      setOrderedCards(dueCardsData.cards);
      setTotalCardsInDeck(dueCardsData.totalCardCount);
      
      // If there are no cards to study, we consider the deck completed
      if (dueCardsData.cards.length === 0) {
        setDeckCompleted(true);
      } else {
        setDeckCompleted(false);
      }
      
      setIsLoadingCards(false);
    } catch (error) {
      console.error('Failed to fetch due cards:', error);
      setIsLoadingCards(false);
    }
  }, [deckId]);

  // Fetch deck and due cards
  useEffect(() => {
    let mounted = true;
    let pollTimer: NodeJS.Timeout;

    const fetchDeck = async () => {
      try {
        // First fetch the deck info
        const deckResponse = await fetch(`/api/study-decks/${deckId}`);
        if (!deckResponse.ok || !mounted) return;
        
        const deckData = await deckResponse.json();
        
        // Check if deck was processing and now is not
        const finishedProcessing = wasProcessing && !deckData.isProcessing;
        
        setDeck(deckData);
        
        // Update processing state tracking
        setWasProcessing(deckData.isProcessing);
        
        // Only fetch due cards if not processing and not in the middle of a transition
        if (!deckData.isProcessing && !finishedProcessing) {
          await fetchDueCards();
        }
        
        // If still processing, poll every 2 seconds
        if (deckData.isProcessing) {
          pollTimer = setTimeout(fetchDeck, 2000);
        }
        
        // If just finished processing, fetch due cards again to ensure we have the latest data
        if (finishedProcessing) {
          // Keep loading state active during transition
          setIsLoadingCards(true);
          
          // Add a small delay to ensure backend processing is complete
          setTimeout(async () => {
            if (mounted) {
              await fetchDueCards();
            }
          }, 500);
        }
      } catch (error) {
        console.error('Failed to fetch deck:', error);
      } finally {
        if (mounted && !wasProcessing) {
          setIsLoading(false);
        }
      }
    };

    fetchDeck();
    
    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [deckId, fetchDueCards, wasProcessing]);

  // Handle card rating
  const handleCardRate = async (difficulty: Difficulty, responseTime: number) => {
    if (!deck || !orderedCards.length) return;

    try {
      const currentCard = orderedCards[currentCardIndex];
      
      // Check if this is the last card
      const isLastCard = currentCardIndex >= orderedCards.length - 1;
      
      // Show estimated points immediately based on difficulty
      // This gives instant feedback while the actual calculation happens on the server
      const estimatedPoints = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 10 : 5;
      setPointsEarned(estimatedPoints);
      
      // Make the API call in parallel
      const response = await fetch(
        `/api/study-decks/${deck.id}/cards/${currentCard.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ difficulty, responseTime }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const { pointsEarned, cardInteraction } = await response.json();
      
      // Update total points
      setTotalPoints(prev => prev + pointsEarned);
      
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
      // Timing synchronized with the points fade-out animation
      setTimeout(() => {
        if (isLastCard) {
          // Set deck completed state
          setDeckCompleted(true);
          setPointsEarned(null);
        } else {
          // Move to next card - reset to front side
          setShowBack(false);
          setCurrentCardIndex(prev => prev + 1);
          setPointsEarned(null);
          setOrderedCards(reorderedCards);
        }
      }, 550); // Synchronized with the animation duration in flashcard.tsx
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  // Restart the deck
  const handleRestartDeck = () => {
    // Reset state for restart
    if (!deck) return;
    
    // Fetch all cards for the deck
    fetchDueCards();
    setCurrentCardIndex(0);
    setShowBack(false);
    setDeckCompleted(false);
  };

  // Clear progress
  const clearProgress = () => {
    if (deck) {
      localStorage.removeItem(`study-progress-${deck.id}`);
    }
  };

  // Flip card
  const flipCard = () => {
    setShowBack(!showBack);
  };

  // Move to next card
  const moveToNextCard = () => {
    if (currentCardIndex < orderedCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowBack(false);
      setPointsEarned(null);
    }
  };

  // Move to previous card
  const moveToPrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setShowBack(false);
      setPointsEarned(null);
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
    moveToNextCard,
    moveToPrevCard,
    setDeckCompleted
  };
}
