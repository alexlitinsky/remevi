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
    <div className="space-y-4">
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
              "w-full p-4 text-left rounded-lg border-2 transition-all relative transform hover:scale-[1.02] hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/5 text-primary ring-2 ring-primary ring-opacity-70 shadow-md"
                : "border-muted hover:border-primary hover:bg-accent",
              disabled && "opacity-70 pointer-events-none"
            )}
            disabled={disabled}
            data-selected={isSelected ? "true" : "false"}
            data-index={index}
            data-option={option}
          >
            <div className="flex items-center gap-2">
              {/* Letter indicator */}
              <kbd className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-md border text-sm font-medium",
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {optionLetter}
              </kbd>
              <span className={cn(
                isSelected && "font-medium text-primary"
              )}>{option}</span>
            </div>
          </button>
        );
      })}
      {!disabled && (
        <div className="text-xs text-muted-foreground mt-2">
          Tip: Press <kbd className="px-1 py-0.5 rounded border bg-muted font-mono">A</kbd> - <kbd className="px-1 py-0.5 rounded border bg-muted font-mono">D</kbd> to select options
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
        <Input
          ref={ref}
          type="text"
          placeholder="Type your answer..."
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
          disabled={disabled}
        />
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
    nextQuestion
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
  
  const proceedToNextQuestion = () => {
    // Reset UI state
    setAnswerResult(null);
    setSelectedOption("");
    setInteractionStartTime(Date.now());
    
    // Advance to next question
    nextQuestion();
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
      // Set submitting state to show loading spinner ONLY in the button
      setIsSubmitting(true);
      
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
    
    // Prevent browser shortcuts for specific keys (a, b, c, d, etc.)
    const key = e.key.toLowerCase();
    if (['a', 'b', 'c', 'd', 'f', 'h', 'j', 'k', ' '].includes(key)) {
      // These keys often trigger browser shortcuts (find, history, bookmarks, etc.)
      // Only prevent if we're in an MCQ question or showing answer feedback
      if ((currentQuestion?.type === 'mcq' || answerResult) && e.target === document.body) {
        e.preventDefault();
        console.log('🛡️ Preventing browser default for key:', key);
      }
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
      
      // Get the key pressed (case insensitive - accept both a/A, b/B, etc.)
      const key = e.key.toUpperCase();
      
      console.log(`🔤 Letter key check: key=${key}`);
      
      // Check if it's a letter from A-D
      if (key === 'A' || key === 'B' || key === 'C' || key === 'D') {
        e.preventDefault();
        
        // Calculate the index based on the letter (A=0, B=1, etc.)
        const index = key.charCodeAt(0) - 65; // ASCII: A=65, B=66, etc. => 0, 1, 2, 3
        console.log(`🔤 Letter key ${key} pressed (index ${index})`);
        
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

  // Only show loading state when the questions haven't loaded yet
  if (isLoading && !currentQuestion) {
    console.log('[QuizContent] Rendering loading state - initial load');
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    console.error('[QuizContent] Rendering error state:', error);
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-semibold">Error Loading Quiz</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!currentQuestion) {
    console.error('[QuizContent] No current question available to render');
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <h3 className="text-xl font-medium">No Questions Available</h3>
          {errorState && (
            <Alert variant="destructive" className="mt-2">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorState}</AlertDescription>
            </Alert>
          )}
          <p className="text-muted-foreground text-center">
            We couldn't find any questions for this quiz. Try generating some questions first.
          </p>
          <Button onClick={generateAndStartQuiz}>
            Generate Questions
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card className="p-6">
        <div className="space-y-6">
          {/* Question - Always visible */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {currentQuestion.question}
            </h3>
            {/* Topic tag */}
            <div className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
              {currentQuestion.topic}
            </div>
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
              "p-4 rounded-lg border mb-4",
              answerResult.isCorrect 
                ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900" 
                : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
            )}>
              <div className="flex items-center gap-2 font-medium mb-2">
                {answerResult.isCorrect ? (
                  <>
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600 dark:text-green-400">Correct!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-red-600 dark:text-red-400">Incorrect</span>
                  </>
                )}
              </div>
              
              {currentQuestion.type === 'mcq' && !answerResult.isCorrect && (
                <div className="mb-2 text-sm">
                  <span className="font-medium">Correct answer: </span>
                  {(currentQuestion as MCQQuestion).options[(currentQuestion as MCQQuestion).correctOptionIndex]}
                </div>
              )}
              
              {answerResult.explanation && (
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">Explanation: </span>
                  {answerResult.explanation}
                </div>
              )}
              
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
                Press <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono">Space</kbd> or <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono">Enter</kbd> to continue
              </div>
            </div>
          )}

          {/* Submit or Next Button */}
          {!answerResult ? (
            <Button
              className={cn(
                "w-full relative",
                selectedOption 
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary" 
                  : "bg-muted text-muted-foreground"
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
                  Evaluating...
                </div>
              ) : (
                'Submit Answer'
              )}
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={proceedToNextQuestion}
            >
              Next Question
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
} 