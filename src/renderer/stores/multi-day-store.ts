/**
 * Multi-Day Analysis Store - State management for multi-day analytics
 * 
 * Zustand-based store that manages multi-day timeline data, pattern recognition,
 * focus streaks, and comparative analysis. Handles complex analytics state for
 * Phase 3 enhancement features. Integrates with session and settings stores
 * for comprehensive productivity insights.
 * 
 * @module MultiDayStore
 * @author FocusFlare Team
 * @since 0.3.0
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  SessionData,
  LoadingState,
  ErrorInfo,
  MultiDayTimelineData,
  RecurringPattern,
  FocusStreak,
  DailySummary,
  WeeklySummary,
  ComparativeAnalysis,
  AnalysisTimeRange
} from '@/shared/types/activity-types';
import { 
  processMultiDayTimelineData,
  identifyRecurringPatterns,
  calculateFocusStreak,
  generateDailySummary,
  generateWeeklySummary,
  performComparativeAnalysis,
  getWeekStart,
  getWeekEnd
} from '@/renderer/utils/multi-day-analysis';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === STORE STATE INTERFACE ===

/**
 * Multi-day analysis store state interface
 */
interface MultiDayStore {
  // === DATA STATE ===
  /** Multi-day timeline data */
  multiDayData: MultiDayTimelineData[];
  /** Identified recurring patterns */
  patterns: RecurringPattern[];
  /** Current focus streak information */
  focusStreak: FocusStreak;
  /** Daily summaries */
  dailySummaries: DailySummary[];
  /** Weekly summaries */
  weeklySummaries: WeeklySummary[];
  /** Comparative analysis */
  comparativeAnalysis: ComparativeAnalysis | null;
  /** Current loading state */
  loadingState: LoadingState;
  /** Last error information */
  error: ErrorInfo | null;
  /** Last analysis timestamp */
  lastAnalyzed: Date | null;
  
  // === CONFIGURATION STATE ===
  /** Current analysis time range */
  analysisRange: AnalysisTimeRange;
  /** Focus goal in minutes */
  focusGoalMinutes: number;
  /** Whether to show patterns */
  showPatterns: boolean;
  /** Whether to show comparative analysis */
  showComparative: boolean;
  
  // === ACTIONS ===
  /** Analyze multi-day data */
  analyzeMultiDayData: (sessions: SessionData[], range: AnalysisTimeRange, focusGoal: number) => Promise<void>;
  /** Update analysis range */
  updateAnalysisRange: (range: AnalysisTimeRange) => void;
  /** Update focus goal */
  updateFocusGoal: (minutes: number) => void;
  /** Toggle pattern visibility */
  togglePatterns: () => void;
  /** Toggle comparative analysis */
  toggleComparative: () => void;
  /** Get current week data */
  getCurrentWeekData: () => MultiDayTimelineData[];
  /** Get previous week data */
  getPreviousWeekData: () => MultiDayTimelineData[];
  /** Clear all data */
  clearData: () => void;
  /** Clear error state */
  clearError: () => void;
}

// === HELPER FUNCTIONS ===

/**
 * Creates default analysis range for the past week
 */
function createDefaultAnalysisRange(): AnalysisTimeRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6); // Past 7 days
  
  return {
    startDate,
    endDate,
    type: 'week'
  };
}

/**
 * Creates default focus streak
 */
function createDefaultFocusStreak(focusGoalMinutes: number): FocusStreak {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDate: null,
    todayCount: false,
    focusGoalMinutes
  };
}

// === STORE IMPLEMENTATION ===

/**
 * Multi-day analysis store implementation using Zustand
 */
export const useMultiDayStore = create<MultiDayStore>()(
  devtools(
    (set, get) => ({
      // === INITIAL STATE ===
      multiDayData: [],
      patterns: [],
      focusStreak: createDefaultFocusStreak(120), // Default 2 hours
      dailySummaries: [],
      weeklySummaries: [],
      comparativeAnalysis: null,
      loadingState: 'idle',
      error: null,
      lastAnalyzed: null,
      analysisRange: createDefaultAnalysisRange(),
      focusGoalMinutes: 120,
      showPatterns: true,
      showComparative: true,

      // === ACTIONS ===

      /**
       * Analyzes multi-day data for patterns, streaks, and summaries
       */
      analyzeMultiDayData: async (sessions: SessionData[], range: AnalysisTimeRange, focusGoal: number) => {
        set({ loadingState: 'loading', error: null });
        
        if (DEBUG_LOGGING) {
          console.log(`[MULTI-DAY STORE] Analyzing ${sessions.length} sessions for range:`, range);
        }
        
        try {
          // Process multi-day timeline data
          const multiDayData = processMultiDayTimelineData(sessions, range, focusGoal);
          
          // Identify recurring patterns
          const patterns = identifyRecurringPatterns(sessions, range);
          
          // Calculate focus streak
          const focusStreak = calculateFocusStreak(multiDayData, focusGoal);
          
          // Generate daily summaries
          const dailySummaries = multiDayData.map(dayData => 
            generateDailySummary(dayData.sessions, dayData.date, focusGoal)
          );
          
          // Generate weekly summaries
          const weeklySummaries: WeeklySummary[] = [];
          const weekStarts = new Set<string>();
          
          // Group daily summaries by week
          for (const daily of dailySummaries) {
            const weekStart = getWeekStart(daily.date);
            const weekKey = weekStart.toISOString();
            
            if (!weekStarts.has(weekKey)) {
              weekStarts.add(weekKey);
              const weekDailies = dailySummaries.filter(d => {
                const dWeekStart = getWeekStart(d.date);
                return dWeekStart.getTime() === weekStart.getTime();
              });
              
              if (weekDailies.length > 0) {
                weeklySummaries.push(generateWeeklySummary(weekDailies, weekStart));
              }
            }
          }
          
          // Generate comparative analysis if we have multiple weeks
          let comparativeAnalysis: ComparativeAnalysis | null = null;
          if (weeklySummaries.length >= 2) {
            const currentWeek = weeklySummaries[weeklySummaries.length - 1];
            const previousWeek = weeklySummaries[weeklySummaries.length - 2];
            comparativeAnalysis = performComparativeAnalysis(currentWeek, previousWeek);
          }
          
          set({
            multiDayData,
            patterns,
            focusStreak,
            dailySummaries,
            weeklySummaries,
            comparativeAnalysis,
            loadingState: 'success',
            lastAnalyzed: new Date(),
            analysisRange: range,
            focusGoalMinutes: focusGoal,
            error: null
          });
          
          if (DEBUG_LOGGING) {
            console.log(`[MULTI-DAY STORE] Analysis complete:`, {
              multiDayData: multiDayData.length,
              patterns: patterns.length,
              focusStreak: focusStreak.currentStreak,
              dailySummaries: dailySummaries.length,
              weeklySummaries: weeklySummaries.length,
              hasComparative: comparativeAnalysis !== null
            });
          }
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to analyze multi-day data',
            code: 'MULTI_DAY_ANALYSIS_FAILED',
            timestamp: new Date()
          };
          
          set({
            loadingState: 'error',
            error: errorInfo
          });
          
          console.error('[MULTI-DAY STORE] Failed to analyze multi-day data:', error);
        }
      },

      /**
       * Updates the analysis time range
       */
      updateAnalysisRange: (range: AnalysisTimeRange) => {
        set({ analysisRange: range });
        
        if (DEBUG_LOGGING) {
          console.log('[MULTI-DAY STORE] Updated analysis range:', range);
        }
      },

      /**
       * Updates the focus goal target
       */
      updateFocusGoal: (minutes: number) => {
        set({ focusGoalMinutes: minutes });
        
        if (DEBUG_LOGGING) {
          console.log('[MULTI-DAY STORE] Updated focus goal:', minutes);
        }
      },

      /**
       * Toggles pattern visibility
       */
      togglePatterns: () => {
        set((state) => ({ showPatterns: !state.showPatterns }));
        
        if (DEBUG_LOGGING) {
          console.log('[MULTI-DAY STORE] Toggled patterns visibility');
        }
      },

      /**
       * Toggles comparative analysis visibility
       */
      toggleComparative: () => {
        set((state) => ({ showComparative: !state.showComparative }));
        
        if (DEBUG_LOGGING) {
          console.log('[MULTI-DAY STORE] Toggled comparative analysis visibility');
        }
      },

      /**
       * Gets current week data
       */
      getCurrentWeekData: () => {
        const { multiDayData } = get();
        const today = new Date();
        const weekStart = getWeekStart(today);
        const weekEnd = getWeekEnd(today);
        
        return multiDayData.filter(dayData => {
          const date = new Date(dayData.date);
          return date >= weekStart && date <= weekEnd;
        });
      },

      /**
       * Gets previous week data
       */
      getPreviousWeekData: () => {
        const { multiDayData } = get();
        const today = new Date();
        const thisWeekStart = getWeekStart(today);
        const prevWeekStart = new Date(thisWeekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = getWeekEnd(prevWeekStart);
        
        return multiDayData.filter(dayData => {
          const date = new Date(dayData.date);
          return date >= prevWeekStart && date <= prevWeekEnd;
        });
      },

      /**
       * Clears all analysis data
       */
      clearData: () => {
        set({
          multiDayData: [],
          patterns: [],
          focusStreak: createDefaultFocusStreak(get().focusGoalMinutes),
          dailySummaries: [],
          weeklySummaries: [],
          comparativeAnalysis: null,
          loadingState: 'idle',
          error: null,
          lastAnalyzed: null
        });
        
        if (DEBUG_LOGGING) {
          console.log('[MULTI-DAY STORE] Cleared all analysis data');
        }
      },

      /**
       * Clears error state
       */
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'multi-day-store',
      version: 1
    }
  )
);

// === STORE SELECTORS ===

/**
 * Hook for accessing pattern data with filtering
 */
export const usePatternData = () => {
  const { patterns, showPatterns } = useMultiDayStore(state => ({
    patterns: state.patterns,
    showPatterns: state.showPatterns
  }));
  
  return showPatterns ? patterns : [];
};

/**
 * Hook for accessing streak information
 */
export const useStreakData = () => {
  return useMultiDayStore(state => state.focusStreak);
};

/**
 * Hook for accessing current week summary
 */
export const useCurrentWeekSummary = () => {
  const { weeklySummaries } = useMultiDayStore(state => ({
    weeklySummaries: state.weeklySummaries
  }));
  
  return weeklySummaries.length > 0 ? weeklySummaries[weeklySummaries.length - 1] : null;
};

/**
 * Hook for accessing comparative analysis
 */
export const useComparativeData = () => {
  const { comparativeAnalysis, showComparative } = useMultiDayStore(state => ({
    comparativeAnalysis: state.comparativeAnalysis,
    showComparative: state.showComparative
  }));
  
  return showComparative ? comparativeAnalysis : null;
};

/**
 * Hook for accessing multi-day store status
 */
export const useMultiDayStatus = () => {
  return useMultiDayStore(state => ({
    loadingState: state.loadingState,
    error: state.error,
    lastAnalyzed: state.lastAnalyzed
  }));
}; 