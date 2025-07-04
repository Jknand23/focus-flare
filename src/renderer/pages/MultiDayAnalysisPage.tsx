/**
 * MultiDayAnalysisPage - Comprehensive multi-day productivity analysis dashboard
 * 
 * Main page component that integrates all Phase 3 Step 2 deliverables:
 * 1. Multi-day timeline view with pattern recognition
 * 2. Weekly/monthly summary views
 * 3. Focus streak tracking and visualization
 * 4. Comparative analysis between periods
 * 5. Advanced analytics and insights
 * 
 * @module MultiDayAnalysisPage
 * @author FocusFlare Team
 * @since 0.3.0
 */

import { useState, useEffect } from 'react';
import { MultiDayTimeline } from '@/renderer/components/timeline/MultiDayTimeline';
import { WeeklySummary } from '@/renderer/components/dashboard/WeeklySummary';
import { FocusStreak } from '@/renderer/components/dashboard/FocusStreak';
import { ComparativeAnalysis } from '@/renderer/components/dashboard/ComparativeAnalysis';
import { 
  useMultiDayStore, 
  useCurrentWeekSummary, 
  useComparativeData, 
  useStreakData,
  useMultiDayStatus
} from '@/renderer/stores/multi-day-store';
import { useSessionStore } from '@/renderer/stores/session-store';
import { useSettingsStore } from '@/renderer/stores/settings-store';
import { Card, CardContent } from '@/renderer/components/ui/card';
import { Button } from '@/renderer/components/ui/button';
import { Badge } from '@/renderer/components/ui/badge';
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  RefreshCw, 
  TrendingUp, 
  Target,
  Clock,
  Award,
  Eye,
  EyeOff
} from 'lucide-react';
import type { AnalysisTimeRange, SessionData } from '@/shared/types/activity-types';

// === COMPONENT TYPES ===

interface MultiDayAnalysisPageProps {
  /** Callback when session is clicked */
  onSessionClick?: (session: SessionData) => void;
}

// === CONSTANTS ===

/** Analysis view modes */
const VIEW_MODES = {
  OVERVIEW: 'overview',
  TIMELINE: 'timeline', 
  SUMMARY: 'summary',
  STREAK: 'streak',
  COMPARISON: 'comparison'
} as const;

type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

// === MAIN COMPONENT ===

/**
 * Multi-day analysis page component
 */
export function MultiDayAnalysisPage({ onSessionClick }: MultiDayAnalysisPageProps) {
  // === STATE ===
  const [activeView, setActiveView] = useState<ViewMode>(VIEW_MODES.OVERVIEW);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // === STORE CONNECTIONS ===
  const multiDayStore = useMultiDayStore();
  const sessionStore = useSessionStore();
  const settingsStore = useSettingsStore();
  
  const { loadingState, error, lastAnalyzed } = useMultiDayStatus();
  const currentWeekSummary = useCurrentWeekSummary();
  const comparativeData = useComparativeData();
  const streakData = useStreakData();
  const focusGoalMinutes = settingsStore.settings.focusSessionGoalMinutes;
  
  // === EFFECTS ===
  
  /**
   * Initial data load and periodic refresh
   */
  useEffect(() => {
    const loadAnalysisData = async () => {
      try {
        // Create analysis range for past 2 weeks (as per user constraint)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 13); // 14 days total
        
        const analysisRange: AnalysisTimeRange = {
          startDate,
          endDate,
          type: 'custom'
        };
        
        // Fetch sessions for the range
        await sessionStore.fetchSessionsByDateRange(startDate, endDate);
        
        // Analyze multi-day data
        await multiDayStore.analyzeMultiDayData(
          sessionStore.sessions,
          analysisRange,
          focusGoalMinutes
        );
      } catch (error) {
        console.error('Failed to load multi-day analysis:', error);
      }
    };
    
    // Initial load
    loadAnalysisData();
    
    // Set up auto-refresh if enabled
    let refreshInterval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      refreshInterval = setInterval(loadAnalysisData, 5 * 60 * 1000); // Every 5 minutes
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, focusGoalMinutes]);
  
  // === HANDLERS ===
  
  /**
   * Handles manual refresh
   */
  const handleRefresh = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 13);
    
    const analysisRange: AnalysisTimeRange = {
      startDate,
      endDate,
      type: 'custom'
    };
    
    await sessionStore.fetchSessionsByDateRange(startDate, endDate);
    await multiDayStore.analyzeMultiDayData(
      sessionStore.sessions,
      analysisRange,
      focusGoalMinutes
    );
  };
  
  /**
   * Handles view mode change
   */
  const handleViewChange = (mode: ViewMode) => {
    setActiveView(mode);
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
  
  const viewModeConfig = {
    [VIEW_MODES.OVERVIEW]: {
      title: 'Overview',
      icon: BarChart3,
      description: 'Complete multi-day analysis dashboard'
    },
    [VIEW_MODES.TIMELINE]: {
      title: 'Timeline',
      icon: Calendar,
      description: 'Multi-day timeline with pattern recognition'
    },
    [VIEW_MODES.SUMMARY]: {
      title: 'Summary',
      icon: TrendingUp,
      description: 'Weekly productivity summaries'
    },
    [VIEW_MODES.STREAK]: {
      title: 'Streak',
      icon: Target,
      description: 'Focus streak tracking and goals'
    },
    [VIEW_MODES.COMPARISON]: {
      title: 'Comparison',
      icon: Award,
      description: 'Week-to-week comparative analysis'
    }
  };
  
  // === RENDER LOADING STATE ===
  
  if (loadingState === 'loading' as any) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">Analyzing Your Productivity</h3>
                  <p className="text-sm text-gray-500">Processing multi-day data and identifying patterns...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // === RENDER ERROR STATE ===
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-red-600 mb-2">Analysis Failed</h3>
                <p className="text-sm text-gray-500 mb-4">{error.message}</p>
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // === RENDER MAIN CONTENT ===
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Multi-Day Analysis
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Advanced productivity insights and pattern recognition
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                {autoRefresh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Auto-refresh {autoRefresh ? 'On' : 'Off'}
              </Button>
              
                             <Button
                 onClick={handleRefresh}
                 variant="outline"
                 size="sm"
                 disabled={loadingState === 'loading' as any}
               >
                 <RefreshCw className={`h-4 w-4 mr-2 ${loadingState === 'loading' as any ? 'animate-spin' : ''}`} />
                 Refresh
               </Button>
              
              <Button
                onClick={() => settingsStore.openSettingsPanel()}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
          
          {/* Last updated info */}
          {lastAnalyzed && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Last updated: {new Intl.DateTimeFormat('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short'
                }).format(lastAnalyzed)}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {Object.entries(viewModeConfig).map(([mode, config]) => {
              const Icon = config.icon;
              const isActive = activeView === mode;
              
              return (
                <button
                  key={mode}
                  onClick={() => handleViewChange(mode as ViewMode)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {config.title}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeView === VIEW_MODES.OVERVIEW && (
          <div className="space-y-8">
            {/* Overview grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Focus streak */}
              <FocusStreak
                streak={streakData}
                multiDayData={multiDayStore.multiDayData}
                showCalendar={false}
              />
              
              {/* Weekly summary (if available) */}
              {currentWeekSummary && (
                <WeeklySummary
                  summary={currentWeekSummary}
                  focusGoalMinutes={focusGoalMinutes}
                  showDetails={false}
                />
              )}
            </div>
            
            {/* Comparative analysis (if available) */}
            {comparativeData && (
              <ComparativeAnalysis
                analysis={comparativeData}
                showInsights={true}
              />
            )}
            
            {/* Multi-day timeline */}
            <MultiDayTimeline
              onSessionClick={handleSessionClick}
              showStreak={true}
              showPatterns={true}
            />
          </div>
        )}
        
        {activeView === VIEW_MODES.TIMELINE && (
          <MultiDayTimeline
            onSessionClick={handleSessionClick}
            showStreak={true}
            showPatterns={true}
          />
        )}
        
        {activeView === VIEW_MODES.SUMMARY && currentWeekSummary && (
          <WeeklySummary
            summary={currentWeekSummary}
            focusGoalMinutes={focusGoalMinutes}
            showDetails={true}
          />
        )}
        
        {activeView === VIEW_MODES.STREAK && (
          <FocusStreak
            streak={streakData}
            multiDayData={multiDayStore.multiDayData}
            showCalendar={true}
          />
        )}
        
        {activeView === VIEW_MODES.COMPARISON && comparativeData && (
          <ComparativeAnalysis
            analysis={comparativeData}
            showInsights={true}
          />
        )}
        
        {/* Empty state for missing data */}
        {(
          (activeView === VIEW_MODES.SUMMARY && !currentWeekSummary) ||
          (activeView === VIEW_MODES.COMPARISON && !comparativeData)
        ) && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {activeView === VIEW_MODES.SUMMARY ? 'No Summary Available' : 'No Comparison Data'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {activeView === VIEW_MODES.SUMMARY 
                    ? 'Not enough data to generate a weekly summary. Use the app for a few days to see insights.'
                    : 'Need at least 2 weeks of data to show comparative analysis.'
                  }
                </p>
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 