import { useState, useEffect } from 'react';

interface StudySettings {
  showHints: boolean;
  audioEnabled: boolean;
  shuffleCards: boolean;
  focusMode: boolean;
}

const DEFAULT_SETTINGS: StudySettings = {
  showHints: true,
  audioEnabled: false,
  shuffleCards: true,
  focusMode: false,
};

export function useStudySettings(deckId: string) {
  const [settings, setSettings] = useState<StudySettings>(DEFAULT_SETTINGS);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(`deck-${deckId}-settings`);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [deckId]);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem(`deck-${deckId}-settings`, JSON.stringify(settings));
  }, [deckId, settings]);

  const updateSettings = (newSettings: Partial<StudySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    settings,
    updateSettings,
  };
} 