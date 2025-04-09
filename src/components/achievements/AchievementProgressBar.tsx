import { Achievement } from "@prisma/client";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy } from "lucide-react";
import Image from 'next/image';

// Define proper types for achievement requirements
interface AchievementRequirements {
  pointThreshold: number;
  // Add other potential requirement fields here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Add index signature for JsonValue compatibility
}

// Extend Achievement to include typed requirements
interface ExtendedAchievement extends Achievement {
  requirements: AchievementRequirements;
}

interface AchievementProgressBarProps {
  achievements: ExtendedAchievement[];
  currentPoints: number;
  className?: string;
}

export function AchievementProgressBar({
  achievements,
  currentPoints,
  className
}: AchievementProgressBarProps) {
  // Sort achievements by point threshold
  const sortedAchievements = achievements
    .sort((a, b) => {
      const aThreshold = (a.requirements as AchievementRequirements).pointThreshold || 0;
      const bThreshold = (b.requirements as AchievementRequirements).pointThreshold || 0;
      return aThreshold - bThreshold;
    });

  // Find the next achievement threshold
  const maxThreshold = Math.max(...sortedAchievements.map(a => (a.requirements as AchievementRequirements).pointThreshold || 0));
  const progressPercentage = Math.min((currentPoints / maxThreshold) * 100, 100);

  // Find next achievement
  const nextAchievement = sortedAchievements.find(a => {
    const threshold = (a.requirements as AchievementRequirements).pointThreshold || 0;
    return threshold > currentPoints;
  });

  return (
    <div className={cn("relative w-full space-y-4 p-4 rounded-lg shadow-md", className)}>
      {/* Points Display */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <span className="text-lg font-semibold text-white">{currentPoints.toLocaleString()} points</span>
        </div>
        {nextAchievement && (
          <span className="text-sm text-gray-400">
            Next: {nextAchievement.name} at {((nextAchievement.requirements as AchievementRequirements).pointThreshold).toLocaleString()} points
          </span>
        )}
      </div>

      {/* Progress Bar Container - simplified layout */}
      <div className="relative">
        {/* Base Progress Bar */}
        <div className="relative mt-10">
          <Progress 
            value={progressPercentage} 
            className="h-8 bg-gray-700 rounded-full overflow-hidden"
          />
          
          {/* Vertical position markers stopping at bottom of progress bar */}
          {sortedAchievements.map((achievement) => {
            const threshold = (achievement.requirements as AchievementRequirements).pointThreshold || 0;
            const position = (threshold / maxThreshold) * 100;
            
            return (
              <div 
                key={`line-${achievement.id}`}
                className="absolute top-0 h-8 w-0.5 bg-gray-600"
                style={{ 
                  left: `${position}%`, 
                  transform: 'translateX(-50%)',
                  zIndex: 5  // Lower z-index so lines appear behind icons
                }}
              />
            );
          })}
          
          {/* Current Points Indicator */}
          <div 
            className="absolute top-0 h-8 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] transition-all duration-300"
            style={{ 
              left: `${progressPercentage}%`, 
              transform: 'translateX(-50%)',
              zIndex: 15  // Higher than lines but lower than icons
            }}
          />
        </div>

        {/* Achievement Icons - positioned exactly on top of the lines */}
        {sortedAchievements.map((achievement) => {
          const threshold = (achievement.requirements as AchievementRequirements).pointThreshold || 0;
          const position = (threshold / maxThreshold) * 100;
          const isUnlocked = currentPoints >= threshold;

          return (
            <TooltipProvider key={achievement.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110",
                      isUnlocked 
                        ? "bg-yellow-400 text-white shadow-lg" 
                        : "bg-gray-500 text-gray-300",
                      "w-10 h-10"
                    )}
                    style={{ 
                      left: `${position}%`,
                      bottom: "calc(100% - 5px)",
                      transform: 'translateX(-50%)',
                      zIndex: 20  // Higher z-index so icons appear on top of everything
                    }}
                  >
                    <Image
                      src={`${achievement.badgeIcon}`}
                      alt={achievement.name}
                      width={24}
                      height={24}
                      className="max-w-full max-h-full"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white border-gray-700">
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">{achievement.name}</p>
                    <p className="text-xs text-gray-400">
                      {achievement.description}
                    </p>
                    <div className="text-xs font-mono text-yellow-400">
                      {isUnlocked ? "✨ Unlocked!" : `${threshold.toLocaleString()} points needed`}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
} 