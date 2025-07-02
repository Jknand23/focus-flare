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
  
  // System operations
  system: {
    /** Show the dashboard window */
    showDashboard: () => Promise<void>;
    /** Hide the dashboard window */
    hideDashboard: () => Promise<void>;
    /** Get application version */
    getVersion: () => Promise<string>;
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
    get: () => Promise<any>;
    /** Update user settings */
    update: (updates: any) => Promise<void>;
    /** Reset settings to defaults */
    reset: () => Promise<void>;
    /** Clear all activity data */
    clearActivityData: () => Promise<{ activities: number; sessions: number }>;
  };

  // Event operations
  events: {
    /** Add event listener for IPC messages from main process */
    addEventListener: (channel: string, callback: (...args: any[]) => void) => void;
    /** Remove event listener for IPC messages */
    removeEventListener: (channel: string, callback: (...args: any[]) => void) => void;
  };
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
  getVersion: createSafeIpcInvoke<void, string>(IPC_CHANNELS.GET_APP_VERSION)
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
  system: systemAPI,
  database: databaseAPI,
  ollama: ollamaAPI,
  monitoring: monitoringAPI,
  settings: settingsAPI,
  events: eventsAPI
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