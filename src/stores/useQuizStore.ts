import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  MCQQuestion, 
  FRQQuestion, 
  QuizAnswer, 
  Achievement,
  StartQuizResponse,
  SubmitAnswerResponse,
  EndQuizResponse,
  AnswerResult
} from '@/types/quiz';
import { QuizAnalyticsEvent } from '@/types/api';

export type QuizType = 'mcq' | 'frq' | 'mixed';
export type QuizView = 'quiz' | 'results' | 'config';
export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'all';

interface QuizConfig {
  deckId: string;
  type: QuizType;
  questionCount: number;
}

interface TimingData {
  startTime: number | null;
  pausedAt: number | null;
  totalPausedTime: number;
  totalTime: number;
  timePerQuestion: Record<string, number>;
}

interface ProgressData {
  currentQuestionIndex: number;
  totalQuestions: number;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  streak: number;
  topicPerformance: Record<string, {
    attempted: number;
    correct: number;
  }>;
}

export interface UIState {
  view: QuizView;
  isLoading: boolean;
  error: string | null;
  showHint: boolean;
  showExplanation: boolean;
  isPaused: boolean;
  showConfig: boolean;
}

interface QuizStats {
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
  recentResults: Array<{
    date: number;
    score: number;
    accuracy: number;
    timeSpent: number;
  }>;
}

export interface UIActions {
  setIsLoading: (isLoading: boolean) => void;
  toggleConfig: () => void;
  togglePause: () => void;
}

interface QuizState {
  // Core state
  config: QuizConfig | null;
  currentQuestion: MCQQuestion | FRQQuestion | null;
  questions: (MCQQuestion | FRQQuestion)[];
  answers: Record<string, QuizAnswer>;
  sessionId: string | null;
  
  // UI state
  view: QuizView;
  isLoading: boolean;
  error: string | null;
  showExplanation: boolean;
  showConfig: boolean;
  
  // Progress tracking
  currentQuestionIndex: number;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  
  // Actions
  startQuiz: (config: QuizConfig) => Promise<void>;
  submitAnswer: (answer: string) => Promise<AnswerResult>;
  nextQuestion: () => void;
  endQuiz: () => Promise<void>;
  restartQuiz: () => Promise<void>;
  setView: (view: QuizView) => void;
  toggleExplanation: () => void;
  toggleConfig: () => void;
}

const initialProgress: ProgressData = {
  currentQuestionIndex: 0,
  totalQuestions: 0,
  score: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  streak: 0,
  topicPerformance: {},
};

const initialTiming: TimingData = {
  startTime: null,
  pausedAt: null,
  totalPausedTime: 0,
  totalTime: 0,
  timePerQuestion: {},
};

const initialUI: UIState = {
  view: 'config',
  isLoading: false,
  error: null,
  showHint: false,
  showExplanation: false,
  isPaused: false,
  showConfig: true,
};

const initialStats: QuizStats = {
  totalQuizzesTaken: 0,
  totalQuestionsAnswered: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  averageScore: 0,
  bestStreak: 0,
  topicStats: {},
  recentResults: [],
};

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: null,
      currentQuestion: null,
      questions: [],
      answers: {},
      sessionId: null,
      view: 'config',
      isLoading: false,
      error: null,
      showExplanation: false,
      currentQuestionIndex: 0,
      score: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      showConfig: true,

      // Actions
      startQuiz: async (config) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`/api/decks/${config.deckId}/quiz/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: config.type,
              questionCount: config.questionCount
            })
          });

          if (!response.ok) throw new Error('Failed to start quiz');
          
          const data = await response.json() as StartQuizResponse;
          
          set({
            config,
            questions: data.questions,
            currentQuestion: data.questions[0],
            sessionId: data.sessionId,
            view: 'quiz',
            currentQuestionIndex: 0,
            score: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            answers: {},
            isLoading: false,
            error: null,
            showExplanation: false,
            showConfig: false,
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to start quiz' 
          });
        }
      },

      submitAnswer: async (userAnswer: string) => {
        const state = get();
        if (!state.sessionId || !state.currentQuestion) {
          throw new Error('No active quiz session');
        }

        set({ isLoading: true });

        try {
          const response = await fetch(`/api/decks/${state.config?.deckId}/quiz/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: state.sessionId,
              questionId: state.currentQuestion.id,
              userAnswer,
              timeTaken: 0 // Simplified - not tracking time in this version
            })
          });

          if (!response.ok) throw new Error('Failed to submit answer');
          
          const result = await response.json() as SubmitAnswerResponse;
          
          set(state => ({
            answers: {
              ...state.answers,
              [state.currentQuestion!.id]: {
                questionId: state.currentQuestion!.id,
                userAnswer,
                isCorrect: result.isCorrect,
                pointsEarned: result.pointsEarned,
                timeTaken: 0
              }
            },
            score: state.score + result.pointsEarned,
            correctAnswers: state.correctAnswers + (result.isCorrect ? 1 : 0),
            incorrectAnswers: state.incorrectAnswers + (!result.isCorrect ? 1 : 0),
            showExplanation: true,
            isLoading: false
          }));

          return {
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
            explanation: result.explanation || 'No explanation available'
          };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      nextQuestion: () => {
        const state = get();
        const nextIndex = state.currentQuestionIndex + 1;
        
        if (nextIndex >= state.questions.length) {
          get().endQuiz();
          return;
        }

        set({
          currentQuestion: state.questions[nextIndex],
          currentQuestionIndex: nextIndex,
          showExplanation: false
        });
      },

      endQuiz: async () => {
        const state = get();
        if (!state.sessionId) return;

        try {
          await fetch(`/api/decks/${state.config?.deckId}/quiz/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: state.sessionId,
              totalTime: 0 // Simplified - not tracking time
            })
          });
        } catch (error) {
          console.error('Failed to end quiz:', error);
        }

        set({ view: 'results' });
      },

      restartQuiz: async () => {
        const config = get().config;
        if (!config) return;
        
        await get().startQuiz(config);
      },

      setView: (view) => set({ view }),
      
      toggleExplanation: () => set(state => ({ 
        showExplanation: !state.showExplanation 
      })),

      toggleConfig: () => set(state => ({ 
        showConfig: !state.showConfig 
      })),
    }),
    {
      name: 'quiz-storage',
      partialize: (state) => ({
        config: state.config,
        sessionId: state.sessionId,
        showConfig: state.showConfig,
      })
    }
  )
); 