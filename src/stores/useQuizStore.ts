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
  deckId: string | null;
  
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

  // Helper to check if session is valid and in progress
  isValidSession: () => boolean;

  // Actions
  cleanupSession: () => void;
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
      deckId: null,
      view: 'config',
      isLoading: false,
      error: null,
      showExplanation: false,
      currentQuestionIndex: 0,
      score: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      showConfig: true,

      // Helper to check if session is valid and in progress
      isValidSession: () => {
        const state = get();
        
        // If we don't have a session ID or config, the session is invalid
        if (!state.sessionId || !state.config) return false;
        
        // If there are no questions or the current index is beyond the questions array, the session is invalid
        if (state.questions.length === 0 || state.currentQuestionIndex >= state.questions.length) return false;
        
        // Check if there are answers recorded (indicating session progress)
        const hasAnswers = Object.keys(state.answers).length > 0;
        
        // Check if the deckId in the config matches the stored deckId
        const isDeckMatch = state.config.deckId === state.deckId;
        
        return hasAnswers && isDeckMatch;
      },

      // Actions
      startQuiz: async (config) => {
        // First check if we're switching decks
        const state = get();
        const previousDeckId = state.deckId;
        
        // If we have a previous deck ID and it's different from the current one,
        // or if we're loading the component with a different deck, clean up
        if (previousDeckId && previousDeckId !== config.deckId) {
          console.log('Switching from deck', previousDeckId, 'to', config.deckId);
          get().cleanupSession();
        }
        
        // Now check if there's a valid session we can resume for this specific deck
        if (get().isValidSession() && state.config?.deckId === config.deckId) {
          console.log('Resuming existing quiz session for deck', config.deckId);
          
          // Resume the session by setting the current question and view
          const currentQuestion = state.questions[state.currentQuestionIndex];
          const showExplanation = state.answers[currentQuestion.id] !== undefined;
          
          set({ 
            view: 'quiz', 
            showConfig: false,
            currentQuestion,
            showExplanation,
            deckId: config.deckId // Make sure deckId is explicitly set
          });
          return;
        }
        
        // If we get here, we need to start a new quiz
        console.log('Starting new quiz for deck', config.deckId);
        set({ isLoading: true, error: null, deckId: config.deckId });
        
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
          
          // Update state with new quiz data
          set({
            config,
            questions: data.questions,
            currentQuestion: data.questions[0],
            sessionId: data.sessionId,
            deckId: config.deckId,
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

      // Thoroughly clean up the session state
      cleanupSession: () => {
        console.log('Cleaning up quiz session');
        set({
          sessionId: null,
          questions: [],
          answers: {},
          currentQuestion: null,
          currentQuestionIndex: 0,
          score: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          view: 'config',
          showConfig: true,
          showExplanation: false,
          config: null,
          deckId: null
        });
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
        // Don't cleanup here - let user see results
      },

      restartQuiz: async () => {
        const config = get().config;
        if (!config) return;
        
        get().cleanupSession();
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
        // Persist more state for session recovery
        config: state.config,
        sessionId: state.sessionId,
        questions: state.questions,
        answers: state.answers,
        currentQuestionIndex: state.currentQuestionIndex,
        currentQuestion: state.currentQuestion,
        score: state.score,
        correctAnswers: state.correctAnswers,
        incorrectAnswers: state.incorrectAnswers,
        view: state.view,
        showConfig: state.showConfig,
        showExplanation: state.showExplanation,
        deckId: state.deckId // Make sure we persist the deckId
      })
    }
  )
); 