import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StudyActionButtonsProps {
  onShowSettings: () => void;
}

export function StudyActionButtons({
  onShowSettings
}: StudyActionButtonsProps) {
  return (
    <div className="absolute bottom-12 right-6 flex flex-col gap-3 z-50">
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
    </div>
  );
} 