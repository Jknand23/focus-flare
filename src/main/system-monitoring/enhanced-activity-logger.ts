/**
 * Enhanced Activity Logger - Intelligent activity monitoring and classification
 * 
 * Combines window focus monitoring, user interaction tracking, and system resource
 * monitoring to provide sophisticated activity detection. Implements the enhanced
 * monitoring requirements including per-app activity levels, idle detection, and
 * special handling for apps like YouTube and Cursor.
 * 
 * @module EnhancedActivityLogger
 * @author FocusFlare Team
 * @since 0.3.0
 */

import activeWin from 'active-win';
import { insertActivity } from '@/main/database/connection';
import { 
  startUserInteractionMonitoring,
  stopUserInteractionMonitoring,
  getInteractionCount,
  getAppActivityState
} from './user-interaction-monitor';
import { 
  startResourceMonitoring,
  stopResourceMonitoring,
  getAppResourceUsage,
  isAppProcessing
} from './system-resource-monitor';
import { processActivitiesIntoSessions } from '@/main/ai-integration/session-classifier';
import { getUnclassifiedActivities } from '@/main/database/connection';
import type { 
  ActivityLevel, 
  RawActivityData 
} from '@/shared/types/activity-types';
import {
  ACTIVITY_LEVEL_CHECK_INTERVAL,
  USER_INTERACTION_IDLE_TIMEOUT,
  EXCLUDED_APPS,
  EXCLUDED_TITLE_PATTERNS,
  DEBUG_LOGGING,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '@/shared/constants/app-constants';

// === TYPES ===

/**
 * Enhanced activity session with detailed state tracking
 */
interface EnhancedActivitySession {
  /** Application name */
  appName: string;
  /** Window title */
  windowTitle: string;
  /** Session start time */
  startTime: Date;
  /** Last update time */
  lastUpdate: Date;
  /** Current activity level */
  activityLevel: ActivityLevel;
  /** User interaction count in this session */
  interactionCount: number;
  /** Whether app is processing */
  isProcessing: boolean;
  /** CPU usage during session */
  cpuUsage: number;
  /** Whether this is the primary focused app */
  isPrimaryFocus: boolean;
}

/**
 * App context for special behavior rules
 */
interface AppContext {
  /** Application name */
  appName: string;
  /** Whether app can be passive while other apps are active */
  canBePassive: boolean;
  /** Whether app requires special processing detection */
  hasSpecialProcessing: boolean;
  /** Minimum time to be considered actively engaged (ms) */
  minimumActiveTime: number;
}

// === CONSTANTS ===

/** Session classification interval (15 minutes) */
const SESSION_CLASSIFICATION_INTERVAL = 15 * 60 * 1000;

// === GLOBAL STATE ===

/** Current monitoring state */
let isMonitoring = false;

/** Timer for main monitoring loop */
let monitoringTimer: NodeJS.Timeout | null = null;

/** Timer for session classification */
let sessionClassificationTimer: NodeJS.Timeout | null = null;

/** Current active session */
let currentSession: EnhancedActivitySession | null = null;

/** Currently focused app */
let currentFocusedApp: string | null = null;

/** Background apps state tracking */
const backgroundApps = new Map<string, {
  startTime: Date;
  lastSeen: Date;
  isBackground: boolean;
}>();

/** App context configurations */
const appContexts = new Map<string, AppContext>();

// === APP CONTEXT CONFIGURATION ===

/**
 * Initializes app contexts with special behavior rules
 */
function initializeAppContexts(): void {
  // YouTube - can be passive while other apps are active
  appContexts.set('YouTube', {
    appName: 'YouTube',
    canBePassive: true,
    hasSpecialProcessing: false,
    minimumActiveTime: 2 * 60 * 1000 // 2 minutes
  });

  // Chrome/Edge (for YouTube detection)
  appContexts.set('Chrome', {
    appName: 'Chrome',
    canBePassive: true,
    hasSpecialProcessing: false,
    minimumActiveTime: 2 * 60 * 1000
  });

  appContexts.set('Edge', {
    appName: 'Edge',
    canBePassive: true,
    hasSpecialProcessing: false,
    minimumActiveTime: 2 * 60 * 1000
  });

  // Cursor - special processing detection for AI thinking
  appContexts.set('Cursor', {
    appName: 'Cursor',
    canBePassive: false,
    hasSpecialProcessing: true,
    minimumActiveTime: 0
  });

  // Spotify - can be background, needs 2+ minutes to be active
  appContexts.set('Spotify', {
    appName: 'Spotify',
    canBePassive: true,
    hasSpecialProcessing: false,
    minimumActiveTime: 2 * 60 * 1000
  });

  // Development tools
  appContexts.set('Visual Studio Code', {
    appName: 'Visual Studio Code',
    canBePassive: false,
    hasSpecialProcessing: true,
    minimumActiveTime: 0
  });

  appContexts.set('WebStorm', {
    appName: 'WebStorm',
    canBePassive: false,
    hasSpecialProcessing: true,
    minimumActiveTime: 0
  });
}

// === PRIVACY FILTERING ===

/**
 * Checks if an application should be excluded from tracking
 */
function isAppExcluded(appName: string): boolean {
  if (!appName) return true;
  
  const normalizedAppName = appName.toLowerCase();
  return EXCLUDED_APPS.some(excludedApp => 
    normalizedAppName.includes(excludedApp.toLowerCase())
  );
}

/**
 * Sanitizes window title for privacy
 */
function sanitizeWindowTitle(windowTitle: string, appName: string): string {
  if (!windowTitle) return '';
  
  // Check for sensitive patterns
  const normalizedTitle = windowTitle.toLowerCase();
  const hasSensitiveContent = EXCLUDED_TITLE_PATTERNS.some(pattern =>
    normalizedTitle.includes(pattern.toLowerCase())
  );
  
  if (hasSensitiveContent) {
    return `${appName} - [Private]`;
  }
  
  // Limit title length
  const maxTitleLength = 100;
  if (windowTitle.length > maxTitleLength) {
    return windowTitle.substring(0, maxTitleLength) + '...';
  }
  
  return windowTitle;
}

// === ACTIVITY LEVEL DETECTION ===

/**
 * Determines activity level for an application
 */
function determineActivityLevel(appName: string, windowTitle: string): ActivityLevel {
  const now = new Date();
  
  // Get user interaction state
  const appState = getAppActivityState(appName);
  const interactionCount = getInteractionCount(appName, ACTIVITY_LEVEL_CHECK_INTERVAL);
  
  // Get resource usage
  const resourceUsage = getAppResourceUsage(appName);
  const isProcessingActive = isAppProcessing(appName);
  
  // Check if app has been idle for too long
  if (appState && 
      (now.getTime() - appState.lastUserInteraction.getTime()) > USER_INTERACTION_IDLE_TIMEOUT) {
    return 'idle';
  }

  // Get app context for special behavior
  const context = getAppContext(appName);
  
  // Special handling for Cursor
  if (appName.toLowerCase().includes('cursor')) {
    // If Cursor is processing (AI thinking) OR has user interaction, it's active
    if (isProcessingActive || interactionCount > 0) {
      return 'active';
    }
    return 'idle';
  }

  // Special handling for YouTube/media apps
  if (isMediaApp(appName, windowTitle)) {
    // If another app is currently active and this is not the primary focus
    if (currentFocusedApp && currentFocusedApp !== appName) {
      // Check if video is paused (less resource usage, no audio processing)
      if (!isProcessingActive && !resourceUsage?.isActive) {
        return 'idle';
      }
      return 'passive'; // Playing but not primary focus
    }
    
    // If it's been the primary focus for minimum time, it's active
    const backgroundState = backgroundApps.get(appName);
    if (backgroundState && 
        (now.getTime() - backgroundState.startTime.getTime()) >= context.minimumActiveTime) {
      return 'active';
    }
    
    return 'passive';
  }

  // For apps that can be passive (like Spotify)
  if (context.canBePassive && currentFocusedApp !== appName) {
    const backgroundState = backgroundApps.get(appName);
    if (backgroundState && 
        (now.getTime() - backgroundState.startTime.getTime()) >= context.minimumActiveTime) {
      return 'active';
    }
    return 'background';
  }

  // Default active/idle detection based on interaction and processing
  if (interactionCount > 0 || isProcessingActive) {
    return 'active';
  }

  return 'idle';
}

/**
 * Gets app context, with fallback to default
 */
function getAppContext(appName: string): AppContext {
  // Check for exact match first
  const context = appContexts.get(appName);
  if (context) return context;

  // Check for partial matches
  const normalizedAppName = appName.toLowerCase();
  for (const [key, ctx] of appContexts) {
    if (normalizedAppName.includes(key.toLowerCase()) || 
        key.toLowerCase().includes(normalizedAppName)) {
      return ctx;
    }
  }

  // Default context
  return {
    appName,
    canBePassive: false,
    hasSpecialProcessing: false,
    minimumActiveTime: 0
  };
}

/**
 * Checks if an app is a media app (YouTube, Netflix, etc.)
 */
function isMediaApp(appName: string, windowTitle: string): boolean {
  const mediaIndicators = [
    'youtube', 'netflix', 'hulu', 'disney+', 'amazon prime',
    'twitch', 'spotify', 'apple music', 'video', 'music'
  ];
  
  const combined = `${appName} ${windowTitle}`.toLowerCase();
  return mediaIndicators.some(indicator => combined.includes(indicator));
}

// === ACTIVITY PROCESSING ===

/**
 * Gets the currently active window information
 */
async function getCurrentActiveWindow(): Promise<{appName: string, windowTitle: string} | null> {
  try {
    const activeWindow = await activeWin();
    
    if (!activeWindow) {
      return null;
    }
    
    return {
      appName: activeWindow.owner?.name || 'Unknown',
      windowTitle: activeWindow.title || ''
    };
  } catch (error) {
    console.error('Failed to get active window:', error);
    return null;
  }
}

/**
 * Processes current activity state and updates sessions
 */
async function processActivityState(): Promise<void> {
  try {
    const windowInfo = await getCurrentActiveWindow();
    if (!windowInfo) return;

    const { appName, windowTitle } = windowInfo;
    
    // Skip excluded apps
    if (isAppExcluded(appName)) {
      if (DEBUG_LOGGING) {
        console.log(`Skipping excluded app: ${appName}`);
      }
      return;
    }

    // Update current focused app
    if (currentFocusedApp !== appName) {
      currentFocusedApp = appName;
    }

    // Update background apps tracking
    updateBackgroundAppsState(appName);

    // Sanitize window title
    const sanitizedTitle = sanitizeWindowTitle(windowTitle, appName);
    
    // Determine activity level
    const activityLevel = determineActivityLevel(appName, windowTitle);
    
    // Get additional metrics
    const interactionCount = getInteractionCount(appName, ACTIVITY_LEVEL_CHECK_INTERVAL);
    const isProcessingActive = isAppProcessing(appName);
    const resourceUsage = getAppResourceUsage(appName);
    const cpuUsage = resourceUsage?.cpuUsage || 0;

    const now = new Date();
    
    // Check if this continues the current session
    if (currentSession && 
        currentSession.appName === appName && 
        currentSession.windowTitle === sanitizedTitle) {
      
      // Update session
      currentSession.lastUpdate = now;
      currentSession.activityLevel = activityLevel;
      currentSession.interactionCount += interactionCount;
      currentSession.isProcessing = isProcessingActive;
      currentSession.cpuUsage = Math.max(currentSession.cpuUsage, cpuUsage);
      
      return;
    }

    // End current session and save to database
    if (currentSession) {
      await saveSessionToDatabase(currentSession);
    }

    // Start new session
    currentSession = {
      appName,
      windowTitle: sanitizedTitle,
      startTime: now,
      lastUpdate: now,
      activityLevel,
      interactionCount,
      isProcessing: isProcessingActive,
      cpuUsage,
      isPrimaryFocus: currentFocusedApp === appName
    };

    if (DEBUG_LOGGING) {
      console.log(`Started new session: ${appName} - ${activityLevel}`);
    }

  } catch (error) {
    console.error('Failed to process activity state:', error);
  }
}

/**
 * Updates background apps state tracking
 */
function updateBackgroundAppsState(currentAppName: string): void {
  const now = new Date();
  
  // Update current app as not background
  backgroundApps.set(currentAppName, {
    startTime: backgroundApps.get(currentAppName)?.startTime || now,
    lastSeen: now,
    isBackground: false
  });

  // Mark other apps as background
  for (const [appName, state] of backgroundApps) {
    if (appName !== currentAppName) {
      state.isBackground = true;
      backgroundApps.set(appName, state);
    }
  }
}

/**
 * Saves an activity session to the database
 */
async function saveSessionToDatabase(session: EnhancedActivitySession): Promise<void> {
  try {
    const sessionDuration = session.lastUpdate.getTime() - session.startTime.getTime();
    
    // Only save sessions longer than 1 second
    if (sessionDuration > 1000) {
      const activityData: Omit<RawActivityData, 'id' | 'createdAt'> = {
        timestamp: session.startTime,
        appName: session.appName,
        windowTitle: session.windowTitle,
        duration: sessionDuration,
        activityLevel: session.activityLevel,
        interactionCount: session.interactionCount,
        isProcessing: session.isProcessing,
        cpuUsage: session.cpuUsage,
        isIdle: session.activityLevel === 'idle'
      };

      await insertActivity(activityData);
      
      if (DEBUG_LOGGING) {
        console.log(`Saved activity: ${session.appName} - ${session.activityLevel} - ${sessionDuration}ms`);
      }
    }
  } catch (error) {
    console.error('Failed to save session to database:', error);
  }
}

/**
 * Main monitoring loop
 */
async function monitoringLoop(): Promise<void> {
  try {
    await processActivityState();
  } catch (error) {
    console.error('Monitoring loop error:', error);
  }
  
  // Schedule next monitoring cycle
  if (isMonitoring) {
    monitoringTimer = setTimeout(monitoringLoop, ACTIVITY_LEVEL_CHECK_INTERVAL);
  }
}

/**
 * Automatic session classification task
 */
async function performSessionClassification(): Promise<void> {
  try {
    if (DEBUG_LOGGING) {
      console.log('Running automatic session classification...');
    }

    // Get recent unclassified activities (last 6 hours)
    const activities = getUnclassifiedActivities(6);
    
    if (activities.length === 0) {
      if (DEBUG_LOGGING) {
        console.log('No unclassified activities found for automatic classification');
      }
      return;
    }

    // Process activities into sessions
    const stats = await processActivitiesIntoSessions(activities, {
      useAI: true,
      context: 'Automatic background classification'
    });

    if (DEBUG_LOGGING) {
      console.log('Automatic session classification completed:', stats);
    }
  } catch (error) {
    console.error('Failed to perform automatic session classification:', error);
  }
}

/**
 * Starts the session classification timer
 */
function startSessionClassificationTimer(): void {
  // Run initial classification after 30 seconds
  setTimeout(() => {
    performSessionClassification();
  }, 30000);

  // Then run every 15 minutes
  sessionClassificationTimer = setInterval(() => {
    performSessionClassification();
  }, SESSION_CLASSIFICATION_INTERVAL);

  if (DEBUG_LOGGING) {
    console.log('Session classification timer started (15 minute intervals)');
  }
}

/**
 * Stops the session classification timer
 */
function stopSessionClassificationTimer(): void {
  if (sessionClassificationTimer) {
    clearInterval(sessionClassificationTimer);
    sessionClassificationTimer = null;
  }
}

// === PUBLIC API ===

/**
 * Starts enhanced activity logging
 * 
 * @returns Promise resolving to true if monitoring started successfully
 */
export async function startEnhancedActivityLogging(): Promise<boolean> {
  try {
    if (isMonitoring) {
      if (DEBUG_LOGGING) {
        console.log('Enhanced activity logging already running');
      }
      return true;
    }

    // Initialize app contexts
    initializeAppContexts();

    // Start sub-systems
    const interactionStarted = await startUserInteractionMonitoring();
    if (!interactionStarted) {
      throw new Error('Failed to start user interaction monitoring');
    }

    const resourceStarted = await startResourceMonitoring();
    if (!resourceStarted) {
      throw new Error('Failed to start resource monitoring');
    }

    // Reset state
    currentSession = null;
    currentFocusedApp = null;
    backgroundApps.clear();
    isMonitoring = true;

    // Start main monitoring loop
    monitoringLoop();

    // Start automatic session classification
    startSessionClassificationTimer();

    if (DEBUG_LOGGING) {
      console.log(SUCCESS_MESSAGES.MONITORING_STARTED);
    }

    return true;
  } catch (error) {
    console.error('Failed to start enhanced activity logging:', error);
    isMonitoring = false;
    
    // Clean up if partially started
    await stopUserInteractionMonitoring();
    await stopResourceMonitoring();
    
    throw new Error(`${ERROR_MESSAGES.MONITORING_FAILED}: ${error}`);
  }
}

/**
 * Stops enhanced activity logging
 * 
 * @returns Promise resolving when monitoring is stopped
 */
export async function stopEnhancedActivityLogging(): Promise<void> {
  try {
    if (!isMonitoring) {
      return;
    }

    isMonitoring = false;

    // Clear monitoring timer
    if (monitoringTimer) {
      clearTimeout(monitoringTimer);
      monitoringTimer = null;
    }

    // Stop session classification timer
    stopSessionClassificationTimer();

    // Save current session
    if (currentSession) {
      await saveSessionToDatabase(currentSession);
      currentSession = null;
    }

    // Stop sub-systems
    await stopUserInteractionMonitoring();
    await stopResourceMonitoring();

    // Clear state
    currentFocusedApp = null;
    backgroundApps.clear();

    if (DEBUG_LOGGING) {
      console.log(SUCCESS_MESSAGES.MONITORING_STOPPED);
    }
  } catch (error) {
    console.error('Error stopping enhanced activity logging:', error);
  }
}

/**
 * Gets the current monitoring status
 * 
 * @returns True if enhanced monitoring is currently active
 */
export function isEnhancedActivityLoggingActive(): boolean {
  return isMonitoring;
}

/**
 * Gets the current session information
 * 
 * @returns Current session or null if none active
 */
export function getCurrentSession(): EnhancedActivitySession | null {
  return currentSession ? { ...currentSession } : null;
}

/**
 * Gets current background apps state
 * 
 * @returns Map of background app states
 */
export function getBackgroundAppsState(): Map<string, {startTime: Date, lastSeen: Date, isBackground: boolean}> {
  return new Map(backgroundApps);
} 