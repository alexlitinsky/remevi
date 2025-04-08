export interface Card {
  id?: string
  deck_id?: string
  front: string
  back: string
  hint?: string
  tags?: string[]
  due_date?: string
  ease_factor?: number
  interval?: number
  created_at?: string
  updated_at?: string
  last_reviewed?: string
}

export type Difficulty = 'hard' | 'good' | 'easy' | 'again'

export interface StudySessionStats {
  totalCards: number
  newCards: number
  dueCards: number
  timeSpent: number  // in seconds
  cardsCompleted: number
  streak: number
  pointsEarned: number
}

export interface DeckData {
  id: string
  name: string
  description?: string
  card_count: number
  owner_id: string
  created_at: string
  updated_at: string
  cover_image?: string
  is_public: boolean
  tags?: string[]
  isProcessing?: boolean
  mindMap?: {
    nodes: Array<{ id: string; label: string; type: 'main' | 'subtopic' | 'detail'; x?: number; y?: number }>;
    connections: Array<{ source: string; target: string; label?: string; type: string }>;
  };
  processingProgress: number;
  processingStage: string;
} 