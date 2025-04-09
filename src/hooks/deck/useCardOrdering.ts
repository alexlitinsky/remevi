import { useCallback } from 'react';
import type { FlashcardData } from './types';

export function useCardOrdering() {
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

  return { orderCardsBySRS };
} 