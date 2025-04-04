'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { AchievementGrid } from './AchievementGrid';
import { Skeleton } from '@/components/ui/skeleton';

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

interface ApiResponse {
  achievements: Achievement[];
  userAchievements: {
    id: string;
    userId: string;
    achievementId: string;
    unlockedAt: string;
    achievement: Achievement;
  }[];
}

export function GlobalAchievements() {
  const { user, isSignedIn } = useUser();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        console.log('Fetching achievements...', { isSignedIn, userId: user?.id });
        const response = await fetch('/api/achievements');
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Failed to fetch achievements');
        }
        
        const data: ApiResponse = await response.json();
        console.log('Raw API response:', data);
        
        // Map achievements with unlocked status
        const mappedAchievements = data.achievements.map(achievement => ({
          ...achievement,
          unlocked: data.userAchievements.some(ua => ua.achievementId === achievement.id),
          progress: 0, // We'll need to add progress calculation later
        }));
        
        console.log('Mapped achievements:', mappedAchievements);
        setAchievements(mappedAchievements);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setAchievements([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn) {
      console.log('User is signed in, fetching achievements');
      fetchAchievements();
    } else {
      console.log('User is not signed in');
      setAchievements([]); // Reset achievements when not signed in
      setLoading(false);
    }
  }, [isSignedIn, user?.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[180px] rounded-lg" />
        ))}
      </div>
    );
  }

  const globalAchievements = achievements.filter(
    (achievement) => achievement.category && ['study', 'mastery', 'streak', 'points'].includes(achievement.category)
  );
  
  console.log('Achievement categories:', achievements.map(a => a.category));
  console.log('Filtered global achievements:', globalAchievements);

  return <AchievementGrid achievements={globalAchievements} />;
} 