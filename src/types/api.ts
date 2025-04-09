import { QuizType, QuizDifficulty } from '@/stores/useQuizStore';

// API Request Types
export interface StartQuizRequest {
  type: QuizType;
  difficulty: QuizDifficulty;
  questionCount: number;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  userAnswer: string;
}

export interface EndQuizRequest {
  sessionId: string;
  totalTime: number;
}

// Analytics Events
export type QuizAnalyticsEvent =
  | {
      type: 'quiz_started';
      data: {
        deckId: string;
        quizType: QuizType;
        difficulty?: QuizDifficulty;
        questionCount: number;
        timestamp: number;
      };
    }
  | {
      type: 'question_answered';
      data: {
        questionId: string;
        timeTaken: number;
        isCorrect: boolean;
        skipped: boolean;
        questionType: 'mcq' | 'frq';
        topic: string;
        timestamp: number;
      };
    }
  | {
      type: 'quiz_completed';
      data: {
        sessionId: string;
        totalTime: number;
        score: number;
        accuracy: number;
        questionsAnswered: number;
        timestamp: number;
      };
    }
  | {
      type: 'error_occurred';
      data: {
        sessionId?: string;
        errorType: 'api' | 'network' | 'validation' | 'unknown';
        errorMessage: string;
        timestamp: number;
      };
    }
  | {
      type: 'session_recovered';
      data: {
        sessionId: string;
        recoveryType: 'crash' | 'network' | 'browser_close';
        questionsAnswered: number;
        timestamp: number;
      };
    }; 