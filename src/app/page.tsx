'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpTrayIcon, SparklesIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useUser, SignIn } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { useDropzone } from 'react-dropzone';

interface StudyDeck {
  id: string;
  title: string;
  createdAt: string;
  flashcards: Array<{
    front: string;
    back: string;
  }>;
}

function StudyDeckCard({ deck }: { deck: StudyDeck }) {
  const router = useRouter();

  return (
    <Card 
      className="p-6 hover:bg-gray-800/50 cursor-pointer transition-colors border-gray-800"
      onClick={() => router.push(`/study/${deck.id}`)}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-800 rounded-lg">
          <DocumentTextIcon className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2 text-gray-100">{deck.title}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ClockIcon className="w-4 h-4" />
            <span>Created {format(new Date(deck.createdAt), 'MMM d, yyyy')}</span>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {deck.flashcards.length} flashcards
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [studyDecks, setStudyDecks] = useState<StudyDeck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      fetchStudyDecks();
      
      const uploadId = localStorage.getItem('pendingUploadId');
      if (uploadId) {
        // Create study deck and redirect immediately
        fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uploadId }),
        })
          .then(response => {
            if (!response.ok) throw new Error('Failed to generate study materials');
            return response.json();
          })
          .then(({ deckId }) => {
            router.push(`/study/${deckId}`);
            localStorage.removeItem('pendingUploadId');
          })
          .catch(error => {
            console.error('Error processing file:', error);
          });
      }
    }
  }, [isSignedIn]);

  const fetchStudyDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const response = await fetch('/api/study-decks');
      if (response.ok) {
        const decks = await response.json();
        setStudyDecks(decks);
      }
    } catch (error) {
      console.error('Failed to fetch study decks:', error);
    } finally {
      setIsLoadingDecks(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    try {
      setIsProcessing(true);
      
      // Always upload to temp storage first
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/temp-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      const { uploadId } = await response.json();

      if (!isSignedIn) {
        // Store uploadId and show sign in
        localStorage.setItem('pendingUploadId', uploadId);
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
        body: JSON.stringify({ uploadId }),
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
  }, [isSignedIn]);

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
    <main className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-6">
              Transform Your Notes into Interactive Study Materials
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Upload your study materials and let AI create effective flashcards and mind maps
            </p>
            
            <div
              {...getRootProps()}
              className={`p-12 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors mb-8
                ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'}`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400" />
                {isDragActive ? (
                  <p className="text-lg">Drop your files here</p>
                ) : (
                  <>
                    <p className="text-lg">Drag & drop your files here, or click to select files</p>
                    <p className="text-sm text-gray-500">Supports PDF, DOCX, and TXT files</p>
                  </>
                )}
              </div>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <SparklesIcon className="h-5 w-5 animate-spin" />
                <span>Processing your document...</span>
              </div>
            )}

            {showSignIn && !isSignedIn && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background p-4 rounded-lg">
                  <SignIn 
                    routing="hash"
                    forceRedirectUrl={window?.location?.href || '/'}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="AI-Powered"
              description="Advanced AI analyzes your notes to create comprehensive flashcards"
            />
            <FeatureCard
              title="Time-Saving"
              description="Convert hours of manual work into minutes of automated learning"
            />
            <FeatureCard
              title="Customizable"
              description="Edit and refine generated flashcards to match your learning style"
            />
          </div>

          {isSignedIn && (
            <div className="mt-16">
              <h2 className="text-2xl font-semibold mb-6">Your Study Decks</h2>
              {isLoadingDecks ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
              ) : studyDecks.length > 0 ? (
                <div className="grid gap-4">
                  {studyDecks.map((deck) => (
                    <StudyDeckCard key={deck.id} deck={deck} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400">No study decks yet. Upload a document to get started!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 border border-gray-800 rounded-lg bg-gray-900 hover:bg-gray-800/50 transition-colors">
      <h3 className="text-lg font-semibold mb-2 text-gray-100">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
