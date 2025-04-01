import { QuizType, QuizView, QuizDifficulty } from '@/stores/useQuizStore';

// Base question interface
export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'frq';
  topic: string;
  difficulty: QuizDifficulty;
  hint?: string;
}

// MCQ specific question
export interface MCQQuestion extends QuizQuestion {
  type: 'mcq';
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

// FRQ specific question
export interface FRQQuestion extends QuizQuestion {
  type: 'frq';
  question: string;
  answers: string[];
  caseSensitive: boolean;
  explanation?: string;
}

// Quiz session from API
export interface QuizSession {
  id: string;
  userId: string;
  deckId: string;
  startTime: Date;
  endTime?: Date;
  totalTime?: number;
  questionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  pointsEarned: number;
  quizType: QuizType;
}

// Answer submission
export interface QuizAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeTaken: number;
  pointsEarned: number;
  skipped?: boolean;
}

// API Response Types
export interface StartQuizResponse {
  sessionId: string;
  questions: (MCQQuestion | FRQQuestion)[];
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  pointsEarned: number;
  explanation?: string;
  achievements?: Achievement[];
}

export interface EndQuizResponse {
  sessionStats: {
    totalTime: number;
    questionsAnswered: number;
    correctAnswers: number;
    incorrectAnswers: number;
    pointsEarned: number;
    accuracy: number;
    averageTime: number;
  };
  achievements: Achievement[];
  newLevel?: {
    level: number;
    title: string;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'expert' | 'speed' | 'accuracy' | 'dedication';
  type: 'milestone' | 'special' | 'secret';
  pointsAwarded: number;
  shown?: boolean;
}

export type QuizAnalyticsEventType = 
  | 'quiz_started' 
  | 'question_answered' 
  | 'quiz_completed' 
  | 'error_occurred' 
  | 'session_recovered'
  | 'question_interaction';

export type QuizAnalyticsData = 
  | {
      deckId: string;
      quizType: QuizType;
      difficulty: QuizDifficulty;
      questionCount: number;
      timestamp: number;
    }
  | {
      questionId: string;
      timeTaken: number;
      isCorrect: boolean;
      skipped: boolean;
      questionType: 'frq' | 'mcq';
      topic: string;
      timestamp: number;
    }
  | {
      questionId: string;
      timeTaken: number;
      interactionType: 'option_selected' | 'typing';
      option?: string;
      timestamp: number;
    }
  | {
      errorType: 'api' | 'validation' | 'timeout';
      errorMessage: string;
      timestamp: number;
    }
  | {
      sessionId: string;
      recoveryType: 'auto' | 'manual';
      timestamp: number;
    };

// Add this with the other types
export interface AnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  explanation: string;
} 