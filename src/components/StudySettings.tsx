import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export function StudySettings() {
  const [newCardsPerDay, setNewCardsPerDay] = useState(5);
  const [reviewsPerDay, setReviewsPerDay] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/users/me/preferences');
        if (res.ok) {
          const data = await res.json();
          setNewCardsPerDay(data.newCardsPerDay);
          setReviewsPerDay(data.reviewsPerDay);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadPreferences();
  }, []);
  
  async function handleSave() {
    try {
      setIsSaving(true);
      const res = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newCardsPerDay,
          reviewsPerDay
        }),
      });
      
      if (res.ok) {
        toast.success('Study settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }
  
  if (isLoading) return (
    <div className="flex items-center justify-center p-6 min-h-[200px]">
      <div className="animate-pulse">Loading settings...</div>
    </div>
  );
  
  return (
    <div className="space-y-6 bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-lg">
      <h2 className="text-xl font-semibold text-white">Study Settings</h2>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-zinc-400">New cards per day</label>
            <span className="text-sm font-medium text-white">{newCardsPerDay}</span>
          </div>
          <Slider
            value={[newCardsPerDay]}
            min={0}
            max={50}
            step={1}
            onValueChange={(value) => setNewCardsPerDay(value[0])}
            className="my-4"
          />
          <p className="text-xs text-zinc-500">
            Limit how many new cards to introduce each day
          </p>
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-zinc-400">Reviews per day</label>
            <span className="text-sm font-medium text-white">{reviewsPerDay}</span>
          </div>
          <Slider
            value={[reviewsPerDay]}
            min={0}
            max={200}
            step={5}
            onValueChange={(value) => setReviewsPerDay(value[0])}
            className="my-4"
          />
          <p className="text-xs text-zinc-500">
            Maximum number of review cards to show each day
          </p>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
