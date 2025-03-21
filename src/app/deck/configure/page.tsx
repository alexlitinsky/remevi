'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

interface UploadInfo {
  uploadId: string;
  filePath: string;
  metadata: {
    originalName: string;
    type: string;
    size: number;
  };
}

const QUESTION_RANGES = {
  low: { min: 1, max: 20 },
  moderate: { min: 20, max: 40 },
  high: { min: 40, max: 60 }
} as const;

type Difficulty = keyof typeof QUESTION_RANGES;

interface PageRange {
  start: number;
  end: number;
}

export default function ConfigurePage() {
  const router = useRouter();
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [pageRange, setPageRange] = useState<PageRange>({ start: 1, end: 1 });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const pendingUploadInfo = localStorage.getItem('pendingUploadInfo');
    if (!pendingUploadInfo) {
      router.push('/');
      return;
    }
    setUploadInfo(JSON.parse(pendingUploadInfo));
  }, [router]);

  const handleGenerate = async () => {
    if (!uploadInfo) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: uploadInfo.uploadId,
          filePath: uploadInfo.filePath,
          metadata: uploadInfo.metadata,
          questionCount: QUESTION_RANGES[difficulty].max,
          pageRange: uploadInfo.metadata.type.includes('pdf') ? pageRange : undefined
        }),
      });

      if (!response.ok) throw new Error('Failed to generate study materials');

      const { deckId } = await response.json();
      localStorage.removeItem('pendingUploadInfo'); // Clean up
      router.push(`/deck/${deckId}/session`);
    } catch (error) {
      console.error('Error generating questions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!uploadInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPDF = uploadInfo?.metadata.type.includes('pdf');

  return (
    <main className="container mx-auto px-6 py-24">
      <Card className="max-w-2xl mx-auto p-8 bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configure Study Session</h1>
          <p className="text-muted-foreground">
            Choose how many questions to generate from {uploadInfo?.metadata.originalName}
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <Label>Question Amount</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(value: Difficulty) => setDifficulty(value)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low">Low ({QUESTION_RANGES.low.min}-{QUESTION_RANGES.low.max} questions)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="moderate" id="moderate" />
                <Label htmlFor="moderate">Moderate ({QUESTION_RANGES.moderate.min}-{QUESTION_RANGES.moderate.max} questions)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high">High ({QUESTION_RANGES.high.min}-{QUESTION_RANGES.high.max} questions)</Label>
              </div>
            </RadioGroup>
          </div>

          {isPDF && (
            <div className="space-y-4">
              <Label>Page Range</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Start Page</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pageRange.start}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPageRange({
                      ...pageRange,
                      start: Math.max(1, parseInt(e.target.value) || 1)
                    })}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="flex-1">
                  <Label>End Page</Label>
                  <Input
                    type="number"
                    min={pageRange.start}
                    value={pageRange.end}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPageRange({
                      ...pageRange,
                      end: Math.max(pageRange.start, parseInt(e.target.value) || pageRange.start)
                    })}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Start Study Session'}
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
