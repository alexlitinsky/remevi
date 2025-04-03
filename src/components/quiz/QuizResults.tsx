'use client'
import { useQuizStore } from "@/stores/useQuizStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Trophy,
  Clock,
  Target,
  Zap,
  Award,
  BarChart3,
  Star,
  RefreshCw,
  CheckCircle,
  XCircle,
  CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { formatTime } from '@/lib/utils';

const categoryIcons = {
  beginner: Trophy,
  intermediate: Star,
  expert: Zap,
  speed: Clock,
  accuracy: Target,
  dedication: Award,
} as const;

export function QuizResults() {
  const {
    questions,
    answers,
    score,
    correctAnswers,
    incorrectAnswers,
    restartQuiz,
    setView
  } = useQuizStore();

  const totalQuestions = questions.length;
  const accuracy = totalQuestions > 0 
    ? Math.round((correctAnswers / totalQuestions) * 100) 
    : 0;

  return (
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
        <div className="flex justify-center gap-4">
          <Button onClick={() => setView('config')}>
            New Quiz
          </Button>
          <Button onClick={() => restartQuiz()}>
            Retry Quiz
          </Button>
        </div>
      </div>
    </Card>
  );
} 