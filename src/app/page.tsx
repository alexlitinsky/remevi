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
  Trophy,
  Zap,
  Brain,
  Flame,
  BarChart3,
  ArrowRight,
  Loader2,
  Trash2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SignIn } from '@clerk/nextjs';
import { SparklesCore } from "@/components/ui/sparkles";
import { useUploadContext, FileMetadata } from '@/contexts/UploadContext';
import { toast } from 'sonner';
import { FREEMIUM_LIMITS } from '@/lib/constants';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AchievementProgressBar } from '@/components/achievements/AchievementProgressBar';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

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

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  requirements: {
    pointThreshold: number;
    streakDays?: number;
    quizScore?: number;
    cardsStudied?: number;
    correctAnswers?: number;
    decksCreated?: number;
    perfectQuiz?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // For any other potential properties
  };
  badgeIcon: string;
  pointsAwarded: number;
  visible: boolean;
}

export default function Home() {
  const { isSignedIn } = useUser();
  const [decks, setDecks] = useState<Deck[]>([]);
  const isProcessing = false;
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
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isExtractingMeta, setIsExtractingMeta] = useState(false);
  const { setFile, setMetadata, file, metadata } = useUploadContext();
  const { subscription } = useSubscription();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const limits = subscription?.status === "active" ? FREEMIUM_LIMITS.PRO : FREEMIUM_LIMITS.FREE;

  useEffect(() => {
    if (isSignedIn) {
      fetchDecks();
      fetchProgress();
      fetchAchievements();
      
      if (file && metadata) {
        router.push('/deck/configure');
      }
    }
  }, [isSignedIn, router, file, metadata, setFile, setMetadata]);

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

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements);
        // Update progress with total points
        setProgress(prev => ({
          ...prev,
          totalPoints: data.totalPoints
        }));
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  };

  const extractMetadata = async (file: File): Promise<FileMetadata> => {
    const metadata: FileMetadata = {
      originalName: file.name,
      type: file.type,
      size: file.size,
    };

    if (file.type === 'application/pdf') {
      try {
      // Set the PDF worker script (required for client-side use)
      GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      
      metadata.pageCount = pdf.numPages;
      } catch (error) {
        console.error('Error extracting PDF metadata:', error);
        toast.error('Error reading PDF file. Please try again.');
        throw error;
      }
    }

    return metadata;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Check file size
    if (file.size > limits.maxFileSize) {
      toast.error(`File size (${formatFileSize(file.size)}) exceeds plan limit (${formatFileSize(limits.maxFileSize)}).`);
      return;
    }
    // Check deck limit
    if (decks.length >= limits.maxDecks) {
      toast.error(`You've reached your plan's deck limit (${limits.maxDecks} decks). Please upgrade to create more.`);
      return;
    }


    // Check file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please upload a PDF, TXT, or DOC file.');
      return;
    }

    setIsExtractingMeta(true);

    try {
      const metadata = await extractMetadata(file);
      setFile(file);
      setMetadata(metadata);

      if (isSignedIn) {
        router.push('/deck/configure');
      } else {
        // Store file and metadata in localStorage before sign-in
        // localStorage.setItem('pendingUpload', JSON.stringify({
        //   metadata,
        //   file
        // }));
        setShowSignIn(true);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsExtractingMeta(false);
    }
  }, [isSignedIn, router, setFile, setMetadata, limits.maxFileSize, decks.length, limits.maxDecks]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 3600 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  const handleDelete = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to deck page
    setIsDeleting(deckId);
    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete deck');
      }

      toast.success('Deck deleted successfully');
      // Remove the deck from local state instead of refreshing
      setDecks(prevDecks => prevDecks.filter(deck => deck.id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error('Failed to delete deck');
    } finally {
      setIsDeleting(null);
    }
  };

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
                AI-Powered Study Assistant
              </Badge>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                Study Smarter,
                <br className="hidden sm:block" />
                Score Higher
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Join thousands of students who&apos;ve improved their grades using our AI study assistant. Upload any document and get personalized study materials in seconds.
              </p>
            </div>

            <div {...getRootProps()} className="max-w-3xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "relative py-12 px-8 rounded-2xl cursor-pointer transition-all duration-300",
                  isProcessing ? "cursor-not-allowed opacity-70" : "cursor-pointer",
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
                      {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-primary mt-4">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{isExtractingMeta ? 'Analyzing file...' : 'Processing...'}</span>
                        </div>
                      )}
                      {!isProcessing && (
                        <>
                          <p className="text-xl md:text-2xl font-medium">
                            Drag & drop your files here, or click to select files
                          </p>
                          <p className="text-muted-foreground">Supports PDF, DOCX, and TXT files</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>

          {!isSignedIn && (
            <>
              {/* Impact Stats Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-24"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="text-4xl font-bold text-primary">85%</div>
                        <p className="text-lg font-medium">Improved Retention</p>
                        <p className="text-sm text-muted-foreground">
                          Our spaced repetition system helps you remember more for longer
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="text-4xl font-bold text-primary">50%</div>
                        <p className="text-lg font-medium">Less Study Time</p>
                        <p className="text-sm text-muted-foreground">
                          Study smarter, not harder with AI-optimized learning paths
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="text-4xl font-bold text-primary">2x</div>
                        <p className="text-lg font-medium">Faster Mastery</p>
                        <p className="text-sm text-muted-foreground">
                          Master concepts in half the time with personalized learning
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* How It Works Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-24"
              >
                <div className="text-center mb-12">
                  <Badge variant="outline" className="mb-4">How It Works</Badge>
                  <h2 className="text-3xl font-bold mb-4">From Notes to Knowledge in Minutes</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Transform any study material into an effective learning experience
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">1. Upload Your Notes</h3>
                      <p className="text-muted-foreground">
                        Drop any PDF, document, or text file - our AI handles the rest
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">2. AI Creates Your Study Plan</h3>
                      <p className="text-muted-foreground">
                        Get personalized flashcards and quizzes optimized for your learning
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">3. Excel in Your Exams</h3>
                      <p className="text-muted-foreground">
                        Watch your grades improve as you master concepts effortlessly
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Success Outcomes Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-24"
              >
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-4">Ready to Ace Your Exams?</h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                    Join students who&apos;ve transformed their academic performance with Remevi
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4">
                        <div className="rounded-full bg-primary/10 p-3 w-fit">
                          <Brain className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-medium">Better Memory Retention</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Remember key concepts for months, not days</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Strengthen weak areas automatically</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Build lasting understanding, not cramming</span>
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border border-primary/10">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4">
                        <div className="rounded-full bg-primary/10 p-3 w-fit">
                          <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-medium">Efficient Study Sessions</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Cut study time in half with AI optimization</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Focus on what you need to learn most</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Track your progress in real-time</span>
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Final CTA Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mb-24"
              >
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    Start Acing Your Exams Today
                  </h2>
                  <p className="text-xl text-muted-foreground mb-8">
                    Try Remevi free and experience the power of AI-enhanced learning
                  </p>
                  <Button size="lg" className="gap-2" onClick={() => setShowSignIn(true)}>
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </>
          )}

          {isSignedIn && (
            <>
              {/* Combined Study Progress Section */}
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
                        <CardTitle className="text-2xl font-bold">Learning Progress</CardTitle>
                        <CardDescription>Track your learning journey</CardDescription>
                      </div>
                      <div className="flex items-center justify-end">
                        <div className="text-muted-foreground text-sm">Days Streak</div>
                        <Flame className="h-4 w-4 text-orange-500 ml-2" />
                        <div className="text-2xl font-bold ml-2">{progress.currentStreak || 0}</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Study Progress */}
                    <div className="space-y-6">
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
                          {Array.from({ length: 7 }, (_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (6 - i));
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                            const value = progress.weeklyActivity[i] || 0;
                            const maxValue = Math.max(...progress.weeklyActivity, 1);
                            const heightPercent = (value / maxValue) * 100;

                            return (
                              <div key={dayName} className="flex flex-col items-center gap-2">
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
                                  {dayName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Move AchievementProgressBar here */}
                      <AchievementProgressBar 
                        achievements={achievements} 
                        currentPoints={progress.totalPoints} 
                        className="mb-4"
                      />
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
                        className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-primary/10 hover:border-primary/30 hover:shadow-lg bg-card/50 backdrop-blur-sm"
                      >
                        <div 
                          role="button"
                          onClick={() => router.push(`/deck/${deck.id}`)}
                          className="cursor-pointer"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/50" />
                          <CardContent className="p-6">
                            {/* Title section */}
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

                            {/* Stats section */}
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

                            {/* Separate non-clickable section for buttons */}
                            <div 
                              className="relative mt-4 pt-4 border-t border-primary/10 flex justify-between items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="z-10">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors cursor-pointer bg-red-500"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent 
                                    className="fixed inset-0 m-auto h-fit max-h-[90vh] max-w-[400px] overflow-y-auto p-0 bg-black"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-6 pt-6">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-center text-2xl font-bold tracking-tight">Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-center mt-2">
                                          This action cannot be undone. This will permanently delete your deck
                                          and all associated study materials.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                    </div>

                                    <div className="p-6">
                                      <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                                        <AlertDialogCancel className="sm:mt-0">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await handleDelete(deck.id, e);
                                          }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          disabled={isDeleting === deck.id}
                                        >
                                          {isDeleting === deck.id ? (
                                            <>
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                                              Deleting...
                                            </>
                                          ) : (
                                            'Delete'
                                          )}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </div>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                              <div className="z-10">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="gap-1 text-xs group-hover:text-primary cursor-pointer transition-colors bg-blue-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/deck/${deck.id}/session`);
                                  }}
                                >
                                  Study Now
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </div>
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

      {/* Footer */}
      <footer className="border-t border-primary/10 bg-card/50 backdrop-blur-sm mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Remevi
              </p>
              <div className="flex items-center gap-4">
                <a href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition">Privacy</a>
                <a href="/terms" className="text-sm text-muted-foreground hover:text-primary transition">Terms</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

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
