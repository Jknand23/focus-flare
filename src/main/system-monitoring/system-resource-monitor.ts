/**
 * System Resource Monitor - Process-level resource usage tracking
 * 
 * Monitors CPU usage, memory consumption, network activity, and disk I/O
 * for running processes to support enhanced activity detection. This helps
 * identify when applications are actively processing (builds, AI inference,
 * downloads) even without direct user interaction.
 * 
 * @module SystemResourceMonitor
 * @author FocusFlare Team
 * @since 0.3.0
 */

import * as si from 'systeminformation';
import type { SystemResourceUsage, ActivityLevel } from '@/shared/types/activity-types';
import {
  RESOURCE_MONITORING_INTERVAL,
  CPU_USAGE_THRESHOLD,
  NETWORK_ACTIVITY_THRESHOLD,
  DISK_ACTIVITY_THRESHOLD,
  DEBUG_LOGGING
} from '@/shared/constants/app-constants';

// === TYPES ===

/**
 * Process resource data from systeminformation
 */
interface ProcessResourceData {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  priority: number;
  starttime: string;
}

/**
 * Network statistics data
 */
interface NetworkStats {
  rx_bytes: number;
  tx_bytes: number;
  rx_sec: number;
  tx_sec: number;
}

/**
 * Disk I/O statistics data
 */
interface DiskIOStats {
  rIO_sec: number | null;
  wIO_sec: number | null;
  rIO: number | null;
  wIO: number | null;
}

// === STATE MANAGEMENT ===

/** Current monitoring state */
let isMonitoring = false;

/** Resource monitoring interval timer */
let monitoringTimer: NodeJS.Timeout | null = null;

/** Process resource usage cache */
const processResourceCache = new Map<number, SystemResourceUsage>();

/** Network statistics cache for rate calculation */
let networkStatsCache: NetworkStats | null = null;

/** Disk I/O statistics cache for rate calculation */
let diskIOStatsCache: DiskIOStats | null = null;

/** Previous measurement timestamp */
let lastMeasurementTime: number = 0;

// === RESOURCE MONITORING ===

/**
 * Gets current system resource usage for all processes
 * 
 * @returns Promise resolving to array of process resource usage data
 */
async function getSystemResourceUsage(): Promise<SystemResourceUsage[]> {
  try {
    const [processes, networkStats, diskStats] = await Promise.all([
      si.processes(),
      si.networkStats(),
      si.disksIO()
    ]);

    const currentTime = Date.now();
    const timeDelta = lastMeasurementTime > 0 ? (currentTime - lastMeasurementTime) / 1000 : 1;
    
    // Calculate network activity rates
    let networkActivity = 0;
    if (networkStatsCache && networkStats.length > 0) {
      const currentNetworkStats = networkStats[0];
      const rxRate = (currentNetworkStats.rx_bytes - networkStatsCache.rx_bytes) / timeDelta;
      const txRate = (currentNetworkStats.tx_bytes - networkStatsCache.tx_bytes) / timeDelta;
      networkActivity = rxRate + txRate;
    }
    
    // Calculate disk I/O activity rates
    let diskActivity = 0;
    if (diskIOStatsCache && diskStats && diskStats.rIO && diskStats.wIO && diskIOStatsCache.rIO && diskIOStatsCache.wIO) {
      const rIORate = (diskStats.rIO - diskIOStatsCache.rIO) / timeDelta;
      const wIORate = (diskStats.wIO - diskIOStatsCache.wIO) / timeDelta;
      diskActivity = rIORate + wIORate;
    }
    
    // Update caches
    if (networkStats.length > 0) {
      networkStatsCache = networkStats[0];
    }
    if (diskStats) {
      diskIOStatsCache = diskStats;
    }
    lastMeasurementTime = currentTime;

    // Process each running process
    const resourceUsage: SystemResourceUsage[] = [];
    
    for (const process of processes.list || []) {
      const processData: ProcessResourceData = {
        pid: process.pid,
        name: process.name,
        cpu: process.cpu,
        memory: process.memRss || 0, // Use memRss for memory usage
        priority: process.priority,
        starttime: process.started
      };

      // Skip system processes and processes with no CPU usage
      if (processData.pid <= 4 || !processData.name) {
        continue;
      }

      // Calculate if process is actively using resources
      const isActive = 
        processData.cpu > CPU_USAGE_THRESHOLD ||
        networkActivity > NETWORK_ACTIVITY_THRESHOLD ||
        diskActivity > DISK_ACTIVITY_THRESHOLD;

      const usage: SystemResourceUsage = {
        pid: processData.pid,
        appName: processData.name,
        cpuUsage: processData.cpu,
        memoryUsage: processData.memory,
        networkActivity,
        diskActivity,
        isActive
      };

      resourceUsage.push(usage);
      
      // Update cache
      processResourceCache.set(processData.pid, usage);
    }

    return resourceUsage;
  } catch (error) {
    console.error('Failed to get system resource usage:', error);
    return [];
  }
}

/**
 * Gets resource usage for a specific process by PID
 * 
 * @param pid - Process ID to get resource usage for
 * @returns Resource usage data or null if not found
 */
function getProcessResourceUsage(pid: number): SystemResourceUsage | null {
  return processResourceCache.get(pid) || null;
}

/**
 * Gets resource usage for a specific application by name
 * 
 * @param appName - Application name to get resource usage for
 * @returns Resource usage data or null if not found
 */
function getAppResourceUsage(appName: string): SystemResourceUsage | null {
  for (const [, usage] of processResourceCache) {
    if (usage.appName.toLowerCase().includes(appName.toLowerCase())) {
      return usage;
    }
  }
  return null;
}

/**
 * Determines if an application is currently processing based on resource usage
 * 
 * @param appName - Application name to check
 * @returns True if application is actively processing
 */
function isAppProcessing(appName: string): boolean {
  const usage = getAppResourceUsage(appName);
  return usage?.isActive || false;
}

/**
 * Gets the activity level suggestion based on resource usage
 * 
 * @param appName - Application name to analyze
 * @param hasUserInteraction - Whether there has been recent user interaction
 * @returns Suggested activity level
 */
function getActivityLevelSuggestion(
  appName: string, 
  hasUserInteraction: boolean
): ActivityLevel {
  const usage = getAppResourceUsage(appName);
  
  if (!usage) {
    return hasUserInteraction ? 'active' : 'idle';
  }

  // High CPU usage suggests active processing
  if (usage.cpuUsage > CPU_USAGE_THRESHOLD * 2) {
    return hasUserInteraction ? 'active' : 'passive';
  }

  // Moderate resource usage with user interaction
  if (usage.isActive && hasUserInteraction) {
    return 'active';
  }

  // Resource usage without user interaction
  if (usage.isActive && !hasUserInteraction) {
    return 'passive';
  }

  // No significant resource usage
  return hasUserInteraction ? 'active' : 'idle';
}

// === MONITORING CONTROL ===

/**
 * Main resource monitoring loop
 */
async function resourceMonitoringLoop(): Promise<void> {
  try {
    await getSystemResourceUsage();
    
    if (DEBUG_LOGGING) {
      const activeProcesses = Array.from(processResourceCache.values())
        .filter(usage => usage.isActive)
        .length;
      console.log(`Resource monitoring: ${activeProcesses} active processes`);
    }
  } catch (error) {
    console.error('Resource monitoring loop error:', error);
  }
  
  // Schedule next monitoring cycle
  if (isMonitoring) {
    monitoringTimer = setTimeout(resourceMonitoringLoop, RESOURCE_MONITORING_INTERVAL);
  }
}

/**
 * Starts system resource monitoring
 * 
 * @param interval - Monitoring interval in milliseconds (optional)
 * @returns Promise resolving to true if monitoring started successfully
 */
export async function startResourceMonitoring(_interval?: number): Promise<boolean> {
  try {
    if (isMonitoring) {
      if (DEBUG_LOGGING) {
        console.log('Resource monitoring already running');
      }
      return true;
    }

    isMonitoring = true;
    processResourceCache.clear();
    networkStatsCache = null;
    diskIOStatsCache = null;
    lastMeasurementTime = 0;

    // Start monitoring loop
    await resourceMonitoringLoop();

    if (DEBUG_LOGGING) {
      console.log('System resource monitoring started');
    }

    return true;
  } catch (error) {
    console.error('Failed to start resource monitoring:', error);
    isMonitoring = false;
    return false;
  }
}

/**
 * Stops system resource monitoring
 */
export async function stopResourceMonitoring(): Promise<void> {
  try {
    if (!isMonitoring) {
      return;
    }

    isMonitoring = false;

    if (monitoringTimer) {
      clearTimeout(monitoringTimer);
      monitoringTimer = null;
    }

    processResourceCache.clear();
    networkStatsCache = null;
    diskIOStatsCache = null;

    if (DEBUG_LOGGING) {
      console.log('System resource monitoring stopped');
    }
  } catch (error) {
    console.error('Error stopping resource monitoring:', error);
  }
}

/**
 * Gets the current resource monitoring status
 * 
 * @returns True if resource monitoring is active
 */
export function isResourceMonitoringActive(): boolean {
  return isMonitoring;
}

// === PUBLIC API ===

export {
  getSystemResourceUsage,
  getProcessResourceUsage,
  getAppResourceUsage,
  isAppProcessing,
  getActivityLevelSuggestion
}; 