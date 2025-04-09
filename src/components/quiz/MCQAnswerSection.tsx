'use client';

import { cn } from "@/lib/utils";
import { MCQQuestion } from "@/types/quiz";

interface MCQAnswerSectionProps {
  question: MCQQuestion;
  selectedAnswer: string;
  onSelect: (answer: string) => void;
  disabled?: boolean;
}

export function MCQAnswerSection({ 
  question, 
  selectedAnswer, 
  onSelect,
  disabled = false
}: MCQAnswerSectionProps) {
  if (!question?.options?.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {question.options.map((option: string, index: number) => {
        const isSelected = selectedAnswer === option;
        const optionLetter = String.fromCharCode(65 + index); // ASCII: A=65, B=66, etc.
        
        return (
          <button
            key={index}
            onClick={() => !disabled && onSelect(option)}
            className={cn(
              "w-full p-4 text-left rounded-xl border-2 transition-all relative hover:scale-[1.01] hover:shadow-md",
              isSelected
                ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/50 shadow-md"
                : "border-muted/50 hover:border-primary/50 bg-card/50 hover:bg-accent/50 backdrop-blur-sm",
              disabled && "opacity-80 pointer-events-none"
            )}
            disabled={disabled}
            data-selected={isSelected ? "true" : "false"}
            data-index={index}
            data-option={option}
          >
            <div className="flex items-center gap-3">
              <kbd className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted/70 text-muted-foreground border border-muted"
              )}>
                {optionLetter}
              </kbd>
              <span className={cn(
                "text-base",
                isSelected && "font-medium"
              )}>{option}</span>
            </div>
          </button>
        );
      })}
      {!disabled && (
        <div className="text-xs text-muted-foreground mt-2 pl-2">
          Press <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">A</kbd> - 
          <kbd className="px-1.5 py-0.5 mx-1 rounded border bg-muted/70 font-mono text-xs">D</kbd> to select options
        </div>
      )}
    </div>
  );
} 