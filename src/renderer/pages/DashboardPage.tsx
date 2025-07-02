/**
 * DashboardPage - Main dashboard interface for FocusFlare
 * 
 * Primary page component that displays intelligent session classification data
 * with timeline visualization. Features AI-powered session detection, color-coded
 * timeline, and user feedback for continuous learning. Core component for
 * Phase 2 MVP functionality.
 * 
 * @module DashboardPage
 * @author FocusFlare Team
 * @since 0.2.0
 */

import { useEffect, useState } from 'react';
import { TimelineChart } from '@/renderer/components/timeline/TimelineChart';
import { SessionModal } from '@/renderer/components/dashboard/SessionModal';
import { SettingsPanel } from '@/renderer/components/settings/SettingsPanel';
import { useSessionStore } from '@/renderer/stores/session-store';
import { useSettingsStore } from '@/renderer/stores/settings-store';
import { useTheme } from '@/renderer/components/theme/ThemeProvider';
import type { SessionData, UpdateSessionRequest } from '@/shared/types/activity-types';

// === COMPONENT TYPES ===

/**
 * Props interface for DashboardPage component
 */
interface DashboardPageProps {
  /** Optional CSS class name */
  className?: string;
}

// === HEADER COMPONENT ===

/**
 * Dashboard header with title and controls
 */
function DashboardHeader() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const { refreshData, triggerClassification } = useSessionStore();
  const { openSettingsPanel } = useSettingsStore();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
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
    } catch (error) {
      console.error('Failed to trigger classification:', error);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleOpenSettings = () => {
    openSettingsPanel();
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Focus Dashboard</h1>
        <p className="text-gray-600">Track your daily activities and focus patterns</p>
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
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
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

          // Check Ollama health using IPC (secure)
          const ollamaHealth = await window.electronAPI.ollama.healthCheck();
          setOllamaHealth(ollamaHealth);
        }
      } catch (error) {
        console.error('Failed to load system info:', error);
      }
    };
    
    loadSystemInfo();
  }, []);

  const sessionTypes = [
    { id: 'all', label: 'All Sessions', color: '' },
    { id: 'focused-work', label: 'Focused Work', color: 'text-green-600' },
    { id: 'research', label: 'Research', color: 'text-blue-600' },
    { id: 'entertainment', label: 'Entertainment', color: 'text-orange-600' },
    { id: 'break', label: 'Breaks', color: 'text-purple-600' },
    { id: 'unclear', label: 'Unclear', color: 'text-gray-600' }
  ];

  const timeRanges = [
    { id: 'today', label: 'Today', handler: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      updateDateFilter(today, endOfDay);
      setActiveTimeRange('today');
    }},
    { id: 'yesterday', label: 'Yesterday', handler: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const endOfDay = new Date(yesterday);
      endOfDay.setHours(23, 59, 59, 999);
      updateDateFilter(yesterday, endOfDay);
      setActiveTimeRange('yesterday');
    }},
    { id: 'week', label: 'Last 7 Days', handler: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      updateDateFilter(startDate, endDate);
      setActiveTimeRange('week');
    }}
  ];
  
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
      <div className="p-6 flex-1">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                Database: 
                <span className={`ml-1 ${dbHealth ? 'text-green-600' : 'text-red-600'}`}>
                  {dbHealth === null ? 'Checking...' : dbHealth ? 'Healthy' : 'Error'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                AI (Ollama): 
                <span className={`ml-1 ${ollamaHealth ? 'text-green-600' : 'text-red-600'}`}>
                  {ollamaHealth === null ? 'Checking...' : ollamaHealth ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Session Types</h3>
            <div className="space-y-1">
              {sessionTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => updateTypeFilter(type.id as any)}
                  className={`w-full text-left text-sm py-1 px-2 rounded hover:bg-gray-50 ${
                    typeFilter === type.id ? 'bg-blue-50 text-blue-700 font-medium' : `text-gray-600 ${type.color}`
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Time Ranges</h3>
            <div className="space-y-1">
              {timeRanges.map((range) => (
                <button
                  key={range.id}
                  onClick={range.handler}
                  className={`w-full text-left text-sm py-1 px-2 rounded hover:bg-gray-50 ${
                    activeTimeRange === range.id 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {appVersion && (
            <div>Version: {appVersion}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * Main dashboard page component with session timeline
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
  const { isSettingsPanelOpen, openSettingsPanel, closeSettingsPanel } = useSettingsStore();
  const { sessionColors } = useTheme();

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
        // Load sessions for today
        await fetchSessionsForDate(today);
      } else if (dateFilter.startDate && dateFilter.endDate) {
        // Load sessions for current date filter
        await fetchSessionsByDateRange(dateFilter.startDate, dateFilter.endDate);
      }
    };

    initializeAndLoadSessions();
  }, [
    dateFilter.startDate?.getTime(), 
    dateFilter.endDate?.getTime(),
    // Note: fetchSessionsForDate, fetchSessionsByDateRange, updateDateFilter are stable functions from Zustand
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

  const handleSessionClick = (session: SessionData) => {
    selectSession(session);
    setShowSessionModal(true);
  };

  const handleCloseModal = () => {
    setShowSessionModal(false);
    selectSession(null);
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <DashboardHeader />
      
      <div className="flex">
        <Sidebar />
        
        <div className="flex-1 p-6">
          <SessionStats />
          
          {/* Timeline Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Daily Timeline</h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Click on session blocks to view details
              </div>
            </div>
            
            <TimelineChart
              date={dateFilter.startDate || new Date()}
              sessions={sessions}
              onSessionClick={handleSessionClick}
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
                  Try clicking "Classify Recent" to process your activities
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 10).map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
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