/**
 * DashboardPage - Main dashboard interface for FocusFlare
 * 
 * Primary page component that displays intelligent session classification data
 * with timeline visualization and multi-day analysis. Features AI-powered session 
 * detection, color-coded timeline, multi-day insights, pattern recognition, and 
 * focus streak tracking. Enhanced with Phase 3 multi-day analysis capabilities.
 * 
 * @module DashboardPage
 * @author FocusFlare Team
 * @since 0.2.0
 */

import { useEffect, useState } from 'react';
import { TimelineChart } from '@/renderer/components/timeline/TimelineChart';
import { SessionModal } from '@/renderer/components/dashboard/SessionModal';
import { SettingsPanel } from '@/renderer/components/settings/SettingsPanel';
import { MultiDayTimeline } from '@/renderer/components/timeline/MultiDayTimeline';
import { WeeklySummary } from '@/renderer/components/dashboard/WeeklySummary';
import { FocusStreak } from '@/renderer/components/dashboard/FocusStreak';
import { ComparativeAnalysis } from '@/renderer/components/dashboard/ComparativeAnalysis';
import { PatternAnalysisDashboard } from '@/renderer/components/dashboard/PatternAnalysisDashboard';
import { ProductivityInsightsWidget } from '@/renderer/components/dashboard/ProductivityInsightsWidget';
import { useSessionStore } from '@/renderer/stores/session-store';
import { useSettingsStore } from '@/renderer/stores/settings-store';
import { useMultiDayStore } from '@/renderer/stores/multi-day-store';
import { useTheme } from '@/renderer/components/theme/ThemeProvider';
import type { SessionData, UpdateSessionRequest, AnalysisTimeRange } from '@/shared/types/activity-types';

// === COMPONENT TYPES ===

/**
 * Props interface for DashboardPage component
 */
interface DashboardPageProps {
  /** Optional CSS class name */
  className?: string;
}

/**
 * Dashboard view mode type
 */
type DashboardView = 'daily' | 'timeline' | 'summary' | 'streak' | 'comparison' | 'patterns' | 'insights';

// === HEADER COMPONENT ===

/**
 * Dashboard header with title, controls, and view tabs
 */
function DashboardHeader({ 
  currentView, 
  onViewChange 
}: { 
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const { refreshData, triggerClassification, sessions } = useSessionStore();
  const { analyzeMultiDayData, analysisRange } = useMultiDayStore();
  const { settings } = useSettingsStore();
  const { openSettingsPanel } = useSettingsStore();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      if (currentView !== 'daily') {
        // Trigger multi-day analysis with current sessions
        await analyzeMultiDayData(sessions, analysisRange, settings.focusSessionGoalMinutes);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClassifyRecent = async () => {
    setIsClassifying(true);
    try {
      await triggerClassification();
      if (currentView !== 'daily') {
        // Trigger multi-day analysis with updated sessions
        await analyzeMultiDayData(sessions, analysisRange, settings.focusSessionGoalMinutes);
      }
    } catch (error) {
      console.error('Failed to trigger classification:', error);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleOpenSettings = () => {
    openSettingsPanel();
  };

  const viewTabs = [
    { id: 'daily' as const, label: 'Today', description: 'Daily overview' },
    { id: 'timeline' as const, label: 'Timeline', description: 'Multi-day timeline' },
    { id: 'summary' as const, label: 'Summary', description: 'Weekly insights' },
    { id: 'streak' as const, label: 'Streak', description: 'Focus streaks' },
    { id: 'comparison' as const, label: 'Compare', description: 'Period comparison' },
    { id: 'patterns' as const, label: 'Patterns', description: 'AI pattern analysis' },
    { id: 'insights' as const, label: 'Insights', description: 'Windows integration insights' }
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Focus Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your activities and analyze focus patterns</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={handleClassifyRecent}
            disabled={isClassifying}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isClassifying ? 'Classifying...' : 'Classify Recent'}
          </button>
          
          <button
            onClick={handleOpenSettings}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {viewTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            title={tab.description}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// === STATS COMPONENT ===

/**
 * Session statistics component showing focus insights
 */
function SessionStats() {
  const { sessions } = useSessionStore();
  
  // Calculate session-based stats
  const totalSessions = sessions.length;
  
  // Calculate time by session type
  const sessionTypeStats = sessions.reduce((acc, session) => {
    acc[session.sessionType] = (acc[session.sessionType] || 0) + session.duration;
    return acc;
  }, {} as Record<string, number>);
  
  // Format duration
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };
  
  const focusedTime = sessionTypeStats['focused-work'] || 0;
  const researchTime = sessionTypeStats['research'] || 0;
  
  const stats = [
    {
      label: 'Focus Time',
      value: formatDuration(focusedTime),
      description: 'Deep work sessions',
      color: 'text-green-600'
    },
    {
      label: 'Research Time',
      value: formatDuration(researchTime),
      description: 'Learning & exploration',
      color: 'text-blue-600'
    },
    {
      label: 'Total Sessions',
      value: totalSessions.toString(),
      description: 'AI-classified periods',
      color: 'text-gray-600'
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6">
          <div className={`text-2xl font-bold mb-1 ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            {stat.label}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {stat.description}
          </div>
        </div>
      ))}
    </div>
  );
}

// === SIDEBAR COMPONENT ===

/**
 * Sidebar with session filtering and system info
 */
function Sidebar() {
  const [appVersion, setAppVersion] = useState<string>('');
  const [dbHealth, setDbHealth] = useState<boolean | null>(null);
  const [ollamaHealth, setOllamaHealth] = useState<boolean | null>(null);
  const [activeTimeRange, setActiveTimeRange] = useState<string>('today');
  const { updateTypeFilter, typeFilter, updateDateFilter } = useSessionStore();
  
  // Load system information
  useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        if (window.electronAPI) {
          const version = await window.electronAPI.system.getVersion();
          setAppVersion(version);
          
          const health = await window.electronAPI.database.healthCheck();
          setDbHealth(health);
          
          // Check Ollama health
          try {
            const ollamaResponse = await window.electronAPI.ollama.healthCheck();
            setOllamaHealth(ollamaResponse);
          } catch (error) {
            console.warn('Ollama health check failed:', error);
            setOllamaHealth(false);
          }
        }
      } catch (error) {
        console.error('Failed to load system info:', error);
      }
    };

    loadSystemInfo();
  }, []);

  const handleTimeRangeChange = (range: string) => {
    setActiveTimeRange(range);
    const today = new Date();
    
    switch (range) {
      case 'today': {
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        updateDateFilter(startOfToday, endOfToday);
        break;
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        updateDateFilter(yesterday, endOfYesterday);
        break;
      }
      case 'week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setHours(23, 59, 59, 999);
        updateDateFilter(startOfWeek, endOfWeek);
        break;
      }
    }
  };

  const timeRanges = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' }
  ];

  const sessionTypes = [
    { value: 'all', label: 'All Sessions' },
    { value: 'focused-work', label: 'Focused Work' },
    { value: 'research', label: 'Research' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'break', label: 'Break' },
    { value: 'unclear', label: 'Unclear' }
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow border-r dark:border-gray-700 h-screen overflow-y-auto">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Filters</h3>
        
        {/* Time Range Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Range
          </label>
          <select
            value={activeTimeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Session Type Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Session Type
          </label>
          <select
            value={typeFilter}
            onChange={(e) => updateTypeFilter(e.target.value as any)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {sessionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* System Status */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Status</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
              <div className={`w-2 h-2 rounded-full ${dbHealth ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">AI Service</span>
              <div className={`w-2 h-2 rounded-full ${ollamaHealth ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {appVersion && (
            <div>Version: {appVersion}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// === DAILY VIEW COMPONENT ===

/**
 * Daily view component with timeline and recent sessions
 */
function DailyView({ 
  sessions, 
  onSessionClick 
}: { 
  sessions: SessionData[];
  onSessionClick: (session: SessionData) => void;
}) {
  const { dateFilter } = useSessionStore();
  const { sessionColors } = useTheme();

  return (
    <div className="space-y-6">
      <SessionStats />
      
      {/* Timeline Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Daily Timeline</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Click on session blocks to view details
          </div>
        </div>
        
        <TimelineChart
          date={dateFilter.startDate || new Date()}
          sessions={sessions}
          onSessionClick={onSessionClick}
          height={80}
          sessionColors={sessionColors}
        />
      </div>

      {/* Recent Sessions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Sessions</h2>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-2">No sessions found</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Try clicking &quot;Classify Recent&quot; to process your activities
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 10).map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionClick(session)}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: sessionColors?.[session.sessionType] || {
                          'focused-work': '#22c55e',
                          'research': '#3b82f6', 
                          'entertainment': '#f59e0b',
                          'break': '#8b5cf6',
                          'unclear': '#6b7280'
                        }[session.sessionType] 
                      }}
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {session.sessionType.replace('-', ' ')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {Math.round(session.duration / (1000 * 60))}m
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(session.confidenceScore * 100)}% confidence
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * Main dashboard page component with multiple views
 */
export function DashboardPage({ className = '' }: DashboardPageProps) {
  const { 
    sessions, 
    selectedSession, 
    selectSession, 
    fetchSessionsForDate, 
    fetchSessionsByDateRange,
    dateFilter,
    updateDateFilter
  } = useSessionStore();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('daily');
  const { isSettingsPanelOpen, openSettingsPanel, closeSettingsPanel } = useSettingsStore();
  const { sessionColors: _sessionColors } = useTheme();

  // Initialize date filter to today and load sessions
  useEffect(() => {
    const initializeAndLoadSessions = async () => {
      // Set date filter to today if not already set
      if (!dateFilter.startDate && !dateFilter.endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        updateDateFilter(today, endOfDay);
        // Note: updateDateFilter already handles fetching the data, so we don't need to call fetchSessionsForDate here
      }
      // Remove the else if block - updateDateFilter in the session store already handles fetching
    };

    initializeAndLoadSessions();
  }, [
    // Remove dateFilter dependencies to prevent infinite loop
    // dateFilter.startDate,
    // dateFilter.endDate,
    updateDateFilter
  ]);

  // Listen for IPC message to open settings panel from system tray
  useEffect(() => {
    const handleOpenSettingsFromTray = () => {
      openSettingsPanel();
    };

    // Add event listener for settings panel IPC message
    if (window.electronAPI?.events) {
      window.electronAPI.events.addEventListener('open-settings-panel', handleOpenSettingsFromTray);
    }

    return () => {
      // Cleanup event listener
      if (window.electronAPI?.events) {
        window.electronAPI.events.removeEventListener('open-settings-panel', handleOpenSettingsFromTray);
      }
    };
  }, [openSettingsPanel]);

  // Initialize multi-day analysis when switching to multi-day views
  useEffect(() => {
    const initializeMultiDayAnalysis = async () => {
      if (currentView !== 'daily' && sessions.length > 0) {
        const { analyzeMultiDayData, analysisRange } = useMultiDayStore.getState();
        const { settings } = useSettingsStore.getState();
        
        try {
          await analyzeMultiDayData(sessions, analysisRange, settings.focusSessionGoalMinutes);
        } catch (error) {
          console.error('Failed to initialize multi-day analysis:', error);
        }
      }
    };

    initializeMultiDayAnalysis();
  }, [currentView, sessions]);

  const handleSessionClick = (session: SessionData) => {
    selectSession(session);
    setShowSessionModal(true);
  };

  const handleCloseModal = () => {
    setShowSessionModal(false);
    selectSession(null);
  };

  const { 
    weeklySummaries, 
    focusStreak, 
    multiDayData, 
    comparativeAnalysis,
    focusGoalMinutes 
  } = useMultiDayStore();

  const renderCurrentView = () => {
    
    switch (currentView) {
      case 'daily':
        return <DailyView sessions={sessions} onSessionClick={handleSessionClick} />;
      case 'timeline':
        return <MultiDayTimeline onSessionClick={handleSessionClick} />;
      case 'summary': {
        const currentSummary = weeklySummaries.length > 0 ? weeklySummaries[weeklySummaries.length - 1] : null;
        return currentSummary ? (
          <WeeklySummary 
            summary={currentSummary} 
            focusGoalMinutes={focusGoalMinutes} 
          />
        ) : (
          <div className="text-center py-8 text-gray-500">No weekly summary available</div>
        );
      }
      case 'streak':
        return (
          <FocusStreak 
            streak={focusStreak} 
            multiDayData={multiDayData} 
          />
        );
      case 'comparison':
        return comparativeAnalysis ? (
          <ComparativeAnalysis analysis={comparativeAnalysis} />
        ) : (
          <div className="text-center py-8 text-gray-500">No comparative analysis available</div>
        );
      case 'patterns': {
        const { analysisRange } = useMultiDayStore.getState();
        const patternDateRange: AnalysisTimeRange = {
          startDate: analysisRange.startDate,
          endDate: analysisRange.endDate,
          type: 'custom'
        };
        return <PatternAnalysisDashboard dateRange={patternDateRange} />;
      }
      case 'insights':
        return <ProductivityInsightsWidget insights={[]} timeRange="today" />;
      default:
        return <DailyView sessions={sessions} onSessionClick={handleSessionClick} />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="p-6">
        <DashboardHeader 
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <div className="flex">
          <Sidebar />
          
          <div className="flex-1 ml-6">
            {renderCurrentView()}
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      {showSessionModal && selectedSession && (
        <SessionModal
          session={selectedSession}
          isOpen={showSessionModal}
          onClose={handleCloseModal}
          onSessionUpdate={async (sessionId: number, updates: UpdateSessionRequest) => {
            // Handle session updates
            const { updateSession } = useSessionStore.getState();
            await updateSession(sessionId, updates);
          }}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={closeSettingsPanel}
      />
    </div>
  );
} 