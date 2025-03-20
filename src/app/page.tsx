'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignIn } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface Flashcard {
  front: string;
  back: string;
}

interface Deck {
  id: string;
  title: string;
  flashcardCount: number;
  createdAt: string;
  isProcessing?: boolean;
  error?: string;
}

export default function Home() {
  const { isSignedIn } = useUser();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();
  const [progress] = useState({
    cardsReviewed: 0,
    totalCards: 50,
    masteryLevel: 0,
    minutesStudied: 15,
    studySessions: 3,
    daysStreak: 8
  });

  useEffect(() => {
    if (isSignedIn) {
      fetchDecks();
      
      const pendingUploadInfo = localStorage.getItem('pendingUploadInfo');
      if (pendingUploadInfo) {
        try {
          // Parse the stored upload info
          const { uploadId, filePath, metadata } = JSON.parse(pendingUploadInfo);
          
          // Create study deck and redirect immediately
          fetch('/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uploadId, filePath, metadata }),
          })
            .then(response => {
              if (!response.ok) throw new Error('Failed to generate study materials');
              return response.json();
            })
            .then(({ deckId }) => {
              router.push(`/study/${deckId}`);
              localStorage.removeItem('pendingUploadInfo');
            })
            .catch(error => {
              console.error('Error processing file:', error);
            });
        } catch (error) {
          console.error('Error parsing pending upload info:', error);
          localStorage.removeItem('pendingUploadInfo');
        }
      }
    }
  }, [isSignedIn, router]);

  const fetchDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const response = await fetch('/api/study-decks');
      if (response.ok) {
        const fetchedDecks = await response.json();
        setDecks(fetchedDecks);
      }
    } catch (error) {
      console.error('Failed to fetch decks:', error);
    } finally {
      setIsLoadingDecks(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    try {
      setIsProcessing(true);
      
      // Upload file to Supabase storage via our API
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/temp-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      const { uploadId, filePath, metadata } = await response.json();

      if (!isSignedIn) {
        // Store upload info and show sign in
        localStorage.setItem('pendingUploadInfo', JSON.stringify({ uploadId, filePath, metadata }));
        setShowSignIn(true);
        setIsProcessing(false);
        return;
      }

      // Create study deck and redirect immediately
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadId, filePath, metadata }),
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate study materials');
      }

      const { deckId } = await generateResponse.json();
      router.push(`/study/${deckId}`);
    } catch (error) {
      console.error('Error handling file:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isSignedIn, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="relative container mx-auto px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white tracking-tight leading-tight">
              Transform Your Notes into<br />Interactive Study Materials
            </h1>
            <p className="text-xl text-zinc-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Upload your study materials and let AI create effective flashcards and mind maps
            </p>

            <div {...getRootProps()} className="max-w-3xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "relative py-12 px-8 rounded-2xl cursor-pointer transition-all duration-300",
                  isDragActive
                    ? "border-2 border-dashed border-zinc-400/50 bg-zinc-800/40" 
                    : "border-2 border-dashed border-zinc-500/30 hover:border-zinc-400/30 bg-zinc-800/30",
                  "shadow-[0_8px_16px_-6px_rgba(0,0,0,0.2)]"
                )}
              >
                <input {...getInputProps()} />
                <div className="relative z-10 space-y-6 text-center">
                  <div className="text-4xl">⬆️</div>
                  {isDragActive ? (
                    <p className="text-2xl font-medium text-zinc-200">Drop your files here</p>
                  ) : (
                    <>
                      <p className="text-2xl font-medium text-zinc-200">Drag & drop your files here, or click to select files</p>
                      <p className="text-lg text-zinc-400">Supports PDF, DOCX, and TXT files</p>
                      {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-blue-400 mt-4">
                          <SparklesIcon className="h-5 w-5 animate-spin" />
                          <span>Processing your document...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>

            </div>
          </motion.div>

          {isSignedIn && (
            <>
              {/* Study Progress Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-4xl mx-auto mb-20"
              >
                <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-semibold text-white">Study Progress</h2>
                    <p className="text-zinc-400">Today&apos;s Progress</p>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Cards Reviewed */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Cards Reviewed</span>
                        <span className="text-white">0/0</span>
                      </div>
                      <div className="h-2 bg-zinc-800/30 rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-gradient-to-r from-blue-500/80 to-purple-500/80 transition-all duration-1000"></div>
                      </div>
                    </div>

                    {/* Mastery Level */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Mastery Level</span>
                        <span className="text-white">0%</span>
                      </div>
                      <div className="h-2 bg-zinc-800/30 rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-gradient-to-r from-emerald-500/80 to-blue-500/80 transition-all duration-1000"></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="text-center p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30">
                        <div className="text-2xl font-semibold text-white mb-1">{progress.minutesStudied}</div>
                        <div className="text-sm text-zinc-400">Minutes Studied</div>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30">
                        <div className="text-2xl font-semibold text-white mb-1">{progress.studySessions}</div>
                        <div className="text-sm text-zinc-400">Study Sessions</div>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30">
                        <div className="text-2xl font-semibold text-white mb-1">{progress.daysStreak}</div>
                        <div className="text-sm text-zinc-400">Days Streak</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Study Decks Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-24"
              >
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold mb-4 text-white">Your Study Decks</h2>
                  
                  {isLoadingDecks ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : decks.length === 0 ? (
                    <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-gray-400">You don't have any study decks yet. Upload a file to get started!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {decks.map((deck) => (
                        <div 
                          key={deck.id}
                          onClick={() => router.push(`/study/${deck.id}`)}
                          className="bg-gray-800 border border-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors"
                        >
                          <h3 className="text-lg font-medium text-white mb-2">{deck.title}</h3>
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>{deck.flashcardCount} cards</span>
                            <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
                          </div>
                          {deck.isProcessing && (
                            <div className="mt-2 flex items-center text-yellow-500 text-sm">
                              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-yellow-500 mr-2"></div>
                              Processing...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Sign In Modal */}
      <AnimatePresence>
        {showSignIn && !isSignedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900/90 p-8 rounded-2xl border border-zinc-700"
            >
              <SignIn 
                routing="hash"
                forceRedirectUrl={window?.location?.href || '/'}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
