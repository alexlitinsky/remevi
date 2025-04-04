'use client';

import { FRQQuestion } from "@/types/quiz";
import { Textarea } from "@/components/ui/textarea";
import React from "react";

interface FRQAnswerSectionProps {
  question: FRQQuestion;
  answer: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const FRQAnswerSection = React.forwardRef<HTMLTextAreaElement, FRQAnswerSectionProps>(
  ({ question, answer, onChange, disabled = false }, ref) => {
    if (!question) {
      return null;
    }

    return (
      <div className="space-y-4">
        <div className="relative">
          <Textarea
            ref={ref}
            placeholder="Type your answer..."
            value={answer}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            className="w-full min-h-[100px] px-4 py-3 text-base rounded-xl border-2 border-muted/50 focus-visible:border-primary/50 bg-card/50 backdrop-blur-sm resize-y"
            disabled={disabled}
          />
        </div>
        {!disabled && (
          <div className="text-xs text-muted-foreground mt-2 pl-2">
            Press <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">Enter</kbd> to submit or <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">Shift + Enter</kbd> for new line
          </div>
        )}
      </div>
    );
  }
);

FRQAnswerSection.displayName = "FRQAnswerSection"; 