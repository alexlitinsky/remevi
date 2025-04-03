'use client';

import { Question } from "@/stores/useQuizStore";
import { Input } from "@/components/ui/input";
import React from "react";

interface FRQAnswerSectionProps {
  question: Question;
  answer: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const FRQAnswerSection = React.forwardRef<HTMLInputElement, FRQAnswerSectionProps>(
  ({ question, answer, onChange, disabled = false }, ref) => {
    if (!question) {
      return null;
    }

    return (
      <div className="space-y-4">
        <div className="relative">
          <Input
            ref={ref}
            placeholder="Type your answer..."
            value={answer}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            className="w-full min-h-[100px] px-4 py-3 text-base rounded-xl border-2 border-muted/50 focus-visible:border-primary/50 bg-card/50 backdrop-blur-sm"
            disabled={disabled}
          />
        </div>
        {!disabled && (
          <div className="text-xs text-muted-foreground mt-2 pl-2">
            Press <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">Enter</kbd> to submit your answer
          </div>
        )}
      </div>
    );
  }
);

FRQAnswerSection.displayName = "FRQAnswerSection"; 