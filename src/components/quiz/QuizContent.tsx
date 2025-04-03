'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { MCQQuestion, FRQQuestion } from "@/types/quiz";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function MCQAnswerSection({ 
  question, 
  selectedAnswer, 
  onSelect,
  disabled = false
}: { 
  question: MCQQuestion;
  selectedAnswer: string;
  onSelect: (answer: string) => void;
  disabled?: boolean;
}) {
  if (!question?.options?.length) {
    return null;
  }

  // Debug what's selected
  console.log("🔍 MCQAnswerSection Render:", { 
    selectedAnswer, 
    options: question.options,
    matchingOptionIndex: question.options.findIndex(opt => opt === selectedAnswer)
  });

  return (
    <div className="space-y-3">
      {question.options.map((option, index) => {
        // Check if this option is selected (comparing strings)
        const isSelected = selectedAnswer === option;
        // Get the letter for this option (A, B, C, D)
        const optionLetter = String.fromCharCode(65 + index); // ASCII: A=65, B=66, etc.
        
        return (
          <button
            key={index}
            onClick={() => !disabled && onSelect(option)}
            className={cn(
              "w-full p-4 text-left rounded-xl border-2 transition-all relative hover:scale-[1.01] hover:shadow-md",
              isSelected
                ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/50 shadow-md"
                : "border-muted/50 hover:border-primary/50 bg-card/50 hover:bg-accent/50 backdrop-blur-sm",
              disabled && "opacity-80 pointer-events-none"
            )}
            disabled={disabled}
            data-selected={isSelected ? "true" : "false"}
            data-index={index}
            data-option={option}
          >
            <div className="flex items-center gap-3">
              {/* Letter indicator */}
              <kbd className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted/70 text-muted-foreground border border-muted"
              )}>
                {optionLetter}
              </kbd>
              <span className={cn(
                "text-base",
                isSelected && "font-medium"
              )}>{option}</span>
            </div>
          </button>
        );
      })}
      {!disabled && (
        <div className="text-xs text-muted-foreground mt-2 pl-2">
          Press <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">A</kbd> - 
          <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">D</kbd> to select options
        </div>
      )}
    </div>
  );
}

interface FRQAnswerSectionProps {
  question: FRQQuestion;
  answer: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const FRQAnswerSection = React.forwardRef<HTMLInputElement, FRQAnswerSectionProps>(
  ({ question, answer, onChange, disabled = false }, ref) => {
    if (!question) {
      return null;
    }

    return (
      <div className="space-y-4">
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            placeholder="Type your answer..."
            value={answer}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-6 text-base rounded-xl border-2 border-muted/50 focus-visible:border-primary/50 bg-card/50 backdrop-blur-sm"
            disabled={disabled}
          />
        </div>
        {!disabled && (
          <div className="text-xs text-muted-foreground mt-2 pl-2">
            Press <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">Enter</kbd> to submit your answer
          </div>
        )}
      </div>
    );
  }
);

FRQAnswerSection.displayName = "FRQAnswerSection";

export function QuizContent() {
  const {
    questions,
    progress: { currentQuestionIndex },
    ui: { showHint, showExplanation, isPaused, isLoading, error },
    timing,
    submitAnswer,
    toggleHint,
    actions: { togglePause },
    logAnalytics,
    nextQuestion,
    endQuiz
  } = useQuizStore();

  // Enhanced debugging - log more detailed information about the current state
  console.log('[QuizContent] Current state:', {
    questionsArray: questions.all?.length,
    currentQuestion: questions.current,
    currentQuestionId: questions.current?.id,
    currentQuestionType: questions.current?.type,
    remainingQuestions: questions.remaining?.length,
    currentQuestionIndex,
    isLoading,
    error
  });

  const [selectedOption, setSelectedOption] = useState<string>("");
  const [interactionStartTime, setInteractionStartTime] = useState<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const currentQuestion = questions.current;
  const [errorState, setError] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    explanation: string;
    submitted: boolean;
  } | null>(null);
  const [deckId, setDeckId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const calculateTimeTaken = () => {
    if (!timing.startTime) return 0;
    const now = Date.now();
    const totalTime = now - interactionStartTime;
    return Math.max(0, totalTime - (timing.totalPausedTime || 0));
  };

  const handleOptionSelect = useCallback((option: string) => {
    console.log(`🔆 Selecting option: "${option}"`);
    setSelectedOption(prev => {
      if (prev === option) {
        console.log(`🔆 Option already selected: "${option}"`);
        return prev;
      }
      console.log(`🔆 Changing selection from "${prev}" to "${option}"`);
      return option;
    });
  }, []);
  
  const proceedToNextQuestion = async () => {
    const state = useQuizStore.getState();
    const isLastQuestion = state.progress.currentQuestionIndex === state.questions.all.length - 1;
    
    // Debug the answered questions state before proceeding
    console.log('[QuizContent] Before proceeding to next question:', {
      currentIndex: state.progress.currentQuestionIndex,
      totalQuestions: state.questions.all.length,
      answeredCount: Object.keys(state.questions.answered).length,
      isLastQuestion,
      currentQuestionId: currentQuestion?.id,
      hasAnswerResult: !!answerResult
    });
    
    // Reset UI state
    setAnswerResult(null);
    setSelectedOption("");
    setInteractionStartTime(Date.now());
    
    if (isLastQuestion) {
      // On the last question, immediately switch to results view before API call
      console.log('[QuizContent] Last question answered, showing results immediately');
      
      // Immediately set UI to results view
      useQuizStore.setState(state => ({
        activeSession: {
          ...state.activeSession,
          status: 'completed',
          endTime: Date.now()
        },
        ui: {
          ...state.ui,
          view: 'results',
          isLoading: false,
        }
      }));
      
      // Then attempt to end quiz in the background
      try {
        await state.endQuiz();
        console.log('[QuizContent] Quiz ended successfully via API');
        
        // Check the final state after API call
        const finalState = useQuizStore.getState();
        console.log('[QuizContent] Final quiz state after API call:', {
          view: finalState.ui.view,
          status: finalState.activeSession.status,
          answeredCount: Object.keys(finalState.questions.answered).length
        });
      } catch (error) {
        console.error('[QuizContent] Error ending quiz:', error);
        // UI is already showing results, so no need to update again
      }
    } else {
      // Otherwise advance to next question
      nextQuestion();
    }
  };
  
  // Extract deck ID from URL path on the client side only
  useEffect(() => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const deckIndex = pathParts.indexOf('deck');
    
    if (deckIndex !== -1 && pathParts.length > deckIndex + 1) {
      setDeckId(pathParts[deckIndex + 1]);
    } else {
      console.error('[QuizContent] Could not extract deck ID from path:', window.location.pathname);
    }
  }, []);
  
  // Try to generate questions and start quiz
  const generateAndStartQuiz = async () => {
    if (!deckId) {
      setError('Could not determine deck ID. Please try again.');
      return;
    }
    
    try {
      // Check if there are available questions
      const response = await fetch(`/api/decks/${deckId}/quiz/available-questions`);
      const data = await response.json();
      
      if (data.total === 0) {
        // No questions available, generate some
        console.log('[QuizContent] No questions available, generating questions');
        const generateResponse = await fetch(`/api/decks/${deckId}/quiz/generate-questions`, {
          method: 'POST'
        });
        
        if (!generateResponse.ok) {
          throw new Error('Failed to generate questions');
        }

        // Wait for questions to be generated and indexed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify questions were generated
        const verifyResponse = await fetch(`/api/decks/${deckId}/quiz/available-questions`);
        const verifyData = await verifyResponse.json();
        
        if (verifyData.total === 0) {
          throw new Error('Failed to generate questions');
        }
      }
      
      // Now start the quiz
      const { startQuiz } = useQuizStore.getState();
      await startQuiz({
        deckId,
        type: 'mixed',
        questionCount: 10
      });
    } catch (error) {
      console.error('[QuizContent] Error generating/starting quiz:', error);
      setError('Failed to start quiz. Please try again later.');
    }
  };

  // Log when component mounts
  useEffect(() => {
    // Only log on client-side
    if (typeof window !== 'undefined') {
      console.log('[QuizContent] Component mounted, questions state:', {
        all: questions.all?.length || 0,
        current: questions.current ? 'exists' : 'null',
        loading: isLoading,
        error: error
      });
    }
  }, [questions.all?.length, questions.current, isLoading, error]);

  // Reset interaction timer when question changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[QuizContent] Question changed:', currentQuestion?.id, 
        'Type:', currentQuestion?.type, 
        'Question:', currentQuestion?.question?.substring(0, 30),
        'Options:', currentQuestion?.type === 'mcq' ? (currentQuestion as MCQQuestion)?.options?.length : 'N/A'
      );
      setInteractionStartTime(Date.now());
      setSelectedOption("");
    }
  }, [currentQuestion?.id]);

  // Monitor for error state changes
  useEffect(() => {
    if (typeof window !== 'undefined' && error) {
      console.error('[QuizContent] Error state updated:', error);
    }
  }, [error]);

  // Monitor when the quiz is restarted and reset component state
  useEffect(() => {
    if (currentQuestion) {
      // When the question changes (especially during restarts),
      // reset local state variables
      setSelectedOption("");
      setAnswerResult(null);
      setInteractionStartTime(Date.now());
      setError(null);
      
      console.log('[QuizContent] Question reset/restart detected:', currentQuestion.id);
    }
  }, [currentQuestion?.id]);

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedOption) {
      console.log('[QuizContent] Cannot submit - missing question or answer', {
        hasQuestion: !!currentQuestion,
        hasAnswer: !!selectedOption,
        selectedOption
      });
      return;
    }

    try {
      // Set submitting state to show loading spinner ONLY in the button, not the whole UI
      setIsSubmitting(true);
      
      // Store current question locally to prevent it from disappearing during submission
      const questionBeingAnswered = currentQuestion;
      
      const timeTaken = calculateTimeTaken();
      
      // Get the quiz state
      const state = useQuizStore.getState();
      const deckId = state.config?.deckId || state.activeSession.deckId;
      
      if (!deckId) {
        console.error('🔴 [QuizContent] Cannot submit answer - no deck ID found');
        setError('Unable to submit answer - session information is missing. Please restart the quiz.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('🟡 [QuizContent] Preparing to submit answer:', {
        questionId: currentQuestion.id,
        questionType: currentQuestion.type,
        userAnswer: selectedOption,
        timeTaken,
        deckId
      });
      
      // Ensure selectedOption is properly formatted for the question type
      let submittedAnswer = selectedOption;
      if (currentQuestion.type === 'mcq') {
        const mcqQuestion = currentQuestion as MCQQuestion;
        // If we're submitting the option text, find its index
        const optionIndex = mcqQuestion.options.findIndex(opt => opt === selectedOption);
        console.log('🟡 [QuizContent] MCQ answer processing:', {
          optionIndex,
          selectedOption,
          allOptions: mcqQuestion.options
        });
        
        if (optionIndex !== -1) {
          submittedAnswer = optionIndex.toString();
          console.log('🟡 [QuizContent] Converted MCQ answer to index:', submittedAnswer);
        }
      }
      
      // Note: currentQuestion.id is the ID of the MCQContent/FRQContent, not the StudyContent
      console.log('🟡 [QuizContent] Calling submitAnswer with:', {
        questionId: currentQuestion.id, // This ID is what we'll use to find the content
        userAnswer: submittedAnswer,
        timeTaken,
        skipped: false
      });
      
      // Get direct access to the store state
      console.log('🟡 [QuizContent] Current quiz session:', {
        sessionId: state.activeSession.id,
        deckId: state.config?.deckId,
        status: state.activeSession.status
      });
      
      const result = await submitAnswer({
        questionId: currentQuestion.id,
        userAnswer: submittedAnswer,
        timeTaken,
        skipped: false,
      });
      
      console.log('🟡 [QuizContent] Answer submitted successfully', result);
      
      // Set the answer result to show feedback
      setAnswerResult({
        isCorrect: result.isCorrect,
        explanation: result.explanation,
        submitted: true
      });
      
      // Don't clear selection or reset timer yet - wait for user to proceed
    } catch (error) {
      console.error('🔴 [QuizContent] Error submitting answer:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit answer');
    } finally {
      // Always disable the loading state
      setIsSubmitting(false);
    }
  };

  // Fix keyboard shortcuts to use direct key handling for A, B, C, D
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    // Don't process keyboard shortcuts if we're in an input element
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Don't process if paused or submitting
    if (isPaused || isSubmitting) return;
    
    // Prevent defaults for keyboard shortcuts that might trigger browser actions or extensions
    const key = e.key.toLowerCase();
    // Always prevent default for letter keys and special keys during quiz
    if (currentQuestion && /^[a-z]$/.test(key) || ['enter', ' ', 'escape'].includes(key)) {
      e.preventDefault();
      console.log('🛡️ Preventing browser default for key:', key);
    }
    
    console.log('🎹 Key pressed:', e.key, 'Key code:', e.keyCode, 'Code:', e.code, 'Target:', e.target);
    
    // If we have answer result shown, space/enter should advance to next question
    if (answerResult) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        proceedToNextQuestion();
      }
      return;
    }
    
    // Only process other shortcuts if we have a current question and no answer result yet
    if (!currentQuestion) return;

    // Universal shortcuts
    switch (e.key) {
      case 'Escape':
        togglePause();
        break;
      case ' ':
        if (e.target === document.body) {
          e.preventDefault();
          toggleHint();
        }
        break;
    }

    // Letter key handling (A, B, C, D) for MCQ questions
    if (currentQuestion.type === 'mcq' && !(isSubmitting || answerResult !== null)) {
      const mcqQuestion = currentQuestion as MCQQuestion;
      
      // Handle both letter and number keys
      const keyNum = parseInt(e.key);
      const isNumberKey = !isNaN(keyNum) && keyNum > 0 && keyNum <= mcqQuestion.options.length;
      
      // Get the key pressed (case insensitive - accept both a/A, b/B, etc.)
      const letterKey = e.key.toUpperCase();
      const isLetterKey = letterKey >= 'A' && letterKey <= 'D';
      
      console.log(`🔤 Key check: key=${e.key}, isNumber=${isNumberKey}, isLetter=${isLetterKey}`);
      
      if (isNumberKey || isLetterKey) {
        e.preventDefault();
        
        // Calculate the index based on either number (1-based) or letter (A=0, B=1, etc.)
        const index = isNumberKey ? keyNum - 1 : letterKey.charCodeAt(0) - 65;
        console.log(`🔤 Key ${e.key} pressed (index ${index})`);
        
        if (index >= 0 && index < mcqQuestion.options.length) {
          console.log(`🔤 Selecting option at index ${index}: ${mcqQuestion.options[index]}`);
          handleOptionSelect(mcqQuestion.options[index]);
        }
      }
    }

    // Submit on Enter if answer selected
    if (e.key === 'Enter' && selectedOption) {
      e.preventDefault();
      handleSubmit();
    }
  }, [currentQuestion, selectedOption, isPaused, answerResult, isSubmitting, togglePause, toggleHint, proceedToNextQuestion, handleOptionSelect]);

  // Update where the keyboard handler is set up to use capture phase
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use capture phase to ensure our handler gets first chance at the event
    window.addEventListener('keydown', handleKeyboardShortcuts, true);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts, true);
  }, [handleKeyboardShortcuts]);

  // Only show loading state when isLoading is true and there's no current question
  if (isLoading && !currentQuestion) {
    console.log('[QuizContent] Rendering loading state - initial load');
    return (
      <Card className="p-6 border-2 border-primary/10 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" aria-hidden="true" />
        <div className="relative z-10">
          <div className="animate-pulse space-y-5">
            <div className="h-5 bg-muted rounded-full w-1/5"></div>
            <div className="h-6 bg-muted rounded-full w-3/4"></div>
            <div className="h-4 bg-muted rounded-full w-1/2"></div>
            <div className="space-y-3 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-muted/70 rounded-xl"></div>
              ))}
            </div>
            <div className="h-14 bg-muted/70 rounded-xl mt-4"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    console.error('[QuizContent] Rendering error state:', error);
    return (
      <Card className="p-6 border-2 border-destructive/30 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-background to-destructive/5 pointer-events-none" aria-hidden="true" />
        <div className="relative z-10">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center text-destructive">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Error Loading Quiz</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!currentQuestion) {
    console.error('[QuizContent] No current question available to render');
    return (
      <Card className="p-8 border-2 border-primary/10 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" aria-hidden="true" />
        <div className="relative z-10">
          <div className="flex flex-col items-center justify-center space-y-5 py-4">
            <h3 className="text-xl font-medium">No Questions Available</h3>
            {errorState && (
              <Alert variant="destructive" className="mt-2 border-2 border-destructive/30">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorState}</AlertDescription>
              </Alert>
            )}
            <p className="text-muted-foreground text-center">
              We couldn't find any questions for this quiz. Try generating some questions first.
            </p>
            <Button 
              onClick={generateAndStartQuiz}
              className="mt-4 py-6 px-8 text-base font-medium rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 text-primary-foreground border-2 border-primary/20 shadow-md"
            >
              Generate Questions
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card className="p-6 border-2 border-primary/10 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 space-y-6">
          {/* Question */}
          <div className="space-y-3">
            <div className="inline-block px-2 py-1 mb-2 rounded-full bg-primary/10 text-primary text-xs">
              {currentQuestion.topic}
            </div>
            <h3 className="text-xl font-semibold">
              {currentQuestion.question}
            </h3>
            <AnimatePresence>
              {showHint && currentQuestion.hint && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-lg"
                >
                  💡 {currentQuestion.hint}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Answer Section - Always visible but possibly disabled */}
          {currentQuestion.type === 'mcq' && (
            <MCQAnswerSection
              question={currentQuestion as MCQQuestion}
              selectedAnswer={selectedOption}
              onSelect={handleOptionSelect}
              disabled={isSubmitting || answerResult !== null}
            />
          )}

          {currentQuestion.type === 'frq' && (
            <FRQAnswerSection
              ref={inputRef}
              question={currentQuestion as FRQQuestion}
              answer={selectedOption}
              onChange={handleOptionSelect}
              disabled={isSubmitting || answerResult !== null}
            />
          )}

          {/* Feedback Section (only appears after submission) */}
          {answerResult && (
            <div className={cn(
              "p-6 rounded-xl border-2 mb-4 backdrop-blur-sm",
              answerResult.isCorrect 
                ? "bg-green-50/90 border-green-200 dark:bg-green-950/50 dark:border-green-800" 
                : "bg-red-50/90 border-red-200 dark:bg-red-950/50 dark:border-red-800"
            )}>
              <div className="flex items-center gap-2 font-semibold mb-3 text-lg">
                {answerResult.isCorrect ? (
                  <>
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600 dark:text-green-400">Correct!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-red-600 dark:text-red-400">Incorrect</span>
                  </>
                )}
              </div>
              
              {currentQuestion.type === 'mcq' && !answerResult.isCorrect && (
                <div className="mb-3 p-3 bg-background/80 rounded-lg border border-muted">
                  <span className="font-medium block mb-1">Correct answer:</span>
                  {(currentQuestion as MCQQuestion).options[(currentQuestion as MCQQuestion).correctOptionIndex]}
                </div>
              )}
              
              {answerResult.explanation && (
                <div className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-background/80 rounded-lg border border-muted">
                  <span className="font-medium block mb-1">Explanation:</span>
                  {answerResult.explanation}
                </div>
              )}
              
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
                Press <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono">Space</kbd> or <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono">Enter</kbd> to continue
              </div>
            </div>
          )}

          {/* Submit or Next Button */}
          {!answerResult ? (
            <Button
              className={cn(
                "w-full relative py-6 text-base font-medium rounded-xl",
                selectedOption 
                  ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 text-primary-foreground border-2 border-primary/20 shadow-md" 
                  : "bg-muted/70 text-muted-foreground border-2 border-muted/30"
              )}
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
              variant={selectedOption ? "default" : "outline"}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="animate-pulse">Evaluating Answer...</span>
                </div>
              ) : (
                'Submit Answer'
              )}
            </Button>
          ) : (
            <>
            {useQuizStore.getState().progress.currentQuestionIndex === 
             useQuizStore.getState().questions.all.length - 1 ? (
              <Button 
                className="w-full py-6 text-base font-medium rounded-xl bg-gradient-to-r from-secondary to-primary hover:from-secondary/95 hover:to-primary/95 text-primary-foreground border-2 border-primary/20 shadow-md" 
                onClick={() => {
                  // Immediately set view to results before any async operations
                  console.log('[QuizContent] View Results button clicked, forcing results view');
                  useQuizStore.setState(state => ({
                    activeSession: {
                      ...state.activeSession,
                      status: 'completed',
                      endTime: Date.now()
                    },
                    ui: {
                      ...state.ui,
                      view: 'results',
                      isLoading: false,
                    }
                  }));
                  
                  // Then try to properly end the quiz
                  proceedToNextQuestion();
                }}
              >
                View Results
              </Button>
            ) : (
              <Button 
                className="w-full py-6 text-base font-medium rounded-xl bg-gradient-to-r from-primary/90 to-secondary/90 hover:from-primary hover:to-secondary text-primary-foreground border-2 border-primary/20 shadow-md" 
                onClick={proceedToNextQuestion}
              >
                Next Question
              </Button>
            )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
} 