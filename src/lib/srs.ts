export type Difficulty = 'hard' | 'medium' | 'easy';

interface ReviewData {
  difficulty: Difficulty;
  responseTime: number; // milliseconds
}

interface SchedulingResult {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: Date;
  points: number;
}

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
  dueDate?: string;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
  isNew?: boolean;
  isDue?: boolean;
}

const DIFFICULTY_QUALITY = {
  hard: 0,
  medium: 1,
  easy: 2,
};

const DIFFICULTY_MULTIPLIER = {
  hard: 2.0,
  medium: 1.5,
  easy: 1.0,
};

const BASE_POINTS = 10;
const MAX_RESPONSE_TIME = 30000; // 30 seconds
const MIN_EASE_FACTOR = 1.3;

export function calculateNextReview(
  review: ReviewData,
  currentStreak: number,
  currentEaseFactor: number,
  currentRepetitions: number
): SchedulingResult {
  const { difficulty, responseTime } = review;
  const quality = DIFFICULTY_QUALITY[difficulty];

  // Calculate new ease factor
  let easeFactor = currentEaseFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor);

  // Calculate new interval
  let interval: number;
  if (currentRepetitions === 0) {
    interval = 1;
  } else if (currentRepetitions === 1) {
    interval = 6;
  } else {
    interval = Math.round(currentRepetitions * easeFactor);
  }

  // Adjust interval based on difficulty
  if (difficulty === 'hard') {
    interval = Math.max(1, Math.floor(interval * 0.5));
  } else if (difficulty === 'medium') {
    interval = Math.max(1, Math.floor(interval * 0.75));
  }

  // Calculate points
  const speedMultiplier = Math.max(1, 2 - (responseTime / MAX_RESPONSE_TIME));
  const difficultyMultiplier = DIFFICULTY_MULTIPLIER[difficulty];
  const streakMultiplier = Math.min(2, 1 + (currentStreak * 0.1));
  
  const points = Math.round(
    BASE_POINTS * speedMultiplier * difficultyMultiplier * streakMultiplier
  );

  // Calculate next due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    interval,
    easeFactor,
    repetitions: currentRepetitions + 1,
    dueDate,
    points,
  };
}

export function isCardDue(dueDate: Date): boolean {
  return new Date() >= dueDate;
}

export function calculateStreak(
  currentStreak: number,
  difficulty: Difficulty
): number {
  // Only increment streak for easy/medium responses
  if (difficulty === "easy" || difficulty === "medium") {
    return currentStreak + 1;
  }
  
  // Reset streak for hard responses
  return 0;
}