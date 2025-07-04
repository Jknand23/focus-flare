/**
 * User Interaction Monitor - Global input event tracking with fallback
 * 
 * Monitors global keyboard and mouse events to track user interaction patterns.
 * Provides fallback functionality when native global hooks are unavailable.
 * This helps determine activity levels and user engagement across applications.
 * 
 * @module UserInteractionMonitor
 * @author FocusFlare Team
 * @since 0.3.0
 */

// Conditional import with fallback
let uIOhook: any = null;
let isUiohookAvailable = false;

// Initialize uiohook asynchronously
async function initializeUiohook() {
  try {
    const uiohookModule = await import('uiohook-napi');
    uIOhook = uiohookModule.uIOhook;
    isUiohookAvailable = true;
  } catch (error: any) {
    console.warn('uiohook-napi not available, using fallback interaction monitoring:', error?.message || error);
    isUiohookAvailable = false;
  }
}

// Initialize uiohook when module loads
initializeUiohook();

import activeWin from 'active-win';
import type { UserInteractionEvent, InteractionType, AppActivityState } from '@/shared/types/activity-types';
import {
  USER_INTERACTION_IDLE_TIMEOUT,
  DEBUG_LOGGING
} from '@/shared/constants/app-constants';

// === TYPES ===

/**
 * Interaction statistics for an application
 */
interface AppInteractionStats {
  /** Total interaction count */
  totalInteractions: number;
  /** Last interaction timestamp */
  lastInteraction: Date;
  /** Interaction types distribution */
  interactionTypes: Record<InteractionType, number>;
  /** Whether app is considered actively engaged */
  isActivelyEngaged: boolean;
}

// === STATE MANAGEMENT ===

/** Whether global interaction monitoring is active */
let isMonitoring = false;

/** Whether uiohook event listeners are registered */
let isUiohookListening = false;

/** App activity states tracking */
const appActivityStates = new Map<string, AppActivityState>();

/** Recent interaction events */
const recentInteractions: UserInteractionEvent[] = [];

/** App interaction statistics */
const appInteractionStats = new Map<string, AppInteractionStats>();

/** Last global interaction timestamp */
let lastGlobalInteraction = new Date();

/** Fallback interaction timer for apps */
let fallbackTimer: NodeJS.Timeout | null = null;

/** Periodic summary logging timer */
let summaryTimer: NodeJS.Timeout | null = null;

// === FALLBACK INTERACTION DETECTION ===

/**
 * Fallback interaction detection using window focus changes
 * This is used when global input hooks are not available
 */
async function detectFallbackInteractions(): Promise<void> {
  try {
    const activeWindow = await activeWin();
    
    if (activeWindow?.owner?.name) {
      const appName = activeWindow.owner.name;
      const now = new Date();
      
      // Treat window focus changes as interactions
      recordInteraction({
        type: 'click', // Assume focus change is from user click
        appName,
        timestamp: now,
        metadata: { fallback: true, windowTitle: activeWindow.title }
      });
      
      updateAppActivityState(appName, now);
    }
  } catch (error) {
    if (DEBUG_LOGGING) {
      console.error('Fallback interaction detection error:', error);
    }
  }
}

/**
 * Starts fallback interaction monitoring
 */
function startFallbackMonitoring(): void {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
  }
  
  // Check for window focus changes every 2 seconds
  fallbackTimer = setInterval(detectFallbackInteractions, 2000);
  
  if (DEBUG_LOGGING) {
    console.log('Started fallback interaction monitoring (window focus based)');
  }
}

/**
 * Stops fallback interaction monitoring
 */
function stopFallbackMonitoring(): void {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
}

/**
 * Starts periodic summary logging instead of logging every interaction
 */
function startPeriodicSummaryLogging(): void {
  if (summaryTimer) {
    clearInterval(summaryTimer);
  }
  
  // Log summary every 30 seconds
  summaryTimer = setInterval(() => {
    if (DEBUG_LOGGING && recentInteractions.length > 0) {
      const last5Minutes = recentInteractions.filter(i => 
        Date.now() - i.timestamp.getTime() < 5 * 60 * 1000
      );
      
      const appCounts = last5Minutes.reduce((acc, interaction) => {
        acc[interaction.appName] = (acc[interaction.appName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`[Interaction Summary] ${last5Minutes.length} interactions in last 5 min:`, appCounts);
    }
  }, 30000); // Every 30 seconds
}

/**
 * Stops periodic summary logging
 */
function stopPeriodicSummaryLogging(): void {
  if (summaryTimer) {
    clearInterval(summaryTimer);
    summaryTimer = null;
  }
}

// === INTERACTION RECORDING ===

/**
 * Records a user interaction event
 */
function recordInteraction(event: UserInteractionEvent): void {
  // Add to recent interactions queue
  recentInteractions.push(event);
  
  // Keep only recent interactions (last 100)
  if (recentInteractions.length > 100) {
    recentInteractions.shift();
  }
  
  // Update app interaction stats
  updateAppInteractionStats(event.appName, event.type, event.timestamp);
  
  // Update global interaction timestamp
  lastGlobalInteraction = event.timestamp;
  
  // Individual interaction logging disabled - using periodic summaries instead
  // This prevents console spam while still tracking all interactions
}

/**
 * Updates interaction statistics for an app
 */
function updateAppInteractionStats(appName: string, type: InteractionType, timestamp: Date): void {
  let stats = appInteractionStats.get(appName);
  
  if (!stats) {
    stats = {
      totalInteractions: 0,
      lastInteraction: timestamp,
      interactionTypes: {
        keyboard: 0,
        mouse: 0,
        scroll: 0,
        click: 0,
        file_operation: 0
      },
      isActivelyEngaged: false
    };
    appInteractionStats.set(appName, stats);
  }
  
  stats.totalInteractions++;
  stats.lastInteraction = timestamp;
  stats.interactionTypes[type]++;
  
  // Consider app actively engaged if recent interactions
  const timeSinceLastInteraction = Date.now() - stats.lastInteraction.getTime();
  stats.isActivelyEngaged = timeSinceLastInteraction < 30000; // 30 seconds
}

/**
 * Updates app activity state based on interactions
 */
function updateAppActivityState(appName: string, timestamp: Date): void {
  let state = appActivityStates.get(appName);
  
  if (!state) {
    state = {
      appName,
      activityLevel: 'active',
      lastUserInteraction: timestamp,
      lastSystemActivity: timestamp,
      totalActiveTime: 0,
      totalIdleTime: 0,
      interactionCount: 0,
      isProcessing: false,
      isPlayingMedia: false,
      sessionStart: timestamp
    };
    appActivityStates.set(appName, state);
  }
  
  state.lastUserInteraction = timestamp;
  state.interactionCount++;
  
  // Update activity level based on recent interactions
  const timeSinceInteraction = Date.now() - timestamp.getTime();
  if (timeSinceInteraction < 5000) { // 5 seconds
    state.activityLevel = 'active';
  }
}

// === GLOBAL INPUT HOOKS (when available) ===

/**
 * Handles keyboard events from global hook
 */
async function handleKeyboardEvent(event: any): Promise<void> {
  const appName = await getCurrentActiveAppName();
  recordInteraction({
    type: 'keyboard',
    appName: appName || 'Unknown',
    timestamp: new Date(),
    metadata: { keycode: event.keycode }
  });
}

/**
 * Handles mouse events from global hook
 */
async function handleMouseEvent(event: any): Promise<void> {
  const interactionType: InteractionType = event.type === 'mousewheel' ? 'scroll' : 
                                          event.type === 'mouseclick' ? 'click' : 'mouse';
  
  const appName = await getCurrentActiveAppName();
  recordInteraction({
    type: interactionType,
    appName: appName || 'Unknown',
    timestamp: new Date(),
    metadata: { 
      button: event.button,
      x: event.x,
      y: event.y
    }
  });
}

/**
 * Gets the current active application name
 */
async function getCurrentActiveAppName(): Promise<string | null> {
  try {
    const activeWindow = await activeWin();
    return activeWindow?.owner?.name || null;
  } catch (error) {
    return null;
  }
}

// === MONITORING CONTROL ===

/**
 * Starts user interaction monitoring
 */
export async function startUserInteractionMonitoring(): Promise<boolean> {
  try {
    if (isMonitoring) {
      if (DEBUG_LOGGING) {
        console.log('User interaction monitoring already running');
      }
      return true;
    }
    
    isMonitoring = true;
    
    if (isUiohookAvailable && uIOhook) {
      try {
        // Try to start global input hooks
        uIOhook.on('keydown', handleKeyboardEvent);
        uIOhook.on('keyup', handleKeyboardEvent);
        uIOhook.on('mousedown', handleMouseEvent);
        uIOhook.on('mouseup', handleMouseEvent);
        uIOhook.on('mousemove', handleMouseEvent);
        uIOhook.on('wheel', handleMouseEvent);
        
        uIOhook.start();
        isUiohookListening = true;
        
        if (DEBUG_LOGGING) {
          console.log('Global input monitoring started successfully');
        }
             } catch (error: any) {
         console.warn('Failed to start global input hooks, using fallback:', error?.message || error);
         isUiohookListening = false;
         startFallbackMonitoring();
       }
    } else {
      if (DEBUG_LOGGING) {
        console.log('uiohook not available, using fallback monitoring');
      }
      startFallbackMonitoring();
    }
    
    // Start periodic summary logging instead of logging every interaction
    startPeriodicSummaryLogging();
    
    if (DEBUG_LOGGING) {
      const method = isUiohookListening ? 'global hooks' : 'fallback (window focus)';
      console.log(`User interaction monitoring started using: ${method}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to start user interaction monitoring:', error);
    isMonitoring = false;
    return false;
  }
}

/**
 * Stops user interaction monitoring
 */
export async function stopUserInteractionMonitoring(): Promise<void> {
  try {
    if (!isMonitoring) {
      return;
    }
    
    isMonitoring = false;
    
    // Stop global hooks if active
    if (isUiohookListening && uIOhook) {
      try {
        uIOhook.stop();
        uIOhook.removeAllListeners();
        isUiohookListening = false;
             } catch (error: any) {
         console.warn('Error stopping global input hooks:', error?.message || error);
       }
    }
    
    // Stop fallback monitoring
    stopFallbackMonitoring();
    
    // Stop periodic summary logging
    stopPeriodicSummaryLogging();
    
    if (DEBUG_LOGGING) {
      console.log('User interaction monitoring stopped');
    }
  } catch (error) {
    console.error('Error stopping user interaction monitoring:', error);
  }
}

/**
 * Gets current monitoring status
 */
export function isUserInteractionMonitoringActive(): boolean {
  return isMonitoring;
}

/**
 * Gets monitoring method info
 */
export function getMonitoringMethodInfo(): { isActive: boolean; method: string; hasGlobalHooks: boolean } {
  return {
    isActive: isMonitoring,
    method: isUiohookListening ? 'global_hooks' : 'fallback_focus',
    hasGlobalHooks: isUiohookAvailable && isUiohookListening
  };
}

// === DATA ACCESS ===

/**
 * Gets all app activity states
 */
export function getAppActivityStates(): Map<string, AppActivityState> {
  return new Map(appActivityStates);
}

/**
 * Gets activity state for a specific app
 */
export function getAppActivityState(appName: string): AppActivityState | null {
  return appActivityStates.get(appName) || null;
}

/**
 * Gets recent interaction events
 */
export function getRecentInteractions(limit: number = 50): UserInteractionEvent[] {
  return recentInteractions.slice(-limit);
}

/**
 * Gets interaction count for an app in the last specified minutes
 */
export function getInteractionCount(appName: string, lastMinutes: number = 5): number {
  const cutoffTime = Date.now() - (lastMinutes * 60 * 1000);
  return recentInteractions.filter(interaction => 
    interaction.appName === appName && 
    interaction.timestamp.getTime() > cutoffTime
  ).length;
}

/**
 * Gets interaction statistics for an app
 */
export function getAppInteractionStats(appName: string): AppInteractionStats | null {
  return appInteractionStats.get(appName) || null;
}

/**
 * Clears all interaction data (for testing/reset)
 */
export function clearInteractionData(): void {
  recentInteractions.length = 0;
  appActivityStates.clear();
  appInteractionStats.clear();
  lastGlobalInteraction = new Date();
  
  if (DEBUG_LOGGING) {
    console.log('Interaction data cleared');
  }
}

/**
 * Gets time since last global interaction
 */
export function getTimeSinceLastInteraction(): number {
  return Date.now() - lastGlobalInteraction.getTime();
}

/**
 * Checks if user is currently idle
 */
export function isUserIdle(): boolean {
  return getTimeSinceLastInteraction() > USER_INTERACTION_IDLE_TIMEOUT;
} 