import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AchievementCategory = 'study' | 'mastery' | 'streak' | 'quiz';
export type AchievementType = 'milestone' | 'special' | 'secret';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  type: AchievementType;
  requirements: {
    pointsRequired?: number;
    streakDays?: number;
    quizScore?: number;
    cardsStudied?: number;
    correctAnswers?: number;
  };
  badgeIcon: string;
  pointsAwarded: number;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  unlockedAt: Date;
  notified: boolean;
  achievement: Achievement;
}

interface AchievementState {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  recentUnlock: UserAchievement | null;
  isLoading: boolean;
  error: string | null;
  lastCheckTime: number | null;

  // Actions
  fetchAchievements: () => Promise<void>;
  checkAchievements: (context: {
    quizScore?: number;
    streakDays?: number;
    cardsStudied?: number;
    correctAnswers?: number;
    sessionType: 'quiz' | 'study';
  }) => Promise<void>;
  dismissNotification: () => void;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      achievements: [],
      userAchievements: [],
      recentUnlock: null,
      isLoading: false,
      error: null,
      lastCheckTime: null,

      fetchAchievements: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/achievements');
          const data = await response.json();
          set({ 
            achievements: data.achievements, 
            userAchievements: data.userAchievements,
            error: null 
          });
        } catch (error) {
          set({ error: 'Failed to fetch achievements' });
          console.error('Error fetching achievements:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      checkAchievements: async (context) => {
        const currentTime = Date.now();
        const lastCheckTime = get().lastCheckTime;
        
        // Prevent multiple checks within 3 seconds to avoid duplicate notifications
        if (lastCheckTime && currentTime - lastCheckTime < 3000) {
          console.log('Skipping achievement check - too soon since last check');
          return;
        }
        
        try {
          set({ lastCheckTime: currentTime });
          
          const response = await fetch('/api/achievements/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...context,
              checkId: currentTime // Add unique checkId to prevent duplicate processing
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to check achievements');
          }

          const { newAchievements } = await response.json();
          
          if (newAchievements?.length) {
            // Check if we already have this achievement to prevent duplicates
            const existingIds = get().userAchievements.map(a => a.id);
            const uniqueNewAchievements = newAchievements.filter(
              (a: UserAchievement) => !existingIds.includes(a.id)
            );
            
            if (uniqueNewAchievements.length > 0) {
              set(state => ({
                userAchievements: [...state.userAchievements, ...uniqueNewAchievements],
                recentUnlock: uniqueNewAchievements[uniqueNewAchievements.length - 1]
              }));
            }
          }
        } catch (error) {
          console.error('Error checking achievements:', error);
          set({ error: 'Failed to check achievements' });
        }
      },

      dismissNotification: () => set({ recentUnlock: null })
    }),
    {
      name: 'achievement-storage',
      // Only persist these fields
      partialize: (state) => ({
        userAchievements: state.userAchievements,
        lastCheckTime: state.lastCheckTime
      }),
    }
  )
); 