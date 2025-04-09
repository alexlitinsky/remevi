'use client';

import { Card } from '@/components/ui/card';
import { Trophy, Lock, Sparkles, Target, Zap, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  requirements: {
    type: string;
    value: number;
  };
  unlocked: boolean;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

type CategoryIcon = {
  study: typeof Award;
  mastery: typeof Sparkles;
  streak: typeof Zap;
  quiz: typeof Target;
};

const categoryIcons: CategoryIcon = {
  study: Award,
  mastery: Sparkles,
  streak: Zap,
  quiz: Target,
} as const;

interface AchievementGridProps {
  achievements: Achievement[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement) => {
        const Icon = achievement.category && achievement.category in categoryIcons
          ? categoryIcons[achievement.category as keyof CategoryIcon]
          : Trophy;
        
        return (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={cn(
                'p-6 h-full transition-colors',
                achievement.unlocked
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-muted/5 border-muted/20'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {achievement.unlocked ? (
                    <Icon className="h-6 w-6 text-primary" />
                  ) : (
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold">{achievement.name}</h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {achievement.description}
              </p>
              <div className="mt-4">
                <Progress
                  value={(achievement.progress / achievement.requirements.value) * 100}
                  className={cn(
                    'h-2',
                    achievement.unlocked ? 'bg-primary/20' : 'bg-muted/20'
                  )}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Progress: {achievement.progress} / {achievement.requirements.value}{' '}
                  {achievement.requirements.type}
                </p>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}