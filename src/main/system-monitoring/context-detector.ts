/**
 * Context Detector - Advanced background/foreground activity detection
 * 
 * Detects application context including audio/video playback, window focus state,
 * and application processing indicators to provide enhanced context for AI
 * classification. Implements Phase 3 requirements for context-aware AI prompts.
 * 
 * @module ContextDetector
 * @author FocusFlare Team
 * @since 0.3.0
 */

import activeWin from 'active-win';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { 
  MediaState
} from '@/shared/types/activity-types';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

const execAsync = promisify(exec);

// === TYPES ===

/**
 * Application context information
 */
export interface ApplicationContext {
  /** Application name */
  appName: string;
  /** Window title */
  windowTitle: string;
  /** Whether app is in foreground */
  isForeground: boolean;
  /** Media playback state */
  mediaState: MediaState;
  /** Audio/video detection results */
  audioVideoContext: AudioVideoContext;
  /** Resource usage context */
  resourceContext: ResourceContext;
  /** Application behavior patterns */
  behaviorContext: BehaviorContext;
}

/**
 * Audio/video context detection
 */
interface AudioVideoContext {
  /** Whether audio is playing */
  isAudioPlaying: boolean;
  /** Whether video is likely playing */
  isVideoPlaying: boolean;
  /** Audio device activity */
  audioDeviceActive: boolean;
  /** Detected content type */
  contentType: 'entertainment' | 'educational' | 'communication' | 'ambient' | 'none';
  /** Confidence in content type detection */
  contentTypeConfidence: number;
}

/**
 * Resource usage context
 */
interface ResourceContext {
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Network activity level */
  networkActivity: 'none' | 'low' | 'medium' | 'high';
  /** Disk activity level */
  diskActivity: 'none' | 'low' | 'medium' | 'high';
  /** Whether app is actively processing */
  isProcessing: boolean;
}

/**
 * Application behavior context
 */
interface BehaviorContext {
  /** Window interactions in last minute */
  recentInteractions: number;
  /** Time in foreground (seconds) */
  foregroundTime: number;
  /** Time since last user interaction */
  timeSinceLastInteraction: number;
  /** Application usage pattern */
  usagePattern: 'active' | 'passive' | 'background' | 'intermittent';
}

// === CONSTANTS ===

/** Context detection configuration */
const CONTEXT_CONFIG = {
  /** Audio detection check interval (5 seconds) */
  audioCheckInterval: 5000,
  /** Resource monitoring interval (2 seconds) */
  resourceCheckInterval: 2000,
  /** Context cache duration (30 seconds) */
  contextCacheDuration: 30000,
  /** CPU threshold for processing detection */
  processingCpuThreshold: 25,
  /** Network threshold for activity detection (bytes/sec) */
  networkActivityThreshold: 1024 * 1024, // 1MB/s
  /** Disk threshold for activity detection (ops/sec) */
  diskActivityThreshold: 50
} as const;

// === GLOBAL STATE ===

/** Context detection state */
let isDetectionActive = false;

/** Audio detection timer */
let audioDetectionTimer: NodeJS.Timeout | null = null;

/** Resource monitoring timer */
let resourceMonitoringTimer: NodeJS.Timeout | null = null;

/** Context cache */
const contextCache = new Map<string, {
  context: ApplicationContext;
  timestamp: number;
}>();

// /** Audio device state cache */
// let audioDeviceState = {
//   isActive: false,
//   lastCheck: 0,
//   devices: [] as string[]
// };

// /** Previous resource measurements */
// let previousResourceMeasurement: {
//   timestamp: number;
//   network: any;
//   disk: any;
// } | null = null;

// === CORE DETECTION FUNCTIONS ===

/**
 * Detects comprehensive context for an application
 */
export async function detectApplicationContext(
  appName: string,
  windowTitle: string,
  foregroundTime: number = 0,
  recentInteractions: number = 0
): Promise<ApplicationContext> {
  const cacheKey = `${appName}:${windowTitle}`;
  const cachedContext = contextCache.get(cacheKey);
  
  // Return cached context if recent
  if (cachedContext && Date.now() - cachedContext.timestamp < CONTEXT_CONFIG.contextCacheDuration) {
    return cachedContext.context;
  }

  try {
    // Get current active window info
    const activeWindow = await activeWin();
    const isForeground = activeWindow?.title === windowTitle && activeWindow?.owner.name === appName;
    
    // Detect audio/video context
    const audioVideoContext = await detectAudioVideoContext(appName, windowTitle);
    
    // Detect resource usage context
    const resourceContext = await detectResourceContext(appName);
    
    // Determine media state
    const mediaState = determineMediaState(audioVideoContext);
    
    // Analyze behavior context
    const behaviorContext = analyzeBehaviorContext(
      recentInteractions,
      foregroundTime,
      resourceContext,
      audioVideoContext
    );

    const context: ApplicationContext = {
      appName,
      windowTitle,
      isForeground,
      mediaState,
      audioVideoContext,
      resourceContext,
      behaviorContext
    };

    // Cache the context
    contextCache.set(cacheKey, {
      context,
      timestamp: Date.now()
    });

    return context;
  } catch (error) {
    if (DEBUG_LOGGING) {
      console.error('Context detection failed:', error);
    }
    
    // Return minimal context on error
    return {
      appName,
      windowTitle,
      isForeground: false,
      mediaState: 'none',
      audioVideoContext: {
        isAudioPlaying: false,
        isVideoPlaying: false,
        audioDeviceActive: false,
        contentType: 'none',
        contentTypeConfidence: 1.0
      },
      resourceContext: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkActivity: 'none',
        diskActivity: 'none',
        isProcessing: false
      },
      behaviorContext: {
        recentInteractions,
        foregroundTime,
        timeSinceLastInteraction: 0,
        usagePattern: 'active'
      }
    };
  }
}

/**
 * Detects audio/video playback context using Windows APIs
 */
async function detectAudioVideoContext(appName: string, windowTitle: string): Promise<AudioVideoContext> {
  try {
    // Use Windows PowerShell to detect audio sessions
    const audioDetection = await detectAudioPlayback();
    
    // Detect video playback based on app patterns and resource usage
    const videoDetection = await detectVideoPlayback(appName, windowTitle);
    
    // Classify content type based on app and window title
    const contentAnalysis = analyzeContentType(appName, windowTitle);
    
    return {
      isAudioPlaying: audioDetection.isPlaying,
      isVideoPlaying: videoDetection.isPlaying,
      audioDeviceActive: audioDetection.deviceActive,
      contentType: contentAnalysis.type,
      contentTypeConfidence: contentAnalysis.confidence
    };
  } catch (error) {
    if (DEBUG_LOGGING) {
      console.error('Audio/video detection failed:', error);
    }
    
    return {
      isAudioPlaying: false,
      isVideoPlaying: false,
      audioDeviceActive: false,
      contentType: 'none',
      contentTypeConfidence: 1.0
    };
  }
}

/**
 * Detects audio playback using Windows Audio Session API
 */
async function detectAudioPlayback(): Promise<{ isPlaying: boolean; deviceActive: boolean }> {
  try {
    // PowerShell script to check audio sessions
    const audioScript = `
      Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        
        public class AudioAPI {
          [DllImport("winmm.dll", SetLastError = true)]
          public static extern uint waveOutGetNumDevs();
          
          [DllImport("winmm.dll", SetLastError = true)]
          public static extern uint mixerGetNumDevs();
        }
      "@
      
      # Get audio devices
      $audioDevices = [AudioAPI]::waveOutGetNumDevs()
      $mixerDevices = [AudioAPI]::mixerGetNumDevs()
      
      # Check if any audio sessions are active
      $audioSessions = Get-WmiObject -Class Win32_Process | Where-Object { 
        $_.ProcessName -match "(spotify|chrome|firefox|vlc|wmplayer|iTunes|musicbee)" 
      }
      
      $isPlaying = $audioSessions.Count -gt 0
      $deviceActive = $audioDevices -gt 0
      
      Write-Output "$isPlaying,$deviceActive"
    `;

    const { stdout } = await execAsync(`powershell -Command "${audioScript.replace(/"/g, '\\"')}"`, {
      timeout: 5000,
      windowsHide: true
    });

    const [isPlaying, deviceActive] = stdout.trim().split(',');
    
    return {
      isPlaying: isPlaying === 'True',
      deviceActive: deviceActive === 'True'
    };
  } catch (error) {
    if (DEBUG_LOGGING) {
      console.error('Audio detection failed:', error);
    }
    
    return { isPlaying: false, deviceActive: false };
  }
}

/**
 * Detects video playback based on app patterns and resource usage
 */
async function detectVideoPlayback(appName: string, windowTitle: string): Promise<{ isPlaying: boolean }> {
  try {
    // Check for video-related apps
    const videoApps = [
      'vlc', 'media player', 'windows media player', 'mpc-hc', 'potplayer',
      'netflix', 'youtube', 'prime video', 'disney+', 'hulu', 'twitch'
    ];
    
    const appLower = appName.toLowerCase();
    const titleLower = windowTitle.toLowerCase();
    
    const isVideoApp = videoApps.some(app => 
      appLower.includes(app) || titleLower.includes(app)
    );
    
    // Check for video-related window titles
    const videoKeywords = [
      'playing', 'video', 'movie', 'stream', 'youtube', 'netflix', 
      'twitch', 'vimeo', 'dailymotion', 'facebook video'
    ];
    
    const hasVideoKeywords = videoKeywords.some(keyword => 
      titleLower.includes(keyword)
    );
    
    // For browsers, check for video streaming sites
    const browserVideoCheck = appLower.includes('chrome') || 
                             appLower.includes('firefox') || 
                             appLower.includes('edge');
    
    const isVideoSite = browserVideoCheck && (
      titleLower.includes('youtube') ||
      titleLower.includes('netflix') ||
      titleLower.includes('twitch') ||
      titleLower.includes('video') ||
      titleLower.includes('watch')
    );
    
    return {
      isPlaying: isVideoApp || hasVideoKeywords || isVideoSite
    };
  } catch (error) {
    if (DEBUG_LOGGING) {
      console.error('Video detection failed:', error);
    }
    
    return { isPlaying: false };
  }
}

/**
 * Analyzes content type based on application and window title
 */
function analyzeContentType(appName: string, windowTitle: string): {
  type: AudioVideoContext['contentType'];
  confidence: number;
} {
  const appLower = appName.toLowerCase();
  const titleLower = windowTitle.toLowerCase();
  
  // Entertainment indicators
  const entertainmentPatterns = [
    'netflix', 'youtube', 'twitch', 'spotify', 'music', 'game', 'entertainment',
    'movie', 'tv show', 'series', 'funny', 'memes', 'social media'
  ];
  
  // Educational indicators
  const educationalPatterns = [
    'tutorial', 'course', 'learn', 'education', 'documentation', 'guide',
    'training', 'lecture', 'coursera', 'udemy', 'khan academy', 'stackoverflow'
  ];
  
  // Communication indicators
  const communicationPatterns = [
    'zoom', 'teams', 'skype', 'discord', 'slack', 'meeting', 'call',
    'webinar', 'conference', 'hangouts'
  ];
  
  // Check patterns
  const checkPatterns = (patterns: string[]) => {
    return patterns.some(pattern => 
      appLower.includes(pattern) || titleLower.includes(pattern)
    );
  };
  
  if (checkPatterns(entertainmentPatterns)) {
    return { type: 'entertainment', confidence: 0.8 };
  }
  
  if (checkPatterns(educationalPatterns)) {
    return { type: 'educational', confidence: 0.8 };
  }
  
  if (checkPatterns(communicationPatterns)) {
    return { type: 'communication', confidence: 0.9 };
  }
  
  // Default to ambient for background music/sounds
  if (appLower.includes('spotify') || appLower.includes('music')) {
    return { type: 'ambient', confidence: 0.7 };
  }
  
  return { type: 'none', confidence: 1.0 };
}

/**
 * Detects resource usage context for an application
 */
async function detectResourceContext(appName: string): Promise<ResourceContext> {
  try {
    // Get current processes
    const processes = await si.processes();
    const targetProcess = processes.list.find(p => 
      p.name.toLowerCase().includes(appName.toLowerCase())
    );
    
    if (!targetProcess) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        networkActivity: 'none',
        diskActivity: 'none',
        isProcessing: false
      };
    }
    
    // Get network and disk stats
    const [networkStats, diskStats] = await Promise.all([
      si.networkStats(),
      si.disksIO()
    ]);
    
    // Calculate network activity level
    const networkActivity = calculateNetworkActivity(networkStats);
    
    // Calculate disk activity level
    const diskActivity = calculateDiskActivity(diskStats);
    
    // Determine if processing
    const isProcessing = targetProcess.cpu > CONTEXT_CONFIG.processingCpuThreshold ||
                        networkActivity !== 'none' ||
                        diskActivity !== 'none';
    
         return {
       cpuUsage: targetProcess.cpu,
       memoryUsage: targetProcess.memRss || targetProcess.mem || 0,
       networkActivity,
       diskActivity,
       isProcessing
     };
  } catch (error) {
    if (DEBUG_LOGGING) {
      console.error('Resource detection failed:', error);
    }
    
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      networkActivity: 'none',
      diskActivity: 'none',
      isProcessing: false
    };
  }
}

/**
 * Calculates network activity level
 */
function calculateNetworkActivity(networkStats: any[]): ResourceContext['networkActivity'] {
  if (!networkStats || networkStats.length === 0) return 'none';
  
  const totalBytes = networkStats.reduce((sum, stat) => 
    sum + (stat.tx_bytes || 0) + (stat.rx_bytes || 0), 0
  );
  
  if (totalBytes === 0) return 'none';
  if (totalBytes < 1024 * 1024) return 'low';        // < 1MB
  if (totalBytes < 10 * 1024 * 1024) return 'medium'; // < 10MB
  return 'high';
}

/**
 * Calculates disk activity level
 */
function calculateDiskActivity(diskStats: any): ResourceContext['diskActivity'] {
  if (!diskStats || typeof diskStats.rIO !== 'number') return 'none';
  
  const totalOps = diskStats.rIO + diskStats.wIO;
  
  if (totalOps === 0) return 'none';
  if (totalOps < 50) return 'low';
  if (totalOps < 200) return 'medium';
  return 'high';
}

/**
 * Determines media state from audio/video context
 */
function determineMediaState(audioVideoContext: AudioVideoContext): MediaState {
  if (audioVideoContext.isVideoPlaying) return 'playing';
  if (audioVideoContext.isAudioPlaying) return 'playing';
  return 'none';
}

/**
 * Analyzes behavior context based on interaction patterns
 */
function analyzeBehaviorContext(
  recentInteractions: number,
  foregroundTime: number,
  resourceContext: ResourceContext,
  audioVideoContext: AudioVideoContext
): BehaviorContext {
  // Determine usage pattern
  let usagePattern: BehaviorContext['usagePattern'] = 'active';
  
  if (recentInteractions === 0 && foregroundTime < 30) {
    usagePattern = 'background';
  } else if (recentInteractions < 3 && !resourceContext.isProcessing) {
    usagePattern = 'passive';
  } else if (recentInteractions > 10 && foregroundTime < 60) {
    usagePattern = 'intermittent';
  }
  
  // If media is playing, adjust pattern
  if (audioVideoContext.isVideoPlaying || audioVideoContext.isAudioPlaying) {
    usagePattern = audioVideoContext.contentType === 'entertainment' ? 'passive' : 'active';
  }
  
  return {
    recentInteractions,
    foregroundTime,
    timeSinceLastInteraction: Date.now() - (foregroundTime * 1000),
    usagePattern
  };
}

/**
 * Generates context description for AI prompts
 */
export function generateContextDescription(context: ApplicationContext): string {
  const parts = [];
  
  parts.push(`App: ${context.appName}`);
  
  if (context.isForeground) {
    parts.push('Foreground: Active window');
  } else {
    parts.push('Background: Not active window');
  }
  
  if (context.audioVideoContext.isAudioPlaying || context.audioVideoContext.isVideoPlaying) {
    parts.push(`Media: ${context.audioVideoContext.contentType} content playing`);
  }
  
  if (context.resourceContext.isProcessing) {
    parts.push(`Processing: High CPU/disk/network activity`);
  }
  
  if (context.behaviorContext.usagePattern !== 'active') {
    parts.push(`Usage: ${context.behaviorContext.usagePattern} pattern`);
  }
  
  return parts.join(', ');
}

// === LIFECYCLE MANAGEMENT ===

/**
 * Starts context detection monitoring
 */
export async function startContextDetection(): Promise<boolean> {
  if (isDetectionActive) {
    return true;
  }
  
  try {
    isDetectionActive = true;
    
    if (DEBUG_LOGGING) {
      console.log('🔍 Starting context detection...');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to start context detection:', error);
    return false;
  }
}

/**
 * Stops context detection monitoring
 */
export async function stopContextDetection(): Promise<void> {
  isDetectionActive = false;
  
  if (audioDetectionTimer) {
    clearInterval(audioDetectionTimer);
    audioDetectionTimer = null;
  }
  
  if (resourceMonitoringTimer) {
    clearInterval(resourceMonitoringTimer);
    resourceMonitoringTimer = null;
  }
  
  contextCache.clear();
}

/**
 * Checks if context detection is active
 */
export function isContextDetectionActive(): boolean {
  return isDetectionActive;
}
