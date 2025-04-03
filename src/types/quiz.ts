import { QuizType, QuizView, QuizDifficulty } from '@/stores/useQuizStore';

// Base question interface
export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'frq';
  topic: string;
  hint?: string;
}

// Quiz configuration
export interface QuizConfig {
  deckId: string;
  type: 'mcq' | 'frq' | 'mixed';
  questionCount: number;
}

// Base question interface
export interface BaseQuestion {
  id: string;
  question: string;
  hint: string;
  topic: string;
}

// MCQ specific question
export interface MCQQuestion extends BaseQuestion {
  type: 'mcq';
  options: string[];
  correctOptionIndex: number;
}

// FRQ specific question
export interface FRQQuestion extends BaseQuestion {
  type: 'frq';
  answers: string[];
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
  pointsEarned: number;
  timeTaken: number;
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
  title: string;
  description: string;
  shown?: boolean;
}

export interface ProgressData {
  currentQuestionIndex: number;
  totalQuestions: number;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  streak: number;
  topicPerformance: Record<string, {
    correct: number;
    total: number;
  }>;
}

export interface TimingData {
  startTime: number | null;
  pausedAt: number | null;
  totalPausedTime: number;
  totalTime: number;
  timePerQuestion: Record<string, number>;
}

export interface UIState {
  view: 'quiz' | 'results' | 'review';
  isLoading: boolean;
  error: string | null;
  showHint: boolean;
  showExplanation: boolean;
  isPaused: boolean;
  showConfig: boolean;
}

export interface UIActions {
  togglePause: () => void;
  toggleConfig: () => void;
}

export interface QuizStats {
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  averageScore: number;
  bestStreak: number;
  topicStats: Record<string, {
    attempted: number;
    correct: number;
    averageTime: number;
  }>;
  recentResults: {
    date: number;
    score: number;
    accuracy: number;
    timeSpent: number;
  }[];
}

export type QuizAnalyticsEvent = {
  type: 'quiz_started' | 'question_answered' | 'quiz_completed' | 'error_occurred';
  data: {
    timestamp: number;
    [key: string]: any;
  };
};

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