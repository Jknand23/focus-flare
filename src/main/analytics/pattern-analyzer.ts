/**
 * Pattern Analysis Engine - Advanced pattern recognition and analytics for FocusFlare
 * 
 * Core pattern recognition engine that analyzes user activity data to identify:
 * - Peak focus hours and optimal session lengths
 * - Distraction patterns and triggers
 * - Productivity trends and forecasting
 * - Personalized insights and recommendations
 * 
 * This engine processes historical session data to provide actionable insights
 * for improving focus and productivity patterns.
 * 
 * @module PatternAnalyzer
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type { 
  SessionData, 
  SessionType, 
  AnalysisTimeRange 
} from '@/shared/types/activity-types';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';
import { getSessionsByDate } from '@/main/database/connection';

// === PATTERN ANALYSIS TYPES ===

/**
 * Focus pattern detection result
 */
export interface FocusPattern {
  /** Pattern type */
  type: 'peak_hours' | 'optimal_session_length' | 'distraction_trigger' | 'productivity_rhythm';
  /** Pattern data specific to type */
  data: {
    /** Peak focus hours (0-23) */
    peakHours?: number[];
    /** Optimal session duration in minutes */
    optimalDuration?: number;
    /** Apps that commonly trigger distractions */
    triggerApps?: string[];
    /** Weekly productivity rhythm */
    weeklyPattern?: number[];
  };
  /** Confidence score (0-1) */
  confidence: number;
  /** Frequency of occurrence */
  frequency: number;
  /** Sample size used for analysis */
  sampleSize: number;
  /** When pattern was identified */
  identifiedAt: Date;
}

/**
 * Distraction pattern analysis result
 */
export interface DistractionPattern {
  /** Distraction trigger (app or activity) */
  trigger: string;
  /** Average distraction duration in minutes */
  averageDuration: number;
  /** Frequency of distraction per day */
  frequencyPerDay: number;
  /** Time of day when distraction commonly occurs */
  commonTimeRanges: Array<{ start: number; end: number }>;
  /** Context when distraction occurs */
  context: {
    /** Previous activity before distraction */
    previousActivity: string;
    /** Session type when distraction occurs */
    sessionType: SessionType;
    /** Duration of focus before distraction */
    focusDurationBefore: number;
  };
  /** Severity score (0-1, higher is more disruptive) */
  severity: number;
}

/**
 * Productivity trend analysis result
 */
export interface ProductivityTrend {
  /** Time period analyzed */
  period: 'daily' | 'weekly' | 'monthly';
  /** Trend direction */
  direction: 'improving' | 'declining' | 'stable';
  /** Confidence in trend direction */
  confidence: number;
  /** Metrics analyzed */
  metrics: {
    /** Focus time trend */
    focusTime: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
    /** Session quality trend */
    sessionQuality: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
    /** Distraction rate trend */
    distractionRate: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
  };
  /** Forecast for next period */
  forecast: {
    /** Predicted focus time */
    predictedFocusTime: number;
    /** Predicted session quality */
    predictedQuality: number;
    /** Confidence in forecast */
    confidence: number;
  };
}

/**
 * Personalized insight with actionable recommendations
 */
export interface PersonalizedInsight {
  /** Insight ID */
  id: string;
  /** Insight type */
  type: 'focus_optimization' | 'distraction_reduction' | 'schedule_adjustment' | 'goal_adjustment';
  /** Insight title */
  title: string;
  /** Detailed description */
  description: string;
  /** Actionable recommendations */
  recommendations: string[];
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Confidence in insight */
  confidence: number;
  /** Supporting data */
  supportingData: {
    /** Metrics that support this insight */
    metrics: Record<string, number>;
    /** Patterns that support this insight */
    patterns: string[];
  };
  /** When insight was generated */
  generatedAt: Date;
}

// === CONSTANTS ===

/** Minimum sessions required for pattern analysis */
const MIN_SESSIONS_FOR_ANALYSIS = 10;

/** Focus session types */
const FOCUS_SESSION_TYPES: SessionType[] = ['focused-work', 'research'];

/** Distraction session types */
const DISTRACTION_SESSION_TYPES: SessionType[] = ['entertainment', 'break'];

/** Minimum confidence threshold for patterns */
const MIN_CONFIDENCE_THRESHOLD = 0.6;

/** Hours in a day */
const HOURS_IN_DAY = 24;



// === PATTERN ANALYSIS ENGINE ===

/**
 * Main pattern analysis engine class
 */
export class PatternAnalyzer {

  /**
   * Analyzes focus patterns from session data
   * 
   * @param sessions - Array of session data to analyze
   * @param timeRange - Time range for analysis
   * @returns Array of detected focus patterns
   */
  async analyzeFocusPatterns(
    sessions: SessionData[],
    _timeRange: AnalysisTimeRange
  ): Promise<FocusPattern[]> {
    if (DEBUG_LOGGING) {
      console.log(`[PATTERN ANALYZER] Analyzing focus patterns for ${sessions.length} sessions`);
    }

    if (sessions.length < MIN_SESSIONS_FOR_ANALYSIS) {
      if (DEBUG_LOGGING) {
        console.log(`[PATTERN ANALYZER] Insufficient data for analysis (${sessions.length} sessions)`);
      }
      return [];
    }

    const patterns: FocusPattern[] = [];
    const focusSessions = sessions.filter(s => FOCUS_SESSION_TYPES.includes(s.sessionType));

    // Analyze peak hours
    const peakHoursPattern = this.analyzePeakHours(focusSessions);
    if (peakHoursPattern) {
      patterns.push(peakHoursPattern);
    }

    // Analyze optimal session lengths
    const optimalDurationPattern = this.analyzeOptimalSessionDuration(focusSessions);
    if (optimalDurationPattern) {
      patterns.push(optimalDurationPattern);
    }

    // Analyze productivity rhythm
    const productivityRhythm = this.analyzeProductivityRhythm(focusSessions);
    if (productivityRhythm) {
      patterns.push(productivityRhythm);
    }

    if (DEBUG_LOGGING) {
      console.log(`[PATTERN ANALYZER] Found ${patterns.length} focus patterns`);
    }

    return patterns;
  }

  /**
   * Analyzes distraction patterns from session data
   * 
   * @param sessions - Array of session data to analyze
   * @returns Array of detected distraction patterns
   */
  async analyzeDistractionPatterns(sessions: SessionData[]): Promise<DistractionPattern[]> {
    if (DEBUG_LOGGING) {
      console.log(`[PATTERN ANALYZER] Analyzing distraction patterns for ${sessions.length} sessions`);
    }

    if (sessions.length < MIN_SESSIONS_FOR_ANALYSIS) {
      return [];
    }

    const patterns: DistractionPattern[] = [];
    const distractionSessions = sessions.filter(s => 
      DISTRACTION_SESSION_TYPES.includes(s.sessionType) || s.sessionType === 'unclear'
    );

    // Group by application to identify distraction triggers
    const appDistractions = new Map<string, SessionData[]>();
    
    for (const session of distractionSessions) {
      for (const activity of session.activities) {
        if (!appDistractions.has(activity.appName)) {
          appDistractions.set(activity.appName, []);
        }
        appDistractions.get(activity.appName)!.push(session);
      }
    }

    // Analyze each app's distraction pattern
    for (const [appName, appSessions] of appDistractions) {
      const pattern = this.analyzeAppDistractionPattern(appName, appSessions, sessions);
      if (pattern && pattern.severity > 0.3) {
        patterns.push(pattern);
      }
    }

    return patterns.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Analyzes productivity trends over time
   * 
   * @param sessions - Array of session data to analyze
   * @param timeRange - Time range for analysis
   * @returns Productivity trend analysis
   */
  async analyzeProductivityTrends(
    sessions: SessionData[],
    timeRange: AnalysisTimeRange
  ): Promise<ProductivityTrend | null> {
    if (DEBUG_LOGGING) {
      console.log(`[PATTERN ANALYZER] Analyzing productivity trends for ${timeRange.type} period`);
    }

    if (sessions.length < MIN_SESSIONS_FOR_ANALYSIS) {
      return null;
    }

    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Split sessions into two periods for comparison
    const midPoint = Math.floor(sortedSessions.length / 2);
    const previousPeriod = sortedSessions.slice(0, midPoint);
    const currentPeriod = sortedSessions.slice(midPoint);

    // Calculate metrics for each period
    const previousMetrics = this.calculatePeriodMetrics(previousPeriod);
    const currentMetrics = this.calculatePeriodMetrics(currentPeriod);

    // Determine trend direction
    const focusTimeChange = currentMetrics.focusTime - previousMetrics.focusTime;
    const qualityChange = currentMetrics.sessionQuality - previousMetrics.sessionQuality;
    const distractionChange = currentMetrics.distractionRate - previousMetrics.distractionRate;

    const trendDirection = this.determineTrendDirection(
      focusTimeChange,
      qualityChange,
      distractionChange
    );

    // Generate forecast
    const forecast = this.generateForecast(currentMetrics, trendDirection);

    // Map AnalysisTimeRange.type to ProductivityTrend.period
    const periodMap: Record<AnalysisTimeRange['type'], ProductivityTrend['period']> = {
      'day': 'daily',
      'week': 'weekly',
      'month': 'monthly',
      'custom': 'daily' // Default to daily for custom ranges
    };

    return {
      period: periodMap[timeRange.type],
      direction: trendDirection,
      confidence: this.calculateTrendConfidence(currentMetrics, previousMetrics),
      metrics: {
        focusTime: {
          current: currentMetrics.focusTime,
          previous: previousMetrics.focusTime,
          change: focusTimeChange,
          changePercent: previousMetrics.focusTime > 0 ? 
            (focusTimeChange / previousMetrics.focusTime) * 100 : 0
        },
        sessionQuality: {
          current: currentMetrics.sessionQuality,
          previous: previousMetrics.sessionQuality,
          change: qualityChange,
          changePercent: previousMetrics.sessionQuality > 0 ? 
            (qualityChange / previousMetrics.sessionQuality) * 100 : 0
        },
        distractionRate: {
          current: currentMetrics.distractionRate,
          previous: previousMetrics.distractionRate,
          change: distractionChange,
          changePercent: previousMetrics.distractionRate > 0 ? 
            (distractionChange / previousMetrics.distractionRate) * 100 : 0
        }
      },
      forecast
    };
  }

  /**
   * Generates personalized insights based on pattern analysis
   * 
   * @param focusPatterns - Detected focus patterns
   * @param distractionPatterns - Detected distraction patterns
   * @param productivityTrend - Productivity trend analysis
   * @returns Array of personalized insights
   */
  async generatePersonalizedInsights(
    focusPatterns: FocusPattern[],
    distractionPatterns: DistractionPattern[],
    productivityTrend: ProductivityTrend | null
  ): Promise<PersonalizedInsight[]> {
    if (DEBUG_LOGGING) {
      console.log(`[PATTERN ANALYZER] Generating personalized insights`);
    }

    const insights: PersonalizedInsight[] = [];

    // Focus optimization insights
    const focusInsights = this.generateFocusOptimizationInsights(focusPatterns);
    insights.push(...focusInsights);

    // Distraction reduction insights
    const distractionInsights = this.generateDistractionReductionInsights(distractionPatterns);
    insights.push(...distractionInsights);

    // Schedule adjustment insights
    if (productivityTrend) {
      const scheduleInsights = this.generateScheduleAdjustmentInsights(productivityTrend);
      insights.push(...scheduleInsights);
    }

    // Goal adjustment insights
    const goalInsights = this.generateGoalAdjustmentInsights(focusPatterns, productivityTrend);
    insights.push(...goalInsights);

    // Sort by priority and confidence
    return insights.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.confidence - a.confidence;
    });
  }

  // === PRIVATE ANALYSIS METHODS ===

  /**
   * Analyzes peak focus hours from session data
   */
  private analyzePeakHours(sessions: SessionData[]): FocusPattern | null {
    if (sessions.length < 5) return null;

    const hourlyFocusTime = new Array(HOURS_IN_DAY).fill(0);
    const hourlySessionCounts = new Array(HOURS_IN_DAY).fill(0);

    // Aggregate focus time by hour
    for (const session of sessions) {
      const startHour = new Date(session.startTime).getHours();
      const durationMinutes = session.duration / (1000 * 60);
      
      hourlyFocusTime[startHour] += durationMinutes;
      hourlySessionCounts[startHour]++;
    }

    // Calculate average focus time per hour
    const avgFocusPerHour = hourlyFocusTime.map((time, hour) => ({
      hour,
      avgFocus: hourlySessionCounts[hour] > 0 ? time / hourlySessionCounts[hour] : 0,
      totalTime: time
    }));

    // Find peak hours (top 25% of hours)
    const sortedHours = avgFocusPerHour
      .filter(h => h.totalTime > 0)
      .sort((a, b) => b.avgFocus - a.avgFocus);

    if (sortedHours.length === 0) return null;

    const peakHours = sortedHours
      .slice(0, Math.max(1, Math.ceil(sortedHours.length * 0.25)))
      .map(h => h.hour)
      .sort((a, b) => a - b);

    const confidence = this.calculatePatternConfidence(
      sortedHours.slice(0, peakHours.length),
      sortedHours
    );

    return {
      type: 'peak_hours',
      data: { peakHours },
      confidence,
      frequency: peakHours.length / HOURS_IN_DAY,
      sampleSize: sessions.length,
      identifiedAt: new Date()
    };
  }

  /**
   * Analyzes optimal session duration from session data
   */
  private analyzeOptimalSessionDuration(sessions: SessionData[]): FocusPattern | null {
    if (sessions.length < 10) return null;

    const durations = sessions.map(s => s.duration / (1000 * 60)); // Convert to minutes
    const sortedDurations = durations.sort((a, b) => a - b);

    // Use interquartile range to find optimal duration
    const q1Index = Math.floor(sortedDurations.length * 0.25);
    const q3Index = Math.floor(sortedDurations.length * 0.75);
    const medianIndex = Math.floor(sortedDurations.length * 0.5);

    const optimalDuration = sortedDurations[medianIndex];
    const iqr = sortedDurations[q3Index] - sortedDurations[q1Index];
    
    // Confidence based on consistency (smaller IQR = higher confidence)
    const confidence = Math.max(0.1, 1 - (iqr / optimalDuration));

    return {
      type: 'optimal_session_length',
      data: { optimalDuration: Math.round(optimalDuration) },
      confidence,
      frequency: 1.0, // All sessions contribute to this pattern
      sampleSize: sessions.length,
      identifiedAt: new Date()
    };
  }

  /**
   * Analyzes productivity rhythm patterns
   */
  private analyzeProductivityRhythm(
    sessions: SessionData[]
  ): FocusPattern | null {
    if (sessions.length < 14) return null; // Need at least 2 weeks of data

    const weeklyPattern = new Array(7).fill(0); // Sunday = 0, Monday = 1, etc.
    const weeklyCounts = new Array(7).fill(0);

    // Aggregate focus time by day of week
    for (const session of sessions) {
      const dayOfWeek = new Date(session.startTime).getDay();
      const durationMinutes = session.duration / (1000 * 60);
      
      weeklyPattern[dayOfWeek] += durationMinutes;
      weeklyCounts[dayOfWeek]++;
    }

    // Calculate average focus time per day of week
    const avgWeeklyPattern = weeklyPattern.map((time, day) => 
      weeklyCounts[day] > 0 ? time / weeklyCounts[day] : 0
    );

    // Calculate confidence based on consistency
    const mean = avgWeeklyPattern.reduce((a, b) => a + b, 0) / 7;
    const variance = avgWeeklyPattern.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / 7;
    const confidence = Math.max(0.1, 1 - (Math.sqrt(variance) / mean));

    return {
      type: 'productivity_rhythm',
      data: { weeklyPattern: avgWeeklyPattern },
      confidence,
      frequency: 1.0,
      sampleSize: sessions.length,
      identifiedAt: new Date()
    };
  }

  /**
   * Analyzes distraction pattern for a specific app
   */
  private analyzeAppDistractionPattern(
    appName: string,
    appSessions: SessionData[],
    allSessions: SessionData[]
  ): DistractionPattern | null {
    if (appSessions.length < 3) return null;

    const durations = appSessions.map(s => s.duration / (1000 * 60));
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    // Calculate frequency per day
    const daySpan = this.calculateDaySpan(appSessions);
    const frequencyPerDay = daySpan > 0 ? appSessions.length / daySpan : 0;

    // Find common time ranges
    const timeRanges = this.findCommonTimeRanges(appSessions);

    // Analyze context
    const context = this.analyzeDistractionContext(appSessions, allSessions);

    // Calculate severity based on frequency, duration, and context
    const severity = this.calculateDistractionSeverity(
      frequencyPerDay,
      averageDuration,
      context
    );

    return {
      trigger: appName,
      averageDuration,
      frequencyPerDay,
      commonTimeRanges: timeRanges,
      context,
      severity
    };
  }

  /**
   * Calculates metrics for a period of sessions
   */
  private calculatePeriodMetrics(sessions: SessionData[]): {
    focusTime: number;
    sessionQuality: number;
    distractionRate: number;
  } {
    if (sessions.length === 0) {
      return { focusTime: 0, sessionQuality: 0, distractionRate: 0 };
    }

    const focusSessions = sessions.filter(s => FOCUS_SESSION_TYPES.includes(s.sessionType));
    const distractionSessions = sessions.filter(s => 
      DISTRACTION_SESSION_TYPES.includes(s.sessionType)
    );

    const focusTime = focusSessions.reduce((sum, s) => sum + s.duration, 0) / (1000 * 60);
    const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0) / (1000 * 60);
    
    const sessionQuality = focusSessions.reduce((sum, s) => sum + s.confidenceScore, 0) / 
      Math.max(1, focusSessions.length);
    
    const distractionRate = totalTime > 0 ? 
      (distractionSessions.reduce((sum, s) => sum + s.duration, 0) / (1000 * 60)) / totalTime : 0;

    return { focusTime, sessionQuality, distractionRate };
  }

  /**
   * Determines trend direction based on metrics changes
   */
  private determineTrendDirection(
    focusTimeChange: number,
    qualityChange: number,
    distractionChange: number
  ): 'improving' | 'declining' | 'stable' {
    const improvingScore = 
      (focusTimeChange > 0 ? 1 : 0) +
      (qualityChange > 0 ? 1 : 0) +
      (distractionChange < 0 ? 1 : 0);

    const decliningScore = 
      (focusTimeChange < 0 ? 1 : 0) +
      (qualityChange < 0 ? 1 : 0) +
      (distractionChange > 0 ? 1 : 0);

    if (improvingScore > decliningScore) return 'improving';
    if (decliningScore > improvingScore) return 'declining';
    return 'stable';
  }

  /**
   * Generates forecast based on current metrics and trend
   */
  private generateForecast(
    currentMetrics: { focusTime: number; sessionQuality: number; distractionRate: number },
    trendDirection: 'improving' | 'declining' | 'stable'
  ): { predictedFocusTime: number; predictedQuality: number; confidence: number } {
    const trendMultiplier = trendDirection === 'improving' ? 1.1 : 
                           trendDirection === 'declining' ? 0.9 : 1.0;

    return {
      predictedFocusTime: currentMetrics.focusTime * trendMultiplier,
      predictedQuality: Math.min(1.0, currentMetrics.sessionQuality * trendMultiplier),
      confidence: trendDirection === 'stable' ? 0.9 : 0.7
    };
  }

  // === INSIGHT GENERATION METHODS ===

  /**
   * Generates focus optimization insights
   */
  private generateFocusOptimizationInsights(patterns: FocusPattern[]): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];

    const peakHoursPattern = patterns.find(p => p.type === 'peak_hours');
    if (peakHoursPattern && peakHoursPattern.confidence > MIN_CONFIDENCE_THRESHOLD) {
      const peakHours = peakHoursPattern.data.peakHours || [];
      
      insights.push({
        id: 'focus_peak_hours',
        type: 'focus_optimization',
        title: 'Schedule Deep Work During Peak Hours',
        description: `Your most productive hours are typically ${this.formatHours(peakHours)}. Consider scheduling your most important work during these times.`,
        recommendations: [
          'Block calendar during peak hours for deep work',
          'Minimize meetings and interruptions during these times',
          'Use these hours for your most challenging tasks'
        ],
        priority: 'high',
        confidence: peakHoursPattern.confidence,
        supportingData: {
          metrics: { peakHours: peakHours.length },
          patterns: ['peak_hours']
        },
        generatedAt: new Date()
      });
    }

    const durationPattern = patterns.find(p => p.type === 'optimal_session_length');
    if (durationPattern && durationPattern.confidence > MIN_CONFIDENCE_THRESHOLD) {
      const duration = durationPattern.data.optimalDuration || 0;
      
      insights.push({
        id: 'focus_session_length',
        type: 'focus_optimization',
        title: 'Optimize Session Duration',
        description: `Your optimal focus session length is approximately ${duration} minutes. Consider structuring your work in these intervals.`,
        recommendations: [
          `Use a timer to maintain ${duration}-minute focus sessions`,
          'Take breaks between sessions to maintain quality',
          'Experiment with slightly longer or shorter sessions to find your perfect rhythm'
        ],
        priority: 'medium',
        confidence: durationPattern.confidence,
        supportingData: {
          metrics: { optimalDuration: duration },
          patterns: ['optimal_session_length']
        },
        generatedAt: new Date()
      });
    }

    return insights;
  }

  /**
   * Generates distraction reduction insights
   */
  private generateDistractionReductionInsights(patterns: DistractionPattern[]): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];

    const topDistractions = patterns.slice(0, 3); // Top 3 distractions

    for (const distraction of topDistractions) {
      insights.push({
        id: `distraction_${distraction.trigger.toLowerCase()}`,
        type: 'distraction_reduction',
        title: `Reduce ${distraction.trigger} Distractions`,
        description: `${distraction.trigger} interrupts your focus ${distraction.frequencyPerDay.toFixed(1)} times per day on average, lasting ${distraction.averageDuration.toFixed(0)} minutes each time.`,
        recommendations: [
          `Consider blocking ${distraction.trigger} during focus hours`,
          'Use app timers to limit usage',
          'Find alternative ways to meet the underlying need'
        ],
        priority: distraction.severity > 0.7 ? 'high' : 'medium',
        confidence: distraction.severity,
        supportingData: {
          metrics: {
            frequency: distraction.frequencyPerDay,
            duration: distraction.averageDuration,
            severity: distraction.severity
          },
          patterns: ['distraction_trigger']
        },
        generatedAt: new Date()
      });
    }

    return insights;
  }

  /**
   * Generates schedule adjustment insights
   */
  private generateScheduleAdjustmentInsights(trend: ProductivityTrend): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];

    if (trend.direction === 'declining' && trend.confidence > 0.6) {
      insights.push({
        id: 'schedule_adjustment_declining',
        type: 'schedule_adjustment',
        title: 'Adjust Schedule for Better Focus',
        description: `Your productivity has been declining. Focus time decreased by ${Math.abs(trend.metrics.focusTime.changePercent).toFixed(1)}% recently.`,
        recommendations: [
          'Review your current schedule for potential improvements',
          'Consider shifting focus work to different time slots',
          'Evaluate if external factors are affecting your productivity'
        ],
        priority: 'high',
        confidence: trend.confidence,
        supportingData: {
          metrics: {
            focusTimeChange: trend.metrics.focusTime.changePercent,
            qualityChange: trend.metrics.sessionQuality.changePercent
          },
          patterns: ['productivity_decline']
        },
        generatedAt: new Date()
      });
    }

    return insights;
  }

  /**
   * Generates goal adjustment insights
   */
  private generateGoalAdjustmentInsights(
    _patterns: FocusPattern[],
    trend: ProductivityTrend | null
  ): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];

    // Add goal adjustment logic based on patterns and trends
    if (trend && trend.direction === 'improving') {
      insights.push({
        id: 'goal_adjustment_increase',
        type: 'goal_adjustment',
        title: 'Consider Increasing Focus Goals',
        description: 'Your productivity has been improving consistently. You might be ready for a more ambitious focus goal.',
        recommendations: [
          'Gradually increase your daily focus time goal',
          'Set stretch goals for peak performance days',
          'Track progress to ensure sustainable improvement'
        ],
        priority: 'low',
        confidence: trend.confidence,
        supportingData: {
          metrics: { improvementRate: trend.metrics.focusTime.changePercent },
          patterns: ['productivity_improvement']
        },
        generatedAt: new Date()
      });
    }

    return insights;
  }

  // === HELPER METHODS ===

  /**
   * Calculates pattern confidence based on consistency
   */
  private calculatePatternConfidence(topItems: any[], allItems: any[]): number {
    if (allItems.length === 0) return 0;
    
    const topTotal = topItems.reduce((sum, item) => sum + (item.totalTime || item.avgFocus || 0), 0);
    const allTotal = allItems.reduce((sum, item) => sum + (item.totalTime || item.avgFocus || 0), 0);
    
    return allTotal > 0 ? Math.min(1.0, topTotal / allTotal) : 0;
  }

  /**
   * Calculates trend confidence based on metrics comparison
   */
  private calculateTrendConfidence(current: any, previous: any): number {
    const changes = [
      Math.abs(current.focusTime - previous.focusTime),
      Math.abs(current.sessionQuality - previous.sessionQuality),
      Math.abs(current.distractionRate - previous.distractionRate)
    ];
    
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return Math.min(1.0, avgChange + 0.5); // Base confidence with adjustment
  }

  /**
   * Calculates day span for sessions
   */
  private calculateDaySpan(sessions: SessionData[]): number {
    if (sessions.length === 0) return 0;
    
    const dates = sessions.map(s => new Date(s.startTime).toDateString());
    const uniqueDates = new Set(dates);
    
    return uniqueDates.size;
  }

  /**
   * Finds common time ranges for sessions
   */
  private findCommonTimeRanges(sessions: SessionData[]): Array<{ start: number; end: number }> {
    const hourOccurrences = new Map<number, number>();
    
    for (const session of sessions) {
      const hour = new Date(session.startTime).getHours();
      hourOccurrences.set(hour, (hourOccurrences.get(hour) || 0) + 1);
    }
    
    const threshold = Math.max(1, sessions.length * 0.3);
    const commonHours = Array.from(hourOccurrences.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([hour, _]) => hour)
      .sort((a, b) => a - b);
    
    // Group consecutive hours into ranges
    const ranges: Array<{ start: number; end: number }> = [];
    let currentRange: { start: number; end: number } | null = null;
    
    for (const hour of commonHours) {
      if (!currentRange) {
        currentRange = { start: hour, end: hour };
      } else if (hour === currentRange.end + 1) {
        currentRange.end = hour;
      } else {
        ranges.push(currentRange);
        currentRange = { start: hour, end: hour };
      }
    }
    
    if (currentRange) {
      ranges.push(currentRange);
    }
    
    return ranges;
  }

  /**
   * Analyzes distraction context
   */
  private analyzeDistractionContext(
    appSessions: SessionData[],
    allSessions: SessionData[]
  ): DistractionPattern['context'] {
    // Find what typically happens before distractions
    const previousActivities = new Map<string, number>();
    const sessionTypes = new Map<SessionType, number>();
    let totalFocusBefore = 0;
    let contextCount = 0;

    for (const session of appSessions) {
      const sessionIndex = allSessions.findIndex(s => s.id === session.id);
      if (sessionIndex > 0) {
        const previousSession = allSessions[sessionIndex - 1];
        const prevApp = previousSession.activities[0]?.appName || 'unknown';
        previousActivities.set(prevApp, (previousActivities.get(prevApp) || 0) + 1);
        sessionTypes.set(previousSession.sessionType, (sessionTypes.get(previousSession.sessionType) || 0) + 1);
        
        if (FOCUS_SESSION_TYPES.includes(previousSession.sessionType)) {
          totalFocusBefore += previousSession.duration / (1000 * 60);
          contextCount++;
        }
      }
    }

    // Get most common previous activity
    const mostCommonPrev = Array.from(previousActivities.entries())
      .sort((a, b) => b[1] - a[1])[0];

    // Get most common session type
    const mostCommonType = Array.from(sessionTypes.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return {
      previousActivity: mostCommonPrev ? mostCommonPrev[0] : 'unknown',
      sessionType: mostCommonType ? mostCommonType[0] : 'unclear',
      focusDurationBefore: contextCount > 0 ? totalFocusBefore / contextCount : 0
    };
  }

  /**
   * Calculates distraction severity score
   */
  private calculateDistractionSeverity(
    frequencyPerDay: number,
    averageDuration: number,
    context: DistractionPattern['context']
  ): number {
    // Normalize components (0-1 scale)
    const frequencyScore = Math.min(1.0, frequencyPerDay / 10); // 10+ times per day = max
    const durationScore = Math.min(1.0, averageDuration / 60); // 60+ minutes = max
    const contextScore = FOCUS_SESSION_TYPES.includes(context.sessionType) ? 0.8 : 0.3;

    // Weighted average
    return (frequencyScore * 0.4) + (durationScore * 0.3) + (contextScore * 0.3);
  }

  /**
   * Formats hours array for display
   */
  private formatHours(hours: number[]): string {
    if (hours.length === 0) return 'no specific hours';
    
    const formatHour = (hour: number) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}${ampm}`;
    };

    if (hours.length === 1) {
      return formatHour(hours[0]);
    } else if (hours.length === 2) {
      return `${formatHour(hours[0])} and ${formatHour(hours[1])}`;
    } else {
      const formatted = hours.slice(0, -1).map(formatHour).join(', ');
      return `${formatted}, and ${formatHour(hours[hours.length - 1])}`;
    }
  }
}

// === EXPORTED FUNCTIONS ===

/**
 * Creates a new pattern analyzer instance
 */
export function createPatternAnalyzer(): PatternAnalyzer {
  return new PatternAnalyzer();
}

/**
 * Analyzes patterns for a date range
 */
export async function analyzePatterns(
  startDate: Date,
  endDate: Date
): Promise<{
  focusPatterns: FocusPattern[];
  distractionPatterns: DistractionPattern[];
  productivityTrend: ProductivityTrend | null;
  insights: PersonalizedInsight[];
}> {
  const analyzer = createPatternAnalyzer();
  
  try {
    // Get sessions for the date range
    const sessions = getSessionsByDate({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 1000
    });

    if (DEBUG_LOGGING) {
      console.log(`[PATTERN ANALYZER] Analyzing ${sessions.length} sessions from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    }

    const timeRange: AnalysisTimeRange = {
      startDate,
      endDate,
      type: 'custom'
    };

    // Perform analysis
    const focusPatterns = await analyzer.analyzeFocusPatterns(sessions, timeRange);
    const distractionPatterns = await analyzer.analyzeDistractionPatterns(sessions);
    const productivityTrend = await analyzer.analyzeProductivityTrends(sessions, timeRange);
    const insights = await analyzer.generatePersonalizedInsights(
      focusPatterns,
      distractionPatterns,
      productivityTrend
    );

    return {
      focusPatterns,
      distractionPatterns,
      productivityTrend,
      insights
    };
  } catch (error) {
    console.error('[PATTERN ANALYZER] Analysis failed:', error);
    throw error;
  }
} 