import React from 'react';

interface StudyDeckHeaderProps {
  title: string;
  newCardCount: number;
  dueCardCount: number;
  totalCardCount: number;
}

export function StudyDeckHeader({
  title,
  newCardCount,
  dueCardCount,
  totalCardCount
}: StudyDeckHeaderProps) {
  return (
    <div className="flex justify-between items-center px-6 py-4">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <div className="flex space-x-2 text-sm">
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
          New: {newCardCount}
        </span>
        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
          Due: {dueCardCount}
        </span>
        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
          Total: {totalCardCount}
        </span>
      </div>
    </div>
  );
}
