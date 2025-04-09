import { useState, useEffect } from 'react';

interface StudySettings {
  newCardsPerDay: number;
  reviewsPerDay: number;
}

const DEFAULT_SETTINGS: StudySettings = {
  newCardsPerDay: 15,
  reviewsPerDay: 20
};

export function useStudySettings(deckId: string) {
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from API on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/users/me/preferences');
        if (response.ok) {
          const data = await response.json();
          setSettings({
            newCardsPerDay: data.newCardsPerDay,
            reviewsPerDay: data.reviewsPerDay
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [deckId]);

  const updateSettings = async (newSettings: Partial<StudySettings>) => {
    try {
      const response = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          newCardsPerDay: data.newCardsPerDay,
          reviewsPerDay: data.reviewsPerDay
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  return {
    settings,
    updateSettings,
    isLoading,
  };
} 