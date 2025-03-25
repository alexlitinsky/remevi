import { useState, useEffect } from 'react';

export function useSessionStats(deckId: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Start session timer only when active
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isActive) {
      timer = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive]);

  // Handle tab close/browser exit
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (sessionId) {
        await fetch(`/api/decks/${deckId}/session/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          // Keep alive flag to ensure request completes
          keepalive: true
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, deckId]);

  // Load streak from localStorage
  useEffect(() => {
    const lastStudyDate = localStorage.getItem('lastStudyDate');
    const currentStreak = parseInt(localStorage.getItem('studyStreak') || '0');

    const today = new Date().toDateString();
    
    if (lastStudyDate === today) {
      setStreak(currentStreak);
    } else if (lastStudyDate === new Date(Date.now() - 86400000).toDateString()) {
      // Yesterday - continue streak
      setStreak(currentStreak + 1);
      localStorage.setItem('studyStreak', (currentStreak + 1).toString());
      localStorage.setItem('lastStudyDate', today);
    } else {
      // Streak broken
      setStreak(1);
      localStorage.setItem('studyStreak', '1');
      localStorage.setItem('lastStudyDate', today);
    }
  }, []);

  const addPoints = (points: number) => {
    setSessionPoints(prev => prev + points);
    setCardsReviewed(prev => prev + 1);
  };

  const startSession = async () => {
    try {
      const response = await fetch(`/api/decks/${deckId}/session/start`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to start session');
      
      const data = await response.json();
      setSessionId(data.id);
      setIsActive(true);
      setSessionTime(0);
      setSessionPoints(0);
      setCardsReviewed(0);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const endSession = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/decks/${deckId}/session/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
    setIsActive(false);
    setSessionId(null);
  };

  const resetSession = async () => {
    // End current session if exists
    if (sessionId) {
      await endSession();
    }
    // Start new session
    await startSession();
  };

  return {
    sessionTime,
    streak,
    sessionPoints,
    cardsReviewed,
    addPoints,
    startSession,
    endSession,
    resetSession,
    isActive
  };
} 