import { useState, useEffect } from 'react';

export function useSessionStats(deckId: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [streak, setStreak] = useState(0);

  // Load streak from API
  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const response = await fetch('/api/study-progress');
        if (response.ok) {
          const data = await response.json();
          setStreak(data.currentStreak || 0);
        }
      } catch (error) {
        console.error('Failed to fetch streak:', error);
      }
    };
    fetchStreak();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const addPoints = (points: number) => {
    setSessionPoints(prev => prev + points);
    setCardsReviewed(prev => prev + 1);
  };

  const startSession = async () => {
    try {
      setIsActive(true); // Start timer immediately
      setSessionTime(0);
      setSessionPoints(0);
      setCardsReviewed(0);

      const response = await fetch(`/api/decks/${deckId}/session/start`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        setIsActive(false); // Stop timer if request fails
        throw new Error('Failed to start session');
      }
      
      const data = await response.json();
      setSessionId(data.id);

      // Fetch initial streak
      const streakResponse = await fetch('/api/study-progress');
      if (streakResponse.ok) {
        const streakData = await streakResponse.json();
        setStreak(streakData.currentStreak || 0);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsActive(false);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    
    try {
      setIsActive(false); // Stop timer immediately
      await fetch(`/api/decks/${deckId}/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        body: JSON.stringify({ sessionId })
      });
      
      // Refresh streak after session ends
      const response = await fetch('/api/study-progress');
      if (response.ok) {
        const data = await response.json();
        setStreak(data.currentStreak || 0);
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const resetSession = () => {
    setSessionTime(0);
    setSessionPoints(0);
    setCardsReviewed(0);
    setIsActive(true); // Start timer when resetting
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
  };
} 