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
  Star
} from "lucide-react";

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
    progress: { score, correctAnswers, incorrectAnswers },
    timing: { totalTime },
    achievements,
    restartQuiz,
    reviewQuiz,
  } = useQuizStore();

  const totalQuestions = correctAnswers + incorrectAnswers;
  const accuracy = totalQuestions > 0 
    ? (correctAnswers / totalQuestions) * 100 
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Score Overview */}
      <Card className="p-6">
        <motion.div variants={item} className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-muted-foreground">
            Here's how you performed
          </p>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-medium">Score</span>
            </div>
            <p className="text-2xl font-bold">{score}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-medium">Time</span>
            </div>
            <p className="text-2xl font-bold">{formatTime(totalTime || 0)}</p>
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium">Accuracy</span>
            </div>
            <span>{Math.round(accuracy)}%</span>
          </div>
          <Progress value={accuracy} className="h-2" />
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span className="text-sm">Correct</span>
            </div>
            <p className="font-bold">{correctAnswers}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-500" />
              <span className="text-sm">Incorrect</span>
            </div>
            <p className="font-bold">{incorrectAnswers}</p>
          </div>
        </motion.div>
      </Card>

      {/* Achievements */}
      {achievements.length > 0 && (
        <motion.div variants={item}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Achievements Unlocked</h3>
            </div>
            <div className="grid gap-4">
              {achievements.map((achievement) => {
                const Icon = categoryIcons[achievement.category] || Trophy;
                return (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded-full">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{achievement.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                    <div className="ml-auto text-sm text-primary">
                      +{achievement.pointsAwarded} points
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={item} className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={reviewQuiz}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Review Answers
        </Button>
        <Button
          className="flex-1"
          onClick={restartQuiz}
        >
          Try Again
        </Button>
      </motion.div>
    </motion.div>
  );
} 