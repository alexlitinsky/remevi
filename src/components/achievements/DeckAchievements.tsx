'use client';

import { useEffect } from 'react';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { Card } from '@/components/ui/card';
import { Trophy, Lock, Sparkles, Target, Zap, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const categoryIcons = {
  study: Award,
  mastery: Sparkles,
  streak: Zap,
  quiz: Target,
} as const;

interface DeckAchievementsProps {
  deckId: string;
}

export function DeckAchievements({ deckId }: DeckAchievementsProps) {
  const { achievements, userAchievements, fetchAchievements, isLoading } = useAchievementStore();

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Filter achievements relevant to deck study/quiz
  const relevantCategories = ['study', 'quiz'];
  const filteredAchievements = achievements.filter(a => relevantCategories.includes(a.category));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted h-12 w-12" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {filteredAchievements.map((achievement, index) => {
        const isUnlocked = userAchievements.some(
          ua => ua.achievementId === achievement.id
        );
        const Icon = categoryIcons[achievement.category] || Trophy;
        
        return (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`p-4 transition-all duration-300 ${
                isUnlocked 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-3 ${
                  isUnlocked ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {isUnlocked ? (
                    <Icon className="h-6 w-6 text-primary" />
                  ) : (
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{achievement.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                  {isUnlocked && (
                    <p className="text-xs text-primary mt-1">
                      +{achievement.pointsAwarded} points
                    </p>
                  )}
                </div>
              </div>
              
              {!isUnlocked && achievement.requirements && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Requirements:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    {achievement.requirements.quizScore && (
                      <li>• Score {achievement.requirements.quizScore}% on a quiz</li>
                    )}
                    {achievement.requirements.cardsStudied && (
                      <li>• Study {achievement.requirements.cardsStudied} cards</li>
                    )}
                    {achievement.requirements.correctAnswers && (
                      <li>• Get {achievement.requirements.correctAnswers} correct answers in a row</li>
                    )}
                  </ul>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
} 