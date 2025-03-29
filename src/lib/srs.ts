export type Difficulty = 'again' | 'hard' | 'good' | 'easy';

// Core data structures
export interface ReviewData {
  difficulty: Difficulty;
  responseTime: number; // milliseconds
}

export interface SchedulingResult {
  interval: number; // days until next review
  easeFactor: number; // multiplier for spacing
  repetitions: number; // count of successful reviews
  dueDate: Date; // next review date
  points: number; // points awarded for this review
  lapsed: boolean; // whether the card was forgotten
}

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  dueDate: string; // ISO string format
  easeFactor: number;
  interval: number;
  repetitions: number;
  isNew: boolean;
  isDue: boolean;
  lapses: number; // count of times card was forgotten
  lastReviewed?: string; // ISO string of last review date
}

// Constants for algorithm configuration
const DIFFICULTY_QUALITY: Record<Difficulty, number> = {
  again: 0,
  hard: 1,
  good: 2,
  easy: 3,
};

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  again: 0.0, // No points for forgotten cards
  hard: 1.0,
  good: 1.5,
  easy: 2.0,
};

// Algorithm configuration constants
const BASE_POINTS = 10;
const MAX_RESPONSE_TIME = 30000; // 30 seconds
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 2.5;
const EASE_BONUS = 0.15; // Bonus for easy cards
const EASE_PENALTY = 0.2; // Penalty for difficult cards
const LAPSE_INTERVAL_REDUCTION = 0.5; // How much to reduce interval on lapse
const MAXIMUM_INTERVAL = 365; // Cap interval at 1 year

/**
 * Calculate points based on difficulty and response time
 */
export function calculatePoints(difficulty: Difficulty, responseTime: number): number {
  if (difficulty === 'again') return 0;
  
  const speedMultiplier = Math.max(1, 2 - (responseTime / MAX_RESPONSE_TIME));
  const difficultyMultiplier = DIFFICULTY_MULTIPLIER[difficulty];
  
  return Math.round(BASE_POINTS * speedMultiplier * difficultyMultiplier);
}

/**
 * Calculate when a card should next be reviewed
 */
export function calculateNextReview(
  review: ReviewData,
  currentInterval: number = 0,
  currentEaseFactor: number = 2.5,
  currentRepetitions: number = 0,
  currentLapses: number = 0
): SchedulingResult {
  const { difficulty, responseTime } = review;
  const quality = DIFFICULTY_QUALITY[difficulty];
  let lapsed = false;
  let repetitions = currentRepetitions;
  let lapses = currentLapses;
  
  // Handle card lapses ("again" responses)
  if (difficulty === 'again') {
    lapsed = true;
    lapses += 1;
    repetitions = 0; // Reset repetitions counter
    
    // Calculate new ease factor with penalty
    currentEaseFactor = Math.max(
      MIN_EASE_FACTOR, 
      currentEaseFactor - EASE_PENALTY
    );
    
    // Reduce interval
    currentInterval = Math.max(
      1, 
      Math.floor(currentInterval * LAPSE_INTERVAL_REDUCTION)
    );
  } else {
    // Calculate new ease factor
    let easeDelta = 0;
    
    if (difficulty === 'easy') {
      easeDelta = EASE_BONUS;
    } else if (difficulty === 'hard') {
      easeDelta = -EASE_PENALTY;
    }
    
    currentEaseFactor = Math.min(
      MAX_EASE_FACTOR,
      Math.max(MIN_EASE_FACTOR, currentEaseFactor + easeDelta)
    );
    
    // Increment repetitions counter for successful reviews
    repetitions = currentRepetitions + 1;
  }

  // Calculate new interval
  let interval: number;
  if (lapsed) {
    interval = 1; // Start over for lapsed cards
  } else if (repetitions === 1) {
    interval = 1; // First successful review
  } else if (repetitions === 2) {
    interval = 3; // Second successful review
  } else if (repetitions === 3) {
    interval = 7; // Third successful review
  } else {
    // After that, apply the ease factor
    interval = Math.round(currentInterval * currentEaseFactor);
  }
  
  // Apply difficulty adjustments
  if (difficulty === 'hard' && !lapsed) {
    interval = Math.max(1, Math.floor(interval * 0.8));
  } else if (difficulty === 'easy') {
    interval = Math.ceil(interval * 1.3);
  }
  
  // Cap maximum interval
  interval = Math.min(MAXIMUM_INTERVAL, interval);

  // Calculate points
  const points = calculatePoints(difficulty, responseTime);

  // Calculate next due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    interval,
    easeFactor: currentEaseFactor,
    repetitions,
    dueDate,
    points,
    lapsed
  };
}

/**
 * Check if a card is due for review
 */
export function isCardDue(dueDate: Date | string): boolean {
  const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return new Date() >= dueDateObj;
}

/**
 * Calculate streak based on review difficulty
 */
export function calculateStreak(
  currentStreak: number,
  difficulty: Difficulty
): number {
  // Reset streak for "again" responses
  if (difficulty === 'again') {
    return 0;
  }
  
  // Maintain streak for "hard" responses, but don't increment
  if (difficulty === 'hard') {
    return currentStreak;
  }
  
  // Increment streak for "good" and "easy" responses
  return currentStreak + 1;
}

/**
 * Create default values for a new flashcard
 */
export function createNewFlashcard(id: string, front: string, back: string): FlashcardData {
  return {
    id,
    front,
    back,
    dueDate: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    isNew: true,
    isDue: true,
    lapses: 0
  };
}