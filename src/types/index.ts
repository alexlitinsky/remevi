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

export type Difficulty = 'hard' | 'medium' | 'easy'

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
} 