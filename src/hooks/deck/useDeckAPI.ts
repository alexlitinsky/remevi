import { useState, useCallback } from 'react';
import type { DeckData, Difficulty } from './types';

export function useDeckAPI(deckId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [wasProcessing, setWasProcessing] = useState(false);

  const fetchDueCards = useCallback(async () => {
    if (!deckId) return null;
    
    try {
      setIsLoadingCards(true);
      
      const response = await fetch(`/api/decks/${deckId}/due-cards`);
      if (!response.ok) {
        setIsLoadingCards(false);
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch due cards:', error);
      return null;
    } finally {
      setIsLoadingCards(false);
    }
  }, [deckId]);

  const fetchDeck = useCallback(async () => {
    try {
      const response = await fetch(`/api/decks/${deckId}`);
      if (!response.ok) return null;
      
      const deckData: DeckData = await response.json();
      
      // Update processing state tracking
      const finishedProcessing = wasProcessing && !deckData.isProcessing;
      setWasProcessing(deckData.isProcessing);
      
      // Only set loading to false when we have both deck data and cards
      if (!deckData.isProcessing) {
        const dueCardsData = await fetchDueCards();
        if (dueCardsData) {
          setIsLoading(false);
          return { deckData, finishedProcessing, dueCardsData };
        }
      }
      
      return { deckData, finishedProcessing };
    } catch (error) {
      console.error('Failed to fetch deck:', error);
      setIsLoading(false);
      return null;
    }
  }, [deckId, wasProcessing, fetchDueCards]);

  const submitCardReview = async (
    deckId: string, 
    cardId: string, 
    difficulty: Difficulty, 
    responseTime: number
  ) => {
    try {
      const response = await fetch(
        `/api/decks/${deckId}/cards/${cardId}/review`,
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

      return await response.json();
    } catch (error) {
      console.error('Error submitting review:', error);
      return null;
    }
  };

  return {
    isLoading,
    isLoadingCards,
    wasProcessing,
    fetchDueCards,
    fetchDeck,
    submitCardReview
  };
} 