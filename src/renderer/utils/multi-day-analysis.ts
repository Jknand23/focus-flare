/**
 * Multi-Day Analysis Utilities - Pattern recognition and analytics for FocusFlare
 * 
 * Contains utility functions for analyzing activity patterns across multiple days,
 * calculating focus streaks, generating summary statistics, and performing
 * comparative analysis. Supports Phase 3 enhancement features for advanced
 * timeline visualization and productivity insights.
 * 
 * @module MultiDayAnalysis
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type {
  SessionData,
  SessionType,
  MultiDayTimelineData,
  RecurringPattern,
  FocusStreak,
  DailySummary,
  WeeklySummary,
  ComparativeAnalysis,
  AnalysisTimeRange
} from '@/shared/types/activity-types';

// === CONSTANTS ===

/** Focus session types that count toward focus goals */
const FOCUS_SESSION_TYPES: SessionType[] = ['focused-work', 'research'];

/** Minimum frequency threshold for pattern recognition */
const MIN_PATTERN_FREQUENCY = 0.3;

/** Minimum occurrences for a pattern to be considered */
const MIN_PATTERN_OCCURRENCES = 2;

// === UTILITY FUNCTIONS ===

/**
 * Converts duration from milliseconds to minutes
 * 
 * @param ms - Duration in milliseconds
 * @returns Duration in minutes
 */
function msToMinutes(ms: number): number {
  return Math.round(ms / (1000 * 60));
}

/**
 * Gets the start of week (Monday) for a given date
 * 
 * @param date - Input date
 * @returns Start of week date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

/**
 * Gets the end of week (Sunday) for a given date
 * 
 * @param date - Input date
 * @returns End of week date
 */
function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

/**
 * Checks if two dates are the same day
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// === MULTI-DAY TIMELINE FUNCTIONS ===

/**
 * Processes session data for multi-day timeline visualization
 * 
 * @param sessions - Array of session data
 * @param dateRange - Date range to analyze
 * @param focusGoalMinutes - Daily focus goal in minutes
 * @returns Array of multi-day timeline data
 */
export function processMultiDayTimelineData(
  sessions: SessionData[],
  dateRange: AnalysisTimeRange,
  focusGoalMinutes: number
): MultiDayTimelineData[] {
  const result: MultiDayTimelineData[] = [];
  const current = new Date(dateRange.startDate);
  
  while (current <= dateRange.endDate) {
    const dayDate = new Date(current);
    const daySessions = sessions.filter(session => 
      isSameDay(new Date(session.startTime), dayDate)
    );
    
    const totalFocusTime = daySessions
      .filter(session => FOCUS_SESSION_TYPES.includes(session.sessionType))
      .reduce((sum, session) => sum + msToMinutes(session.duration), 0);
    
    const totalActiveTime = daySessions
      .reduce((sum, session) => sum + msToMinutes(session.duration), 0);
    
    result.push({
      date: new Date(dayDate),
      sessions: daySessions,
      totalFocusTime,
      totalActiveTime,
      metFocusGoal: totalFocusTime >= focusGoalMinutes,
      dayOfWeek: dayDate.getDay()
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return result;
}

// === PATTERN RECOGNITION FUNCTIONS ===

/**
 * Analyzes sessions to identify recurring patterns
 * 
 * @param sessions - Array of session data
 * @param dateRange - Date range to analyze
 * @returns Array of recurring patterns found
 */
export function identifyRecurringPatterns(
  sessions: SessionData[],
  dateRange: AnalysisTimeRange
): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];
  const sessionTypes = Array.from(new Set(sessions.map(s => s.sessionType)));
  
  for (const sessionType of sessionTypes) {
    const typeSessions = sessions.filter(s => s.sessionType === sessionType);
    const pattern = analyzeSessionTypePattern(typeSessions, dateRange);
    
    if (pattern && pattern.frequency >= MIN_PATTERN_FREQUENCY && 
        pattern.occurrences >= MIN_PATTERN_OCCURRENCES) {
      patterns.push(pattern);
    }
  }
  
  return patterns.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Analyzes pattern for a specific session type
 * 
 * @param sessions - Sessions of the same type
 * @param dateRange - Date range to analyze
 * @returns Pattern analysis result
 */
function analyzeSessionTypePattern(
  sessions: SessionData[],
  dateRange: AnalysisTimeRange
): RecurringPattern | null {
  if (sessions.length < MIN_PATTERN_OCCURRENCES) {
    return null;
  }
  
  const sessionType = sessions[0].sessionType;
  const dayOccurrences = new Map<number, number>();
  const hourOccurrences: number[] = [];
  let totalDuration = 0;
  
  sessions.forEach(session => {
    const startTime = new Date(session.startTime);
    const dayOfWeek = startTime.getDay();
    const hour = startTime.getHours();
    
    dayOccurrences.set(dayOfWeek, (dayOccurrences.get(dayOfWeek) || 0) + 1);
    hourOccurrences.push(hour);
    totalDuration += session.duration;
  });
  
  // Calculate most common days
  const totalDaysInRange = Math.ceil(
    (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weeksInRange = Math.ceil(totalDaysInRange / 7);
  
  const commonDays = Array.from(dayOccurrences.entries())
    .filter(([_, count]) => count >= Math.max(1, weeksInRange * 0.3))
    .map(([day, _]) => day)
    .sort((a, b) => a - b);
  
  if (commonDays.length === 0) {
    return null;
  }
  
  // Calculate time range
  const minHour = Math.min(...hourOccurrences);
  const maxHour = Math.max(...hourOccurrences);
  
  // Calculate frequency score
  const maxPossibleOccurrences = commonDays.length * weeksInRange;
  const frequency = Math.min(1, sessions.length / maxPossibleOccurrences);
  
  return {
    sessionType,
    timeRange: {
      startHour: minHour,
      endHour: maxHour
    },
    daysOfWeek: commonDays,
    frequency,
    averageDuration: msToMinutes(totalDuration / sessions.length),
    occurrences: sessions.length
  };
}

// === FOCUS STREAK FUNCTIONS ===

/**
 * Calculates current focus streak information
 * 
 * @param multiDayData - Multi-day timeline data
 * @param focusGoalMinutes - Daily focus goal in minutes
 * @returns Focus streak information
 */
export function calculateFocusStreak(
  multiDayData: MultiDayTimelineData[],
  focusGoalMinutes: number
): FocusStreak {
  const sortedData = [...multiDayData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastStreakDate: Date | null = null;
  let todayCount = false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const dayData of sortedData) {
    const dayDate = new Date(dayData.date);
    dayDate.setHours(0, 0, 0, 0);
    
    if (dayData.metFocusGoal) {
      tempStreak++;
      lastStreakDate = new Date(dayData.date);
      
      if (isSameDay(dayDate, today)) {
        todayCount = true;
      }
    } else {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 0;
    }
  }
  
  // Handle case where streak continues to the end
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }
  
  // Calculate current streak (from end of data backwards)
  for (let i = sortedData.length - 1; i >= 0; i--) {
    if (sortedData[i].metFocusGoal) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  return {
    currentStreak,
    longestStreak,
    lastStreakDate,
    todayCount,
    focusGoalMinutes
  };
}

// === SUMMARY FUNCTIONS ===

/**
 * Generates daily summary statistics
 * 
 * @param sessions - Sessions for the day
 * @param date - Date for the summary
 * @param focusGoalMinutes - Daily focus goal in minutes
 * @returns Daily summary
 */
export function generateDailySummary(
  sessions: SessionData[],
  date: Date,
  focusGoalMinutes: number
): DailySummary {
  const focusSessions = sessions.filter(s => FOCUS_SESSION_TYPES.includes(s.sessionType));
  const breakSessions = sessions.filter(s => s.sessionType === 'break');
  const entertainmentSessions = sessions.filter(s => s.sessionType === 'entertainment');
  
  const focusTime = focusSessions.reduce((sum, s) => sum + msToMinutes(s.duration), 0);
  const activeTime = sessions.reduce((sum, s) => sum + msToMinutes(s.duration), 0);
  const breakTime = breakSessions.reduce((sum, s) => sum + msToMinutes(s.duration), 0);
  const entertainmentTime = entertainmentSessions.reduce((sum, s) => sum + msToMinutes(s.duration), 0);
  
  const averageFocusSession = focusSessions.length > 0 ? 
    focusTime / focusSessions.length : 0;
  
  const longestFocusSession = focusSessions.length > 0 ? 
    Math.max(...focusSessions.map(s => msToMinutes(s.duration))) : 0;
  
  const metFocusGoal = focusTime >= focusGoalMinutes;
  
  // Calculate productivity score (0-100)
  const goalRatio = Math.min(1, focusTime / focusGoalMinutes);
  const entertainmentPenalty = Math.min(0.3, entertainmentTime / (activeTime || 1));
  const productivityScore = Math.round((goalRatio * 100) * (1 - entertainmentPenalty));
  
  return {
    date: new Date(date),
    focusTime,
    activeTime,
    breakTime,
    entertainmentTime,
    focusSessionCount: focusSessions.length,
    averageFocusSession,
    longestFocusSession,
    metFocusGoal,
    productivityScore
  };
}

/**
 * Generates weekly summary statistics
 * 
 * @param dailySummaries - Daily summaries for the week
 * @param weekStart - Start of the week
 * @returns Weekly summary
 */
export function generateWeeklySummary(
  dailySummaries: DailySummary[],
  weekStart: Date
): WeeklySummary {
  const weekEnd = getWeekEnd(weekStart);
  const totalFocusTime = dailySummaries.reduce((sum, d) => sum + d.focusTime, 0);
  const averageDailyFocus = dailySummaries.length > 0 ? totalFocusTime / dailySummaries.length : 0;
  const daysMetGoal = dailySummaries.filter(d => d.metFocusGoal).length;
  
  const weeklyProductivityScore = dailySummaries.length > 0 ? 
    Math.round(dailySummaries.reduce((sum, d) => sum + d.productivityScore, 0) / dailySummaries.length) : 0;
  
  const mostProductiveDay = dailySummaries.reduce((max, d) => 
    d.productivityScore > max.productivityScore ? d : max, dailySummaries[0]);
  
  const leastProductiveDay = dailySummaries.reduce((min, d) => 
    d.productivityScore < min.productivityScore ? d : min, dailySummaries[0]);
  
  return {
    weekStart: new Date(weekStart),
    weekEnd,
    dailySummaries,
    totalFocusTime,
    averageDailyFocus,
    daysMetGoal,
    weeklyProductivityScore,
    mostProductiveDay,
    leastProductiveDay
  };
}

// === COMPARATIVE ANALYSIS FUNCTIONS ===

/**
 * Performs comparative analysis between two weekly periods
 * 
 * @param currentWeek - Current week summary
 * @param previousWeek - Previous week summary
 * @returns Comparative analysis result
 */
export function performComparativeAnalysis(
  currentWeek: WeeklySummary,
  previousWeek: WeeklySummary
): ComparativeAnalysis {
  const focusTimeChange = currentWeek.totalFocusTime - previousWeek.totalFocusTime;
  const focusTimeChangePercent = previousWeek.totalFocusTime > 0 ? 
    (focusTimeChange / previousWeek.totalFocusTime) * 100 : 0;
  
  const goalAchievementChange = currentWeek.daysMetGoal - previousWeek.daysMetGoal;
  const productivityScoreChange = currentWeek.weeklyProductivityScore - previousWeek.weeklyProductivityScore;
  
  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (focusTimeChangePercent > 5) {
    trendDirection = 'improving';
  } else if (focusTimeChangePercent < -5) {
    trendDirection = 'declining';
  }
  
  const insights: string[] = [];
  
  if (focusTimeChange > 0) {
    insights.push(`Focus time increased by ${Math.round(focusTimeChange)} minutes`);
  } else if (focusTimeChange < 0) {
    insights.push(`Focus time decreased by ${Math.round(Math.abs(focusTimeChange))} minutes`);
  }
  
  if (goalAchievementChange > 0) {
    insights.push(`Met focus goal on ${goalAchievementChange} more days`);
  } else if (goalAchievementChange < 0) {
    insights.push(`Met focus goal on ${Math.abs(goalAchievementChange)} fewer days`);
  }
  
  if (productivityScoreChange > 0) {
    insights.push(`Productivity score improved by ${productivityScoreChange} points`);
  } else if (productivityScoreChange < 0) {
    insights.push(`Productivity score decreased by ${Math.abs(productivityScoreChange)} points`);
  }
  
  return {
    currentPeriod: currentWeek,
    previousPeriod: previousWeek,
    focusTimeChange,
    focusTimeChangePercent,
    goalAchievementChange,
    productivityScoreChange,
    trendDirection,
    insights
  };
}

// === EXPORT FUNCTIONS ===

export {
  msToMinutes,
  getWeekStart,
  getWeekEnd,
  isSameDay,
  FOCUS_SESSION_TYPES
}; 