import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DeckData, Difficulty } from '@/types';
import { calculatePoints } from '@/lib/srs';

// Assuming FlashcardData exists in your project
// If not, we need to define it
export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  isNew: boolean;
  isDue: boolean;
  deck_id: string;
  hint?: string;
  tags?: string[];
}

interface StudySessionState {
  // Deck and cards data
  deckId: string;
  deck: DeckData | null;
  orderedCards: FlashcardData[];
  currentCardIndex: number;
  showBack: boolean;
  deckCompleted: boolean;
  totalCardsInDeck: number;
  newCardCount: number;
  dueCardCount: number;
  completedCardIds: string[];
  originalNewCount: number;
  originalDueCount: number;
  originalCardIds: string[];
  hasSetOriginalCounts: boolean;
  
  // Session stats
  sessionTime: number;
  sessionId: string | null;
  streak: number;
  sessionPoints: number;
  totalPoints: number;
  cardsReviewed: number;
  isSessionActive: boolean;
  lastEarnedPoints: number | null;
  hasStarted: boolean;
  
  // UI state
  isLoading: boolean;
  isLoadingCards: boolean;
  showSettings: boolean;
  showMindMap: boolean;
  
  // Error state
  error: string | null;
  
  // Required for timer cleanup
  timerId: number | null;

  // Actions
  setDeckId: (deckId: string) => void;
  initSession: () => Promise<void>;
  flipCard: () => void;
  startSession: () => Promise<void>;
  rateCard: (difficulty: Difficulty, responseTime: number) => Promise<void>;
  moveToNextCard: () => void;
  moveToPrevCard: () => void;
  restartDeck: () => Promise<void>;
  endSession: () => Promise<void>;
  clearProgress: () => void;
  toggleSettings: (show?: boolean) => void;
  toggleMindMap: (show?: boolean) => void;
  calculateProgress: () => number;
  getCardsReviewed: () => number;
}

type StudySessionPersist = Pick<
  StudySessionState,
  'deckId' | 'currentCardIndex' | 'totalPoints' | 'completedCardIds' | 'sessionId'
>;

export const useStudySessionStore = create<StudySessionState>()(
  persist<StudySessionState, [], [], StudySessionPersist>(
    (set, get) => ({
      // Default state
      deckId: '',
      deck: null,
      orderedCards: [],
      currentCardIndex: 0,
      showBack: false,
      deckCompleted: false,
      totalCardsInDeck: 0,
      newCardCount: 0,
      dueCardCount: 0,
      completedCardIds: [],
      originalNewCount: 0,
      originalDueCount: 0,
      originalCardIds: [],
      hasSetOriginalCounts: false,
      
      sessionTime: 0,
      sessionId: null,
      streak: 0,
      sessionPoints: 0,
      totalPoints: 0, 
      cardsReviewed: 0,
      isSessionActive: false,
      lastEarnedPoints: null,
      hasStarted: false,
      
      isLoading: true,
      isLoadingCards: false,
      showSettings: false,
      showMindMap: false,
      
      error: null,
      timerId: null,

      // Set deckId
      setDeckId: (deckId: string) => set({ deckId }),

      // Initialize the session
      initSession: async () => {
        const { deckId } = get();
        if (!deckId) return;

        // Add the reset here, before setting isLoading
        if (!get().hasStarted) {
            set({ currentCardIndex: 0 });
        }

        set({ isLoading: true, error: null });
        
        try {
          // Fetch deck data
          const deckResponse = await fetch(`/api/decks/${deckId}`);
          if (!deckResponse.ok) {
            throw new Error(`Failed to fetch deck: ${deckResponse.statusText}`);
          }
          
          const deckData: DeckData = await deckResponse.json();
          set({ deck: deckData });
          
          // If deck is still processing, we don't need to fetch cards
          if (deckData.isProcessing) {
            set({ isLoading: false });
            return;
          }
          
          // Fetch due cards
          set({ isLoadingCards: true });
          const cardsResponse = await fetch(`/api/decks/${deckId}/due-cards`);
          
          if (!cardsResponse.ok) {
            throw new Error(`Failed to fetch cards: ${cardsResponse.statusText}`);
          }
          
          const cardsData = await cardsResponse.json();
          
          // Update card counts
          const newCards = cardsData.cards.filter((card: FlashcardData) => card.isNew);
          const dueCards = cardsData.cards.filter((card: FlashcardData) => card.isDue && !card.isNew);
          
          set({
            orderedCards: cardsData.cards,
            totalCardsInDeck: cardsData.totalCardCount,
            newCardCount: newCards.length,
            dueCardCount: dueCards.length,
            deckCompleted: cardsData.cards.length === 0,
            isLoading: false,
            isLoadingCards: false
          });
          
          // Set original counts if not already set
          const { hasSetOriginalCounts } = get();
          if (!hasSetOriginalCounts && cardsData.cards.length > 0) {
            const cardIds = cardsData.cards.map((card: FlashcardData) => card.id);
            set({
              originalNewCount: newCards.length,
              originalDueCount: dueCards.length,
              originalCardIds: cardIds,
              hasSetOriginalCounts: true
            });
            
            // Save to localStorage for backup
            localStorage.setItem(`session-state-${deckId}`, JSON.stringify({
              newCount: newCards.length,
              dueCount: dueCards.length,
              cardIds
            }));
          }
        } catch (error) {
          console.error('Error initializing session:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            isLoading: false,
            isLoadingCards: false
          });
        }
      },
      
      // Flip the current card
      flipCard: () => {
        const { showBack, hasStarted } = get();
        
        // If this is the first card flip, start the session
        if (!hasStarted && !showBack) {
          get().startSession();
        }
        
        set({ showBack: !showBack });
      },
      
      // Start a study session
      startSession: async () => {
        const { deckId } = get();
        
        set({ 
          sessionTime: 0,
          sessionPoints: 0,
          cardsReviewed: 0,
          isSessionActive: true,
          hasStarted: true
        });
        
        // Start the timer
        const intervalId = setInterval(() => {
          const { isSessionActive } = get();
          if (isSessionActive) {
            set(state => ({ sessionTime: state.sessionTime + 1 }));
          } else {
            clearInterval(intervalId);
          }
        }, 1000);
        
        // Register the interval for cleanup
        set({ timerId: intervalId as unknown as number });
        
        try {
          // Call the session start API
          const response = await fetch(`/api/decks/${deckId}/session/start`, {
            method: 'POST'
          });
          
          if (!response.ok) {
            throw new Error('Failed to start session');
          }
          
          const data = await response.json();
          set({ sessionId: data.id });
          
          // Fetch initial streak
          const streakResponse = await fetch('/api/study-progress');
          if (streakResponse.ok) {
            const streakData = await streakResponse.json();
            set({ streak: streakData.currentStreak || 0 });
          }
        } catch (error) {
          console.error('Failed to start session:', error);
          // Don't stop the timer on API failure, just log the error
        }
      },
      
      // Rate the current card
      rateCard: async (difficulty: Difficulty, responseTime: number) => {
        const { 
          deckId, 
          deck, 
          orderedCards, 
          currentCardIndex,
          completedCardIds,
          timerId,
          sessionId
        } = get();
        
        if (!deck || !orderedCards.length) return;
        
        const currentCard = orderedCards[currentCardIndex];
        const isLastCard = currentCardIndex >= orderedCards.length - 1;
        
        // Calculate estimated points
        const estimatedPoints = calculatePoints(difficulty, responseTime);
        
        // Update state optimistically
        set(state => ({ 
          lastEarnedPoints: estimatedPoints,
          sessionPoints: state.sessionPoints + estimatedPoints,
          totalPoints: state.totalPoints + estimatedPoints,
          cardsReviewed: state.cardsReviewed + 1,
          completedCardIds: completedCardIds.includes(currentCard.id) 
            ? completedCardIds 
            : [...completedCardIds, currentCard.id],
          newCardCount: state.newCardCount - (currentCard.isNew ? 1 : 0),
          dueCardCount: state.dueCardCount - (!currentCard.isNew ? 1 : 0)
        }));
        
        // Move to next card if not the last one
        if (!isLastCard) {
          set({ 
            showBack: false,
            currentCardIndex: currentCardIndex + 1 
          });
        } else {
          // Important: Stop the timer when deck is completed
          if (timerId) {
            clearInterval(timerId);
          }
          
          set({ 
            deckCompleted: true,
            isSessionActive: false
          });
        }
        
        // Submit review to API
        try {
          const result = await fetch(
            `/api/decks/${deckId}/cards/${currentCard.id}/review`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                difficulty, 
                responseTime,
                sessionId // Include the sessionId in all review requests
              }),
            }
          );
          
          if (!result.ok) {
            throw new Error('Failed to submit review');
          }
          
          const reviewData = await result.json();
          
          // Adjust points if server calculation differs
          if (reviewData.pointsEarned !== estimatedPoints) {
            const pointsDiff = reviewData.pointsEarned - estimatedPoints;
            set(state => ({ 
              totalPoints: state.totalPoints + pointsDiff,
              sessionPoints: state.sessionPoints + pointsDiff 
            }));
          }
          
          // Keep lastEarnedPoints visible longer for better UX
          // Only reset if we're not on the completion screen
          if (!isLastCard) {
            setTimeout(() => {
              set({ lastEarnedPoints: null });
            }, 3000); // Increased from 1500ms to 3000ms
          }
          
        } catch (error) {
          console.error('Error submitting review:', error);
          // We don't revert the optimistic updates to avoid UI confusion
        }
      },
      
      // Move to the next card
      moveToNextCard: () => {
        const { currentCardIndex, orderedCards } = get();
        
        if (currentCardIndex < orderedCards.length - 1) {
          set({ 
            currentCardIndex: currentCardIndex + 1,
            showBack: false,
            lastEarnedPoints: null
          });
        }
      },
      
      // Move to the previous card
      moveToPrevCard: () => {
        const { currentCardIndex } = get();
        
        if (currentCardIndex > 0) {
          set({ 
            currentCardIndex: currentCardIndex - 1,
            showBack: false,
            lastEarnedPoints: null
          });
        }
      },
      
      // Restart the deck
      restartDeck: async () => {
        const { deckId, deck, timerId } = get();
        
        if (!deck) return;
        
        // Clean up existing timer if any
        if (timerId) {
          clearInterval(timerId);
        }
        
        try {
          // Reset all cards to be due
          const resetResponse = await fetch(`/api/decks/${deckId}/reset`, {
            method: 'POST'
          });
          
          if (!resetResponse.ok) {
            throw new Error('Failed to reset deck');
          }
          
          // Fetch newly due cards
          set({ isLoadingCards: true });
          const cardsResponse = await fetch(`/api/decks/${deckId}/due-cards`);
          
          if (!cardsResponse.ok) {
            throw new Error('Failed to fetch cards after reset');
          }
          
          const cardsData = await cardsResponse.json();
          
          // Update card counts
          const newCards = cardsData.cards.filter((card: FlashcardData) => card.isNew);
          const dueCards = cardsData.cards.filter((card: FlashcardData) => card.isDue && !card.isNew);
          
          // Reset session state
          set({
            orderedCards: cardsData.cards,
            currentCardIndex: 0,
            showBack: false,
            deckCompleted: false,
            newCardCount: newCards.length,
            dueCardCount: dueCards.length,
            totalCardsInDeck: cardsData.totalCardCount,
            sessionTime: 0,
            sessionPoints: 0,
            cardsReviewed: 0,
            lastEarnedPoints: null,
            completedCardIds: [],
            isSessionActive: true,
            hasStarted: true,
            isLoadingCards: false
          });
          
          // Start a new timer
          const intervalId = setInterval(() => {
            const { isSessionActive } = get();
            if (isSessionActive) {
              set(state => ({ sessionTime: state.sessionTime + 1 }));
            } else {
              clearInterval(intervalId);
            }
          }, 1000);
          
          // Register the new timer
          set({ timerId: intervalId as unknown as number });
          
        } catch (error) {
          console.error('Error restarting deck:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to restart deck',
            isLoadingCards: false
          });
        }
      },
      
      // End the session
      endSession: async () => {
        const { deckId, sessionId, timerId, sessionTime } = get();
        
        // Stop the timer
        if (timerId) {
          clearInterval(timerId);
        }
        
        set({ 
          isSessionActive: false, 
          hasStarted: false,
          timerId: null // Clear the timer ID to prevent memory leaks
        });
        
        // Clear session state from localStorage
        localStorage.removeItem(`session-state-${deckId}`);
        
        if (!sessionId) return;
        
        try {
          await fetch(`/api/decks/${deckId}/session/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            body: JSON.stringify({ 
              sessionId,
              sessionTime // Send the tracked session time to the backend
            })
          });
          
          // Refresh streak data
          const response = await fetch('/api/study-progress');
          if (response.ok) {
            const data = await response.json();
            set({ streak: data.currentStreak || 0 });
          }
        } catch (error) {
          console.error('Failed to end session:', error);
        }
      },
      
      // Clear progress
      clearProgress: () => {
        const { deckId } = get();
        
        set({
          currentCardIndex: 0,
          totalPoints: 0,
          completedCardIds: [],
          lastEarnedPoints: null
        });
        
        localStorage.removeItem(`study-progress-${deckId}`);
      },
      
      // Toggle settings modal
      toggleSettings: (show?: boolean) => {
        if (show !== undefined) {
          set({ showSettings: show });
        } else {
          set(state => ({ showSettings: !state.showSettings }));
        }
      },
      
      // Toggle mind map modal
      toggleMindMap: (show?: boolean) => {
        if (show !== undefined) {
          set({ showMindMap: show });
        } else {
          set(state => ({ showMindMap: !state.showMindMap }));
        }
      },
      
      // Calculate progress
      calculateProgress: () => {
        const { currentCardIndex, orderedCards } = get();
        if (orderedCards.length === 0) return 0;
        
        // Cap progress at 1 (100%)
        return Math.min(currentCardIndex / orderedCards.length, 1);
      },
      
      // Get an accurate count of cards reviewed
      getCardsReviewed: () => {
        const { completedCardIds } = get();
        return completedCardIds.length;
      }
    }),
    {
      name: 'study-session-storage',
      partialize: (state) => ({
        // Only persist these values
        deckId: state.deckId,
        currentCardIndex: state.currentCardIndex,
        totalPoints: state.totalPoints,
        completedCardIds: state.completedCardIds,
        sessionId: state.sessionId
      })
    }
  )
); 