'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Home
} from "lucide-react";
import { useEffect } from "react";
import { useAchievementStore } from '@/stores/useAchievementStore';
import { AchievementNotification } from '@/components/achievements/AchievementNotification';

export function QuizResults() {
  const {
    questions,
    answers,
    score,
    correctAnswers,
    incorrectAnswers,
    restartQuiz,
    setView,
    config
  } = useQuizStore();

  const { checkAchievements } = useAchievementStore();

  const totalQuestions = questions.length;
  const accuracy = totalQuestions > 0 
    ? Math.round((correctAnswers / totalQuestions) * 100) 
    : 0;

  useEffect(() => {
    // Check for achievements when quiz is completed
    checkAchievements({
      quizScore: accuracy,
      correctAnswers,
      sessionType: 'quiz'
    });
  }, [accuracy, correctAnswers, checkAchievements]);

  return (
    <>
      <Card className="p-6 w-full max-w-2xl mx-auto">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Quiz Results</h2>
            <p className="text-xl mb-4">
              Score: {score} points
            </p>
            <div className="flex justify-center gap-8 text-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>{correctAnswers} correct</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>{incorrectAnswers} incorrect</span>
              </div>
            </div>
            <p className="text-lg mt-2">
              Accuracy: {accuracy}%
            </p>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Question Review</h3>
            {questions.map((question, index) => {
              const answer = answers[question.id];
              if (!answer) return null;

              return (
                <div 
                  key={question.id} 
                  className={`p-4 rounded-lg border ${
                    answer.isCorrect 
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/10' 
                      : 'border-red-200 bg-red-50 dark:bg-red-900/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      {answer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Question {index + 1}</p>
                      <p className="text-gray-700 dark:text-gray-300">{question.question}</p>
                      <div className="mt-2">
                        <p className="text-sm font-medium">Your answer:</p>
                        <p className="text-gray-600 dark:text-gray-400">{answer.userAnswer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:justify-center">
            <Button 
              onClick={() => setView('config')}
              className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              New Quiz
            </Button>
            <Button 
              onClick={() => restartQuiz()}
              className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary cursor-pointer"
              size="lg"
            >
              <BarChart3 className="h-4 w-4" />
              Retry Quiz
            </Button>
            <Button 
              onClick={() => window.location.href = `/deck/${config?.deckId}`}
              className="flex items-center gap-2 sm:col-span-2 bg-accent hover:bg-accent/80 cursor-pointer"
              size="lg"
            >
              <Trophy className="h-4 w-4" />
              Return to Deck
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex items-center gap-2 sm:col-span-2 cursor-pointer"
              size="lg"
            >
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </div>
        </div>
      </Card>
      <AchievementNotification />
    </>
  );
} 