/**
 * ComparativeAnalysis - Week-to-week productivity comparison and trend analysis
 * 
 * Displays comparative analysis between current and previous periods showing
 * productivity trends, focus time changes, goal achievement differences, and
 * actionable insights. Provides data-driven recommendations for productivity
 * improvement. Part of Phase 3 enhancement features for advanced analytics.
 * 
 * @module ComparativeAnalysis
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { useMemo } from 'react';
import type { ComparativeAnalysis as ComparativeAnalysisType } from '@/shared/types/activity-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
// import { Progress } from '@/renderer/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowRight,
  Calendar,
  Clock,
  Target,
  BarChart3,
  Lightbulb,
  Award,
  AlertTriangle
} from 'lucide-react';

// === COMPONENT TYPES ===

/**
 * Props interface for ComparativeAnalysis component
 */
interface ComparativeAnalysisProps {
  /** Comparative analysis data */
  analysis: ComparativeAnalysisType;
  /** Whether to show detailed insights */
  showInsights?: boolean;
}

// === CONSTANTS ===

/** Trend colors and icons */
const TREND_CONFIG = {
  improving: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: TrendingUp,
    label: 'Improving'
  },
  declining: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: TrendingDown,
    label: 'Declining'
  },
  stable: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: Minus,
    label: 'Stable'
  }
};

// === HELPER FUNCTIONS ===

/**
 * Formats duration in minutes to readable format
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
 * Formats percentage change with appropriate sign
 */
function formatPercentageChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
}

/**
 * Gets the date range string for a week
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

/**
 * Gets significance level of a change
 */
function getChangeSignificance(percentChange: number): 'major' | 'moderate' | 'minor' {
  const absChange = Math.abs(percentChange);
  if (absChange >= 25) return 'major';
  if (absChange >= 10) return 'moderate';
  return 'minor';
}

// === METRIC COMPARISON COMPONENT ===

/**
 * Individual metric comparison component
 */
interface MetricComparisonProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  unit: 'minutes' | 'number' | 'percentage';
  invertColors?: boolean;
}

function MetricComparison({
  title,
  icon: Icon,
  currentValue,
  previousValue,
  change,
  changePercent,
  unit,
  invertColors = false
}: MetricComparisonProps) {
  const isPositive = change > 0;
  const isImprovement = invertColors ? !isPositive : isPositive;
  
  const formatValue = (value: number) => {
    switch (unit) {
      case 'minutes':
        return formatDuration(value);
      case 'percentage':
        return `${Math.round(value)}%`;
      default:
        return value.toString();
    }
  };
  
  const TrendIcon = isPositive ? TrendingUp : (change < 0 ? TrendingDown : Minus);
  const trendColor = isImprovement ? 'text-green-600' : (change < 0 ? 'text-red-600' : 'text-gray-600');
  const bgColor = isImprovement ? 'bg-green-50' : (change < 0 ? 'bg-red-50' : 'bg-gray-50');
  
  return (
    <div className={`p-4 rounded-lg border ${bgColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            {formatValue(currentValue)}
          </span>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {formatPercentageChange(changePercent)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Previous: {formatValue(previousValue)}</span>
          <ArrowRight className="h-3 w-3" />
          <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}>
            {change > 0 ? '+' : ''}{unit === 'minutes' ? formatDuration(Math.abs(change)) : Math.abs(change)}
          </span>
        </div>
      </div>
    </div>
  );
}

// === INSIGHTS COMPONENT ===

/**
 * Insights and recommendations component
 */
interface InsightsProps {
  analysis: ComparativeAnalysisType;
}

function Insights({ analysis }: InsightsProps) {
  const additionalInsights = useMemo(() => {
    const insights: Array<{ type: 'positive' | 'negative' | 'neutral'; message: string }> = [];
    
    // Focus time insights
    const focusChange = analysis.focusTimeChangePercent;
    if (focusChange > 15) {
      insights.push({
        type: 'positive',
        message: 'Excellent improvement in focus time! Your momentum is building.'
      });
    } else if (focusChange < -15) {
      insights.push({
        type: 'negative',
        message: 'Focus time decreased significantly. Consider reviewing your schedule.'
      });
    }
    
    // Goal achievement insights
    const goalChange = analysis.goalAchievementChange;
    if (goalChange > 2) {
      insights.push({
        type: 'positive',
        message: 'Great consistency improvement! You\'re hitting your goals more often.'
      });
    } else if (goalChange < -2) {
      insights.push({
        type: 'negative',
        message: 'Goal achievement consistency needs attention. Try breaking goals into smaller chunks.'
      });
    }
    
    // Productivity score insights
    const productivityChange = analysis.productivityScoreChange;
    if (productivityChange > 10) {
      insights.push({
        type: 'positive',
        message: 'Productivity score is trending upward. Keep up the excellent work!'
      });
    } else if (productivityChange < -10) {
      insights.push({
        type: 'negative',
        message: 'Productivity score declined. Consider analyzing what changed in your routine.'
      });
    }
    
    // Comparative insights
    const currentWeek = analysis.currentPeriod;
    const previousWeek = analysis.previousPeriod;
    
    if (currentWeek.mostProductiveDay.productivityScore > previousWeek.mostProductiveDay.productivityScore) {
      insights.push({
        type: 'positive',
        message: 'Your best day this week was even better than last week!'
      });
    }
    
    if (currentWeek.averageDailyFocus > previousWeek.averageDailyFocus * 1.2) {
      insights.push({
        type: 'positive',
        message: 'Daily focus average increased by more than 20%. Fantastic progress!'
      });
    }
    
    return insights;
  }, [analysis]);
  
  const allInsights = [...analysis.insights.map(i => ({ type: 'neutral' as const, message: i })), ...additionalInsights];
  
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
        <Lightbulb className="h-4 w-4" />
        Insights & Recommendations
      </h4>
      
      <div className="space-y-2">
        {allInsights.map((insight, index) => {
          const bgColor = insight.type === 'positive' ? 'bg-green-50' : 
                         insight.type === 'negative' ? 'bg-red-50' : 'bg-blue-50';
          const textColor = insight.type === 'positive' ? 'text-green-800' : 
                           insight.type === 'negative' ? 'text-red-800' : 'text-blue-800';
          const icon = insight.type === 'positive' ? Award : 
                      insight.type === 'negative' ? AlertTriangle : Lightbulb;
          const IconComponent = icon;
          
          return (
            <div key={index} className={`p-3 rounded-lg ${bgColor}`}>
              <div className="flex items-start gap-2">
                <IconComponent className={`h-4 w-4 mt-0.5 ${textColor.replace('800', '600')}`} />
                <p className={`text-sm ${textColor}`}>{insight.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * ComparativeAnalysis component for displaying week-to-week comparison
 */
export function ComparativeAnalysis({ 
  analysis, 
  showInsights = true 
}: ComparativeAnalysisProps) {
  
  // === COMPUTED VALUES ===
  
  const trendConfig = TREND_CONFIG[analysis.trendDirection];
  const TrendIcon = trendConfig.icon;
  
  const currentWeek = analysis.currentPeriod;
  const previousWeek = analysis.previousPeriod;
  
  const currentRange = getWeekRange(currentWeek.weekStart, currentWeek.weekEnd);
  const previousRange = getWeekRange(previousWeek.weekStart, previousWeek.weekEnd);
  
  const focusChangeSignificance = getChangeSignificance(analysis.focusTimeChangePercent);
  
  // === RENDER ===
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Week Comparison
          </CardTitle>
          
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1 ${trendConfig.color} ${trendConfig.borderColor}`}
          >
            <TrendIcon className="h-3 w-3" />
            {trendConfig.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">Current:</span>
            <span>{currentRange}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Previous:</span>
            <span>{previousRange}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Trend overview */}
        <div className={`p-4 rounded-lg border ${trendConfig.bgColor} ${trendConfig.borderColor}`}>
          <div className="flex items-center gap-3 mb-3">
            <TrendIcon className={`h-6 w-6 ${trendConfig.color}`} />
            <div>
              <h3 className={`font-medium ${trendConfig.color}`}>
                Overall Trend: {trendConfig.label}
              </h3>
              <p className="text-sm text-gray-600">
                {analysis.trendDirection === 'improving' && 'Your productivity is on an upward trajectory'}
                {analysis.trendDirection === 'declining' && 'Your productivity needs some attention'}
                {analysis.trendDirection === 'stable' && 'Your productivity is maintaining a steady level'}
              </p>
            </div>
          </div>
          
          {focusChangeSignificance === 'major' && (
            <Badge variant="secondary" className="text-xs">
              {Math.abs(analysis.focusTimeChangePercent) >= 25 ? 'Major Change' : 'Significant Change'}
            </Badge>
          )}
        </div>
        
        {/* Key metrics comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricComparison
            title="Focus Time"
            icon={Clock}
            currentValue={currentWeek.totalFocusTime}
            previousValue={previousWeek.totalFocusTime}
            change={analysis.focusTimeChange}
            changePercent={analysis.focusTimeChangePercent}
            unit="minutes"
          />
          
          <MetricComparison
            title="Goal Achievement"
            icon={Target}
            currentValue={currentWeek.daysMetGoal}
            previousValue={previousWeek.daysMetGoal}
            change={analysis.goalAchievementChange}
            changePercent={previousWeek.daysMetGoal > 0 ? (analysis.goalAchievementChange / previousWeek.daysMetGoal) * 100 : 0}
            unit="number"
          />
          
          <MetricComparison
            title="Productivity Score"
            icon={BarChart3}
            currentValue={currentWeek.weeklyProductivityScore}
            previousValue={previousWeek.weeklyProductivityScore}
            change={analysis.productivityScoreChange}
            changePercent={previousWeek.weeklyProductivityScore > 0 ? (analysis.productivityScoreChange / previousWeek.weeklyProductivityScore) * 100 : 0}
            unit="number"
          />
          
          <MetricComparison
            title="Avg Daily Focus"
            icon={Calendar}
            currentValue={currentWeek.averageDailyFocus}
            previousValue={previousWeek.averageDailyFocus}
            change={currentWeek.averageDailyFocus - previousWeek.averageDailyFocus}
            changePercent={previousWeek.averageDailyFocus > 0 ? ((currentWeek.averageDailyFocus - previousWeek.averageDailyFocus) / previousWeek.averageDailyFocus) * 100 : 0}
            unit="minutes"
          />
        </div>
        
        {/* Detailed comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Current Week Highlights</h4>
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">Best Day</div>
                <div className="text-xs text-blue-600">
                  {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(currentWeek.mostProductiveDay.date)} - 
                  Score: {currentWeek.mostProductiveDay.productivityScore}
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">Total Focus</div>
                <div className="text-xs text-green-600">
                  {formatDuration(currentWeek.totalFocusTime)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Previous Week Reference</h4>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">Best Day</div>
                <div className="text-xs text-gray-600">
                  {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(previousWeek.mostProductiveDay.date)} - 
                  Score: {previousWeek.mostProductiveDay.productivityScore}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">Total Focus</div>
                <div className="text-xs text-gray-600">
                  {formatDuration(previousWeek.totalFocusTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Insights section */}
        {showInsights && <Insights analysis={analysis} />}
      </CardContent>
    </Card>
  );
} 