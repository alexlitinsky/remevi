'use client';

import { useEffect } from 'react';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AchievementNotification() {
  const { recentUnlock, dismissNotification } = useAchievementStore();

  useEffect(() => {
    if (recentUnlock) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF8C00']
      });

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        dismissNotification();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [recentUnlock, dismissNotification]);

  if (!recentUnlock) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="w-80 p-4 shadow-lg border border-primary/10 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Achievement Unlocked!</h3>
              <p className="text-sm text-muted-foreground">{recentUnlock.achievement.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                +{recentUnlock.achievement.pointsAwarded} points
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={dismissNotification}
            >
              ×
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
} 