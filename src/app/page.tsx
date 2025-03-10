'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, SparklesIcon } from '@heroicons/react/24/outline';
import FlashcardList from '@/components/FlashcardList';

interface Flashcard {
  front: string;
  back: string;
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate flashcards');
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Transform Your Notes into Flashcards
        </h1>
        
        <div className="text-center mb-12">
          <p className="text-xl text-gray-600">
            Upload your study materials and let AI create effective flashcards for you
          </p>
        </div>

        <div className="w-full max-w-2xl mx-auto">
          <div
            {...getRootProps()}
            className={`p-12 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...getInputProps()} className="sr-only" />
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

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {isProcessing && (
            <div className="mt-8 text-center">
              <SparklesIcon className="h-8 w-8 mx-auto text-blue-500 animate-pulse" />
              <p className="mt-2 text-gray-600">Generating your flashcards...</p>
            </div>
          )}

          {flashcards.length > 0 && <FlashcardList flashcards={flashcards} />}
        </div>

        {!flashcards.length && (
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
        )}
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
