/**
 * Preload Script - Secure API bridge between main and renderer processes
 * 
 * This script runs in the renderer process but has access to Node.js APIs.
 * It exposes a safe, limited API to the renderer process through the
 * contextBridge, maintaining security while enabling necessary functionality.
 * 
 * @module Preload
 * @author FocusFlare Team
 * @since 0.1.0
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@/shared/types/activity-types';
import type { 
  GetActivitiesByDateRequest, 
  GetRecentActivitiesRequest,
  GetSessionsByDateRequest,
  UpdateSessionRequest,
  ActivityData,
  SessionData
} from '@/shared/types/activity-types';
import type {
  BackupMetadata,
  CreateBackupOptions,
  ListBackupsOptions,
  RestoreBackupOptions,
  DeleteBackupOptions,
  BackupCreateResult,
  N8NStatus,
  N8NExecutionResult,
  SelectDirectoryOptions,
  SelectDirectoryResult
} from '@/shared/types/workflow-types';
import type {
  WindowsCalendarEvent,
  FileAccessEvent,
  ProductivityInsights,
  CalendarIntegrationConfig,
  FileExplorerIntegrationConfig,
  IntegrationStatus as _IntegrationStatus,
  IntegrationDataSummary as _IntegrationDataSummary,
  IntegrationQueryOptions
} from '@/shared/types/windows-integration-types';

// === TYPE DEFINITIONS ===

/**
 * User settings interface
 */
interface UserSettings {
  focusSessionGoalMinutes: number;
  themePreference: 'light' | 'dark' | 'system';
  sessionColors?: Record<string, string>;
  customTheme?: string;
  [key: string]: unknown;
}

/**
 * Analytics result types
 */
interface AnalyticsPattern {
  type: string;
  frequency: number;
  timeRange: { start: string; end: string };
  confidence: number;
}

interface ProductivityTrend {
  date: string;
  focusTime: number;
  distractionTime: number;
  score: number;
}

interface AnalyticsInsight {
  type: string;
  message: string;
  data: Record<string, unknown>;
  confidence: number;
}

/**
 * Windows integration status (simplified)
 */
interface SimpleIntegrationStatus {
  available: boolean;
  enabled: boolean;
  eventCount: number;
}

/**
 * Windows integration data summary (simplified)
 */
interface SimpleIntegrationDataSummary {
  calendarEvents: number;
  fileAccessEvents: number;
  productivityInsights: number;
}

// === EXPOSED API INTERFACE ===

/**
 * API interface exposed to renderer process through contextBridge
 */
interface ElectronAPI {
  // Activity data operations
  activities: {
    /** Get all activities from database */
    getAll: () => Promise<ActivityData[]>;
    /** Get recent activities by hours */
    getRecent: (request: GetRecentActivitiesRequest) => Promise<ActivityData[]>;
    /** Get activities by date range */
    getByDate: (request: GetActivitiesByDateRequest) => Promise<ActivityData[]>;
  };

  // Session data operations
  sessions: {
    /** Get sessions by date range */
    getByDateRange: (request: GetSessionsByDateRequest) => Promise<SessionData[]>;
    /** Update session classification */
    update: (request: UpdateSessionRequest) => Promise<void>;
    /** Trigger session classification */
    classify: () => Promise<void>;
  };
  
  // Pattern analytics operations
  analytics: {
    /** Analyze patterns for date range */
    analyzePatterns: (startDate: string, endDate: string) => Promise<AnalyticsPattern[]>;
    /** Get focus patterns only */
    getFocusPatterns: (startDate: string, endDate: string) => Promise<AnalyticsPattern[]>;
    /** Get distraction patterns only */
    getDistractionPatterns: (startDate: string, endDate: string) => Promise<AnalyticsPattern[]>;
    /** Get productivity trend only */
    getProductivityTrend: (startDate: string, endDate: string) => Promise<ProductivityTrend[]>;
    /** Get insights only */
    getInsights: (startDate: string, endDate: string) => Promise<AnalyticsInsight[]>;
  };
  
  // System operations
  system: {
    /** Show the dashboard window */
    showDashboard: () => Promise<void>;
    /** Hide the dashboard window */
    hideDashboard: () => Promise<void>;
    /** Get application version */
    getVersion: () => Promise<string>;
    /** Test Windows calendar integration availability */
    testCalendarAccess: () => Promise<boolean>;
    /** Test Windows file monitoring availability */
    testFileMonitoring: () => Promise<boolean>;
  };
  
  // Database operations
  database: {
    /** Check database health */
    healthCheck: () => Promise<boolean>;
  };

  // AI/Ollama operations
  ollama: {
    /** Check Ollama health and connectivity */
    healthCheck: () => Promise<boolean>;
  };

  // Monitoring operations
  monitoring: {
    /** Get current monitoring status */
    getStatus: () => Promise<{ isActive: boolean; isPaused: boolean }>;
    /** Pause activity monitoring */
    pause: () => Promise<void>;
    /** Resume activity monitoring */
    resume: () => Promise<void>;
  };

  // Settings operations
  settings: {
    /** Get user settings */
    get: () => Promise<UserSettings>;
    /** Update user settings */
    update: (updates: Partial<UserSettings>) => Promise<void>;
    /** Reset settings to defaults */
    reset: () => Promise<void>;
    /** Clear all activity data */
    clearActivityData: () => Promise<{ activities: number; sessions: number }>;
  };

  // Workflow operations
  workflows: {
    /** Get N8N workflow status */
    getStatus: () => Promise<N8NStatus>;
    /** Execute N8N workflow */
    execute: (webhookPath: string, data?: Record<string, unknown>) => Promise<N8NExecutionResult>;
    /** Start N8N instance */
    startN8N: () => Promise<void>;
    /** Stop N8N instance */
    stopN8N: () => Promise<void>;
    /** Trigger session end workflow */
    triggerSessionEnd: (sessionData: SessionData) => Promise<N8NExecutionResult>;
    /** Trigger daily summary workflow */
    triggerDailySummary: () => Promise<N8NExecutionResult>;
  };

  // Workflow backup operations
  workflowBackup: {
    /** Create a new workflow backup */
    create: (options?: CreateBackupOptions) => Promise<BackupCreateResult>;
    /** List all available backups */
    list: (options?: ListBackupsOptions) => Promise<BackupMetadata[]>;
    /** Restore workflows from backup */
    restore: (options: RestoreBackupOptions) => Promise<string[]>;
    /** Delete a backup */
    delete: (options: DeleteBackupOptions) => Promise<void>;
  };

  // Dialog operations
  dialog: {
    /** Select directory using native dialog */
    selectDirectory: (options?: SelectDirectoryOptions) => Promise<SelectDirectoryResult>;
  };

  // Windows integrations operations
  windowsIntegrations: {
    /** Get Windows calendar integration status */
    getCalendarStatus: () => Promise<SimpleIntegrationStatus>;
    /** Get Windows file explorer integration status */
    getFileExplorerStatus: () => Promise<SimpleIntegrationStatus>;
    /** Initialize Windows calendar integration */
    initializeCalendar: (config: CalendarIntegrationConfig) => Promise<SimpleIntegrationStatus>;
    /** Initialize Windows file explorer integration */
    initializeFileExplorer: (config: FileExplorerIntegrationConfig) => Promise<SimpleIntegrationStatus>;
    /** Update Windows calendar integration config */
    updateCalendarConfig: (config: Partial<CalendarIntegrationConfig>) => Promise<void>;
    /** Update Windows file explorer integration config */
    updateFileExplorerConfig: (config: Partial<FileExplorerIntegrationConfig>) => Promise<void>;
    /** Get Windows calendar events */
    getCalendarEvents: (options: IntegrationQueryOptions) => Promise<WindowsCalendarEvent[]>;
    /** Get Windows file access events */
    getFileAccessEvents: (options: IntegrationQueryOptions) => Promise<FileAccessEvent[]>;
    /** Generate productivity insights */
    generateInsights: (sessions: SessionData[], calendarEvents: WindowsCalendarEvent[], fileEvents: FileAccessEvent[]) => Promise<ProductivityInsights[]>;
    /** Generate single productivity insight */
    generateSingleInsight: (session: SessionData, calendarEvents: WindowsCalendarEvent[], fileEvents: FileAccessEvent[]) => Promise<ProductivityInsights>;
    /** Update productivity insights config */
    updateInsightsConfig: (config: Record<string, unknown>) => Promise<void>;
    /** Clear Windows integration data */
    clearData: () => Promise<boolean>;
    /** Get Windows integration data summary */
    getDataSummary: () => Promise<SimpleIntegrationDataSummary>;
  };

  // Event operations
  events: {
    /** Add event listener for IPC messages from main process */
    addEventListener: (channel: string, callback: (...args: any[]) => void) => void;
    /** Remove event listener for IPC messages */
    removeEventListener: (channel: string, callback: (...args: any[]) => void) => void;
  };

  // Generic IPC invoke method for flexibility
  invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>;
}

// === SECURE API IMPLEMENTATION ===

/**
 * Safe wrapper for IPC communication with proper error handling
 */
function createSafeIpcInvoke<TRequest = void, TResponse = unknown>(
  channel: string
) {
  return async (request?: TRequest): Promise<TResponse> => {
    try {
      const result = await ipcRenderer.invoke(channel, request);
      return result;
    } catch (error) {
      console.error(`IPC call failed for channel ${channel}:`, error);
      throw error;
    }
  };
}

/**
 * Activities API - Safe wrappers for activity data operations
 */
const activitiesAPI = {
  /**
   * Retrieves all activities from the database
   * @returns Promise resolving to array of activity data
   */
  getAll: createSafeIpcInvoke<void, ActivityData[]>(IPC_CHANNELS.GET_ACTIVITIES),
  
  /**
   * Retrieves recent activities within specified time range
   * @param request - Request parameters including hours and limit
   * @returns Promise resolving to array of recent activity data
   */
  getRecent: createSafeIpcInvoke<GetRecentActivitiesRequest, ActivityData[]>(
    IPC_CHANNELS.GET_RECENT_ACTIVITIES
  ),
  
  /**
   * Retrieves activities within specified date range
   * @param request - Request parameters including date range and limit
   * @returns Promise resolving to array of activity data
   */
  getByDate: createSafeIpcInvoke<GetActivitiesByDateRequest, ActivityData[]>(
    IPC_CHANNELS.GET_ACTIVITIES_BY_DATE
  )
};

/**
 * System API - Safe wrappers for system operations
 */
const systemAPI = {
  /**
   * Shows the dashboard window
   */
  showDashboard: createSafeIpcInvoke<void, void>(IPC_CHANNELS.SHOW_DASHBOARD),
  
  /**
   * Hides the dashboard window
   */
  hideDashboard: createSafeIpcInvoke<void, void>(IPC_CHANNELS.HIDE_DASHBOARD),
  
  /**
   * Gets the application version
   */
  getVersion: createSafeIpcInvoke<void, string>(IPC_CHANNELS.GET_APP_VERSION),
  
  /**
   * Tests Windows calendar integration availability
   */
  testCalendarAccess: createSafeIpcInvoke<void, boolean>('windows-integrations:test-calendar'),
  
  /**
   * Tests Windows file monitoring availability
   */
  testFileMonitoring: createSafeIpcInvoke<void, boolean>('windows-integrations:test-file-explorer')
};

/**
 * Sessions API - Safe wrappers for session operations
 */
const sessionsAPI = {
  /**
   * Retrieves sessions within specified date range
   * @param request - Request parameters including date range and limit
   * @returns Promise resolving to array of session data
   */
  getByDateRange: createSafeIpcInvoke<GetSessionsByDateRequest, SessionData[]>(
    IPC_CHANNELS.GET_SESSIONS_BY_DATE
  ),
  
  /**
   * Updates session classification and feedback
   * @param request - Update request with session ID and changes
   */
  update: createSafeIpcInvoke<UpdateSessionRequest, void>(
    IPC_CHANNELS.UPDATE_SESSION
  ),
  
  /**
   * Triggers session classification for recent activities
   */
  classify: createSafeIpcInvoke<void, void>(IPC_CHANNELS.CLASSIFY_SESSION)
};

/**
 * Database API - Safe wrappers for database operations
 */
const databaseAPI = {
  /**
   * Performs a database health check
   * @returns Promise resolving to true if database is healthy
   */
  healthCheck: createSafeIpcInvoke<void, boolean>(IPC_CHANNELS.DB_HEALTH_CHECK)
};

/**
 * Ollama API - Safe wrappers for AI/Ollama operations
 */
const ollamaAPI = {
  /**
   * Performs an Ollama health check
   * @returns Promise resolving to true if Ollama is connected
   */
  healthCheck: createSafeIpcInvoke<void, boolean>('ollama:health-check')
};

/**
 * Monitoring API - Safe wrappers for monitoring control operations
 */
const monitoringAPI = {
  /**
   * Gets the current monitoring status
   */
  getStatus: createSafeIpcInvoke<void, { isActive: boolean; isPaused: boolean }>('monitoring:get-status'),
  
  /**
   * Pauses activity monitoring
   */
  pause: createSafeIpcInvoke<void, void>('monitoring:pause'),
  
  /**
   * Resumes activity monitoring
   */
  resume: createSafeIpcInvoke<void, void>('monitoring:resume')
};

/**
 * Settings API - Safe wrappers for settings operations
 */
const settingsAPI = {
  /**
   * Gets current user settings
   */
  get: createSafeIpcInvoke<void, any>('settings:get'),
  
  /**
   * Updates user settings
   */
  update: createSafeIpcInvoke<any, void>('settings:update'),
  
  /**
   * Resets settings to defaults
   */
  reset: createSafeIpcInvoke<void, void>('settings:reset'),
  
  /**
   * Clears all activity data
   */
  clearActivityData: createSafeIpcInvoke<void, { activities: number; sessions: number }>('settings:clear-activity-data')
};

/**
 * Windows Integrations API - Safe wrappers for Windows integration operations
 */
const windowsIntegrationsAPI = {
  /**
   * Gets Windows calendar integration status
   */
  getCalendarStatus: createSafeIpcInvoke<void, { available: boolean; enabled: boolean; eventCount: number }>('windows-calendar:get-status'),
  
  /**
   * Gets Windows file explorer integration status
   */
  getFileExplorerStatus: createSafeIpcInvoke<void, { available: boolean; enabled: boolean; eventCount: number }>('windows-file-explorer:get-status'),
  
  /**
   * Initializes Windows calendar integration
   */
  initializeCalendar: createSafeIpcInvoke<any, { available: boolean; enabled: boolean; eventCount: number }>('windows-calendar:initialize'),
  
  /**
   * Initializes Windows file explorer integration
   */
  initializeFileExplorer: createSafeIpcInvoke<any, { available: boolean; enabled: boolean; eventCount: number }>('windows-file-explorer:initialize'),
  
  /**
   * Updates Windows calendar integration config
   */
  updateCalendarConfig: createSafeIpcInvoke<any, void>('windows-calendar:update-config'),
  
  /**
   * Updates Windows file explorer integration config
   */
  updateFileExplorerConfig: createSafeIpcInvoke<any, void>('windows-file-explorer:update-config'),
  
  /**
   * Gets Windows calendar events
   */
  getCalendarEvents: createSafeIpcInvoke<any, any[]>('windows-calendar:get-events'),
  
  /**
   * Gets Windows file access events
   */
  getFileAccessEvents: createSafeIpcInvoke<any, any[]>('windows-file-explorer:get-events'),
  
  /**
   * Generates productivity insights
   */
  generateInsights: async (sessions: any[], calendarEvents: any[], fileEvents: any[]): Promise<any[]> => {
    try {
      return await ipcRenderer.invoke('productivity-insights:generate', sessions, calendarEvents, fileEvents);
    } catch (error) {
      console.error('Windows integrations generate insights failed:', error);
      throw error;
    }
  },
  
  /**
   * Generates single productivity insight
   */
  generateSingleInsight: async (session: any, calendarEvents: any[], fileEvents: any[]): Promise<any> => {
    try {
      return await ipcRenderer.invoke('productivity-insights:generate-single', session, calendarEvents, fileEvents);
    } catch (error) {
      console.error('Windows integrations generate single insight failed:', error);
      throw error;
    }
  },
  
  /**
   * Updates productivity insights config
   */
  updateInsightsConfig: createSafeIpcInvoke<any, void>('productivity-insights:update-config'),
  
  /**
   * Clears Windows integration data
   */
  clearData: createSafeIpcInvoke<void, boolean>('windows-integrations:clear-data'),
  
  /**
   * Gets Windows integration data summary
   */
  getDataSummary: createSafeIpcInvoke<void, { calendarEvents: number; fileAccessEvents: number; productivityInsights: number }>('windows-integrations:get-data-summary')
};

/**
 * Analytics API - Safe wrappers for pattern analytics operations
 */
const analyticsAPI = {
  /**
   * Analyzes patterns for date range
   */
  analyzePatterns: async (startDate: string, endDate: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('analytics:analyze-patterns', startDate, endDate);
    } catch (error) {
      console.error('Analytics analyze patterns failed:', error);
      throw error;
    }
  },
  
  /**
   * Gets focus patterns only
   */
  getFocusPatterns: async (startDate: string, endDate: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('analytics:get-focus-patterns', startDate, endDate);
    } catch (error) {
      console.error('Analytics get focus patterns failed:', error);
      throw error;
    }
  },
  
  /**
   * Gets distraction patterns only
   */
  getDistractionPatterns: async (startDate: string, endDate: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('analytics:get-distraction-patterns', startDate, endDate);
    } catch (error) {
      console.error('Analytics get distraction patterns failed:', error);
      throw error;
    }
  },
  
  /**
   * Gets productivity trend only
   */
  getProductivityTrend: async (startDate: string, endDate: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('analytics:get-productivity-trend', startDate, endDate);
    } catch (error) {
      console.error('Analytics get productivity trend failed:', error);
      throw error;
    }
  },
  
  /**
   * Gets insights only
   */
  getInsights: async (startDate: string, endDate: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('analytics:get-insights', startDate, endDate);
    } catch (error) {
      console.error('Analytics get insights failed:', error);
      throw error;
    }
  }
};

// === IPC EVENT HANDLERS ===

/**
 * Event handler registry for IPC messages from main process
 */
const eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

/**
 * Register event listener for IPC messages from main process
 * @param channel - The IPC channel to listen on
 * @param callback - Callback function to execute when message received
 */
function addEventListener(channel: string, callback: (...args: any[]) => void): void {
  if (!eventHandlers.has(channel)) {
    eventHandlers.set(channel, new Set());
    
    // Set up IPC listener for this channel
    ipcRenderer.on(channel, (_event: any, ...args: any[]) => {
      const handlers = eventHandlers.get(channel);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in IPC event handler for ${channel}:`, error);
          }
        });
      }
    });
  }
  
  eventHandlers.get(channel)?.add(callback);
}

/**
 * Remove event listener for IPC messages
 * @param channel - The IPC channel to stop listening on
 * @param callback - The callback function to remove
 */
function removeEventListener(channel: string, callback: (...args: any[]) => void): void {
  const handlers = eventHandlers.get(channel);
  if (handlers) {
    handlers.delete(callback);
    
    // If no more handlers, remove the IPC listener
    if (handlers.size === 0) {
      ipcRenderer.removeAllListeners(channel);
      eventHandlers.delete(channel);
    }
  }
}

/**
 * Events API - Safe wrappers for IPC event handling
 */
const eventsAPI = {
  /**
   * Add event listener for IPC messages from main process
   */
  addEventListener,
  
  /**
   * Remove event listener for IPC messages
   */
  removeEventListener
};

// === CONTEXT BRIDGE EXPOSURE ===

/**
 * Complete API object exposed to renderer process
 */
const electronAPI: ElectronAPI = {
  activities: activitiesAPI,
  sessions: sessionsAPI,
  analytics: analyticsAPI,
  system: systemAPI,
  database: databaseAPI,
  ollama: ollamaAPI,
  monitoring: monitoringAPI,
  settings: settingsAPI,
  windowsIntegrations: windowsIntegrationsAPI,
      workflows: {
      /** Get N8N workflow status */
      getStatus: async () => {
        try {
          return await ipcRenderer.invoke('workflow:get-status');
        } catch (error) {
          console.error('Workflows get status failed:', error);
          throw error;
        }
      },
      /** Execute N8N workflow */
      execute: async (webhookPath: string, data?: any) => {
        try {
          return await ipcRenderer.invoke('workflow:execute', webhookPath, data);
        } catch (error) {
          console.error(`Workflows execute failed for webhook ${webhookPath}:`, error);
          throw error;
        }
      },
      /** Start N8N instance */
      startN8N: async () => {
        try {
          await ipcRenderer.invoke('workflow:start-n8n');
        } catch (error) {
          console.error('Workflows start N8N failed:', error);
          throw error;
        }
      },
      /** Stop N8N instance */
      stopN8N: async () => {
        try {
          await ipcRenderer.invoke('workflow:stop-n8n');
        } catch (error) {
          console.error('Workflows stop N8N failed:', error);
          throw error;
        }
      },
      /** Trigger session end workflow */
      triggerSessionEnd: async (sessionData: any) => {
        try {
          return await ipcRenderer.invoke('workflow:trigger-session-end', sessionData);
        } catch (error) {
          console.error('Workflows trigger session end failed:', error);
          throw error;
        }
      },
      /** Trigger daily summary workflow */
      triggerDailySummary: async () => {
        try {
          return await ipcRenderer.invoke('workflow:trigger-daily-summary');
        } catch (error) {
          console.error('Workflows trigger daily summary failed:', error);
          throw error;
        }
      }
    },
    workflowBackup: {
      /** Create a new workflow backup */
      create: async (options?: { name?: string; location?: string }) => {
        try {
          return await ipcRenderer.invoke('workflow-backup:create', options);
        } catch (error) {
          console.error('Workflow backup create failed:', error);
          throw error;
        }
      },
      /** List all available backups */
      list: async (options?: { location?: string }) => {
        try {
          return await ipcRenderer.invoke('workflow-backup:list', options);
        } catch (error) {
          console.error('Workflow backup list failed:', error);
          throw error;
        }
      },
      /** Restore workflows from backup */
      restore: async (options: { backupId: string; location?: string }) => {
        try {
          return await ipcRenderer.invoke('workflow-backup:restore', options);
        } catch (error) {
          console.error('Workflow backup restore failed:', error);
          throw error;
        }
      },
      /** Delete a backup */
      delete: async (options: { backupId: string; location?: string }) => {
        try {
          await ipcRenderer.invoke('workflow-backup:delete', options);
        } catch (error) {
          console.error('Workflow backup delete failed:', error);
          throw error;
        }
      }
    },
    dialog: {
      /** Select directory using native dialog */
      selectDirectory: async (options?: { title?: string; defaultPath?: string; buttonLabel?: string }) => {
        try {
          return await ipcRenderer.invoke('dialog:select-directory', options);
        } catch (error) {
          console.error('Dialog select directory failed:', error);
          throw error;
        }
      }
    },
  events: eventsAPI,
  invoke: async <T = any>(channel: string, ...args: any[]): Promise<T> => {
    try {
      const result = await ipcRenderer.invoke(channel, ...args);
      return result;
    } catch (error) {
      console.error(`IPC call failed for channel ${channel}:`, error);
      throw error;
    }
  }
};

// Expose the API to renderer process through contextBridge
try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('Preload script: API exposed successfully');
} catch (error) {
  console.error('Preload script: Failed to expose API:', error);
}

// === TYPE DECLARATIONS FOR RENDERER ===

/**
 * Global type declaration for renderer process
 * This makes the electronAPI available in TypeScript
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 