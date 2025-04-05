"use client"

/* eslint-disable react/no-unescaped-entities */
import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, BarChart3, Brain, Clock, TrendingUp, Award, Zap, BarChart } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StudyStatsProps {
  deckId: string
}

interface DeckStats {
  deckId: string
  deckTitle: string
  totalCards: number
  flashcardCount: number
  cardsWithProgress: number
  newCards: number
  dueCards: number
  averageStreak: number
  averageEaseFactor: number
  averageResponseTime: number | null
  totalPoints: number
  reviewsByDate: Record<
    string,
    {
      total: number
      easy: number
      good: number
      hard: number
      again: number
    }
  >
  masteryLevels: {
    mastered: number
    learning: number
    struggling: number
    new: number
  }
  studyTime: {
    today: number
    week: number
    total: number
  }
  masteryLevel: number
}

export function StudyStats({ deckId }: StudyStatsProps) {
  const [stats, setStats] = useState<DeckStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/decks/${deckId}/stats`, {
          headers: {
            'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })
        
        if (!response.ok) {
          throw new Error("Failed to fetch statistics")
        }
        
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError("Failed to load statistics")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (deckId) {
      fetchStats()
    }
  }, [deckId])

  if (isLoading) {
    return <StatsSkeletonLoader />
  }

  if (error || !stats) {
    return (
      <Card className="w-full border border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle>Study Statistics</CardTitle>
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

  // Calculate completion percentage
  // const completionPercentage = stats.totalCards > 0 ? Math.round((stats.cardsWithProgress / stats.totalCards) * 100) : 0
  const completionPercentage = stats.flashcardCount > 0 ? Math.round(stats.masteryLevel) : 0

  // Format average response time
  const avgResponseTime = stats.averageResponseTime ? `${Math.round(stats.averageResponseTime / 1000)} seconds` : "N/A"

  // Set dates for review history (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0); // Set to start of day
    date.setDate(date.getDate() - i);
    return date.toLocaleDateString('en-US');
  }).reverse();

  // Prepare review data for chart
  const reviewData = last7Days.map((date) => {
    const dayData = stats.reviewsByDate[date] || { total: 0, easy: 0, good: 0, hard: 0, again: 0 };
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: dayData.total,
      easy: dayData.easy || 0,
      good: dayData.good || 0,
      hard: dayData.hard || 0,
      again: dayData.again || 0,
    }
  });

  // Find max count for chart scaling (minimum of 1 to avoid division by zero)
  const maxCount = Math.max(1, ...reviewData.map((d) => d.count));

  return (
    <Card className="w-full border border-primary/10 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Study Statistics
        </CardTitle>
        <CardDescription>Your learning progress and performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Cards"
                value={stats.flashcardCount.toString()}
                icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
                color="blue"
                description="Cards in this deck"
              />
              <StatCard
                title="Cards Due"
                value={stats.dueCards.toString()}
                icon={<Calendar className="h-4 w-4 text-orange-500" />}
                color="orange"
                description="Ready for review"
              />
              <StatCard
                title="New Cards"
                value={stats.newCards.toString()}
                icon={<Zap className="h-4 w-4 text-purple-500" />}
                color="purple"
                description="Not yet studied"
              />
              <StatCard
                title="Total Points"
                value={stats.totalPoints.toString()}
                icon={<Award className="h-4 w-4 text-green-500" />}
                color="green"
                description="Your achievement score"
              />
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-medium mb-4">Card Mastery Levels</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex flex-col space-y-2">
                  <MasteryBar
                    label="Mastered"
                    count={stats.masteryLevels.mastered}
                    total={stats.flashcardCount}
                    color="bg-green-500"
                  />
                  <MasteryBar
                    label="Learning"
                    count={stats.masteryLevels.learning}
                    total={stats.flashcardCount}
                    color="bg-blue-500"
                  />
                  <MasteryBar
                    label="Struggling"
                    count={stats.masteryLevels.struggling}
                    total={stats.flashcardCount}
                    color="bg-orange-500"
                  />
                  <MasteryBar
                    label="New"
                    count={stats.masteryLevels.new}
                    total={stats.flashcardCount}
                    color="bg-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Today's Study</h3>
                    </div>
                    <span className="text-xl font-bold">{Math.round(stats.studyTime.today)} min</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">This Week</h3>
                    </div>
                    <span className="text-xl font-bold">{Math.round(stats.studyTime.week)} min</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Total Time</h3>
                    </div>
                    <span className="text-xl font-bold">{Math.round(stats.studyTime.total)} min</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-sm font-medium mb-3">Deck Completion</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    You've made progress on {stats.cardsWithProgress} out of {stats.flashcardCount} cards
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <StatCard
                  title="Average Streak"
                  value={stats.averageStreak.toFixed(1)}
                  icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                  color="green"
                  description="Consecutive correct answers"
                />
                <StatCard
                  title="Average Ease"
                  value={stats.averageEaseFactor.toFixed(1)}
                  icon={<Brain className="h-4 w-4 text-blue-500" />}
                  color="blue"
                  description="Card difficulty factor"
                />
                <StatCard
                  title="Response Time"
                  value={avgResponseTime}
                  icon={<Clock className="h-4 w-4 text-purple-500" />}
                  color="purple"
                  description="Average answer time"
                />
              </div>

              <div className="bg-muted/30 rounded-lg p-6 mt-6">
                <h3 className="text-sm font-medium mb-4">Learning Efficiency</h3>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-muted stroke-current"
                        strokeWidth="10"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-green-500 stroke-current"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                        strokeDasharray={`${2.5 * Math.PI * 40}`}
                        strokeDashoffset={`${2.5 * Math.PI * 40 * (1 - stats.averageEaseFactor / 5)}`}
                        transform="rotate(-90 50 50)"
                      />
                      <text
                        x="50"
                        y="50"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-lg font-bold"
                        fill="currentColor"
                      >
                        {Math.round((stats.averageEaseFactor / 5) * 100)}%
                      </text>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium">
                      {stats.averageEaseFactor >= 2.5 ? "Great progress!" : "Keep practicing!"}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats.averageEaseFactor >= 2.5
                        ? "Your learning efficiency is above average. Keep up the good work!"
                        : "Regular practice will help improve your learning efficiency."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="pt-2">
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-sm font-medium mb-4">Reviews (Last 7 Days)</h3>
                <div className="h-[240px] relative">
                  {reviewData.length > 0 ? (
                    <div className="flex h-full items-end gap-2">
                      {reviewData.map((day, i) => (
                        <TooltipProvider key={i}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative flex flex-col items-center flex-1 group">
                                <div className="w-full flex flex-col-reverse h-[200px]">
                                  {day.easy > 0 && (
                                    <div
                                      className="w-full bg-blue-500/80 rounded-t transition-all group-hover:bg-blue-500"
                                      style={{ height: `${(day.easy / maxCount) * 180}px` }}
                                    />
                                  )}
                                  {day.good > 0 && (
                                    <div
                                      className="w-full bg-green-500/80 transition-all group-hover:bg-green-500"
                                      style={{ height: `${(day.good / maxCount) * 180}px` }}
                                    />
                                  )}
                                  {day.hard > 0 && (
                                    <div
                                      className="w-full bg-yellow-500/80 transition-all group-hover:bg-yellow-500"
                                      style={{ height: `${(day.hard / maxCount) * 180}px` }}
                                    />
                                  )}
                                  {day.again > 0 && (
                                    <div
                                      className="w-full bg-red-500/80 rounded-t transition-all group-hover:bg-red-500"
                                      style={{ height: `${(day.again / maxCount) * 180}px` }}
                                    />
                                  )}
                                  {day.count === 0 && <div className="w-full h-4 bg-muted rounded-t" />}
                                </div>
                                <span className="absolute top-full mt-2 text-xs font-medium">{day.date}</span>
                                {day.count > 0 && (
                                  <span className="absolute top-[-20px] text-xs font-medium">{day.count}</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs p-1">
                                <div className="font-medium">{day.date}</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                                  <span>Total:</span>
                                  <span className="font-medium">{day.count}</span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Easy:
                                  </span>
                                  <span className="font-medium">{day.easy}</span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    Good:
                                  </span>
                                  <span className="font-medium">{day.good}</span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    Hard:
                                  </span>
                                  <span className="font-medium">{day.hard}</span>
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    Again:
                                  </span>
                                  <span className="font-medium">{day.again}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No review data available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs">Easy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs">Hard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Again</span>
                </div>
              </div>

              {/* <div className="bg-muted/30 rounded-lg p-6 mt-6">
                <h3 className="text-sm font-medium mb-4">Study Consistency</h3>
                <div className="flex items-center gap-4">
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 28 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded-sm ${
                          i % 9 === 0
                            ? "bg-green-200 dark:bg-green-900"
                            : i % 5 === 0
                              ? "bg-green-300 dark:bg-green-800"
                              : i % 3 === 0
                                ? "bg-green-400 dark:bg-green-700"
                                : i % 7 === 0
                                  ? "bg-green-500 dark:bg-green-600"
                                  : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <div>
                    <h4 className="font-medium">Good consistency</h4>
                    <p className="text-sm text-muted-foreground mt-1">You've studied on 18 out of the last 28 days</p>
                  </div>
                </div>
              </div> */}
            </div>
          </TabsContent>
        </Tabs>
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
    <Card className="overflow-hidden border border-primary/10 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className={`rounded-full bg-${color}-500/10 p-1.5`}>{icon}</div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function MasteryBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = Math.round((count / total) * 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {count} cards ({percentage}%)
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function StatsSkeletonLoader() {
  return (
    <Card className="w-full border border-primary/10 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
