import { Settings, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StudyActionButtonsProps {
  onShowSettings: () => void;
  onToggleMindMap: () => void;
  mindMapAvailable?: boolean;
}

export function StudyActionButtons({ 
  onShowSettings, 
  onToggleMindMap,
  mindMapAvailable = false 
}: StudyActionButtonsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full bg-background/50 backdrop-blur-sm"
              onClick={onShowSettings}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className={`h-10 w-10 rounded-full bg-background/50 backdrop-blur-sm ${!mindMapAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={mindMapAvailable ? onToggleMindMap : undefined}
              disabled={!mindMapAvailable}
            >
              <Network className={`h-5 w-5 ${!mindMapAvailable ? 'animate-pulse' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{mindMapAvailable ? 'View Mind Map' : 'Generating Mind Map...'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 