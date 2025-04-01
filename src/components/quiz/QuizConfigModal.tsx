'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { QuizType, QuizDifficulty, useQuizStore } from "@/stores/useQuizStore";
import { useToast } from "@/components/ui/use-toast";

interface QuizConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: {
    type: QuizType;
    difficulty: QuizDifficulty;
    questionCount: number;
  }) => void;
  defaultValues?: {
    type: QuizType;
    difficulty: QuizDifficulty;
    questionCount: number;
  };
  deckId: string;
}

interface AvailableQuestions {
  mcq: number;
  frq: number;
  total: number;
}

export function QuizConfigModal({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {
    type: 'mixed',
    difficulty: 'all',
    questionCount: 10
  },
  deckId
}: QuizConfigModalProps) {
  const [type, setType] = useState<QuizType>(defaultValues.type);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(defaultValues.difficulty);
  const [questionCount, setQuestionCount] = useState(defaultValues.questionCount);
  const [maxQuestions, setMaxQuestions] = useState(50);
  const [availableQuestions, setAvailableQuestions] = useState<AvailableQuestions | null>(null);
  const { ui: { isLoading }, actions: { setIsLoading } } = useQuizStore();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAvailableQuestions = async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}/quiz/available-questions`);
        if (response.ok) {
          const data = await response.json();
          setAvailableQuestions(data);
          // Set max questions based on type
          if (type === 'mcq') {
            setMaxQuestions(data.mcq);
          } else if (type === 'frq') {
            setMaxQuestions(data.frq);
          } else {
            setMaxQuestions(data.total);
          }
        }
      } catch (error) {
        console.error('Error fetching available questions:', error);
      }
    };

    if (open && deckId) {
      fetchAvailableQuestions();
    }
  }, [open, deckId, type]);

  // Update max questions when type changes
  useEffect(() => {
    if (availableQuestions) {
      if (type === 'mcq') {
        setMaxQuestions(availableQuestions.mcq);
      } else if (type === 'frq') {
        setMaxQuestions(availableQuestions.frq);
      } else {
        setMaxQuestions(availableQuestions.total);
      }
      // Adjust question count if it exceeds new max
      setQuestionCount(prev => Math.min(prev, maxQuestions));
    }
  }, [type, availableQuestions]);

  const handleGenerateQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/decks/${deckId}/quiz/generate-questions`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      toast({
        title: 'Questions Generated',
        description: `Created ${data.mcqCount} MCQs and ${data.frqCount} FRQs from your flashcards.`
      });

      // Refresh available questions
      const availableResponse = await fetch(`/api/decks/${deckId}/quiz/available-questions`);
      if (availableResponse.ok) {
        const availableData = await availableResponse.json();
        setAvailableQuestions(availableData);
        // Update max questions based on type
        if (type === 'mcq') {
          setMaxQuestions(availableData.mcq);
        } else if (type === 'frq') {
          setMaxQuestions(availableData.frq);
        } else {
          setMaxQuestions(availableData.total);
        }
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate questions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Quiz</DialogTitle>
          <DialogDescription>
            Choose your quiz settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableQuestions?.total === 0 && (
            <div className="flex flex-col gap-4 items-center justify-center p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                No questions available. Generate some from your flashcards to start the quiz.
              </p>
              <Button 
                onClick={handleGenerateQuestions}
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Questions'}
              </Button>
            </div>
          )}

          {(availableQuestions?.total ?? 0) > 0 && (
            <>
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={type}
                  onValueChange={(value: QuizType) => setType(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed ({availableQuestions?.total} available)</SelectItem>
                    <SelectItem value="mcq">Multiple Choice ({availableQuestions?.mcq} available)</SelectItem>
                    <SelectItem value="frq">Free Response ({availableQuestions?.frq} available)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(value: QuizDifficulty) => setDifficulty(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="all">All Levels</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[questionCount]}
                    onValueChange={([value]) => setQuestionCount(value)}
                    max={maxQuestions}
                    min={1}
                    step={1}
                    disabled={isLoading}
                  />
                  <span className="w-12 text-right">{questionCount}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleGenerateQuestions}
                  disabled={isLoading}
                >
                  Generate More Questions
                </Button>
                <Button onClick={() => onSubmit({ type, difficulty, questionCount })} disabled={isLoading}>
                  Start Quiz
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}