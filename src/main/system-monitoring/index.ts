/**
 * System Monitoring - Main entry point for enhanced activity monitoring
 * 
 * Provides a unified interface to start and stop all monitoring components
 * including enhanced activity logging, user interaction monitoring, and
 * system resource monitoring. This is the main entry point that should
 * be used by the application to control the monitoring system.
 * 
 * @module SystemMonitoring
 * @author FocusFlare Team
 * @since 0.3.0
 */

import {
  startEnhancedActivityLogging,
  stopEnhancedActivityLogging,
  isEnhancedActivityLoggingActive,
  getCurrentSession,
  getBackgroundAppsState
} from './enhanced-activity-logger';

import {
  startUserInteractionMonitoring,
  stopUserInteractionMonitoring,
  isUserInteractionMonitoringActive,
  getAppActivityStates,
  getAppActivityState,
  getRecentInteractions,
  getInteractionCount,
  clearInteractionData
} from './user-interaction-monitor';

import {
  startResourceMonitoring,
  stopResourceMonitoring,
  isResourceMonitoringActive,
  getAppResourceUsage,
  isAppProcessing
} from './system-resource-monitor';

import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === MONITORING STATE ===

/** Overall monitoring status */
let isMonitoringActive = false;

// === PUBLIC API ===

/**
 * Starts the complete enhanced monitoring system
 * 
 * Initializes and starts all monitoring components:
 * - Enhanced activity logging with intelligent activity level detection
 * - User interaction monitoring for keyboard/mouse events
 * - System resource monitoring for CPU/memory/network/disk usage
 * 
 * @returns Promise resolving to true if all monitoring started successfully
 */
export async function startMonitoring(): Promise<boolean> {
  try {
    if (isMonitoringActive) {
      if (DEBUG_LOGGING) {
        console.log('Enhanced monitoring system already running');
      }
      return true;
    }

    if (DEBUG_LOGGING) {
      console.log('Starting enhanced monitoring system...');
    }

    // Start all monitoring components
    const enhancedLoggingStarted = await startEnhancedActivityLogging();
    const userInteractionStarted = await startUserInteractionMonitoring();
    const resourceMonitoringStarted = await startResourceMonitoring();
    
    if (enhancedLoggingStarted && userInteractionStarted && resourceMonitoringStarted) {
      isMonitoringActive = true;
      
      if (DEBUG_LOGGING) {
        console.log('Enhanced monitoring system started successfully');
        console.log(`  • Enhanced activity logging: ${enhancedLoggingStarted}`);
        console.log(`  • User interaction monitoring: ${userInteractionStarted}`);
        console.log(`  • Resource monitoring: ${resourceMonitoringStarted}`);
      }
      
      return true;
    } else {
      throw new Error('Failed to start one or more monitoring components');
    }
  } catch (error) {
    console.error('Failed to start monitoring system:', error);
    isMonitoringActive = false;
    
    // Clean up any partially started components
    await stopMonitoring();
    
    return false;
  }
}

/**
 * Stops the complete enhanced monitoring system
 * 
 * Gracefully stops all monitoring components and saves any pending data.
 * 
 * @returns Promise resolving when all monitoring is stopped
 */
export async function stopMonitoring(): Promise<void> {
  try {
    if (!isMonitoringActive) {
      return;
    }

    if (DEBUG_LOGGING) {
      console.log('Stopping enhanced monitoring system...');
    }

    // Stop all monitoring components
    await stopEnhancedActivityLogging();
    await stopUserInteractionMonitoring();
    await stopResourceMonitoring();
    
    isMonitoringActive = false;
    
    if (DEBUG_LOGGING) {
      console.log('Enhanced monitoring system stopped successfully');
    }
  } catch (error) {
    console.error('Error stopping monitoring system:', error);
    isMonitoringActive = false;
  }
}

/**
 * Gets the current monitoring status
 * 
 * @returns True if enhanced monitoring is currently active
 */
export function isMonitoringSystemActive(): boolean {
  return isMonitoringActive && isEnhancedActivityLoggingActive();
}

/**
 * Gets detailed monitoring status for all components
 * 
 * @returns Object with status of all monitoring components
 */
export function getMonitoringStatus() {
  return {
    overall: isMonitoringActive,
    enhancedActivityLogging: isEnhancedActivityLoggingActive(),
    userInteractionMonitoring: isUserInteractionMonitoringActive(),
    resourceMonitoring: isResourceMonitoringActive()
  };
}

/**
 * Gets detailed app monitoring information for diagnostics
 * 
 * @param appName - Application name to get detailed info for
 * @returns Detailed monitoring information for the app
 */
export function getAppMonitoringInfo(appName: string) {
  return {
    activityState: getAppActivityState(appName),
    resourceUsage: getAppResourceUsage(appName),
    isProcessing: isAppProcessing(appName),
    interactionCount: getInteractionCount(appName, 5),
    isMonitoring: isMonitoringActive
  };
}

/**
 * Performs maintenance operations on monitoring data
 * 
 * @param clearData - Whether to clear old interaction data
 * @returns Object indicating what maintenance was performed
 */
export function performMonitoringMaintenance(clearData: boolean = false) {
  if (DEBUG_LOGGING) {
    console.log('Performing monitoring system maintenance...');
  }
  
  const maintenanceActions = {
    clearedInteractionData: false,
    restartedComponents: false
  };
  
  // Clear old interaction data if requested
  if (clearData) {
    clearInteractionData();
    maintenanceActions.clearedInteractionData = true;
    
    if (DEBUG_LOGGING) {
      console.log('Cleared interaction data during maintenance');
    }
  }
  
  return maintenanceActions;
}

/**
 * Gets current activity monitoring data
 * 
 * @returns Object with current monitoring data
 */
export function getCurrentMonitoringData() {
  // Get current session and app states
  const currentSession = getCurrentSession();
  const appStates = getAppActivityStates();
  const backgroundApps = getBackgroundAppsState();
  const recentInteractions = getRecentInteractions(10);
  
  // Get resource usage for apps that have interactions
  const appResourceUsage = new Map<string, any>();
  for (const [appName] of appStates) {
    const resourceUsage = getAppResourceUsage(appName);
    if (resourceUsage) {
      appResourceUsage.set(appName, resourceUsage);
    }
  }
  
  return {
    currentSession,
    appActivityStates: appStates,
    backgroundAppsState: backgroundApps,
    recentInteractions,
    appResourceUsage: Object.fromEntries(appResourceUsage),
    totalInteractionCount: recentInteractions.length,
    monitoringActive: isMonitoringActive
  };
}

// === RE-EXPORTS FOR CONVENIENCE ===

// Enhanced Activity Logger
export {
  startEnhancedActivityLogging,
  stopEnhancedActivityLogging,
  isEnhancedActivityLoggingActive,
  getCurrentSession,
  getBackgroundAppsState
} from './enhanced-activity-logger';

// User Interaction Monitor
export {
  startUserInteractionMonitoring,
  stopUserInteractionMonitoring,
  isUserInteractionMonitoringActive,
  getAppActivityStates,
  getAppActivityState,
  getRecentInteractions,
  getInteractionCount,
  clearInteractionData
} from './user-interaction-monitor';

// System Resource Monitor
export {
  startResourceMonitoring,
  stopResourceMonitoring,
  isResourceMonitoringActive,
  getAppResourceUsage,
  isAppProcessing
} from './system-resource-monitor';

// Legacy Activity Logger (for backward compatibility)
export {
  startActivityLogging,
  stopActivityLogging,
  isActivityLoggingActive,
  updatePollingInterval
} from './activity-logger'; 