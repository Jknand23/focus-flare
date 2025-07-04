/**
 * Activity Logger - System monitoring and activity data collection
 * 
 * Monitors active windows and user activity on Windows systems. Captures
 * application usage data while respecting privacy settings and filtering
 * out sensitive information. Implements polling-based monitoring with
 * configurable intervals and robust error handling.
 * 
 * @module ActivityLogger
 * @author FocusFlare Team
 * @since 0.1.0
 */

/// <reference types="node" />

import activeWin from 'active-win';
import { insertActivity } from '@/main/database/connection';
import {
  DEFAULT_POLLING_INTERVAL,
  MAX_MONITORING_RETRIES,
  EXCLUDED_APPS,
  EXCLUDED_TITLE_PATTERNS,
  DEBUG_LOGGING,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '@/shared/constants/app-constants';

// === TYPES ===

/**
 * Active window information from system monitoring
 */
interface ActiveWindowInfo {
  /** Application name */
  appName: string;
  /** Window title */
  windowTitle: string;
  /** Process ID */
  processId: number;
  /** Window bounds */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Activity session tracking for duration calculation
 */
interface ActivitySession {
  /** Application name */
  appName: string;
  /** Window title */
  windowTitle: string;
  /** Session start time */
  startTime: Date;
  /** Last seen time */
  lastSeen: Date;
}

// === STATE MANAGEMENT ===

/** Current monitoring state */
let isMonitoring = false;

/** Polling interval timer */
let pollingTimer: NodeJS.Timeout | null = null;

/** Current polling interval in milliseconds */
let currentPollingInterval = DEFAULT_POLLING_INTERVAL;

/** Current activity session */
let currentSession: ActivitySession | null = null;

/** Retry counter for failed monitoring operations */
let retryCount = 0;

// === PRIVACY FILTERING ===

/**
 * Checks if an application should be excluded from tracking
 * 
 * @param appName - Application name to check
 * @returns True if application should be excluded
 */
function isAppExcluded(appName: string): boolean {
  if (!appName) return true;
  
  const normalizedAppName = appName.toLowerCase();
  return EXCLUDED_APPS.some(excludedApp => 
    normalizedAppName.includes(excludedApp.toLowerCase())
  );
}

/**
 * Checks if a window title contains sensitive information
 * 
 * @param windowTitle - Window title to check
 * @returns True if window title should be excluded
 */
function isTitleExcluded(windowTitle: string): boolean {
  if (!windowTitle) return false;
  
  const normalizedTitle = windowTitle.toLowerCase();
  return EXCLUDED_TITLE_PATTERNS.some(pattern =>
    normalizedTitle.includes(pattern.toLowerCase())
  );
}

/**
 * Sanitizes window title for privacy
 * 
 * @param windowTitle - Original window title
 * @param appName - Application name for context
 * @returns Sanitized window title
 */
function sanitizeWindowTitle(windowTitle: string, appName: string): string {
  if (!windowTitle) return '';
  
  // If title contains sensitive patterns, return generic title
  if (isTitleExcluded(windowTitle)) {
    return `${appName} - [Private]`;
  }
  
  // Limit title length to prevent extremely long titles
  const maxTitleLength = 100;
  if (windowTitle.length > maxTitleLength) {
    return windowTitle.substring(0, maxTitleLength) + '...';
  }
  
  return windowTitle;
}

// === ACTIVITY MONITORING ===

/**
 * Gets the currently active window information
 * 
 * @returns Promise resolving to active window info or null if none
 */
async function getCurrentActiveWindow(): Promise<ActiveWindowInfo | null> {
  try {
    const activeWindow = await activeWin();
    
    if (!activeWindow) {
      return null;
    }
    
    return {
      appName: activeWindow.owner?.name || 'Unknown',
      windowTitle: activeWindow.title || '',
      processId: activeWindow.owner?.processId || 0,
      bounds: {
        x: activeWindow.bounds?.x || 0,
        y: activeWindow.bounds?.y || 0,
        width: activeWindow.bounds?.width || 0,
        height: activeWindow.bounds?.height || 0
      }
    };
  } catch (error) {
    console.error('Failed to get active window:', error);
    return null;
  }
}

/**
 * Processes a new activity detection
 * 
 * @param windowInfo - Current active window information
 */
function processActivity(windowInfo: ActiveWindowInfo): void {
  try {
    const { appName, windowTitle } = windowInfo;
    
    // Skip excluded applications
    if (isAppExcluded(appName)) {
      if (DEBUG_LOGGING) {
        console.log(`Skipping excluded app: ${appName}`);
      }
      return;
    }
    
    // Sanitize window title
    const sanitizedTitle = sanitizeWindowTitle(windowTitle, appName);
    
    const now = new Date();
    
    // Check if this is a continuation of the current session
    if (currentSession && 
        currentSession.appName === appName && 
        currentSession.windowTitle === sanitizedTitle) {
      // Update last seen time
      currentSession.lastSeen = now;
      return;
    }
    
    // End current session if it exists
    if (currentSession) {
      const sessionDuration = currentSession.lastSeen.getTime() - currentSession.startTime.getTime();
      
      // Only log sessions longer than 1 second
      if (sessionDuration > 1000) {
        insertActivity({
          appName: currentSession.appName,
          windowTitle: currentSession.windowTitle,
          duration: sessionDuration,
          timestamp: currentSession.startTime,
          activityLevel: 'active', // Default for legacy logger
          interactionCount: 0,
          isProcessing: false,
          cpuUsage: 0.0
        });
        
        if (DEBUG_LOGGING) {
          console.log(`Logged activity: ${currentSession.appName} - ${sessionDuration}ms`);
        }
      }
    }
    
    // Start new session
    currentSession = {
      appName,
      windowTitle: sanitizedTitle,
      startTime: now,
      lastSeen: now
    };
    
  } catch (error) {
    console.error('Failed to process activity:', error);
  }
}

/**
 * Main monitoring loop that polls for active window changes
 */
async function monitoringLoop(): Promise<void> {
  try {
    const windowInfo = await getCurrentActiveWindow();
    
    if (windowInfo) {
      processActivity(windowInfo);
      // Reset retry count on successful operation
      retryCount = 0;
    }
    
  } catch (error) {
    console.error('Monitoring loop error:', error);
    retryCount++;
    
    // Stop monitoring if too many consecutive failures
    if (retryCount >= MAX_MONITORING_RETRIES) {
      console.error(`Stopping monitoring after ${MAX_MONITORING_RETRIES} failures`);
      await stopActivityLogging();
      return;
    }
  }
  
  // Schedule next polling cycle
  if (isMonitoring) {
    pollingTimer = setTimeout(monitoringLoop, currentPollingInterval);
  }
}

// === PUBLIC API ===

/**
 * Starts activity logging with system monitoring
 * 
 * Begins polling the active window and logging activity data to the database.
 * Implements retry logic and graceful error handling for monitoring failures.
 * 
 * @param pollingInterval - Polling interval in milliseconds (optional)
 * @returns Promise resolving to true if monitoring started successfully
 */
export async function startActivityLogging(pollingInterval?: number): Promise<boolean> {
  try {
    if (isMonitoring) {
      if (DEBUG_LOGGING) {
        console.log('Activity logging already running');
      }
      return true;
    }
    
    // Update polling interval if provided
    if (pollingInterval && pollingInterval > 0) {
      currentPollingInterval = pollingInterval;
    }
    
    // Reset state
    retryCount = 0;
    currentSession = null;
    isMonitoring = true;
    
    // Start monitoring loop
    monitoringLoop();
    
    if (DEBUG_LOGGING) {
      console.log(SUCCESS_MESSAGES.MONITORING_STARTED);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to start activity logging:', error);
    isMonitoring = false;
    throw new Error(`${ERROR_MESSAGES.MONITORING_FAILED}: ${error}`);
  }
}

/**
 * Stops activity logging and system monitoring
 * 
 * Gracefully stops the monitoring loop, finalizes any current session,
 * and cleans up resources.
 * 
 * @returns Promise resolving when monitoring is stopped
 */
export async function stopActivityLogging(): Promise<void> {
  try {
    if (!isMonitoring) {
      return;
    }
    
    isMonitoring = false;
    
    // Clear polling timer
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }
    
    // Finalize current session
    if (currentSession) {
      const sessionDuration = currentSession.lastSeen.getTime() - currentSession.startTime.getTime();
      
      if (sessionDuration > 1000) {
        insertActivity({
          appName: currentSession.appName,
          windowTitle: currentSession.windowTitle,
          duration: sessionDuration,
          timestamp: currentSession.startTime,
          activityLevel: 'active', // Default for legacy logger
          interactionCount: 0,
          isProcessing: false,
          cpuUsage: 0.0
        });
      }
      
      currentSession = null;
    }
    
    if (DEBUG_LOGGING) {
      console.log(SUCCESS_MESSAGES.MONITORING_STOPPED);
    }
  } catch (error) {
    console.error('Error stopping activity logging:', error);
  }
}

/**
 * Gets the current monitoring status
 * 
 * @returns True if monitoring is currently active
 */
export function isActivityLoggingActive(): boolean {
  return isMonitoring;
}

/**
 * Updates the polling interval for system monitoring
 * 
 * @param interval - New polling interval in milliseconds
 * @returns True if interval was updated successfully
 */
export function updatePollingInterval(interval: number): boolean {
  if (interval < 1000 || interval > 30000) {
    console.error('Invalid polling interval. Must be between 1000ms and 30000ms');
    return false;
  }
  
  currentPollingInterval = interval;
  
  if (DEBUG_LOGGING) {
    console.log(`Polling interval updated to ${interval}ms`);
  }
  
  return true;
} 