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
export type QuizView = 'quiz' | 'results' | 'review';
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
  // Configuration
  config: QuizConfig | null;
  
  // Session
  activeSession: {
    id: string | null;
    status: 'active' | 'paused' | 'completed' | 'error';
    startTime: number | null;
    endTime: number | null;
    deckId?: string;
  };

  // Questions
  questions: {
    all: (MCQQuestion | FRQQuestion)[];
    current: MCQQuestion | FRQQuestion | null;
    answered: Record<string, QuizAnswer & { 
      submittedAt: number;
      questionIndex: number;
    }>;
    remaining: (MCQQuestion | FRQQuestion)[];
  };

  // State
  progress: ProgressData;
  timing: TimingData;
  ui: UIState;
  achievements: Achievement[];
  stats: QuizStats;

  // Actions
  startQuiz: (config: QuizConfig) => Promise<void>;
  submitAnswer: (answer: {
    questionId: string;
    userAnswer: string;
    timeTaken: number;
    skipped?: boolean;
  }) => Promise<AnswerResult>;
  skipQuestion: () => void;
  previousQuestion: () => void;
  nextQuestion: () => void;
  toggleHint: () => void;
  toggleExplanation: () => void;
  endQuiz: () => Promise<void>;
  restartQuiz: () => void;
  reviewQuiz: () => void;
  cleanupSession: () => void;
  checkForExistingSession: () => boolean;
  updateStats: (result: QuizAnswer) => void;
  recoverSession: () => Promise<void>;
  logAnalytics: (event: QuizAnalyticsEvent) => void;
  actions: UIActions;
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
  view: 'quiz',
  isLoading: false,
  error: null,
  showHint: false,
  showExplanation: false,
  isPaused: false,
  showConfig: false,
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
      activeSession: {
        id: null,
        status: 'completed',
        startTime: null,
        endTime: null,
        deckId: undefined,
      },
      questions: {
        all: [],
        current: null,
        answered: {},
        remaining: [],
      },
      progress: initialProgress,
      timing: initialTiming,
      ui: initialUI,
      achievements: [],
      stats: initialStats,

      // Actions
      startQuiz: async (config) => {
        const state = get();
        console.log('[QuizStore] Starting quiz with config:', config);

        // Check for existing session
        if (state.checkForExistingSession()) {
          console.log('[QuizStore] Existing session found, preventing start');
          set({ 
            ui: { 
              ...state.ui, 
              error: 'A quiz session is already in progress. Please finish or cancel it first.' 
            } 
          });
          return;
        }

        set({ 
          ui: { 
            ...initialUI, 
            isLoading: true 
          },
          config,
        });
        try {
          console.log('[QuizStore] Fetching questions from API...');
          const response = await fetch(`/api/decks/${config.deckId}/quiz/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: config.type,
              questionCount: config.questionCount
            }),
          });
          
          if (!response.ok) {
            const error = await response.text();
            console.error('[QuizStore] API error:', error);
            throw new Error(error || 'Failed to start quiz');
          }
          
          const data = await response.json() as StartQuizResponse;
          console.log('[QuizStore] Received questions:', data.questions);
          
          if (!data.questions || data.questions.length === 0) {
            console.error('[QuizStore] No questions received');
            throw new Error('No questions available for the selected configuration');
          }

          const now = Date.now();
          console.log('[QuizStore] Setting initial question:', data.questions[0]);
          
          set({
            config,
            activeSession: {
              id: data.sessionId,
              status: 'active',
              startTime: now,
              endTime: null,
              deckId: config.deckId,
            },
            questions: {
              all: data.questions,
              current: data.questions[0],
              answered: {},
              remaining: data.questions.slice(1),
            },
            progress: {
              ...initialProgress,
              totalQuestions: data.questions.length,
            },
            timing: {
              ...initialTiming,
              startTime: now,
            },
            ui: {
              ...initialUI,
              isLoading: false,
            },
          });

          // Log analytics
          get().logAnalytics({
            type: 'quiz_started',
            data: {
              deckId: config.deckId,
              quizType: config.type,
              questionCount: config.questionCount,
              timestamp: Date.now(),
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[QuizStore] Error starting quiz:', errorMessage);
          get().logAnalytics({
            type: 'error_occurred',
            data: {
              errorType: 'api',
              errorMessage,
              timestamp: Date.now(),
            },
          });
          set({ 
            ui: { 
              ...initialUI, 
              isLoading: false, 
              error: errorMessage 
            },
            activeSession: { 
              id: null, 
              status: 'error',
              startTime: null,
              endTime: null
            }
          });
        }
      },

      submitAnswer: async (answer) => {
        const state = get();
        if (!state.activeSession.id || !state.questions.current) {
          console.error('🔴 [QuizStore] Cannot submit answer - no active session or current question');
          return {
            isCorrect: false,
            pointsEarned: 0,
            explanation: 'Failed to submit answer - no active session'
          };
        }

        // Get the deck ID from either the config or active session
        const deckId = state.config?.deckId || state.activeSession.deckId;
        
        if (!deckId) {
          console.error('🔴 [QuizStore] Cannot submit answer - no deck ID found');
          return {
            isCorrect: false,
            pointsEarned: 0,
            explanation: 'Failed to submit answer - no deck ID found'
          };
        }

        console.log('🔵 [QuizStore] Submitting answer:', {
          sessionId: state.activeSession.id,
          deckId: deckId,
          questionId: answer.questionId,
          userAnswer: answer.userAnswer
        });

        set({ ui: { ...state.ui, isLoading: true }});
        
        try {
          console.log('🔵 [QuizStore] Preparing API request to:', `/api/decks/${deckId}/quiz/answer`);
          const response = await fetch(`/api/decks/${deckId}/quiz/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: state.activeSession.id,
              questionId: answer.questionId,
              userAnswer: answer.userAnswer,
              timeTaken: answer.timeTaken
            }),
          });

          console.log('🔵 [QuizStore] API response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`🔴 [QuizStore] API error (${response.status}):`, errorText);
            throw new Error(errorText || 'Failed to submit answer');
          }

          const data = await response.json();
          console.log('🔵 [QuizStore] Answer submission successful:', data);
          const now = Date.now();

          // Update answered questions with submission time and index
          const newAnswered = {
            ...state.questions.answered,
            [answer.questionId]: {
              ...answer,
              isCorrect: data.isCorrect,
              pointsEarned: data.pointsEarned,
              submittedAt: now,
              questionIndex: state.progress.currentQuestionIndex
            },
          };

          // Update score and stats but don't advance to next question yet
          set({
            questions: {
              ...state.questions,
              answered: newAnswered,
              // Don't change current or remaining questions yet
            },
            progress: {
              ...state.progress,
              score: state.progress.score + data.pointsEarned,
              correctAnswers: state.progress.correctAnswers + (data.isCorrect ? 1 : 0),
              incorrectAnswers: state.progress.incorrectAnswers + (data.isCorrect ? 0 : 1),
              streak: data.isCorrect ? state.progress.streak + 1 : 0,
            },
            ui: {
              ...state.ui,
              isLoading: false,
              showExplanation: true,
            },
          });

          // Log analytics
          get().logAnalytics({
            type: 'question_answered',
            data: {
              questionId: answer.questionId,
              timeTaken: answer.timeTaken,
              isCorrect: data.isCorrect,
              skipped: answer.skipped || false,
              questionType: state.questions.current.type,
              topic: state.questions.current.topic,
              timestamp: Date.now(),
            },
          });

          // Return the answer result for the UI
          return {
            isCorrect: data.isCorrect,
            pointsEarned: data.pointsEarned,
            explanation: data.explanation
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          get().logAnalytics({
            type: 'error_occurred',
            data: {
              sessionId: state.activeSession.id,
              errorType: 'api',
              errorMessage,
              timestamp: Date.now(),
            },
          });
          set({ 
            ui: { ...state.ui, isLoading: false, error: errorMessage },
            activeSession: { ...state.activeSession, status: 'error' }
          });
          
          // Return error result
          return {
            isCorrect: false,
            pointsEarned: 0,
            explanation: errorMessage
          };
        }
      },

      skipQuestion: () => {
        const state = get();
        if (!state.questions.current) return;

        const currentIndex = state.progress.currentQuestionIndex;
        const nextQuestion = state.questions.all[currentIndex + 1] || null;

        set({
          questions: {
            ...state.questions,
            current: nextQuestion,
            remaining: state.questions.all.slice(currentIndex + 2),
          },
          progress: {
            ...state.progress,
            currentQuestionIndex: currentIndex + 1,
          },
        });
      },

      previousQuestion: () => {
        const state = get();
        const newIndex = state.progress.currentQuestionIndex - 1;
        if (newIndex < 0) return;

        set({
          questions: {
            ...state.questions,
            current: state.questions.all[newIndex],
          },
          progress: {
            ...state.progress,
            currentQuestionIndex: newIndex,
          },
        });
      },

      nextQuestion: () => {
        const state = get();
        const currentIndex = state.progress.currentQuestionIndex;
        
        // If there are no more questions, end the quiz
        if (currentIndex + 1 >= state.questions.all.length) {
          console.log('[QuizStore] No more questions, ending quiz');
          get().endQuiz();
          return;
        }
        
        const nextQuestion = state.questions.all[currentIndex + 1];
        
        console.log('[QuizStore] Moving to next question:', {
          currentIndex,
          nextIndex: currentIndex + 1,
          nextQuestion: nextQuestion?.id
        });
        
        set({
          questions: {
            ...state.questions,
            current: nextQuestion,
            remaining: state.questions.all.slice(currentIndex + 2),
          },
          progress: {
            ...state.progress,
            currentQuestionIndex: currentIndex + 1,
          },
          ui: {
            ...state.ui,
            showExplanation: false,
            showHint: false,
          }
        });
      },

      toggleHint: () => {
        const state = get();
        set({
          ui: {
            ...state.ui,
            showHint: !state.ui.showHint,
          },
        });
      },

      toggleExplanation: () => {
        const state = get();
        set({
          ui: {
            ...state.ui,
            showExplanation: !state.ui.showExplanation,
          },
        });
      },

      endQuiz: async () => {
        const state = get();
        if (!state.activeSession.id) return;

        set({ ui: { ...state.ui, isLoading: true }});

        try {
          const totalTimeMs = Date.now() - (state.timing.startTime || 0) - state.timing.totalPausedTime;
          
          // Get the deck ID from either the config or active session
          const deckId = state.config?.deckId || state.activeSession.deckId;
          
          if (!deckId) {
            console.error('[QuizStore] Cannot end quiz - no deck ID found');
            throw new Error('Failed to end quiz - no deck ID found');
          }
          
          const response = await fetch(`/api/decks/${deckId}/quiz/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: state.activeSession.id,
              totalTime: Math.round(totalTimeMs / 1000) // Convert to seconds for DB
            }),
          });

          if (!response.ok) throw new Error('Failed to end quiz');

          const data = await response.json() as EndQuizResponse;
          
          set({
            activeSession: {
              ...state.activeSession,
              status: 'completed',
              endTime: Date.now()
            },
            achievements: [...state.achievements, ...data.achievements],
            ui: {
              ...state.ui,
              view: 'results',
              isLoading: false,
            },
          });

          // Update stats with session results
          const accuracy = data.sessionStats.accuracy;
          const timeSpent = data.sessionStats.totalTime * 1000; // Convert back to ms for stats

          set({
            stats: {
              ...state.stats,
              totalQuizzesTaken: state.stats.totalQuizzesTaken + 1,
              recentResults: [
                {
                  date: Date.now(),
                  score: data.sessionStats.pointsEarned,
                  accuracy,
                  timeSpent,
                },
                ...state.stats.recentResults.slice(0, 9),
              ],
            },
          });

          // Log analytics
          get().logAnalytics({
            type: 'quiz_completed',
            data: {
              sessionId: state.activeSession.id,
              totalTime: data.sessionStats.totalTime,
              score: data.sessionStats.pointsEarned,
              accuracy: data.sessionStats.accuracy,
              questionsAnswered: data.sessionStats.questionsAnswered,
              timestamp: Date.now(),
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          get().logAnalytics({
            type: 'error_occurred',
            data: {
              sessionId: state.activeSession.id,
              errorType: 'api',
              errorMessage,
              timestamp: Date.now(),
            },
          });
          set({ 
            ui: { ...state.ui, isLoading: false, error: errorMessage },
            activeSession: { ...state.activeSession, status: 'error' }
          });
        }
      },

      restartQuiz: () => {
        const state = get();
        if (!state.config) return;
        get().startQuiz(state.config);
      },

      reviewQuiz: () => {
        set({
          ui: {
            ...get().ui,
            view: 'review',
          },
        });
      },

      // Add cleanup session functionality
      cleanupSession: () => {
        const state = get();
        
        // If session was active, add to stats as incomplete
        if (state.activeSession.status === 'active' || state.activeSession.status === 'paused') {
          const timeSpent = Date.now() - (state.timing.startTime || 0) - state.timing.totalPausedTime;
          const questionsAnswered = Object.keys(state.questions.answered).length;
          const accuracy = questionsAnswered > 0 
            ? (state.progress.correctAnswers / questionsAnswered) * 100 
            : 0;

          set({
            stats: {
              ...state.stats,
              totalQuizzesTaken: state.stats.totalQuizzesTaken + 1,
              recentResults: [
                {
                  date: Date.now(),
                  score: state.progress.score,
                  accuracy,
                  timeSpent,
                },
                ...state.stats.recentResults.slice(0, 9), // Keep last 10
              ],
            },
          });
        }

        // Reset state
        set({
          config: null,
          activeSession: {
            id: null,
            status: 'completed',
            startTime: null,
            endTime: null,
            deckId: undefined,
          },
          questions: {
            all: [],
            current: null,
            answered: {},
            remaining: [],
          },
          progress: initialProgress,
          timing: initialTiming,
          ui: initialUI,
          achievements: [],
        });
      },

      // Add session check functionality
      checkForExistingSession: () => {
        const state = get();
        return state.activeSession.status === 'active' || state.activeSession.status === 'paused';
      },

      // Add stats update functionality
      updateStats: (result: QuizAnswer) => {
        const state = get();
        const currentQuestion = state.questions.current;
        if (!currentQuestion) return;

        const { topicStats } = state.stats;
        const currentTopicStats = topicStats[currentQuestion.topic] || {
          attempted: 0,
          correct: 0,
          averageTime: 0,
        };

        // Update topic stats
        const newAttempts = currentTopicStats.attempted + 1;
        const newCorrect = currentTopicStats.correct + (result.isCorrect ? 1 : 0);
        const newAverageTime = (
          (currentTopicStats.averageTime * currentTopicStats.attempted + result.timeTaken) / 
          newAttempts
        );

        set({
          stats: {
            ...state.stats,
            totalQuestionsAnswered: state.stats.totalQuestionsAnswered + 1,
            totalCorrect: state.stats.totalCorrect + (result.isCorrect ? 1 : 0),
            totalIncorrect: state.stats.totalIncorrect + (result.isCorrect ? 0 : 1),
            bestStreak: Math.max(state.stats.bestStreak, state.progress.streak),
            averageScore: (
              (state.stats.averageScore * state.stats.totalQuestionsAnswered + result.pointsEarned) /
              (state.stats.totalQuestionsAnswered + 1)
            ),
            topicStats: {
              ...topicStats,
              [currentQuestion.topic]: {
                attempted: newAttempts,
                correct: newCorrect,
                averageTime: newAverageTime,
              },
            },
          },
        });
      },

      // Add session recovery
      recoverSession: async () => {
        const state = get();
        if (!state.activeSession.id || state.activeSession.status !== 'error') return;

        set({ ui: { ...state.ui, isLoading: true, error: null }});

        try {
          // Get the deck ID from either the config or active session
          const deckId = state.config?.deckId || state.activeSession.deckId;
          
          if (!deckId) {
            console.error('[QuizStore] Cannot recover session - no deck ID found');
            throw new Error('Failed to recover session - no deck ID found');
          }
          
          // Try to fetch session state from API
          const response = await fetch(`/api/decks/${deckId}/quiz/${state.activeSession.id}/recover`, {
            method: 'POST',
          });

          if (!response.ok) throw new Error('Failed to recover session');

          const data = await response.json();
          
          // Restore session state
          set({
            activeSession: {
              ...state.activeSession,
              status: 'active',
            },
            questions: {
              ...state.questions,
              current: data.currentQuestion,
              answered: data.answeredQuestions,
            },
            progress: {
              ...state.progress,
              currentQuestionIndex: data.currentIndex,
              score: data.score,
              correctAnswers: data.correctAnswers,
              incorrectAnswers: data.incorrectAnswers,
            },
            ui: {
              ...state.ui,
              isLoading: false,
              error: null,
            },
          });

          // Log recovery
          get().logAnalytics({
            type: 'session_recovered',
            data: {
              sessionId: state.activeSession.id,
              recoveryType: 'network',
              questionsAnswered: Object.keys(data.answeredQuestions).length,
              timestamp: Date.now(),
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          get().logAnalytics({
            type: 'error_occurred',
            data: {
              sessionId: state.activeSession.id,
              errorType: 'api',
              errorMessage,
              timestamp: Date.now(),
            },
          });
          set({ 
            ui: { ...state.ui, isLoading: false, error: errorMessage },
          });
        }
      },

      // Add analytics logging
      logAnalytics: (event: QuizAnalyticsEvent) => {
        // Send to analytics service
        fetch('/api/analytics/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }).catch(console.error); // Non-blocking
      },

      actions: {
        setIsLoading: (isLoading: boolean) => set((state) => ({
          ui: { ...state.ui, isLoading }
        })),
        toggleConfig: () => set((state) => ({
          ui: { ...state.ui, showConfig: !state.ui.showConfig }
        })),
        togglePause: () => {
          const state = get();
          const now = Date.now();

          if (state.ui.isPaused) {
            // Resuming
            const pausedDuration = now - (state.timing.pausedAt || now);
            set({
              timing: {
                ...state.timing,
                pausedAt: null,
                totalPausedTime: state.timing.totalPausedTime + pausedDuration,
              },
              ui: {
                ...state.ui,
                isPaused: false,
              },
            });
          } else {
            // Pausing
            set({
              timing: {
                ...state.timing,
                pausedAt: now,
              },
              ui: {
                ...state.ui,
                isPaused: true,
              },
            });
          }
        },
      },
    }),
    {
      name: 'quiz-storage',
      partialize: (state) => ({
        activeSession: state.activeSession,
        questions: state.questions,
        progress: state.progress,
        timing: state.timing,
        stats: state.stats,
      }),
    }
  )
); 