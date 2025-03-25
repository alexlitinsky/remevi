'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import {
  Upload,
  Sparkles,
  BookOpen,
  Clock,
  Trophy,
  Zap,
  Brain,
  FileText,
  FileIcon as FilePdf,
  FileImage,
  Flame,
  BarChart3,
  ArrowRight,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignIn, SignedIn, SignedOut } from '@clerk/nextjs';
import { useToast } from "@/components/ui/use-toast"
import { SparklesCore } from "@/components/ui/sparkles";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  lastReviewed?: string;
  nextReview?: string;
  mastery: number;
}

interface Deck {
  id: string;
  title: string;
  category?: string;
  createdAt: string;
  flashcardCount: number;
  dueCards: number;
  totalProgress: number;
  lastStudied?: string;
  isProcessing?: boolean;
  error?: string;
  tags?: string[];
}

interface StudyProgress {
  cardsReviewed: number;
  totalCards: number;
  masteryLevel: number;
  minutesStudied: number;
  studySessions: number;
  currentStreak: number;
  weeklyActivity: number[];
  recentMastery: { date: string; mastery: number }[];
  totalPoints: number;
}

export default function Home() {
  const { isSignedIn } = useUser();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();
  const [progress, setProgress] = useState<StudyProgress>({
    cardsReviewed: 0,
    totalCards: 0,
    masteryLevel: 0,
    minutesStudied: 0,
    studySessions: 0,
    currentStreak: 0,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    recentMastery: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      mastery: 0
    })).reverse(),
    totalPoints: 0
  });

  useEffect(() => {
    if (isSignedIn) {
      fetchDecks();
      fetchProgress();
      
      const pendingUploadInfo = localStorage.getItem('pendingUploadInfo');
      if (pendingUploadInfo) {
        try {
          router.push('/deck/configure');
        } catch (error) {
          console.error('Error parsing pending upload info:', error);
          localStorage.removeItem('pendingUploadInfo');
        }
      }
    }
  }, [isSignedIn, router]);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/study-progress');
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  const fetchDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const response = await fetch('/api/decks');
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
      localStorage.setItem('pendingUploadInfo', JSON.stringify({ uploadId, filePath, metadata }));

      if (!isSignedIn) {
        setShowSignIn(true);
        setIsProcessing(false);
        return;
      }

      router.push('/deck/configure');

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

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FilePdf className="h-5 w-5 text-red-500" />
    if (type.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />
    return <FileText className="h-5 w-5 text-green-500" />
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 3600 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <div className="relative container mx-auto px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 md:py-24 relative"
          >
            <div className="absolute inset-0 w-full h-full">
              <SparklesCore
                id="tsparticlesHero"
                background="transparent"
                minSize={0.6}
                maxSize={1.4}
                particleDensity={70}
                className="w-full h-full"
                particleColor="rgba(255, 255, 255, 0.3)"
                speed={0.5}
              />
            </div>

            <div className="relative z-10">
              <Badge variant="outline" className="mb-6 px-3 py-1 text-sm bg-primary/10 border-primary/20">
                AI-Powered Learning
              </Badge>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                Transform Your Notes into
                <br className="hidden sm:block" />
                Interactive Study Materials
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Upload your study materials and let AI create effective flashcards and mind maps for accelerated learning
              </p>
            </div>

            <div {...getRootProps()} className="max-w-3xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "relative py-12 px-8 rounded-2xl cursor-pointer transition-all duration-300",
                  isDragActive
                    ? "border-2 border-dashed border-primary/50 bg-primary/5"
                    : "border-2 border-dashed border-muted/50 hover:border-primary/30 bg-card/30",
                  "shadow-[0_8px_16px_-6px_rgba(0,0,0,0.2)]",
                )}
              >
                <input {...getInputProps()} />
                <div className="relative z-10 space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>

                  {isDragActive ? (
                    <p className="text-2xl font-medium">Drop your files here</p>
                  ) : (
                    <>
                      <p className="text-xl md:text-2xl font-medium">
                        Drag & drop your files here, or click to select files
                      </p>
                      <p className="text-muted-foreground">Supports PDF, DOCX, and TXT files</p>
                      {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-primary mt-4">
                          <Sparkles className="h-5 w-5 animate-pulse" />
                          <span>Processing your document...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Intelligent flashcards</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Brain className="h-4 w-4" />
                <span>Spaced repetition</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>AI-generated questions</span>
              </div>
            </div>
          </motion.div>

          {isSignedIn && (
            <>
              {/* Study Progress Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-5xl mx-auto mb-16 md:mb-24"
              >
                <Card className="border border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl font-bold">Study Progress</CardTitle>
                        <CardDescription>Track your learning journey</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Cards Reviewed */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cards Reviewed</span>
                        <span className="font-medium">
                          {progress.cardsReviewed}/{progress.totalCards}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-1 overflow-hidden">
                        <motion.div 
                          className="bg-blue-500 h-2.5 rounded-full relative overflow-hidden"
                          initial={{ width: 0 }}
                          animate={{ width: `${(progress.cardsReviewed / progress.totalCards) * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                          <motion.div
                            className="absolute inset-0 w-full h-full"
                            style={{
                              background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)",
                              backgroundSize: "200% 100%",
                            }}
                            animate={{
                              backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                            }}
                            transition={{
                              duration: 2,
                              ease: "linear",
                              repeat: Infinity,
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>

                    {/* Mastery Level */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mastery Level</span>
                        <span className="font-medium">{progress.masteryLevel}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-1 overflow-hidden">
                        <motion.div 
                          className="bg-blue-500 h-2.5 rounded-full relative overflow-hidden"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.masteryLevel}%` }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                          <motion.div
                            className="absolute inset-0 w-full h-full"
                            style={{
                              background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)",
                              backgroundSize: "200% 100%",
                            }}
                            animate={{
                              backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                            }}
                            transition={{
                              duration: 2,
                              ease: "linear",
                              repeat: Infinity,
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>

                    {/* Weekly Activity */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium">Weekly Activity</h3>
                        <Badge variant="outline" className="text-xs">
                          Last 7 days
                        </Badge>
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map((day, index) => {
                          const value = progress.weeklyActivity[index] || 0
                          const maxValue = Math.max(...progress.weeklyActivity, 1)
                          const heightPercent = (value / maxValue) * 100

                          return (
                            <div key={day} className="flex flex-col items-center gap-2">
                              {/* Bar container */}
                              <div className="w-full h-[100px] flex items-end bg-muted/10 rounded-sm overflow-hidden">
                                {/* Actual bar */}
                                <div 
                                  className="w-full bg-green-400"
                                  style={{ 
                                    height: `${heightPercent}%`,
                                    minHeight: value > 0 ? '2px' : '0',
                                    transition: 'height 0.5s ease-out'
                                  }} 
                                />
                              </div>

                              {/* Day label */}
                              <span className="text-xs text-muted-foreground">
                                {day}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <Card className="bg-muted/30 border-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground text-sm">Minutes Studied</div>
                            <Clock className="h-4 w-4 text-primary/70" />
                          </div>
                          <div className="text-2xl font-bold mt-2">{progress.minutesStudied || 0}</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/30 border-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground text-sm">Study Sessions</div>
                            <BookOpen className="h-4 w-4 text-primary/70" />
                          </div>
                          <div className="text-2xl font-bold mt-2">{progress.studySessions || 0}</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/30 border-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground text-sm">Days Streak</div>
                            <Flame className="h-4 w-4 text-orange-500" />
                          </div>
                          <div className="text-2xl font-bold mt-2">{progress.currentStreak || 0}</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/30 border-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground text-sm">Total Points</div>
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          </div>
                          <div className="text-2xl font-bold mt-2">{progress.totalPoints || 1250}</div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Study Decks Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-24"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Your Study Decks</h2>
                  </div>
                </div>

                {isLoadingDecks ? (
                  <div className="flex justify-center p-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground animate-pulse">Loading your study decks...</p>
                    </div>
                  </div>
                ) : decks.length === 0 ? (
                  <Card className="border border-dashed border-muted-foreground/20">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="rounded-full bg-primary/10 p-3 mb-4">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">No study decks yet</h3>
                      <p className="text-muted-foreground text-center max-w-md mb-6">
                        Upload a document or create a new deck to start your learning journey
                      </p>
                      <Button className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Document
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => (
                      <Card
                        key={deck.id}
                        onClick={() => router.push(`/deck/${deck.id}`)}
                        className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] border border-primary/10 hover:border-primary/30 hover:shadow-lg bg-card/50 backdrop-blur-sm"
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/50" />
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <Badge variant="outline" className="mb-2 text-xs">
                                {deck.category || "Uncategorized"}
                              </Badge>
                              <h3 className="text-lg font-medium line-clamp-2">{deck.title}</h3>
                            </div>
                            <div className="rounded-full bg-primary/10 p-1.5">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{deck.flashcardCount} cards</span>
                              <span className="text-muted-foreground">
                                {deck.lastStudied ? getDaysAgo(deck.lastStudied) : "Never studied"}
                              </span>
                            </div>

                            {deck.isProcessing ? (
                              <div className="flex items-center gap-2 text-yellow-500 text-sm">
                                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-yellow-500"></div>
                                <span>Processing your deck...</span>
                              </div>
                            ) : deck.totalProgress !== undefined ? (
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span>{deck.totalProgress}%</span>
                                </div>
                                <Progress value={deck.totalProgress} className="h-1" />
                              </div>
                            ) : null}

                            {deck.dueCards !== undefined && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Due today:</span>
                                <Badge variant="secondary" className="font-mono">
                                  {deck.dueCards} cards
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-4 border-t border-primary/10 flex justify-end">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs group-hover:text-primary transition-colors">
                              Study Now
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Features Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-24"
              >
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-4">Supercharge Your Learning</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Our AI-powered platform helps you learn faster and retain information longer
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Smart Flashcards</h3>
                      <p className="text-muted-foreground">
                        AI generates high-quality flashcards from your documents, saving you hours of manual work
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                        <Brain className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Spaced Repetition</h3>
                      <p className="text-muted-foreground">
                        Our algorithm optimizes your review schedule to maximize long-term retention
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Progress Tracking</h3>
                      <p className="text-muted-foreground">
                        Detailed analytics help you understand your learning patterns and improve your study habits
                      </p>
                    </CardContent>
                  </Card>
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
