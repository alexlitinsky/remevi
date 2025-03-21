import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, BarChart3Icon, BrainIcon, ClockIcon } from "lucide-react";

interface StudyStatsProps {
  deckId: string;
}

interface DeckStats {
  deckId: string;
  deckTitle: string;
  totalCards: number;
  cardsWithProgress: number;
  newCards: number;
  dueCards: number;
  averageStreak: number;
  averageEaseFactor: number;
  averageResponseTime: number;
  totalPoints: number;
  reviewsByDate: Record<string, {
    total: number;
    easy: number;
    medium: number;
    hard: number;
  }>;
}

export function StudyStats({ deckId }: StudyStatsProps) {
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/decks/${deckId}/stats`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError("Failed to load statistics");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (deckId) {
      fetchStats();
    }
  }, [deckId]);

  if (isLoading) {
    return <StatsSkeletonLoader />;
  }

  if (error || !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Study Statistics</CardTitle>
          <CardDescription>Error loading statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error || "Failed to load statistics"}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate completion percentage
  const completionPercentage = stats.totalCards > 0 
    ? Math.round((stats.cardsWithProgress / stats.totalCards) * 100) 
    : 0;

  // Format average response time
  const avgResponseTime = stats.averageResponseTime 
    ? `${Math.round(stats.averageResponseTime / 1000)} seconds` 
    : "N/A";

  // Get dates for review history (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  // Prepare review data for chart
  const reviewData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: stats.reviewsByDate[date]?.total || 0,
    easy: stats.reviewsByDate[date]?.easy || 0,
    medium: stats.reviewsByDate[date]?.medium || 0,
    hard: stats.reviewsByDate[date]?.hard || 0,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Study Statistics</CardTitle>
        <CardDescription>Your progress for {stats.deckTitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                title="Total Cards" 
                value={stats.totalCards.toString()} 
                icon={<BarChart3Icon className="h-4 w-4" />} 
              />
              <StatCard 
                title="Cards Due" 
                value={stats.dueCards.toString()} 
                icon={<CalendarIcon className="h-4 w-4" />} 
              />
              <StatCard 
                title="New Cards" 
                value={stats.newCards.toString()} 
                icon={<BarChart3Icon className="h-4 w-4" />} 
              />
              <StatCard 
                title="Total Points" 
                value={stats.totalPoints.toString()} 
                icon={<BrainIcon className="h-4 w-4" />} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Deck Completion</span>
                  <span className="text-sm font-medium">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <StatCard 
                  title="Average Streak" 
                  value={stats.averageStreak.toFixed(1)} 
                  icon={<BarChart3Icon className="h-4 w-4" />} 
                />
                <StatCard 
                  title="Average Ease" 
                  value={stats.averageEaseFactor.toFixed(1)} 
                  icon={<BrainIcon className="h-4 w-4" />} 
                />
                <StatCard 
                  title="Response Time" 
                  value={avgResponseTime} 
                  icon={<ClockIcon className="h-4 w-4" />} 
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="pt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Reviews (Last 7 Days)</h3>
              <div className="h-[200px] relative">
                {reviewData.length > 0 ? (
                  <div className="flex h-full items-end gap-2">
                    {reviewData.map((day, i) => (
                      <div key={i} className="relative flex flex-col items-center flex-1">
                        <div className="w-full flex flex-col-reverse">
                          {day.easy > 0 && (
                            <div 
                              className="w-full bg-green-500 rounded-t" 
                              style={{ height: `${(day.easy / Math.max(...reviewData.map(d => d.count || 1))) * 150}px` }}
                            />
                          )}
                          {day.medium > 0 && (
                            <div 
                              className="w-full bg-yellow-500" 
                              style={{ height: `${(day.medium / Math.max(...reviewData.map(d => d.count || 1))) * 150}px` }}
                            />
                          )}
                          {day.hard > 0 && (
                            <div 
                              className="w-full bg-red-500 rounded-t" 
                              style={{ height: `${(day.hard / Math.max(...reviewData.map(d => d.count || 1))) * 150}px` }}
                            />
                          )}
                        </div>
                        <span className="absolute top-full mt-1 text-xs">{day.date}</span>
                        {day.count > 0 && (
                          <span className="absolute top-[-20px] text-xs">{day.count}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No review data available</p>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-8">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Easy</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs">Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Hard</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatsSkeletonLoader() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
