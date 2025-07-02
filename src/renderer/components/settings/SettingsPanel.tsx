/**
 * SettingsPanel - User preferences and application settings
 * 
 * Comprehensive settings panel component that provides controls for user
 * preferences, monitoring settings, work schedule configuration, theme
 * customization, and privacy controls. Integrates with settings store
 * for state management and persistence.
 * 
 * @module SettingsPanel
 * @author FocusFlare Team
 * @since 0.2.0
 */

import { useEffect, useState } from 'react';
import { useSettingsStore, useMonitoringState, useWorkSchedule, useThemeSettings } from '@/renderer/stores/settings-store';

// === COMPONENT TYPES ===

/**
 * Props interface for SettingsPanel component
 */
interface SettingsPanelProps {
  /** Whether the settings panel is open */
  isOpen: boolean;
  /** Callback when panel should be closed */
  onClose: () => void;
}

// === CONSTANTS ===

/**
 * Theme preference options
 */
const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Always use light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
  { value: 'system', label: 'System', description: 'Follow system preference' }
] as const;

/**
 * Data retention period options
 */
const RETENTION_OPTIONS = [
  { value: 30, label: '30 days', description: 'Keep data for 1 month' },
  { value: 90, label: '90 days', description: 'Keep data for 3 months' },
  { value: 180, label: '180 days', description: 'Keep data for 6 months' },
  { value: 365, label: '1 year', description: 'Keep data for 1 year' }
];

// === MAIN COMPONENT ===

/**
 * Settings panel component with tabbed interface
 */
export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('monitoring');
  const [clearingData, setClearingData] = useState(false);
  const [clearDataResult, setClearDataResult] = useState<{ activities: number; sessions: number } | null>(null);
  const { settings, updateSettings, isLoading, error, clearError } = useSettingsStore();
  const { isMonitoringPaused, toggleMonitoringPause } = useMonitoringState();
  const workSchedule = useWorkSchedule();
  const themeSettings = useThemeSettings();

  // Load settings on mount
  useEffect(() => {
    const { loadSettings } = useSettingsStore.getState();
    loadSettings();
  }, []);

  // Clear error when panel opens
  useEffect(() => {
    if (isOpen && error) {
      clearError();
    }
  }, [isOpen, error, clearError]);

  /**
   * Handle clearing all activity data
   */
  const handleClearActivityData = async () => {
    if (!window.confirm('Are you sure you want to clear all activity data? This action cannot be undone.')) {
      return;
    }

    setClearingData(true);
    setClearDataResult(null);

    try {
      if (window.electronAPI?.settings?.clearActivityData) {
        const result = await window.electronAPI.settings.clearActivityData();
        setClearDataResult(result);
        
        // Clear the result message after 5 seconds
        setTimeout(() => {
          setClearDataResult(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to clear activity data:', error);
      // You could add error state here if needed
    } finally {
      setClearingData(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'monitoring', label: 'Monitoring', icon: '🔍' },
    { id: 'schedule', label: 'Work Schedule', icon: '⏰' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-600 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Status Section */}
            <div className="mt-8 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Status</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Monitoring:</span>
                  <span className={isMonitoringPaused ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {isMonitoringPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">AI Classification:</span>
                  <span className={settings.aiClassificationEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                    {settings.aiClassificationEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
                <button
                  onClick={clearError}
                  className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Monitoring Tab */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Activity Monitoring</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">Activity Tracking</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          Monitor window activity and classify sessions
                        </div>
                      </div>
                      <button
                        onClick={toggleMonitoringPause}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          isMonitoringPaused
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        } disabled:opacity-50`}
                      >
                        {isLoading ? 'Loading...' : isMonitoringPaused ? 'Resume' : 'Pause'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">AI Classification</div>
                        <div className="text-sm text-gray-600">
                          Use local AI to automatically classify activity sessions
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.aiClassificationEnabled}
                        onChange={(e) => updateSettings({ aiClassificationEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">Notifications</div>
                        <div className="text-sm text-gray-600">
                          Show session summaries and focus insights
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notificationsEnabled}
                        onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">Morning Nudge</div>
                        <div className="text-sm text-gray-600">
                          Gentle reminder about yesterday's activity summary
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.morningNudgeEnabled}
                        onChange={(e) => updateSettings({ morningNudgeEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Work Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Work Schedule</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Start Time
                      </label>
                      <input
                        type="time"
                        value={workSchedule.workHoursStart}
                        onChange={(e) => workSchedule.updateSettings({ workHoursStart: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work End Time
                      </label>
                      <input
                        type="time"
                        value={workSchedule.workHoursEnd}
                        onChange={(e) => workSchedule.updateSettings({ workHoursEnd: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Break Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={workSchedule.breakDurationMinutes}
                        onChange={(e) => workSchedule.updateSettings({ breakDurationMinutes: parseInt(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Daily Focus Goal (minutes)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="480"
                        value={workSchedule.focusSessionGoalMinutes}
                        onChange={(e) => workSchedule.updateSettings({ focusSessionGoalMinutes: parseInt(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme Preference
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {THEME_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              themeSettings.themePreference === option.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="theme"
                              value={option.value}
                              checked={themeSettings.themePreference === option.value}
                              onChange={(e) => themeSettings.updateSettings({ themePreference: e.target.value as any })}
                              className="sr-only"
                            />
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600">{option.description}</div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Colors
                      </label>
                      <div className="space-y-2">
                        {Object.entries(themeSettings.sessionColors || {}).map(([sessionType, color]) => (
                          <div key={sessionType} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{sessionType.replace('-', ' ')}</span>
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => {
                                const currentColors = themeSettings.sessionColors || {};
                                const newColors = { ...currentColors, [sessionType]: e.target.value };
                                themeSettings.updateSettings({ sessionColors: newColors as Record<string, string> });
                              }}
                              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy & Data</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Retention Period
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {RETENTION_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              settings.dataRetentionDays === option.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="retention"
                              value={option.value}
                              checked={settings.dataRetentionDays === option.value}
                              onChange={(e) => updateSettings({ dataRetentionDays: parseInt(e.target.value) })}
                              className="sr-only"
                            />
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600">{option.description}</div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Privacy First</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• All data stays on your computer - nothing is sent to the cloud</p>
                        <p>• AI processing happens locally using Ollama</p>
                        <p>• Sensitive windows (passwords, private browsing) are automatically excluded</p>
                        <p>• You can delete all data at any time</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <button 
                          onClick={handleClearActivityData}
                          disabled={clearingData}
                          className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {clearingData ? 'Clearing Data...' : 'Clear All Activity Data'}
                        </button>
                        {clearDataResult && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                            ✅ Cleared {clearDataResult.activities} activities and {clearDataResult.sessions} sessions
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          const { resetSettings } = useSettingsStore.getState();
                          resetSettings();
                        }}
                        disabled={isLoading}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Resetting...' : 'Reset Settings to Defaults'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// === EXPORTS ===
export default SettingsPanel; 