'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Lock } from 'lucide-react';

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
        const response = await fetch('/api/achievements');
        
        if (!response.ok) {
          throw new Error('Failed to fetch achievements');
        }
        
        const data: ApiResponse = await response.json();
        
        // Map achievements with unlocked status
        const mappedAchievements = data.achievements.map(achievement => ({
          ...achievement,
          unlocked: data.userAchievements.some(ua => ua.achievementId === achievement.id),
        }));
        
        setAchievements(mappedAchievements);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setAchievements([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn) {
      fetchAchievements();
    } else {
      setAchievements([]); // Reset achievements when not signed in
      setLoading(false);
    }
  }, [isSignedIn, user?.id]);

  // Helper function to get file-friendly name (lowercase, replace spaces with hyphens)
  const getFileName = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

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
  

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {globalAchievements.map((achievement) => {
        const fileName = getFileName(achievement.name);
        
        return (
          <div 
            key={achievement.id} 
            className={`p-4 rounded-lg ${achievement.unlocked ? 'bg-primary/5' : 'bg-muted/50'} text-center`}
          >
            <div className="flex justify-center mb-2">
              {achievement.unlocked ? (
                <Image 
                  src={`/achievements/${fileName}.svg`} 
                  alt={achievement.name} 
                  width={40} 
                  height={40} 
                  className="text-primary"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                  <Lock className="h-6 w-6" />
                </div>
              )}
            </div>
            <p className={`text-lg font-semibold ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}`}>
              {achievement.name}
            </p>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
          </div>
        );
      })}
    </div>
  );
} 