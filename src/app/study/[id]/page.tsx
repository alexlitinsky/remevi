'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Flashcard } from '@/components/ui/flashcard';
import { Button } from '@/components/ui/button';
import { MapIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { MindMap } from '@/components/ui/mind-map';

interface StudyDeck {
  id: string;
  title: string;
  createdAt: string;
  isProcessing: boolean;
  error?: string;
  flashcards: Array<{
    front: string;
    back: string;
  }>;
  mindMap: {
    nodes: Array<{
      id: string;
      label: string;
      x: number;
      y: number;
    }>;
    connections: Array<{
      source: string;
      target: string;
      label?: string;
    }>;
  };
}

export default function StudyDeckPage() {
  const params = useParams();
  const [studyDeck, setStudyDeck] = useState<StudyDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStudyDeck = async () => {
      try {
        const response = await fetch(`/api/study-decks/${params.id}`);
        if (response.ok && mounted) {
          const deck = await response.json();
          setStudyDeck(deck);
          
          // If still processing, poll every 2 seconds
          if (deck.isProcessing) {
            const pollTimer = setTimeout(fetchStudyDeck, 2000);
            return () => clearTimeout(pollTimer);
          }
        }
      } catch (error) {
        console.error('Failed to fetch study deck:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStudyDeck();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!studyDeck) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Study Deck Not Found</h1>
          <p className="text-gray-400">The study deck you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  if (studyDeck.isProcessing) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <h2 className="text-2xl font-bold">Generating Study Materials</h2>
          <p className="text-gray-400">Please wait while we analyze your document...</p>
        </div>
      </div>
    );
  }

  if (studyDeck.error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-400">{studyDeck.error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{studyDeck.title}</h1>
          
          <div className="space-y-8">
            <div className="relative">
              <Flashcard
                front={studyDeck.flashcards[currentCardIndex].front}
                back={studyDeck.flashcards[currentCardIndex].back}
                showBack={showBack}
                onFlip={() => setShowBack(!showBack)}
                onNext={
                  currentCardIndex < studyDeck.flashcards.length - 1
                    ? () => {
                        setCurrentCardIndex(prev => prev + 1);
                        setShowBack(false);
                      }
                    : undefined
                }
                onPrev={
                  currentCardIndex > 0
                    ? () => {
                        setCurrentCardIndex(prev => prev - 1);
                        setShowBack(false);
                      }
                    : undefined
                }
              />
              
              <div className="mt-4 text-center text-sm text-gray-400">
                Card {currentCardIndex + 1} of {studyDeck.flashcards.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8">
        <Button
          onClick={() => setShowMindMap(!showMindMap)}
          className="rounded-full w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <MapIcon className="w-6 h-6" />
        </Button>
      </div>

      <AnimatePresence>
        {showMindMap && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 bg-gray-900/95 z-50 p-8"
          >
            <div className="relative w-full h-full">
              <Button
                onClick={() => setShowMindMap(false)}
                className="absolute top-4 right-4"
                variant="outline"
              >
                Close
              </Button>
              <h2 className="text-2xl font-bold text-center mb-4">Mind Map</h2>
              <div className="w-full h-[calc(100vh-8rem)]">
                <MindMap
                  nodes={studyDeck.mindMap.nodes}
                  connections={studyDeck.mindMap.connections}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
} 