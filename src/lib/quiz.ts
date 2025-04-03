import { MCQContent, FRQContent } from "@prisma/client";
import { MCQQuestion, FRQQuestion } from "@/types/quiz";

type StudyContentWithQuestions = {
  id: string;
  question: string;
  hint: string | null;
  topic: string;
  mcqContent: (MCQContent & {
    options: string[];
    correctOptionIndex: number;
  }) | null;
  frqContent: (FRQContent & {
    answers: string[];
  }) | null;
};

export function formatQuizQuestion(content: StudyContentWithQuestions): MCQQuestion | FRQQuestion {
  const baseQuestion = {
    id: content.id,
    question: content.question,
    hint: content.hint || '',
    topic: content.topic,
  };

  if (content.mcqContent) {
    return {
      ...baseQuestion,
      type: 'mcq' as const,
      options: content.mcqContent.options,
      correctOptionIndex: content.mcqContent.correctOptionIndex,
    };
  } else if (content.frqContent) {
    return {
      ...baseQuestion,
      type: 'frq' as const,
      answers: content.frqContent.answers,
    };
  } else {
    throw new Error('Invalid study content type - neither MCQ nor FRQ content found');
  }
} 