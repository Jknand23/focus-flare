/**
 * Settings Store - User preferences and application settings
 * 
 * Zustand store for managing user settings, preferences, and application state
 * including monitoring controls, theme preferences, and work schedule settings.
 * Provides actions for updating settings and toggling monitoring state.
 * 
 * @module SettingsStore
 * @author FocusFlare Team
 * @since 0.2.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserSettings, SettingsUpdate } from '@/shared/types/activity-types';

// === TYPES ===

/**
 * Settings store state interface
 */
interface SettingsState {
  /** Current user settings */
  settings: UserSettings;
  /** Whether monitoring is currently paused */
  isMonitoringPaused: boolean;
  /** Whether settings panel is open */
  isSettingsPanelOpen: boolean;
  /** Loading state for settings operations */
  isLoading: boolean;
  /** Error message if settings operation failed */
  error: string | null;
}

/**
 * Settings store actions interface  
 */
interface SettingsActions {
  /** Toggle monitoring pause/resume */
  toggleMonitoringPause: () => Promise<void>;
  /** Update user settings */
  updateSettings: (updates: SettingsUpdate) => Promise<void>;
  /** Reset settings to defaults */
  resetSettings: () => Promise<void>;
  /** Open settings panel */
  openSettingsPanel: () => void;
  /** Close settings panel */
  closeSettingsPanel: () => void;
  /** Load settings from main process */
  loadSettings: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Combined settings store interface
 */
type SettingsStore = SettingsState & SettingsActions;

// === DEFAULT SETTINGS ===

/**
 * Default user settings configuration
 */
const DEFAULT_SETTINGS: UserSettings = {
  workHoursStart: '09:00',
  workHoursEnd: '17:00',
  breakDurationMinutes: 15,
  focusSessionGoalMinutes: 120, // 2 hours per day
  themePreference: 'system',
  notificationsEnabled: true,
  morningNudgeEnabled: true,
  dataRetentionDays: 90, // 3 months
  aiClassificationEnabled: true,
  sessionColors: {
    'focused-work': '#10b981', // green
    'research': '#3b82f6',     // blue
    'entertainment': '#f59e0b', // amber
    'break': '#8b5cf6',        // purple
    'unclear': '#6b7280'       // gray
  }
};

// === STORE IMPLEMENTATION ===

/**
 * Create settings store with persistence
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // === STATE ===
      settings: DEFAULT_SETTINGS,
      isMonitoringPaused: false,
      isSettingsPanelOpen: false,
      isLoading: false,
      error: null,

      // === ACTIONS ===

      /**
       * Toggle monitoring pause/resume state
       */
      toggleMonitoringPause: async () => {
        const { isMonitoringPaused } = get();
        
        try {
          set({ isLoading: true, error: null });

          // Call main process to toggle monitoring
          if (window.electronAPI?.monitoring) {
            if (isMonitoringPaused) {
              await window.electronAPI.monitoring.resume();
            } else {
              await window.electronAPI.monitoring.pause();
            }
          }

          set({ 
            isMonitoringPaused: !isMonitoringPaused,
            isLoading: false 
          });

          console.log(`Monitoring ${!isMonitoringPaused ? 'paused' : 'resumed'}`);
        } catch (error) {
          console.error('Failed to toggle monitoring:', error);
          set({ 
            error: 'Failed to toggle monitoring', 
            isLoading: false 
          });
        }
      },

      /**
       * Update user settings
       */
      updateSettings: async (updates: SettingsUpdate) => {
        try {
          set({ isLoading: true, error: null });

          const currentSettings = get().settings;
          const newSettings = { ...currentSettings, ...updates };

          // Update in main process if available
          if (window.electronAPI?.settings) {
            await window.electronAPI.settings.update(updates);
          }

          set({ 
            settings: newSettings,
            isLoading: false 
          });

          console.log('Settings updated:', updates);
        } catch (error) {
          console.error('Failed to update settings:', error);
          set({ 
            error: 'Failed to update settings', 
            isLoading: false 
          });
        }
      },

      /**
       * Reset settings to defaults
       */
      resetSettings: async () => {
        try {
          set({ isLoading: true, error: null });

          // Reset in main process if available
          if (window.electronAPI?.settings) {
            await window.electronAPI.settings.reset();
          }

          set({ 
            settings: DEFAULT_SETTINGS,
            isLoading: false 
          });

          console.log('Settings reset to defaults');
        } catch (error) {
          console.error('Failed to reset settings:', error);
          set({ 
            error: 'Failed to reset settings', 
            isLoading: false 
          });
        }
      },

      /**
       * Open settings panel
       */
      openSettingsPanel: () => {
        set({ isSettingsPanelOpen: true });
      },

      /**
       * Close settings panel
       */
      closeSettingsPanel: () => {
        set({ isSettingsPanelOpen: false });
      },

      /**
       * Load settings from main process
       */
      loadSettings: async () => {
        try {
          set({ isLoading: true, error: null });

          // Load from main process if available
          if (window.electronAPI?.settings) {
            const loadedSettings = await window.electronAPI.settings.get();
            set({ 
              settings: { ...DEFAULT_SETTINGS, ...loadedSettings },
              isLoading: false 
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
          set({ 
            error: 'Failed to load settings', 
            isLoading: false 
          });
        }
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'focusflare-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        isMonitoringPaused: state.isMonitoringPaused
      })
    }
  )
);

// === UTILITY HOOKS ===

/**
 * Hook to get current monitoring state
 */
export function useMonitoringState() {
  return useSettingsStore((state) => ({
    isMonitoringPaused: state.isMonitoringPaused,
    toggleMonitoringPause: state.toggleMonitoringPause,
    isLoading: state.isLoading
  }));
}

/**
 * Hook to get current theme settings
 */
export function useThemeSettings() {
  return useSettingsStore((state) => ({
    themePreference: state.settings.themePreference,
    sessionColors: state.settings.sessionColors,
    customTheme: state.settings.customTheme,
    updateSettings: state.updateSettings
  }));
}

/**
 * Hook to get work schedule settings
 */
export function useWorkSchedule() {
  return useSettingsStore((state) => ({
    workHoursStart: state.settings.workHoursStart,
    workHoursEnd: state.settings.workHoursEnd,
    breakDurationMinutes: state.settings.breakDurationMinutes,
    focusSessionGoalMinutes: state.settings.focusSessionGoalMinutes,
    updateSettings: state.updateSettings
  }));
}

// === EXPORTS ===
export default useSettingsStore; 