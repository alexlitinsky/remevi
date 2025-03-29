import React from 'react';
import { Button } from '@/components/ui/button';
import { type Difficulty } from '@/lib/srs';

interface StudyControlsProps {
  showBack: boolean;
  onFlip: () => void;
  onRate: (difficulty: Difficulty, responseTime: number) => void;
  startTime: number;
}

export function StudyControls({
  showBack,
  onFlip,
  onRate,
  startTime
}: StudyControlsProps) {
  const handleRate = (difficulty: Difficulty) => {
    const responseTime = Date.now() - startTime;
    onRate(difficulty, responseTime);
  };

  if (!showBack) {
    return (
      <div className="w-full flex justify-center mt-6">
        <Button
          onClick={onFlip}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full"
        >
          Show Answer
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center space-x-4 mt-6">
      <Button
        onClick={() => handleRate('again')}
        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full"
      >
        Again
      </Button>
      <Button
        onClick={() => handleRate('hard')}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-full"
      >
        Hard
      </Button>
      <Button
        onClick={() => handleRate('good')}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full"
      >
        Good
      </Button>
      <Button
        onClick={() => handleRate('easy')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full"
      >
        Easy
      </Button>
    </div>
  );
} 