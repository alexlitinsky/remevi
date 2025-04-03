'use client'
import { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useQuizStore } from '@/stores/useQuizStore';
import { MCQQuestion, FRQQuestion } from '@/types/quiz';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';

export function QuizQuestion() {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    currentQuestion,
    submitAnswer,
    nextQuestion,
    showExplanation,
    answers
  } = useQuizStore();

  if (!currentQuestion) return null;

  const currentAnswer = answers[currentQuestion.id];
  const isAnswered = !!currentAnswer;

  const handleSubmit = async () => {
    if (!answer || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await submitAnswer(answer);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setAnswer('');
    nextQuestion();
  };

  return (
    <Card className="p-6 w-full max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Question */}
        <div>
          <h3 className="text-lg font-medium mb-2">Question</h3>
          <p className="text-gray-700 dark:text-gray-300">{currentQuestion.question}</p>
        </div>

        {/* Answer Section */}
        <div>
          <h3 className="text-lg font-medium mb-2">Your Answer</h3>
          
          {currentQuestion.type === 'mcq' ? (
            // MCQ Options
            <RadioGroup
              value={answer}
              onValueChange={setAnswer}
              disabled={isAnswered}
              className="space-y-2"
            >
              {(currentQuestion as MCQQuestion).options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            // FRQ Input
            <Input
              type="text"
              value={answer}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)}
              disabled={isAnswered}
              placeholder="Type your answer here..."
              className="w-full"
            />
          )}
        </div>

        {/* Result & Explanation */}
        {showExplanation && currentAnswer && (
          <Alert variant={currentAnswer.isCorrect ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {currentAnswer.isCorrect ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {currentAnswer.isCorrect ? 'Correct!' : 'Incorrect'}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          {!isAnswered ? (
            <Button
              onClick={handleSubmit}
              disabled={!answer || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next Question
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
} 