"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Clock, CheckCircle, XCircle, BarChart, Brain } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatTime } from "@/lib/utils"

interface QuizStatsProps {
  deckId: string
}

interface QuizSessionSummary {
  id: string
  startTime: string
  endTime: string | null
  totalTime: number
  questionsAnswered: number
  correctAnswers: number
  incorrectAnswers: number
  accuracy: number
  score: number
}

interface QuizStatsData {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  totalIncorrect: number
  averageAccuracy: number
  averageScore: number
  averageTimePerQuestion: number
  bestScore: number
  recentSessions: QuizSessionSummary[]
  availableQuestions: {
    mcq: number
    frq: number
    total: number
  }
}

export function QuizStats({ deckId }: QuizStatsProps) {
  const [stats, setStats] = useState<QuizStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuizStats = async () => {
      try {
        setIsLoading(true)
        
        // First get the list of available questions
        const availableResponse = await fetch(`/api/decks/${deckId}/quiz/available-questions`)
        if (!availableResponse.ok) {
          throw new Error("Failed to fetch available questions")
        }
        const availableData = await availableResponse.json()
        
        // Get all completed quiz sessions for this deck
        const sessionsResponse = await fetch(`/api/decks/${deckId}/quiz/sessions`)
        if (!sessionsResponse.ok) {
          throw new Error("Failed to fetch quiz sessions")
        }
        const sessionsData = await sessionsResponse.json()
        
        // Process the data
        const totalSessions = sessionsData.sessions.length
        const completedSessions = sessionsData.sessions.filter((s: any) => s.endTime)
        
        let totalQuestions = 0
        let totalCorrect = 0
        let totalIncorrect = 0
        let totalScore = 0
        let totalTime = 0
        let bestScore = 0
        
        completedSessions.forEach((session: any) => {
          totalQuestions += session.questionsAnswered
          totalCorrect += session.correctAnswers
          totalIncorrect += session.incorrectAnswers
          totalScore += session.pointsEarned
          totalTime += (session.totalTime || 0)
          
          if (session.pointsEarned > bestScore) {
            bestScore = session.pointsEarned
          }
        })
        
        const averageAccuracy = totalQuestions > 0 
          ? Math.round((totalCorrect / totalQuestions) * 100) 
          : 0
        
        const averageScore = completedSessions.length > 0 
          ? Math.round(totalScore / completedSessions.length) 
          : 0
        
        // Calculate average time per question (commented out for now)
        /*
        const averageTimePerQuestion = totalQuestions > 0 
          ? Math.round(totalTime / totalQuestions) 
          : 0
        */
        const averageTimePerQuestion = 0
        
        // Format recent sessions
        const recentSessions = completedSessions
          .slice(0, 5)
          .map((session: any) => ({
            id: session.id,
            startTime: session.startTime,
            endTime: session.endTime,
            totalTime: session.totalTime || 0,
            questionsAnswered: session.questionsAnswered,
            correctAnswers: session.correctAnswers,
            incorrectAnswers: session.incorrectAnswers,
            accuracy: session.questionsAnswered > 0 
              ? Math.round((session.correctAnswers / session.questionsAnswered) * 100) 
              : 0,
            score: session.pointsEarned
          }))
        
        setStats({
          totalSessions,
          totalQuestions,
          totalCorrect,
          totalIncorrect,
          averageAccuracy,
          averageScore,
          averageTimePerQuestion,
          bestScore,
          recentSessions,
          availableQuestions: availableData
        })
      } catch (err) {
        console.error(err)
        setError("Failed to load quiz statistics")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (deckId) {
      fetchQuizStats()
    }
  }, [deckId])

  if (isLoading) {
    return <QuizStatsSkeletonLoader />
  }

  if (error || !stats) {
    return (
      <Card className="w-full border border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle>Quiz Statistics</CardTitle>
          <CardDescription>Error loading statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/20 p-2">
              <BarChart className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-destructive">{error || "Failed to load statistics"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If no quiz sessions yet
  if (stats.totalSessions === 0) {
    return (
      <Card className="w-full border border-primary/10 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Quiz Statistics
          </CardTitle>
          <CardDescription>Test your knowledge with quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Quiz Data Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This deck has {stats.availableQuestions.total} quiz questions available. 
              Take a quiz to see your performance stats here!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full border border-primary/10 bg-card/50 backdrop-blur-sm mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Quiz Statistics
        </CardTitle>
        <CardDescription>Your quiz performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Available Questions"
              value={stats.availableQuestions.total.toString()}
              icon={<Brain className="h-4 w-4 text-purple-500" />}
              color="purple"
              description={`${stats.availableQuestions.mcq} MCQ · ${stats.availableQuestions.frq} FRQ`}
            />
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}`}
              icon={<Trophy className="h-4 w-4 text-yellow-500" />}
              color="yellow"
              description={`Best: ${stats.bestScore} points`}
            />
            <StatCard
              title="Accuracy"
              value={`${stats.averageAccuracy}%`}
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
              color="green"
              description={`${stats.totalCorrect} correct · ${stats.totalIncorrect} incorrect`}
            />
            {/* Time-related stat card commented out for now 
            <StatCard
              title="Avg. Time per Question"
              value={formatTime(stats.averageTimePerQuestion)}
              icon={<Clock className="h-4 w-4 text-blue-500" />}
              color="blue"
              description={`${stats.totalSessions} ${stats.totalSessions === 1 ? 'quiz' : 'quizzes'} completed`}
            />
            */}
            <StatCard
              title="Quiz Sessions"
              value={stats.totalSessions.toString()}
              icon={<Trophy className="h-4 w-4 text-blue-500" />}
              color="blue"
              description={`${stats.totalQuestions} questions answered`}
            />
          </div>

          {/* Recent Sessions */}
          {stats.recentSessions.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium mb-4">Recent Quiz Sessions</h3>
              <div className="space-y-4">
                {stats.recentSessions.map((session) => (
                  <div key={session.id} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.startTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">{session.score} pts</span>
                          </div>
                          {/* Time display commented out for now 
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>{formatTime(session.totalTime)}</span>
                          </div>
                          */}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{session.accuracy}% Accuracy</span>
                        </div>
                        <div className="w-32 mt-1">
                          <Progress
                            value={session.accuracy}
                            className={`h-2 ${
                              session.accuracy > 80 
                                ? '[&>div]:bg-green-500' 
                                : session.accuracy > 60 
                                  ? '[&>div]:bg-yellow-500' 
                                  : '[&>div]:bg-red-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
  description,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
  description: string
}) {
  return (
    <div className={`p-4 rounded-lg border border-${color}-500/20 bg-${color}-500/5`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`rounded-full bg-${color}-500/10 p-1`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  )
}

function QuizStatsSkeletonLoader() {
  return (
    <Card className="w-full border border-primary/10 bg-card/50 backdrop-blur-sm mt-8">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-4 w-36 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-muted">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
          
          <div className="mt-8">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 