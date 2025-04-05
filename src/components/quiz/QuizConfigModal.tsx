'use client'
import { Button } from "@/components/ui/button";
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQuizStore, QuizType } from "@/stores/useQuizStore";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { IconBrain, IconAbc, IconPencil, IconCards, IconHome } from "@tabler/icons-react";
import { X } from "lucide-react";

interface QuizConfigModalProps {
  deckId: string;
  hasStarted: boolean;
}

export function QuizConfigModal({ deckId, hasStarted }: QuizConfigModalProps) {
  const startQuiz = useQuizStore(state => state.startQuiz);
  const cleanupSession = useQuizStore(state => state.cleanupSession);
  const setView = useQuizStore(state => state.setView);
  const [quizType, setQuizType] = useState<QuizType>('mixed');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setView('quiz');
  };

  const handleStartQuiz = async () => {
    setIsLoading(true);
    try {
      // Force clean up existing session first
      cleanupSession();
      
      await startQuiz({
        deckId,
        type: quizType,
        questionCount: 10
      });

      // Show keyboard shortcuts toast for first-time users
      const hasSeenTips = localStorage.getItem('hasSeenQuizTips');
      if (!hasSeenTips) {
        localStorage.setItem('hasSeenQuizTips', 'true');
        toast({
          title: "Keyboard Shortcuts Available! 🎯",
          description: (
            <div className="space-y-2 mt-2">
              <p>• Use number keys <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-xs">1</kbd> through <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-xs">4</kbd> for multiple choice</p>
              <p>• Press <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-xs">Enter</kbd> or <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-xs">Space</kbd> to submit</p>
              <p>• For free response, use <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-xs">Shift + Enter</kbd> for new lines</p>
            </div>
          ) as unknown as string,
        });
      }
    } catch (error) {
      console.error('Failed to start quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to start quiz. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
      >
        <Card className="relative overflow-hidden border-0 shadow-2xl">
          {/* Background gradient decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
          
          {/* Content */}
          <div className="relative p-8 space-y-8">
            {/* Close button - only show if quiz has started */}
            {hasStarted && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            <div className="text-center space-y-2">
              <motion.h2 
                className="text-3xl font-bold"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Quiz Configuration
              </motion.h2>
              <p className="text-muted-foreground">
                Choose your preferred question type to begin
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Question Type</h3>
              <RadioGroup 
                value={quizType} 
                onValueChange={(value) => setQuizType(value as QuizType)}
                className="grid gap-3"
              >
                {[
                  {
                    id: 'mixed',
                    icon: IconBrain,
                    title: 'Mixed',
                    description: 'MCQ & Free Response Questions'
                  },
                  {
                    id: 'mcq',
                    icon: IconAbc,
                    title: 'Multiple Choice',
                    description: 'Test your knowledge with options'
                  },
                  {
                    id: 'frq',
                    icon: IconPencil,
                    title: 'Free Response',
                    description: 'Write your answers freely'
                  }
                ].map((option, index) => (
                  <motion.div
                    key={option.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    <Label
                      htmlFor={option.id}
                      className={`
                        flex items-center space-x-3 p-4 cursor-pointer
                        rounded-xl transition-all duration-200
                        ${quizType === option.id 
                          ? 'bg-primary/10 border-primary shadow-sm' 
                          : 'bg-card hover:bg-accent/50 border-border'
                        }
                        border-2
                      `}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <option.icon className={`
                        w-5 h-5 transition-colors duration-200
                        ${quizType === option.id ? 'text-primary' : 'text-muted-foreground'}
                      `} />
                      <div>
                        <div className="font-medium">{option.title}</div>
                        <span className="text-sm text-muted-foreground">{option.description}</span>
                      </div>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              <Button 
                onClick={handleStartQuiz} 
                disabled={isLoading}
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 text-primary-foreground shadow-lg rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Starting Quiz...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2 cursor-pointer">
                    <IconBrain className="w-5 h-5" />
                    Start Quiz
                  </span>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Button
                  onClick={() => window.location.href = `/deck/${deckId}`}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-12 text-base font-medium rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer"
                >
                  <IconCards className="h-4 w-4" />
                  Back to Deck
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="ghost"
                  className="flex items-center justify-center gap-2 h-12 text-base font-medium rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer"
                >
                  <IconHome className="h-4 w-4" />
                  Home
                </Button>
              </div>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}