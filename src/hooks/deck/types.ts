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

export type Difficulty = 'easy' | 'good' | 'hard' | 'again'; 