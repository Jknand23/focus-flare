/**
 * MultiDayTimeline - Advanced timeline visualization for multi-day activity analysis
 * 
 * Displays a vertical stack of daily timelines showing activity sessions across
 * multiple days. Features pattern recognition highlighting, focus streak indicators,
 * and comparative analysis between days. Core component for Phase 3 enhancement
 * features providing comprehensive productivity insights.
 * 
 * @module MultiDayTimeline
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { TimelineChart } from './TimelineChart';
import type { 
  SessionData, 
  MultiDayTimelineData, 
  RecurringPattern,
  AnalysisTimeRange,
  SessionType
} from '@/shared/types/activity-types';
import { useMultiDayStore, usePatternData, useStreakData } from '@/renderer/stores/multi-day-store';
import { useSessionStore } from '@/renderer/stores/session-store';
import { useSettingsStore } from '@/renderer/stores/settings-store';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Target, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

// === COMPONENT TYPES ===

/**
 * Props interface for MultiDayTimeline component
 */
interface MultiDayTimelineProps {
  /** Custom height for each daily timeline */
  timelineHeight?: number;
  /** Custom session colors */
  sessionColors?: Record<SessionType, string>;
  /** Callback fired when user clicks on a session */
  onSessionClick?: (session: SessionData) => void;
  /** Whether to show focus streak information */
  showStreak?: boolean;
  /** Whether to show patterns by default */
  showPatterns?: boolean;
}

// === CONSTANTS ===

/** Default colors for session types */
const DEFAULT_SESSION_COLORS: Record<SessionType, string> = {
  'focused-work': '#22c55e',
  'research': '#3b82f6',
  'entertainment': '#f59e0b',
  'break': '#8b5cf6',
  'unclear': '#6b7280'
};

/** Pattern highlight colors */
const PATTERN_COLORS = {
  'focused-work': 'rgba(34, 197, 94, 0.2)',
  'research': 'rgba(59, 130, 246, 0.2)',
  'entertainment': 'rgba(245, 158, 11, 0.2)',
  'break': 'rgba(139, 92, 246, 0.2)',
  'unclear': 'rgba(107, 114, 128, 0.2)'
};

/** Day of week names */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// === HELPER FUNCTIONS ===

/**
 * Formats a date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Gets the pattern background color for a day
 */
function _getPatternHighlight(
  dayData: MultiDayTimelineData,
  patterns: RecurringPattern[]
): string | null {
  const dayOfWeek = dayData.date.getDay();
  const dayHour = dayData.date.getHours();
  
  for (const pattern of patterns) {
    if (pattern.daysOfWeek.includes(dayOfWeek) && 
        dayHour >= pattern.timeRange.startHour && 
        dayHour <= pattern.timeRange.endHour) {
      return PATTERN_COLORS[pattern.sessionType];
    }
  }
  
  return null;
}

// === PATTERN OVERLAY COMPONENT ===

/**
 * Pattern overlay component for highlighting recurring patterns
 */
interface PatternOverlayProps {
  patterns: RecurringPattern[];
  dayData: MultiDayTimelineData;
  width: number;
  height: number;
}

function PatternOverlay({ patterns, dayData, width: _width, height: _height }: PatternOverlayProps) {
  const dayOfWeek = dayData.date.getDay();
  const relevantPatterns = patterns.filter(p => p.daysOfWeek.includes(dayOfWeek));
  
  if (relevantPatterns.length === 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {relevantPatterns.map((pattern, index) => {
        const startPercent = (pattern.timeRange.startHour / 24) * 100;
        const endPercent = (pattern.timeRange.endHour / 24) * 100;
        const widthPercent = endPercent - startPercent;
        
        return (
          <div
            key={index}
            className="absolute top-0 h-full rounded opacity-30"
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
              backgroundColor: PATTERN_COLORS[pattern.sessionType]
            }}
          />
        );
      })}
    </div>
  );
}

// === FOCUS STREAK COMPONENT ===

/**
 * Focus streak display component
 */
interface FocusStreakProps {
  dayData: MultiDayTimelineData;
  streakData: any;
}

function FocusStreakIndicator({ dayData, streakData: _streakData }: FocusStreakProps) {
  const isStreakDay = dayData.metFocusGoal;
  const isToday = new Date().toDateString() === dayData.date.toDateString();
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-3 h-3 rounded-full ${
        isStreakDay ? 'bg-green-500' : 'bg-gray-300'
      }`} />
      <span className={`${isStreakDay ? 'text-green-600' : 'text-gray-500'}`}>
        {isStreakDay ? '✓' : '○'}
      </span>
      {isToday && (
        <Badge variant="secondary" className="ml-auto">
          Today
        </Badge>
      )}
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * MultiDayTimeline component for displaying multi-day activity analysis
 */
export function MultiDayTimeline({
  timelineHeight = 60,
  sessionColors = DEFAULT_SESSION_COLORS,
  onSessionClick,
  showStreak = true,
  showPatterns = true
}: MultiDayTimelineProps) {
  // === STATE ===
  const [selectedDateRange, setSelectedDateRange] = useState<AnalysisTimeRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    return {
      startDate,
      endDate,
      type: 'week'
    };
  });
  
  // === STORE CONNECTIONS ===
  const multiDayStore = useMultiDayStore();
  const sessionStore = useSessionStore();
  const settingsStore = useSettingsStore();
  
  const multiDayData = multiDayStore.multiDayData;
  const patterns = usePatternData();
  const streakData = useStreakData();
  const { loadingState, error, lastAnalyzed } = multiDayStore;
  const focusGoalMinutes = settingsStore.settings.focusSessionGoalMinutes;
  
  // === EFFECTS ===
  
  /**
   * Load and analyze data when component mounts or range changes
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch sessions for the selected date range
        await sessionStore.fetchSessionsByDateRange(
          selectedDateRange.startDate,
          selectedDateRange.endDate
        );
        
        // Analyze multi-day data
        await multiDayStore.analyzeMultiDayData(
          sessionStore.sessions,
          selectedDateRange,
          focusGoalMinutes
        );
      } catch (error) {
        console.error('Failed to load multi-day data:', error);
      }
    };
    
    loadData();
  }, [selectedDateRange, focusGoalMinutes]);
  
  // === HANDLERS ===
  
  /**
   * Handles date range navigation
   */
  const handleDateRangeChange = (direction: 'prev' | 'next') => {
    const days = 7; // Week navigation
    const newStartDate = new Date(selectedDateRange.startDate);
    const newEndDate = new Date(selectedDateRange.endDate);
    
    if (direction === 'prev') {
      newStartDate.setDate(newStartDate.getDate() - days);
      newEndDate.setDate(newEndDate.getDate() - days);
    } else {
      newStartDate.setDate(newStartDate.getDate() + days);
      newEndDate.setDate(newEndDate.getDate() + days);
    }
    
    setSelectedDateRange({
      startDate: newStartDate,
      endDate: newEndDate,
      type: 'week'
    });
  };
  
  /**
   * Handles session click
   */
  const handleSessionClick = (session: SessionData) => {
    if (onSessionClick) {
      onSessionClick(session);
    }
  };
  
  // === COMPUTED VALUES ===
  
  const sortedMultiDayData = useMemo(() => {
    return [...multiDayData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [multiDayData]);
  
  const totalFocusTime = useMemo(() => {
    return multiDayData.reduce((sum, day) => sum + day.totalFocusTime, 0);
  }, [multiDayData]);
  
  const daysWithGoal = useMemo(() => {
    return multiDayData.filter(day => day.metFocusGoal).length;
  }, [multiDayData]);
  
  // === RENDER ===
  
  if (loadingState === 'loading') {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Analyzing multi-day data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Failed to load multi-day analysis</p>
            <p className="text-sm mt-1">{error.message}</p>
            <Button 
              onClick={() => multiDayStore.clearError()} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="w-full space-y-6">
      {/* Header with navigation and summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Multi-Day Timeline
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeChange('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {formatDate(selectedDateRange.startDate)} - {formatDate(selectedDateRange.endDate)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeChange('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => multiDayStore.togglePatterns()}
                className="flex items-center gap-2"
              >
                {showPatterns ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Patterns
              </Button>
              
              {lastAnalyzed && (
                <span className="text-xs text-gray-500">
                  Updated {formatDistanceToNow(lastAnalyzed, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Focus Time:</span>
              <span className="text-sm">{Math.round(totalFocusTime / 60)}h {totalFocusTime % 60}m</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Goal Days:</span>
              <span className="text-sm">{daysWithGoal}/{multiDayData.length}</span>
            </div>
            
            {showStreak && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full" />
                <span className="text-sm font-medium">Current Streak:</span>
                <span className="text-sm">{streakData.currentStreak} days</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Timeline stack */}
      <div className="space-y-4">
        {sortedMultiDayData.map((dayData, _index) => {
          const dayPatterns = patterns.filter(p => 
            p.daysOfWeek.includes(dayData.date.getDay())
          );
          
          return (
            <Card key={dayData.date.toISOString()} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-lg">
                      {formatDate(dayData.date)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {dayData.sessions.length} sessions • {Math.round(dayData.totalFocusTime / 60)}h {dayData.totalFocusTime % 60}m focus
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {showStreak && (
                      <FocusStreakIndicator 
                        dayData={dayData} 
                        streakData={streakData}
                      />
                    )}
                    
                    {dayPatterns.length > 0 && showPatterns && (
                      <Badge variant="secondary" className="text-xs">
                        {dayPatterns.length} patterns
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="relative">
                  {/* Pattern overlay */}
                  {showPatterns && (
                    <PatternOverlay
                      patterns={dayPatterns}
                      dayData={dayData}
                      width={800}
                      height={timelineHeight}
                    />
                  )}
                  
                  {/* Timeline chart */}
                  <TimelineChart
                    date={dayData.date}
                    sessions={dayData.sessions}
                    height={timelineHeight}
                    sessionColors={sessionColors}
                    onSessionClick={handleSessionClick}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Pattern legend */}
      {showPatterns && patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recurring Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patterns.map((pattern, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: PATTERN_COLORS[pattern.sessionType] }}
                  />
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {pattern.sessionType.replace('-', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {pattern.timeRange.startHour}:00 - {pattern.timeRange.endHour}:00 on{' '}
                      {pattern.daysOfWeek.map(day => DAY_NAMES[day]).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {Math.round(pattern.frequency * 100)}% consistent
                    </div>
                    <div className="text-xs text-gray-500">
                      {pattern.occurrences} occurrences
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
