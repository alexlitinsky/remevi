'use client';

import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AchievementProgressProps {
  currentValue: number;
  targetValue: number;
  title: string;
  description?: string;
}

export function AchievementProgress({
  currentValue,
  targetValue,
  title,
  description
}: AchievementProgressProps) {
  const progress = Math.min((currentValue / targetValue) * 100, 100);
  const isComplete = progress >= 100;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2 ${
          isComplete ? 'bg-primary/10' : 'bg-muted'
        }`}>
          <Trophy className={`h-5 w-5 ${
            isComplete ? 'text-primary' : 'text-muted-foreground'
          }`} />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <motion.span
            key={currentValue}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            className="font-medium"
          >
            {currentValue}/{targetValue}
          </motion.span>
        </div>
        <Progress 
          value={progress} 
          className="h-2"
        />
        {isComplete && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-primary font-medium"
          >
            Achievement Complete!
          </motion.p>
        )}
      </div>
    </Card>
  );
} 