/**
 * WeeklySummary - Weekly productivity statistics and insights display
 * 
 * Displays comprehensive weekly summary including focus time, productivity scores,
 * goal achievement, and detailed daily breakdowns. Provides actionable insights
 * about weekly productivity patterns and trends. Part of Phase 3 enhancement
 * features for advanced analytics and reporting.
 * 
 * @module WeeklySummary
 * @author FocusFlare Team
 * @since 0.3.0
 */

import { useMemo } from 'react';
import type { WeeklySummary as WeeklySummaryType, DailySummary } from '@/shared/types/activity-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { Progress } from '@/renderer/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Target, 
  Award,
  Coffee,
  Play,
  BarChart3
} from 'lucide-react';

// === COMPONENT TYPES ===

/**
 * Props interface for WeeklySummary component
 */
interface WeeklySummaryProps {
  /** Weekly summary data */
  summary: WeeklySummaryType;
  /** Focus goal in minutes */
  focusGoalMinutes: number;
  /** Whether to show detailed daily breakdown */
  showDetails?: boolean;
}

// === CONSTANTS ===

/** Day names for display */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Productivity score colors */
const PRODUCTIVITY_COLORS = {
  excellent: 'bg-green-500',
  good: 'bg-blue-500',
  average: 'bg-yellow-500',
  poor: 'bg-red-500'
};

// === HELPER FUNCTIONS ===

/**
 * Gets productivity level based on score
 */
function getProductivityLevel(score: number): keyof typeof PRODUCTIVITY_COLORS {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  return 'poor';
}

/**
 * Formats duration in minutes to hours and minutes
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Formats date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Gets the week date range string
 */
function getWeekRange(weekStart: Date, weekEnd: Date): string {
  const startStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(weekStart);
  
  const endStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(weekEnd);
  
  return `${startStr} - ${endStr}`;
}

// === DAILY BREAKDOWN COMPONENT ===

/**
 * Daily breakdown component for detailed view
 */
interface DailyBreakdownProps {
  dailySummaries: DailySummary[];
  focusGoalMinutes: number;
}

function DailyBreakdown({ dailySummaries, focusGoalMinutes }: DailyBreakdownProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-gray-700">Daily Breakdown</h4>
      
      <div className="space-y-2">
        {dailySummaries.map((day, index) => {
          const dayOfWeek = DAY_NAMES[day.date.getDay()];
          const goalProgress = Math.min(100, (day.focusTime / focusGoalMinutes) * 100);
          const productivityLevel = getProductivityLevel(day.productivityScore);
          
          return (
            <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 text-center">
                <div className="text-xs font-medium text-gray-600">{dayOfWeek}</div>
                <div className="text-xs text-gray-500">{formatDate(day.date)}</div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{formatDuration(day.focusTime)}</span>
                  {day.metFocusGoal && (
                    <Badge variant="secondary" className="text-xs">
                      ✓ Goal
                    </Badge>
                  )}
                </div>
                
                <Progress 
                  value={goalProgress} 
                  className="h-2" 
                />
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${PRODUCTIVITY_COLORS[productivityLevel]}`}
                  />
                  <span className="text-xs font-medium">{day.productivityScore}</span>
                </div>
                <div className="text-xs text-gray-500">{day.focusSessionCount} sessions</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === INSIGHTS COMPONENT ===

/**
 * Weekly insights component
 */
interface WeeklyInsightsProps {
  summary: WeeklySummaryType;
  focusGoalMinutes: number;
}

function WeeklyInsights({ summary, focusGoalMinutes }: WeeklyInsightsProps) {
  const insights = useMemo(() => {
    const results: string[] = [];
    
    // Focus time insights
    const weeklyFocusGoal = focusGoalMinutes * 7;
    const focusAchievement = (summary.totalFocusTime / weeklyFocusGoal) * 100;
    
    if (focusAchievement >= 100) {
      results.push('🎉 Exceeded weekly focus goal! Great work!');
    } else if (focusAchievement >= 80) {
      results.push('👍 Nearly reached weekly focus goal');
    } else {
      results.push(`📈 ${Math.round(100 - focusAchievement)}% short of weekly focus goal`);
    }
    
    // Consistency insights
    if (summary.daysMetGoal >= 5) {
      results.push('🔥 Excellent consistency hitting daily goals');
    } else if (summary.daysMetGoal >= 3) {
      results.push('✅ Good consistency with daily goals');
    } else {
      results.push('🎯 Focus on consistency for better results');
    }
    
    // Best/worst day insights
    const bestDay = DAY_NAMES[summary.mostProductiveDay.date.getDay()];
    
    if (summary.mostProductiveDay.productivityScore > summary.leastProductiveDay.productivityScore + 20) {
      results.push(`📊 ${bestDay} was your most productive day`);
    }
    
    // Average session insights
    const avgSessionTime = summary.dailySummaries.reduce((sum, day) => 
      sum + (day.averageFocusSession || 0), 0
    ) / summary.dailySummaries.length;
    
    if (avgSessionTime > 45) {
      results.push('💪 Good average session length');
    } else if (avgSessionTime > 0) {
      results.push('⏱️ Consider longer focus sessions');
    }
    
    return results;
  }, [summary, focusGoalMinutes]);
  
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-gray-700">Weekly Insights</h4>
      
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <div key={index} className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * WeeklySummary component for displaying comprehensive weekly statistics
 */
export function WeeklySummary({ 
  summary, 
  focusGoalMinutes, 
  showDetails = false 
}: WeeklySummaryProps) {
  
  // === COMPUTED VALUES ===
  
  const weekRange = getWeekRange(summary.weekStart, summary.weekEnd);
  const weeklyFocusGoal = focusGoalMinutes * 7;
  const goalProgress = Math.min(100, (summary.totalFocusTime / weeklyFocusGoal) * 100);
  const productivityLevel = getProductivityLevel(summary.weeklyProductivityScore);
  
  const totalBreakTime = summary.dailySummaries.reduce((sum, day) => sum + day.breakTime, 0);
  const totalEntertainmentTime = summary.dailySummaries.reduce((sum, day) => sum + day.entertainmentTime, 0);
  const totalActiveTime = summary.dailySummaries.reduce((sum, day) => sum + day.activeTime, 0);
  
  // === RENDER ===
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Summary
          </CardTitle>
          <Badge variant="outline" className="text-sm">
            {weekRange}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Focus</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {formatDuration(summary.totalFocusTime)}
            </div>
            <div className="text-xs text-green-600">
              {formatDuration(Math.round(summary.averageDailyFocus))} avg/day
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Goal Progress</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {Math.round(goalProgress)}%
            </div>
            <div className="text-xs text-blue-600">
              {summary.daysMetGoal}/{summary.dailySummaries.length} days achieved
            </div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Productivity</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {summary.weeklyProductivityScore}
            </div>
            <div className="text-xs text-purple-600 capitalize">
              {productivityLevel} level
            </div>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Best Day</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              {DAY_NAMES[summary.mostProductiveDay.date.getDay()]}
            </div>
            <div className="text-xs text-orange-600">
              {summary.mostProductiveDay.productivityScore} score
            </div>
          </div>
        </div>
        
        {/* Weekly goal progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-gray-700">Weekly Focus Goal</h4>
            <span className="text-sm text-gray-600">
              {formatDuration(summary.totalFocusTime)} / {formatDuration(weeklyFocusGoal)}
            </span>
          </div>
          <Progress value={goalProgress} className="h-3" />
        </div>
        
        {/* Activity breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Focus Time</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {formatDuration(summary.totalFocusTime)}
            </div>
            <div className="text-xs text-gray-500">
              {Math.round((summary.totalFocusTime / totalActiveTime) * 100)}% of active time
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Coffee className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Break Time</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {formatDuration(totalBreakTime)}
            </div>
            <div className="text-xs text-gray-500">
              {Math.round((totalBreakTime / totalActiveTime) * 100)}% of active time
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Play className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Entertainment</span>
            </div>
            <div className="text-lg font-bold text-orange-900">
              {formatDuration(totalEntertainmentTime)}
            </div>
            <div className="text-xs text-gray-500">
              {Math.round((totalEntertainmentTime / totalActiveTime) * 100)}% of active time
            </div>
          </div>
        </div>
        
        {/* Daily breakdown */}
        {showDetails && (
          <DailyBreakdown 
            dailySummaries={summary.dailySummaries} 
            focusGoalMinutes={focusGoalMinutes}
          />
        )}
        
        {/* Weekly insights */}
        <WeeklyInsights 
          summary={summary} 
          focusGoalMinutes={focusGoalMinutes}
        />
      </CardContent>
    </Card>
  );
} 
