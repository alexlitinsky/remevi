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

export interface StudyDeck {
  id: string;
  title: string;
  createdAt: string;
  isProcessing: boolean;
  error?: string;
  flashcards: Array<{
    id?: string;
    front: string;
    back: string;
  }>;
  mindMap: {
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
  const [studyDeck, setStudyDeck] = useState<StudyDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [deckCompleted, setDeckCompleted] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCardIds, setCompletedCardIds] = useState<string[]>([]);
  const [orderedCards, setOrderedCards] = useState<FlashcardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCardsInDeck, setTotalCardsInDeck] = useState<number>(0);
  const [newCardCount, setNewCardCount] = useState(0);
  const [dueCardCount, setDueCardCount] = useState(0);

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
    if (!studyDeck) return;
    
    // Only save if we have made some progress
    if (currentCardIndex > 0 || totalPoints > 0) {
      localStorage.setItem(`study-progress-${studyDeck.id}`, JSON.stringify({
        currentIndex: currentCardIndex,
        totalPointsEarned: totalPoints,
        completedCardIds,
        lastStudied: new Date().toISOString()
      }));
    }
  }, [currentCardIndex, studyDeck?.id, studyDeck, totalPoints, completedCardIds]);

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

  // Fetch study deck and due cards
  useEffect(() => {
    let mounted = true;

    const fetchStudyDeck = async () => {
      try {
        // First fetch the deck info
        const deckResponse = await fetch(`/api/study-decks/${deckId}`);
        if (!deckResponse.ok || !mounted) return;
        
        const deckData = await deckResponse.json();
        setStudyDeck(deckData);
        setTotalCardsInDeck(deckData.flashcards.length);
        
        // Then fetch the due cards
        const dueCardsResponse = await fetch(`/api/study-decks/${deckId}/due-cards`);
        if (!dueCardsResponse.ok || !mounted) return;
        
        const dueCardsData = await dueCardsResponse.json();
        
        // Count new and due cards
        const newCards = dueCardsData.cards.filter((card: FlashcardData) => card.isNew);
        const dueCards = dueCardsData.cards.filter((card: FlashcardData) => card.isDue && !card.isNew);
        
        setNewCardCount(newCards.length);
        setDueCardCount(dueCards.length);
        setOrderedCards(dueCardsData.cards);
        
        // If there are no cards to study, we consider the deck completed
        if (dueCardsData.cards.length === 0) {
          setDeckCompleted(true);
        }
        
        // If still processing, poll every 2 seconds
        if (deckData.isProcessing) {
          const pollTimer = setTimeout(fetchStudyDeck, 2000);
          return () => clearTimeout(pollTimer);
        }
      } catch (error) {
        console.error('Failed to fetch study deck:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStudyDeck();
    return () => {
      mounted = false;
    };
  }, [deckId]);

  // Handle card rating
  const handleCardRate = async (difficulty: Difficulty, responseTime: number) => {
    if (!studyDeck || !orderedCards.length) return;

    try {
      const currentCard = orderedCards[currentCardIndex];
      
      // Check if this is the last card
      const isLastCard = currentCardIndex >= orderedCards.length - 1;
      
      // First, show points animation
      const response = await fetch(
        `/api/study-decks/${studyDeck.id}/cards/${currentCard.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ difficulty, responseTime, front: currentCard.front, back: currentCard.back }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const { pointsEarned, cardProgress } = await response.json();
      
      // Set points earned for the current card
      setPointsEarned(pointsEarned);
      
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
              dueDate: cardProgress.dueDate,
              easeFactor: cardProgress.easeFactor,
              repetitions: cardProgress.repetitions,
              interval: cardProgress.interval
            } 
          : card
      );
      
      // Re-order cards based on updated SRS data
      const reorderedCards = orderCardsBySRS(updatedCards);
      
      // Show points animation, then go directly to next card
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
      }, 300); // Give a little time to show the points before transitioning
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  // Restart the deck
  const handleRestartDeck = () => {
    // Reset state for restart
    if (!studyDeck) return;
    
    // Ensure all cards have an id
    const cardsWithIds = studyDeck.flashcards.map(card => ({
      ...card,
      id: card.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
      isNew: true,
      isDue: true
    })) as FlashcardData[];
    
    const ordered = orderCardsBySRS(cardsWithIds);
    setOrderedCards(ordered);
    setCurrentCardIndex(0);
    setShowBack(false);
    setDeckCompleted(false);
  };

  // Clear progress
  const clearProgress = () => {
    if (studyDeck) {
      localStorage.removeItem(`study-progress-${studyDeck.id}`);
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
  };
}
