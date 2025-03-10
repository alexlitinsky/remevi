'use client';

import { useState } from 'react';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardListProps {
  flashcards: Flashcard[];
}

export default function FlashcardList({ flashcards }: FlashcardListProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (!flashcards.length) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="relative">
        <div
          className="min-h-[200px] p-8 rounded-lg shadow-lg cursor-pointer bg-gradient-to-br from-slate-800 to-slate-900 text-white transition-all duration-300 hover:shadow-xl"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-4">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
            <p className="text-xl font-medium leading-relaxed">
              {isFlipped ? flashcards[currentIndex].back : flashcards[currentIndex].front}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center gap-4">
          <button
            onClick={handlePrevious}
            className="px-6 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors"
          >
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 