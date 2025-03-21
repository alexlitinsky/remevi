import React from 'react';
import { Button } from '@/components/ui/button';
import { MapIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface StudyActionButtonsProps {
  onShowSettings: () => void;
  onToggleMindMap: () => void;
}

export function StudyActionButtons({
  onShowSettings,
  onToggleMindMap
}: StudyActionButtonsProps) {
  return (
    <div className="fixed bottom-8 right-8 flex flex-col space-y-4">
      <Button
        onClick={onShowSettings}
        className="rounded-full w-12 h-12 p-0 bg-green-600 hover:bg-green-700 text-white shadow-lg"
        aria-label="Study Settings"
      >
        <ChartBarIcon className="h-6 w-6" />
      </Button>
      <Button
        onClick={onToggleMindMap}
        className="rounded-full w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        aria-label="Toggle Mind Map"
      >
        <MapIcon className="h-6 w-6" />
      </Button>
    </div>
  );
}
