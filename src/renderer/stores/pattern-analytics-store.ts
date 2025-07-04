/**
 * Pattern Analytics Store - State management for pattern analysis and insights
 * 
 * Zustand-based store that manages pattern analysis state for advanced analytics.
 * Handles fetching, caching, and updating pattern analysis results including
 * focus patterns, distraction patterns, productivity trends, and personalized
 * insights. Core state management for Phase 3 pattern recognition features.
 * 
 * @module PatternAnalyticsStore
 * @author FocusFlare Team
 * @since 0.3.0
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  FocusPattern,
  DistractionPattern,
  ProductivityTrend,
  PersonalizedInsight,
  PatternAnalysisResult,
  AnalysisTimeRange,
  LoadingState,
  ErrorInfo
} from '@/shared/types/activity-types';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === STORE STATE INTERFACE ===

/**
 * Pattern analytics store state interface
 */
interface PatternAnalyticsStore {
  // === DATA STATE ===
  /** Current pattern analysis result */
  analysisResult: PatternAnalysisResult | null;
  /** Focus patterns cache */
  focusPatterns: FocusPattern[];
  /** Distraction patterns cache */
  distractionPatterns: DistractionPattern[];
  /** Productivity trend cache */
  productivityTrend: ProductivityTrend | null;
  /** Personalized insights cache */
  insights: PersonalizedInsight[];
  /** Current loading state */
  loadingState: LoadingState;
  /** Last error information */
  error: ErrorInfo | null;
  /** Last analysis timestamp */
  lastAnalyzed: Date | null;
  /** Current analysis date range */
  currentDateRange: AnalysisTimeRange | null;
  
  // === UI STATE ===
  /** Currently selected insight */
  selectedInsight: PersonalizedInsight | null;
  /** Insight type filter */
  insightTypeFilter: PersonalizedInsight['type'] | 'all';
  /** Insight priority filter */
  insightPriorityFilter: PersonalizedInsight['priority'] | 'all';
  /** Whether to show only actionable insights */
  showOnlyActionable: boolean;
  /** Analysis refresh interval */
  refreshInterval: number; // in minutes
  
  // === ACTIONS ===
  /** Analyze patterns for date range */
  analyzePatterns: (startDate: Date, endDate: Date) => Promise<void>;
  /** Get focus patterns only */
  getFocusPatterns: (startDate: Date, endDate: Date) => Promise<void>;
  /** Get distraction patterns only */
  getDistractionPatterns: (startDate: Date, endDate: Date) => Promise<void>;
  /** Get productivity trend only */
  getProductivityTrend: (startDate: Date, endDate: Date) => Promise<void>;
  /** Get insights only */
  getInsights: (startDate: Date, endDate: Date) => Promise<void>;
  /** Refresh current analysis */
  refreshAnalysis: () => Promise<void>;
  /** Clear all data */
  clearData: () => void;
  /** Clear error state */
  clearError: () => void;
  /** Select an insight */
  selectInsight: (insight: PersonalizedInsight | null) => void;
  /** Update insight filters */
  updateInsightTypeFilter: (type: PersonalizedInsight['type'] | 'all') => void;
  /** Update priority filter */
  updateInsightPriorityFilter: (priority: PersonalizedInsight['priority'] | 'all') => void;
  /** Toggle actionable filter */
  toggleActionableFilter: () => void;
  /** Update refresh interval */
  updateRefreshInterval: (minutes: number) => void;
  /** Mark insight as acted upon */
  markInsightActedUpon: (insightId: string) => void;
      /** Dismiss insight */
    dismissInsight: (insightId: string) => void;
}

// === HELPER FUNCTIONS ===

/**
 * Creates a default analysis time range (last 30 days)
 */
function createDefaultTimeRange(): AnalysisTimeRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  return {
    startDate,
    endDate,
    type: 'custom'
  };
}

/**
 * Checks if data needs to be refreshed based on last analysis time
 */
function shouldRefreshData(
  lastAnalyzed: Date | null,
  refreshInterval: number
): boolean {
  if (!lastAnalyzed) return true;
  
  const now = new Date();
  const timeDiff = now.getTime() - lastAnalyzed.getTime();
  const intervalMs = refreshInterval * 60 * 1000;
  
  return timeDiff >= intervalMs;
}

// === STORE IMPLEMENTATION ===

/**
 * Pattern analytics store implementation using Zustand
 */
export const usePatternAnalyticsStore = create<PatternAnalyticsStore>()(
  devtools(
    (set, get) => ({
      // === INITIAL STATE ===
      analysisResult: null,
      focusPatterns: [],
      distractionPatterns: [],
      productivityTrend: null,
      insights: [],
      loadingState: 'idle',
      error: null,
      lastAnalyzed: null,
      currentDateRange: null,
      selectedInsight: null,
      insightTypeFilter: 'all',
      insightPriorityFilter: 'all',
      showOnlyActionable: false,
      refreshInterval: 60, // 1 hour default

      // === ACTIONS ===

      /**
       * Analyzes patterns for a specific date range
       */
      analyzePatterns: async (startDate: Date, endDate: Date) => {
        set({ loadingState: 'loading', error: null });
        
        if (DEBUG_LOGGING) {
          console.log(`[PATTERN ANALYTICS STORE] analyzePatterns called with:`, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const result = await window.electronAPI.analytics.analyzePatterns(startDate.toISOString(), endDate.toISOString());
          
          if (DEBUG_LOGGING) {
            console.log('[PATTERN ANALYTICS STORE] Analysis result received:', {
              focusPatterns: result.focusPatterns.length,
              distractionPatterns: result.distractionPatterns.length,
              hasProductivityTrend: !!result.productivityTrend,
              insights: result.insights.length
            });
          }
          
          const analysisResult: PatternAnalysisResult = {
            ...result,
            analyzedAt: new Date(),
            dateRange: {
              startDate,
              endDate,
              type: 'custom'
            }
          };
          
          set({
            analysisResult,
            focusPatterns: result.focusPatterns,
            distractionPatterns: result.distractionPatterns,
            productivityTrend: result.productivityTrend,
            insights: result.insights,
            loadingState: 'success',
            lastAnalyzed: new Date(),
            currentDateRange: { startDate, endDate, type: 'custom' },
            error: null
          });
          
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to analyze patterns',
            code: 'PATTERN_ANALYSIS_FAILED',
            timestamp: new Date()
          };
          
          set({
            loadingState: 'error',
            error: errorInfo
          });
          
          console.error('[PATTERN ANALYTICS STORE] Failed to analyze patterns:', error);
        }
      },

      /**
       * Gets focus patterns only
       */
      getFocusPatterns: async (startDate: Date, endDate: Date) => {
        if (DEBUG_LOGGING) {
          console.log(`[PATTERN ANALYTICS STORE] getFocusPatterns called`);
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const focusPatterns = await window.electronAPI.analytics.getFocusPatterns(startDate.toISOString(), endDate.toISOString());
          
          set(state => ({
            focusPatterns,
            analysisResult: state.analysisResult ? {
              ...state.analysisResult,
              focusPatterns
            } : null
          }));
          
        } catch (error) {
          console.error('[PATTERN ANALYTICS STORE] Failed to get focus patterns:', error);
          throw error;
        }
      },

      /**
       * Gets distraction patterns only
       */
      getDistractionPatterns: async (startDate: Date, endDate: Date) => {
        if (DEBUG_LOGGING) {
          console.log(`[PATTERN ANALYTICS STORE] getDistractionPatterns called`);
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const distractionPatterns = await window.electronAPI.analytics.getDistractionPatterns(startDate.toISOString(), endDate.toISOString());
          
          set(state => ({
            distractionPatterns,
            analysisResult: state.analysisResult ? {
              ...state.analysisResult,
              distractionPatterns
            } : null
          }));
          
        } catch (error) {
          console.error('[PATTERN ANALYTICS STORE] Failed to get distraction patterns:', error);
          throw error;
        }
      },

      /**
       * Gets productivity trend only
       */
      getProductivityTrend: async (startDate: Date, endDate: Date) => {
        if (DEBUG_LOGGING) {
          console.log(`[PATTERN ANALYTICS STORE] getProductivityTrend called`);
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const productivityTrend = await window.electronAPI.analytics.getProductivityTrend(startDate.toISOString(), endDate.toISOString());
          
          set(state => ({
            productivityTrend,
            analysisResult: state.analysisResult ? {
              ...state.analysisResult,
              productivityTrend
            } : null
          }));
          
        } catch (error) {
          console.error('[PATTERN ANALYTICS STORE] Failed to get productivity trend:', error);
          throw error;
        }
      },

      /**
       * Gets insights only
       */
      getInsights: async (startDate: Date, endDate: Date) => {
        if (DEBUG_LOGGING) {
          console.log(`[PATTERN ANALYTICS STORE] getInsights called`);
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const insights = await window.electronAPI.analytics.getInsights(startDate.toISOString(), endDate.toISOString());
          
          set(state => ({
            insights,
            analysisResult: state.analysisResult ? {
              ...state.analysisResult,
              insights
            } : null
          }));
          
        } catch (error) {
          console.error('[PATTERN ANALYTICS STORE] Failed to get insights:', error);
          throw error;
        }
      },

      /**
       * Refreshes current analysis
       */
      refreshAnalysis: async () => {
        const { currentDateRange, analyzePatterns } = get();
        
        if (!currentDateRange) {
          const defaultRange = createDefaultTimeRange();
          await analyzePatterns(defaultRange.startDate, defaultRange.endDate);
        } else {
          await analyzePatterns(currentDateRange.startDate, currentDateRange.endDate);
        }
      },

      /**
       * Clears all data
       */
      clearData: () => {
        set({
          analysisResult: null,
          focusPatterns: [],
          distractionPatterns: [],
          productivityTrend: null,
          insights: [],
          loadingState: 'idle',
          error: null,
          lastAnalyzed: null,
          currentDateRange: null,
          selectedInsight: null
        });
      },

      /**
       * Clears error state
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Selects an insight
       */
      selectInsight: (insight: PersonalizedInsight | null) => {
        set({ selectedInsight: insight });
      },

      /**
       * Updates insight type filter
       */
      updateInsightTypeFilter: (type: PersonalizedInsight['type'] | 'all') => {
        set({ insightTypeFilter: type });
      },

      /**
       * Updates insight priority filter
       */
      updateInsightPriorityFilter: (priority: PersonalizedInsight['priority'] | 'all') => {
        set({ insightPriorityFilter: priority });
      },

      /**
       * Toggles actionable filter
       */
      toggleActionableFilter: () => {
        set(state => ({ showOnlyActionable: !state.showOnlyActionable }));
      },

      /**
       * Updates refresh interval
       */
      updateRefreshInterval: (minutes: number) => {
        set({ refreshInterval: minutes });
      },

      /**
       * Marks insight as acted upon (local state only)
       */
      markInsightActedUpon: (insightId: string) => {
        set(state => ({
          insights: state.insights.map(insight => 
            insight.id === insightId 
              ? { ...insight, actedUpon: true } as PersonalizedInsight & { actedUpon: boolean }
              : insight
          )
        }));
      },

      /**
       * Dismisses insight (removes from view)
       */
      dismissInsight: (insightId: string) => {
        set(state => ({
          insights: state.insights.filter(insight => insight.id !== insightId),
          selectedInsight: state.selectedInsight?.id === insightId ? null : state.selectedInsight
        }));
              }
    }),
    {
      name: 'pattern-analytics-store',
      // Persist only non-sensitive UI state
      partialize: (state: PatternAnalyticsStore) => ({
        insightTypeFilter: state.insightTypeFilter,
        insightPriorityFilter: state.insightPriorityFilter,
        showOnlyActionable: state.showOnlyActionable,
        refreshInterval: state.refreshInterval
      })
    }
  )
);

// === COMPUTED SELECTORS ===

/**
 * Hook to get filtered insights based on current filters
 */
export function useFilteredInsights() {
  return usePatternAnalyticsStore(state => {
    let filtered = state.insights;
    
    // Filter by type
    if (state.insightTypeFilter !== 'all') {
      filtered = filtered.filter(insight => insight.type === state.insightTypeFilter);
    }
    
    // Filter by priority
    if (state.insightPriorityFilter !== 'all') {
      filtered = filtered.filter(insight => insight.priority === state.insightPriorityFilter);
    }
    
    // Filter by actionable (has recommendations)
    if (state.showOnlyActionable) {
      filtered = filtered.filter(insight => insight.recommendations.length > 0);
    }
    
    return filtered;
  });
}

/**
 * Hook to get pattern analysis statistics
 */
export function usePatternAnalysisStats() {
  return usePatternAnalyticsStore(state => {
    if (!state.analysisResult) {
      return {
        totalPatterns: 0,
        highConfidencePatterns: 0,
        criticalInsights: 0,
        averageConfidence: 0
      };
    }
    
    // Only focus patterns have confidence scores
    const highConfidencePatterns = state.focusPatterns.filter(p => p.confidence > 0.7);
    const criticalInsights = state.insights.filter(i => i.priority === 'high');
    const averageConfidence = state.focusPatterns.length > 0 
      ? state.focusPatterns.reduce((sum, p) => sum + p.confidence, 0) / state.focusPatterns.length 
      : 0;
    
    return {
      totalPatterns: state.focusPatterns.length + state.distractionPatterns.length,
      highConfidencePatterns: highConfidencePatterns.length,
      criticalInsights: criticalInsights.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    };
  });
}

/**
 * Hook to check if data should be refreshed
 */
export function useShouldRefreshPatternData() {
  return usePatternAnalyticsStore(state => 
    shouldRefreshData(state.lastAnalyzed, state.refreshInterval)
  );
} 