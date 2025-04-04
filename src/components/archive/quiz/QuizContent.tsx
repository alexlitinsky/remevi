'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MCQAnswerSection } from "../../quiz/MCQAnswerSection";
import { FRQAnswerSection } from "../../quiz/FRQAnswerSection";
import { useEffect, useRef, useState } from "react";

export function QuizContent() {
  const {
    questions,
    currentQuestionIndex,
    status,
    isLoading,
    error,
    submitAnswer,
    nextQuestion,
    startQuiz,
    setError,
  } = useQuizStore();

  const [selectedOption, setSelectedOption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    feedback?: string;
  } | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Handle answer selection
  const handleOptionSelect = (option: string) => {
    if (isSubmitting || answerResult) return;
    setSelectedOption(option);
  };

  // Handle answer submission
  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting || answerResult) return;

    setIsSubmitting(true);
    try {
      await submitAnswer(selectedOption);
      setAnswerResult({
        isCorrect: selectedOption.toLowerCase() === currentQuestion.correctAnswer.toLowerCase(),
        feedback: currentQuestion.hint
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle proceeding to next question
  const proceedToNextQuestion = () => {
    setSelectedOption("");
    setAnswerResult(null);
    nextQuestion();
  };

  // Extract deck ID from URL
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const deckIndex = pathParts.indexOf('deck');
    if (deckIndex !== -1 && pathParts.length > deckIndex + 1) {
      setDeckId(pathParts[deckIndex + 1]);
    }
  }, []);

  // Start quiz if needed
  useEffect(() => {
    if (status === 'idle' && deckId) {
      startQuiz({ deckId });
    }
  }, [status, deckId, startQuiz]);

  // Show loading state
  if (isLoading) {
    return (
      <Card className="p-6 border-2 border-primary/10 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="animate-pulse space-y-5">
            <div className="h-5 bg-muted rounded-full w-1/5" />
            <div className="h-6 bg-muted rounded-full w-3/4" />
            <div className="h-4 bg-muted rounded-full w-1/2" />
            <div className="space-y-3 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-muted/70 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="p-6 border-2 border-destructive/30 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-background to-destructive/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Error</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Show no questions state
  if (!currentQuestion) {
    return (
      <Card className="p-6 border-2 border-primary/10 shadow-md rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">No Questions Available</h3>
            <p className="text-muted-foreground">
              Please wait while we prepare your questions...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-primary/10 shadow-md rounded-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
      <div className="relative z-10 space-y-6">
        {/* Question */}
        <div className="space-y-3">
          {currentQuestion.topic && (
            <div className="inline-block px-2 py-1 mb-2 rounded-full bg-primary/10 text-primary text-xs">
              {currentQuestion.topic}
            </div>
          )}
          <h3 className="text-xl font-semibold">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Answer Section */}
        {currentQuestion.type === 'mcq' && (
          <MCQAnswerSection
            question={currentQuestion}
            selectedAnswer={selectedOption}
            onSelect={handleOptionSelect}
            disabled={isSubmitting || answerResult !== null}
          />
        )}

        {currentQuestion.type === 'frq' && (
          <FRQAnswerSection
            ref={inputRef}
            question={currentQuestion}
            answer={selectedOption}
            onChange={handleOptionSelect}
            disabled={isSubmitting || answerResult !== null}
          />
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {!answerResult ? (
            <Button
              className="w-full py-6 text-base font-medium rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 text-primary-foreground border-2 border-primary/20 shadow-md"
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
            >
              {isSubmitting ? 'Checking...' : 'Submit Answer'}
            </Button>
          ) : (
            <div className="space-y-4">
              <Alert variant={answerResult.isCorrect ? "default" : "destructive"}>
                <AlertTitle>
                  {answerResult.isCorrect ? 'Correct!' : 'Incorrect'}
                </AlertTitle>
                {answerResult.feedback && (
                  <AlertDescription>{answerResult.feedback}</AlertDescription>
                )}
              </Alert>
              <Button
                className="w-full py-6 text-base font-medium rounded-xl bg-gradient-to-r from-primary/90 to-secondary/90 hover:from-primary hover:to-secondary text-primary-foreground border-2 border-primary/20 shadow-md"
                onClick={proceedToNextQuestion}
              >
                {currentQuestionIndex === questions.length - 1 ? 'View Results' : 'Next Question'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 