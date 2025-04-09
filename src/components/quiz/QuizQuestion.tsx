'use client'
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useQuizStore } from '@/stores/useQuizStore';
import { MCQQuestion, FRQQuestion } from '@/types/quiz';
import { CheckCircle2, XCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { FRQAnswerSection } from './FRQAnswerSection';
import Image from 'next/image';

interface QuizQuestionProps {
  deckTitle: string;
  deckId: string;
}

export function QuizQuestion({ deckTitle, deckId }: QuizQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    currentQuestion,
    submitAnswer,
    nextQuestion,
    showExplanation,
    answers,
    questions,
    currentQuestionIndex,
    setView,
  } = useQuizStore();

  const handleSubmit = useCallback(async () => {
    if (!answer || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitAnswer(answer);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [answer, isSubmitting, submitAnswer]);

  const handleNext = useCallback(() => {
    setAnswer('');
    nextQuestion();
  }, [nextQuestion]);

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      const currentAnswer = answers[currentQuestion?.id || ''];
      const isTextareaActive = document.activeElement?.tagName === 'TEXTAREA';
      
      // If already answered, handle enter/space for next
      if (currentAnswer) {
        if ((e.key === 'Enter' || e.key === ' ') && !isTextareaActive) {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      // Only handle number keys for MCQ questions
      if (currentQuestion?.type === 'mcq') {
        const mcqQuestion = currentQuestion as MCQQuestion;
        const options = mcqQuestion.options;
        
        // Handle number keys 1-4 for MCQ options
        const numKey = parseInt(e.key);
        if (numKey >= 1 && numKey <= 4 && numKey <= options.length) {
          e.preventDefault();
          const selectedOption = options[numKey - 1];
          setAnswer(selectedOption);
        }
      }
      
      // Handle FRQ textarea submissions
      if (currentQuestion?.type === 'frq' && e.key === 'Enter') {
        // Allow shift+enter for new lines
        if (e.shiftKey) {
          return; // Let the default behavior create a new line
        }
        
        // Submit on regular enter if we have an answer
        if (isTextareaActive && answer && !isSubmitting) {
          e.preventDefault();
          handleSubmit();
        }
      }
      
      // Global submit handler (for MCQ or unfocused FRQ)
      if (!isTextareaActive && (e.key === 'Enter' || e.key === ' ') && answer && !isSubmitting) {
        e.preventDefault();
        handleSubmit();
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestion, answer, isSubmitting, answers, handleSubmit, handleNext]);

  if (!currentQuestion) return null;

  const currentAnswer = answers[currentQuestion.id];
  const isAnswered = !!currentAnswer;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="container max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <Image 
            src="/remevi-brain-logo.svg"
            alt="Remevi Logo"
            width={32}
            height={32}
            className="text-primary cursor-pointer"
            onClick={() => window.location.href = '/'}
          />
          <Button
            variant="link"
            className="text-lg font-semibold text-primary hover:text-primary/80 p-0 cursor-pointer"
            onClick={() => window.location.href = `/deck/${deckId}`}
          >
            {deckTitle}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setView('config')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-2" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 border-2 shadow-lg rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
          {/* <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,_var(--tw-gradient-stops))] from-primary/5 via-background/80 to-primary/5 opacity-70" />
            <div className="absolute inset-0 bg-grid-small-white/[0.2] [mask-image:linear-gradient(0deg,transparent,black)]" />
          </div> */}
          
          <div className="relative space-y-6">
            {/* Question */}
            <div className="space-y-3">
              {/* {currentQuestion.topic && (
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {currentQuestion.topic}
                </div>
              )} */}
              <h2 className="text-2xl font-semibold leading-relaxed">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Answer Section */}
            <div className="py-4">
              {currentQuestion.type === 'mcq' ? (
                <RadioGroup
                  value={answer}
                  onValueChange={setAnswer}
                  disabled={isAnswered}
                  className="grid gap-3"
                >
                  {(currentQuestion as MCQQuestion).options.map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Label
                          htmlFor={`option-${index}`}
                          className={`
                            flex items-center space-x-4 p-4 cursor-pointer
                            rounded-xl transition-all duration-200 border-2
                            ${answer === option 
                              ? 'bg-primary/10 border-primary shadow-sm' 
                              : 'hover:bg-accent/50 border-border'
                            }
                          `}
                        >
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center">
                              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground font-medium">
                                {optionLetter}
                              </span>
                            </div>
                            <span className="text-base">{option}</span>
                          </div>
                        </Label>
                      </motion.div>
                    );
                  })}
                </RadioGroup>
              ) : (
                <FRQAnswerSection
                  question={currentQuestion as FRQQuestion}
                  answer={answer}
                  onChange={setAnswer}
                  disabled={isAnswered}
                />
              )}
            </div>

            {/* Result & Explanation */}
            <AnimatePresence>
              {showExplanation && currentAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-4"
                >
                  <div 
                    className={`
                      rounded-xl overflow-hidden border-2 shadow-lg
                      ${currentAnswer.isCorrect 
                        ? 'bg-gradient-to-br from-green-500/20 via-green-500/10 to-background border-green-500/30' 
                        : 'bg-gradient-to-br from-red-500/20 via-red-500/10 to-background border-red-500/30'
                      }
                    `}
                  >
                    {/* Header */}
                    <div className={`
                      px-6 py-4 flex items-center gap-3
                      ${currentAnswer.isCorrect 
                        ? 'bg-green-500/10 border-b border-green-500/20' 
                        : 'bg-red-500/10 border-b border-red-500/20'
                      }
                    `}>
                      {currentAnswer.isCorrect ? (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-500/20">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          </div>
                          <h3 className="text-xl font-semibold text-green-500">Correct!</h3>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-red-500/20">
                            <XCircle className="h-6 w-6 text-red-500" />
                          </div>
                          <h3 className="text-xl font-semibold text-red-500">Incorrect</h3>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      {/* User Answer */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <span>Your Answer</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="p-3 rounded-lg bg-background/80 border shadow-sm">
                          {currentAnswer.userAnswer}
                        </div>
                      </div>

                      {/* Correct Answer for MCQ */}
                      {!currentAnswer.isCorrect && currentQuestion.type === 'mcq' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                            <span>Correct Answer</span>
                            <div className="flex-1 h-px bg-green-500/20" />
                          </div>
                          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 shadow-sm">
                            {(currentQuestion as MCQQuestion).options[(currentQuestion as MCQQuestion).correctOptionIndex]}
                          </div>
                        </div>
                      )}

                      {/* Acceptable Answers for FRQ */}
                      {!currentAnswer.isCorrect && currentQuestion.type === 'frq' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                            <span>Acceptable Answers</span>
                            <div className="flex-1 h-px bg-green-500/20" />
                          </div>
                          <div className="space-y-2">
                            {(currentQuestion as FRQQuestion).answers.map((answer, index) => (
                              <div 
                                key={index}
                                className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 shadow-sm"
                              >
                                {answer}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {currentQuestion.hint && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <span>Explanation</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          <div className="p-4 rounded-lg bg-background/80 border shadow-sm prose prose-sm dark:prose-invert max-w-none">
                            {currentQuestion.hint}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="pt-2">
              {!isAnswered ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!answer || isSubmitting}
                  className="w-full h-12 text-lg font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  size="lg"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-t-2 border-b-2 border-current rounded-full animate-spin" />
                      <span>Checking...</span>
                    </div>
                  ) : (
                    <>
                      Submit Answer
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext}
                  className="w-full h-12 text-lg font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  size="lg"
                >
                  {currentQuestionIndex === questions.length - 1 ? (
                    <>
                      View Results
                    </>
                  ) : (
                    <>
                      Next Question
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
} 