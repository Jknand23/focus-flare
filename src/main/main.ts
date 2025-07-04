/**
 * Main Process - Electron application entry point
 * 
 * Main entry point for the FocusFlare Electron application. Handles application
 * lifecycle, window management, system tray integration, IPC communication,
 * and coordinates between database, monitoring, and UI components.
 * 
 * @module Main
 * @author FocusFlare Team
 * @since 0.1.0
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import http from 'http';
import { 
  initializeDatabase, 
  closeDatabaseConnection,
  checkDatabaseHealth,
  getDatabaseConnection,
  getActivities,
  getSessionsByDate,
  updateSession,
  getUnclassifiedActivities,
  getUserSettings,
  updateUserSettings,
  resetUserSettings,
  clearAllActivityData
} from '@/main/database/connection';
import { 
  startMonitoring, 
  stopMonitoring,
  isMonitoringSystemActive
} from '@/main/system-monitoring/index';
import { IPC_CHANNELS } from '@/shared/types/activity-types';
import type { 
  GetActivitiesByDateRequest,
  GetRecentActivitiesRequest,
  GetSessionsByDateRequest,
  UpdateSessionRequest,
  ActivityData,
  ActivityTableRow
} from '@/shared/types/activity-types';
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  TRAY_TOOLTIP,
  TRAY_MENU,
  DEBUG_LOGGING,
  DEFAULT_ACTIVITY_LIMIT
} from '@/shared/constants/app-constants';
import { processActivitiesIntoSessions } from '@/main/ai-integration/session-classifier';
import { 
  initializeWorkflowManager, 
  cleanupWorkflowManager, 
  getWorkflowManager 
} from '@/main/automation/workflow-manager';

// === GLOBAL STATE ===

/** Main dashboard window instance */
let mainWindow: BrowserWindow | null = null;

/** System tray instance */
let tray: Tray | null = null;

/** Application ready state */
let isAppReady = false;

/** Monitoring pause state */
let isMonitoringPaused = false;

// === UTILITY FUNCTIONS ===

/**
 * Gets the correct path for development vs production
 */
function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, '..', '..', relativePath);
}

/**
 * Transforms database rows to UI-friendly activity data
 */
function transformActivityData(rows: ActivityTableRow[]): ActivityData[] {
  return rows.map(row => ({
    id: row.id,
    timestamp: new Date(row.timestamp),
    appName: row.app_name,
    windowTitle: row.window_title,
    duration: row.duration,
    formattedDuration: formatDuration(row.duration),
    activityLevel: row.activity_level,
    interactionCount: row.interaction_count,
    isProcessing: row.is_processing,
    cpuUsage: row.cpu_usage,
    category: undefined, // Will be added in Phase 2 with AI classification
    sessionId: row.session_id,
    isIdle: row.is_idle
  }));
}

/**
 * Formats duration in milliseconds to human-readable string
 */
function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// === WINDOW MANAGEMENT ===

/**
 * Creates the main dashboard window
 */
function createMainWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    title: APP_NAME,
    icon: getResourcePath('assets/icons/icon.png'),
    show: false, // Start hidden
    webPreferences: {
      nodeIntegration: false, // Security: disable node integration
      contextIsolation: true, // Security: enable context isolation
      // Security: disable remote module (removed in newer Electron versions)
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false // Required for preload script access
    }
  });

  // Load the application
  if (DEBUG_LOGGING) {
    mainWindow.webContents.openDevTools();
  }

  // In development, load from vite dev server
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Hide window instead of closing (minimize to tray)
  mainWindow.on('close', (event) => {
    // Check if app is quitting by seeing if all windows are being closed
    if (BrowserWindow.getAllWindows().length > 1) {
      event.preventDefault();
      hideMainWindow();
    }
  });

  // Handle window ready
  mainWindow.once('ready-to-show', () => {
    if (DEBUG_LOGGING) {
      console.log('Main window ready to show');
      // Auto-show window in development mode
      mainWindow?.show();
    }
  });
}

/**
 * Shows the main dashboard window
 */
function showMainWindow(): void {
  if (!mainWindow) {
    createMainWindow();
  }
  
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    
    if (DEBUG_LOGGING) {
      console.log('Main window shown');
    }
  }
}

/**
 * Hides the main dashboard window
 */
function hideMainWindow(): void {
  if (mainWindow) {
    mainWindow.hide();
    
    if (DEBUG_LOGGING) {
      console.log('Main window hidden');
    }
  }
}

// === SYSTEM TRAY ===

/**
 * Creates the system tray with context menu
 */
function createSystemTray(): void {
  try {
    // Create tray icon with fallback
    const iconPath = getResourcePath('assets/icons/tray-icon.png');
    let trayIcon = nativeImage.createFromPath(iconPath);
    
    // Fallback to empty icon if file doesn't exist
    if (trayIcon.isEmpty()) {
      // Create a simple 16x16 white square as fallback
      trayIcon = nativeImage.createFromBuffer(Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF, 0x61, 0x00, 0x00, 0x00,
        0x0D, 0x49, 0x44, 0x41, 0x54, 0x38, 0x11, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]));
      
      if (DEBUG_LOGGING) {
        console.log('Using fallback tray icon (icon file not found)');
      }
    }
    
    tray = new Tray(trayIcon);
    
    // Set tooltip
    tray.setToolTip(TRAY_TOOLTIP);
    
    // Double-click to show/hide window
    tray.on('double-click', () => {
      if (mainWindow?.isVisible()) {
        hideMainWindow();
      } else {
        showMainWindow();
      }
    });

    // Initialize with proper menu
    updateSystemTray();
    
    if (DEBUG_LOGGING) {
      console.log('System tray created successfully');
    }
  } catch (error) {
    console.error('Failed to create system tray:', error);
  }
}

/**
 * Updates the system tray with current monitoring status
 */
function updateSystemTray(): void {
  if (!tray) return;

  // Create context menu with dynamic pause/resume option
  const contextMenu = Menu.buildFromTemplate([
    {
      label: TRAY_MENU.SHOW_DASHBOARD,
      click: showMainWindow
    },
    {
      label: TRAY_MENU.HIDE_DASHBOARD,
      click: hideMainWindow
    },
    { type: 'separator' },
    {
      label: isMonitoringPaused ? 'Resume Monitoring' : 'Pause Monitoring',
      click: () => {
        toggleMonitoring();
      }
    },
    { type: 'separator' },
    {
      label: TRAY_MENU.SETTINGS,
      click: () => {
        showMainWindow();
        // Send message to open settings panel
        mainWindow?.webContents.send('open-settings-panel');
      }
    },
    { type: 'separator' },
    {
      label: TRAY_MENU.QUIT,
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

/**
 * Toggle monitoring pause/resume state
 */
async function toggleMonitoring(): Promise<void> {
  try {
    if (isMonitoringPaused) {
      // Resume monitoring
      await startMonitoring();
      isMonitoringPaused = false;
      console.log('Enhanced monitoring resumed');
    } else {
      // Pause monitoring
      await stopMonitoring();
      isMonitoringPaused = true;
      console.log('Enhanced monitoring paused');
    }
    
    // Update tray menu to reflect new state
    updateSystemTray();
  } catch (error) {
    console.error('Failed to toggle monitoring:', error);
  }
}

// === IPC HANDLERS ===

/**
 * Sets up IPC handlers for communication with renderer process
 */
function setupIpcHandlers(): void {
  // Activity data handlers
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVITIES, async () => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: GET_ACTIVITIES called');
      }
      
      const activities = getActivities({ limit: DEFAULT_ACTIVITY_LIMIT });
      const transformed = transformActivityData(activities);
      
      if (DEBUG_LOGGING) {
        console.log(`IPC: Returning ${activities.length} raw activities, ${transformed.length} transformed`);
        console.log('First few activities:', activities.slice(0, 3));
      }
      
      return transformed;
    } catch (error) {
      console.error('Failed to get activities:', error);
      throw error;
    }
  });
  
  ipcMain.handle(IPC_CHANNELS.GET_RECENT_ACTIVITIES, async (_, request: GetRecentActivitiesRequest) => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: GET_RECENT_ACTIVITIES called with request:', request);
      }
      
      const { hours, limit = DEFAULT_ACTIVITY_LIMIT } = request;
      const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      if (DEBUG_LOGGING) {
        console.log(`IPC: Fetching activities since ${startDate.toISOString()}, limit: ${limit}`);
      }
      
      const activities = getActivities({ 
        startDate, 
        limit 
      });
      
      const transformed = transformActivityData(activities);
      
      if (DEBUG_LOGGING) {
        console.log(`IPC: Found ${activities.length} raw activities, returning ${transformed.length} transformed`);
        if (activities.length > 0) {
          console.log('Sample activity:', activities[0]);
        }
      }
      
      return transformed;
    } catch (error) {
      console.error('Failed to get recent activities:', error);
      throw error;
    }
  });
  
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVITIES_BY_DATE, async (_, request: GetActivitiesByDateRequest) => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: GET_ACTIVITIES_BY_DATE called with request:', request);
      }
      
      const { startDate, endDate, limit = DEFAULT_ACTIVITY_LIMIT } = request;
      
      const activities = getActivities({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        limit
      });
      
      const transformed = transformActivityData(activities);
      
      if (DEBUG_LOGGING) {
        console.log(`IPC: Found ${activities.length} activities for date range, returning ${transformed.length} transformed`);
      }
      
      return transformed;
    } catch (error) {
      console.error('Failed to get activities by date:', error);
      throw error;
    }
  });
  
  // System operation handlers
  ipcMain.handle(IPC_CHANNELS.SHOW_DASHBOARD, async () => {
    showMainWindow();
  });
  
  ipcMain.handle(IPC_CHANNELS.HIDE_DASHBOARD, async () => {
    hideMainWindow();
  });
  
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async () => {
    return APP_VERSION;
  });
  
  // Session operation handlers
  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS_BY_DATE, async (_, request: GetSessionsByDateRequest) => {
    try {
      return getSessionsByDate(request);
    } catch (error) {
      console.error('Failed to get sessions by date:', error);
      throw error;
    }
  });
  
  ipcMain.handle(IPC_CHANNELS.UPDATE_SESSION, async (_, request: UpdateSessionRequest) => {
    try {
      updateSession(request);
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  });
  
  ipcMain.handle(IPC_CHANNELS.CLASSIFY_SESSION, async () => {
    try {
      // Get recent unclassified activities
      const activities = getUnclassifiedActivities(24); // Last 24 hours
      
      if (activities.length === 0) {
        if (DEBUG_LOGGING) {
          console.log('No unclassified activities found for session classification');
        }
        return;
      }
      
      // Process activities into sessions
      const stats = await processActivitiesIntoSessions(activities, {
        useAI: true,
        context: 'User-triggered classification'
      });
      
      if (DEBUG_LOGGING) {
        console.log('Session classification completed:', stats);
      }
    } catch (error) {
      console.error('Failed to classify sessions:', error);
      throw error;
    }
  });

  // Database operation handlers
  ipcMain.handle(IPC_CHANNELS.DB_HEALTH_CHECK, async () => {
    try {
      return await checkDatabaseHealth();
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  });

  // Enhanced monitoring handlers
  ipcMain.handle('monitoring:get-status', async () => {
    try {
      const { getMonitoringStatus } = await import('@/main/system-monitoring/index');
      return getMonitoringStatus();
    } catch (error) {
      console.error('Failed to get monitoring status:', error);
      return { overall: false, enhancedActivityLogging: false, userInteractionMonitoring: false, resourceMonitoring: false };
    }
  });

  ipcMain.handle('monitoring:get-current-data', async () => {
    try {
      const { getCurrentMonitoringData } = await import('@/main/system-monitoring/index');
      return getCurrentMonitoringData();
    } catch (error) {
      console.error('Failed to get current monitoring data:', error);
      return { currentSession: null, appActivityStates: {}, backgroundAppsState: {}, recentInteractions: [] };
    }
  });

  ipcMain.handle('monitoring:get-app-activity-states', async () => {
    try {
      const { getAppActivityStates } = await import('@/main/system-monitoring/index');
      return getAppActivityStates();
    } catch (error) {
      console.error('Failed to get app activity states:', error);
      return {};
    }
  });

  ipcMain.handle('monitoring:get-app-resource-usage', async (_, appName: string) => {
    try {
      const { getAppResourceUsage } = await import('@/main/system-monitoring/index');
      return getAppResourceUsage(appName);
    } catch (error) {
      console.error('Failed to get app resource usage:', error);
      return null;
    }
  });

  // AI/Ollama operation handlers
  ipcMain.handle('ollama:health-check', async () => {
    try {
      // Use Node.js http module for better compatibility
      // Use imported http module for better compatibility
      
      if (DEBUG_LOGGING) {
        console.log('Starting Ollama health check...');
      }
      
      return new Promise<boolean>((resolve) => {
        const req = http.get('http://127.0.0.1:11434/api/tags', (res: any) => {
          if (DEBUG_LOGGING) {
            console.log(`Ollama health check response: ${res.statusCode}`);
          }
          
          let data = '';
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                const hasModel = parsed.models?.some((model: any) => 
                  model.name.includes('llama3.2:3b') || model.name.includes('llama3.2')
                );
                if (DEBUG_LOGGING) {
                  console.log('Ollama models found:', parsed.models?.map((m: any) => m.name));
                  console.log('Has required model (llama3.2):', hasModel);
                }
                resolve(hasModel);
              } catch (parseError) {
                if (DEBUG_LOGGING) {
                  console.warn('Failed to parse Ollama response:', parseError);
                }
                resolve(false);
              }
            } else {
              resolve(false);
            }
          });
        });
        
        req.on('error', (error: any) => {
          if (DEBUG_LOGGING) {
            console.warn('Ollama health check request error:', error.message);
          }
          resolve(false);
        });
        
        req.setTimeout(5000, () => {
          if (DEBUG_LOGGING) {
            console.warn('Ollama health check timeout');
          }
          req.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  });

  // Monitoring control handlers

  ipcMain.handle('monitoring:pause', async () => {
    try {
      isMonitoringPaused = true;
      await stopMonitoring();
      console.log('Enhanced monitoring paused');
      updateSystemTray();
    } catch (error) {
      console.error('Failed to pause monitoring:', error);
      throw error;
    }
  });

  ipcMain.handle('monitoring:resume', async () => {
    try {
      isMonitoringPaused = false;
      await startMonitoring();
      console.log('Enhanced monitoring resumed');
      updateSystemTray();
    } catch (error) {
      console.error('Failed to resume monitoring:', error);
      throw error;
    }
  });

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = await getUserSettings();
      if (DEBUG_LOGGING) {
        console.log('Retrieved settings for renderer:', Object.keys(settings));
      }
      return settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (_, updates) => {
    try {
      await updateUserSettings(updates);
      if (DEBUG_LOGGING) {
        console.log('Settings updated successfully:', Object.keys(updates));
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  });

  // Workflow backup handlers
  ipcMain.handle('workflow-backup:create', async (_, options) => {
    try {
      const { getWorkflowBackupManager } = await import('@/main/automation/workflow-backup');
      const backupManager = getWorkflowBackupManager();
      
      if (DEBUG_LOGGING) {
        console.log('Creating workflow backup with options:', options);
      }
      
      const result = await backupManager.createBackup(options);
      
      if (DEBUG_LOGGING) {
        console.log('Workflow backup created:', result);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to create workflow backup:', error);
      throw error;
    }
  });

  ipcMain.handle('workflow-backup:list', async (_, options) => {
    try {
      const { getWorkflowBackupManager } = await import('@/main/automation/workflow-backup');
      const backupManager = getWorkflowBackupManager();
      
      const result = await backupManager.listBackups(options?.location);
      
      if (DEBUG_LOGGING) {
        console.log(`Found ${result.length} workflow backups`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to list workflow backups:', error);
      throw error;
    }
  });

  ipcMain.handle('workflow-backup:restore', async (_, options) => {
    try {
      const { getWorkflowBackupManager } = await import('@/main/automation/workflow-backup');
      const backupManager = getWorkflowBackupManager();
      
      if (DEBUG_LOGGING) {
        console.log('Restoring workflow backup:', options);
      }
      
      const result = await backupManager.restoreFromBackup(options);
      
      if (DEBUG_LOGGING) {
        console.log(`Restored ${result.length} workflows from backup`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to restore workflow backup:', error);
      throw error;
    }
  });

  ipcMain.handle('workflow-backup:delete', async (_, options) => {
    try {
      const { getWorkflowBackupManager } = await import('@/main/automation/workflow-backup');
      const backupManager = getWorkflowBackupManager();
      
      if (DEBUG_LOGGING) {
        console.log('Deleting workflow backup:', options);
      }
      
      await backupManager.deleteBackup(options.backupId, options.location);
      
      if (DEBUG_LOGGING) {
        console.log('Workflow backup deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete workflow backup:', error);
      throw error;
    }
  });

  ipcMain.handle('dialog:select-directory', async (_, options) => {
    try {
      const { dialog } = await import('electron');
      
      if (!mainWindow) {
        throw new Error('Main window not available');
      }
      
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: options?.title || 'Select Directory',
        defaultPath: options?.defaultPath,
        buttonLabel: options?.buttonLabel || 'Select'
      });
      
      if (DEBUG_LOGGING) {
        console.log('Directory dialog result:', result);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to show directory dialog:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:reset', async () => {
    try {
      await resetUserSettings();
      if (DEBUG_LOGGING) {
        console.log('Settings reset to defaults successfully');
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:clear-activity-data', async () => {
    try {
      const result = await clearAllActivityData();
      if (DEBUG_LOGGING) {
        console.log('Activity data cleared successfully:', result);
      }
      return result;
    } catch (error) {
      console.error('Failed to clear activity data:', error);
      throw error;
    }
  });

  // === WORKFLOW AUTOMATION HANDLERS (Phase 3) ===

  // N8N Workflow Manager handlers
  ipcMain.handle('workflow:get-status', async () => {
    try {
      const manager = getWorkflowManager();
      return manager.getStatus();
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      return { isRunning: false, port: 5678 };
    }
  });

  ipcMain.handle('workflow:execute', async (_, webhookPath: string, data?: any) => {
    try {
      const manager = getWorkflowManager();
      return await manager.executeWorkflow(webhookPath, data);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  });

  ipcMain.handle('workflow:start-n8n', async () => {
    try {
      const manager = getWorkflowManager();
      await manager.startN8N();
    } catch (error) {
      console.error('Failed to start N8N:', error);
      throw error;
    }
  });

  ipcMain.handle('workflow:stop-n8n', async () => {
    try {
      const manager = getWorkflowManager();
      await manager.stopN8N();
    } catch (error) {
      console.error('Failed to stop N8N:', error);
      throw error;
    }
  });

  ipcMain.handle('workflow:trigger-session-end', async (_, sessionData) => {
    try {
      const manager = getWorkflowManager();
      return await manager.executeWorkflow('session-end-file-organization', sessionData);
    } catch (error) {
      console.error('Failed to trigger session end workflow:', error);
      throw error;
    }
  });

  ipcMain.handle('workflow:trigger-daily-summary', async () => {
    try {
      const manager = getWorkflowManager();
      return await manager.executeWorkflow('daily-focus-summary', {
        date: new Date().toISOString(),
        source: 'manual-trigger'
      });
    } catch (error) {
      console.error('Failed to trigger daily summary workflow:', error);
      throw error;
    }
  });

  // === WINDOWS INTEGRATIONS HANDLERS (Phase 4) ===

  // Windows Calendar Integration handlers
  ipcMain.handle('windows-calendar:get-status', async () => {
    try {
      const { getCalendarIntegration } = await import('@/main/integrations/windows-calendar-integration');
      const integration = getCalendarIntegration();
      return integration.getStatus();
    } catch (error) {
      console.error('Failed to get calendar integration status:', error);
      return { available: false, enabled: false, eventCount: 0 };
    }
  });

  ipcMain.handle('windows-calendar:get-events', async (_, options) => {
    try {
      const { getCalendarIntegration } = await import('@/main/integrations/windows-calendar-integration');
      const integration = getCalendarIntegration();
      return await integration.getCalendarEvents(options);
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      return [];
    }
  });

  ipcMain.handle('windows-calendar:initialize', async (_, config) => {
    try {
      const { initializeCalendarIntegration } = await import('@/main/integrations/windows-calendar-integration');
      const integration = await initializeCalendarIntegration(config);
      return integration.getStatus();
    } catch (error) {
      console.error('Failed to initialize calendar integration:', error);
      throw error;
    }
  });

  ipcMain.handle('windows-calendar:update-config', async (_, config) => {
    try {
      const { getCalendarIntegration } = await import('@/main/integrations/windows-calendar-integration');
      const integration = getCalendarIntegration();
      integration.updateConfig(config);
    } catch (error) {
      console.error('Failed to update calendar config:', error);
      throw error;
    }
  });

  // File Explorer Integration handlers
  ipcMain.handle('windows-file-explorer:get-status', async () => {
    try {
      const { getFileExplorerIntegration } = await import('@/main/integrations/file-explorer-integration');
      const integration = getFileExplorerIntegration();
      return integration.getStatus();
    } catch (error) {
      console.error('Failed to get file explorer integration status:', error);
      return { available: false, enabled: false, eventCount: 0 };
    }
  });

  ipcMain.handle('windows-file-explorer:get-events', async (_, options) => {
    try {
      const { getFileExplorerIntegration } = await import('@/main/integrations/file-explorer-integration');
      const integration = getFileExplorerIntegration();
      return await integration.getFileAccessEvents(options);
    } catch (error) {
      console.error('Failed to get file access events:', error);
      return [];
    }
  });

  ipcMain.handle('windows-file-explorer:initialize', async (_, config) => {
    try {
      const { initializeFileExplorerIntegration } = await import('@/main/integrations/file-explorer-integration');
      const integration = await initializeFileExplorerIntegration(config);
      return integration.getStatus();
    } catch (error) {
      console.error('Failed to initialize file explorer integration:', error);
      throw error;
    }
  });

  ipcMain.handle('windows-file-explorer:update-config', async (_, config) => {
    try {
      const { getFileExplorerIntegration } = await import('@/main/integrations/file-explorer-integration');
      const integration = getFileExplorerIntegration();
      integration.updateConfig(config);
    } catch (error) {
      console.error('Failed to update file explorer config:', error);
      throw error;
    }
  });

  // Productivity Insights Engine handlers
  ipcMain.handle('productivity-insights:generate', async (_, sessions, calendarEvents, fileEvents) => {
    try {
      const { getInsightsEngine } = await import('@/main/integrations/productivity-insights-engine');
      const engine = getInsightsEngine();
      return await engine.generateBatchInsights(sessions, calendarEvents, fileEvents);
    } catch (error) {
      console.error('Failed to generate productivity insights:', error);
      return [];
    }
  });

  ipcMain.handle('productivity-insights:generate-single', async (_, session, calendarEvents, fileEvents) => {
    try {
      const { getInsightsEngine } = await import('@/main/integrations/productivity-insights-engine');
      const engine = getInsightsEngine();
      return await engine.generateInsights(session, calendarEvents, fileEvents);
    } catch (error) {
      console.error('Failed to generate single productivity insight:', error);
      return null;
    }
  });

  ipcMain.handle('productivity-insights:update-config', async (_, config) => {
    try {
      const { getInsightsEngine } = await import('@/main/integrations/productivity-insights-engine');
      const engine = getInsightsEngine();
      engine.updateConfig(config);
    } catch (error) {
      console.error('Failed to update insights config:', error);
      throw error;
    }
  });

  // Windows Integration Testing handlers
  ipcMain.handle('windows-integrations:test-calendar', async () => {
    try {
      const { WindowsCalendarIntegration } = await import('@/main/integrations/windows-calendar-integration');
      const testIntegration = new WindowsCalendarIntegration({ enabled: true });
      await testIntegration.initialize();
      const status = testIntegration.getStatus();
      return status.available;
    } catch (error) {
      console.error('Calendar integration test failed:', error);
      return false;
    }
  });

  ipcMain.handle('windows-integrations:test-file-explorer', async () => {
    try {
      const { FileExplorerIntegration } = await import('@/main/integrations/file-explorer-integration');
      const testIntegration = new FileExplorerIntegration({ enabled: true });
      await testIntegration.initialize();
      const status = testIntegration.getStatus();
      return status.available;
    } catch (error) {
      console.error('File explorer integration test failed:', error);
      return false;
    }
  });

  ipcMain.handle('windows-integrations:clear-data', async () => {
    try {
      // Clear Windows integration data from database
      const database = getDatabaseConnection();
      database.exec('DELETE FROM windows_calendar_events');
      database.exec('DELETE FROM windows_file_events');
      database.exec('DELETE FROM productivity_insights');
      return true;
    } catch (error) {
      console.error('Failed to clear Windows integration data:', error);
      return false;
    }
  });

  ipcMain.handle('windows-integrations:get-data-summary', async () => {
    try {
      const database = getDatabaseConnection();
      const calendarCount = database.prepare('SELECT COUNT(*) as count FROM windows_calendar_events').get() as { count: number };
      const fileCount = database.prepare('SELECT COUNT(*) as count FROM windows_file_events').get() as { count: number };
      const insightsCount = database.prepare('SELECT COUNT(*) as count FROM productivity_insights').get() as { count: number };
      
      return {
        calendarEvents: calendarCount?.count || 0,
        fileAccessEvents: fileCount?.count || 0,
        productivityInsights: insightsCount?.count || 0
      };
    } catch (error) {
      console.error('Failed to get Windows integration data summary:', error);
      return {
        calendarEvents: 0,
        fileAccessEvents: 0,
        productivityInsights: 0
      };
    }
  });

  // === ANALYTICS PATTERN ANALYSIS HANDLERS ===

  ipcMain.handle('analytics:analyze-patterns', async (_, startDate: string, endDate: string) => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: analytics:analyze-patterns called with:', { startDate, endDate });
      }
      
      const { analyzePatterns } = await import('@/main/analytics/pattern-analyzer');
      const result = await analyzePatterns(new Date(startDate), new Date(endDate));
      
      if (DEBUG_LOGGING) {
        console.log('Analytics patterns result:', {
          focusPatterns: result.focusPatterns.length,
          distractionPatterns: result.distractionPatterns.length,
          hasProductivityTrend: !!result.productivityTrend,
          insights: result.insights.length
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
      throw error;
    }
  });

  ipcMain.handle('analytics:get-focus-patterns', async (_, startDate: string, endDate: string) => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: analytics:get-focus-patterns called with:', { startDate, endDate });
      }
      
      const { createPatternAnalyzer } = await import('@/main/analytics/pattern-analyzer');
      const analyzer = createPatternAnalyzer();
      
      // Get sessions for the date range
      const sessions = await getSessionsByDate({
        startDate: startDate,
        endDate: endDate
      });
      
      const focusPatterns = await analyzer.analyzeFocusPatterns(sessions, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: 'custom'
      });
      
      return focusPatterns;
    } catch (error) {
      console.error('Failed to get focus patterns:', error);
      throw error;
    }
  });

  ipcMain.handle('analytics:get-distraction-patterns', async (_, startDate: string, endDate: string) => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: analytics:get-distraction-patterns called with:', { startDate, endDate });
      }
      
      const { createPatternAnalyzer } = await import('@/main/analytics/pattern-analyzer');
      const analyzer = createPatternAnalyzer();
      
      // Get sessions for the date range
      const sessions = await getSessionsByDate({
        startDate: startDate,
        endDate: endDate
      });
      
      const distractionPatterns = await analyzer.analyzeDistractionPatterns(sessions);
      
      return distractionPatterns;
    } catch (error) {
      console.error('Failed to get distraction patterns:', error);
      throw error;
    }
  });

  ipcMain.handle('analytics:get-productivity-trend', async (_, startDate: string, endDate: string) => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: analytics:get-productivity-trend called with:', { startDate, endDate });
      }
      
      const { createPatternAnalyzer } = await import('@/main/analytics/pattern-analyzer');
      const analyzer = createPatternAnalyzer();
      
      // Get sessions for the date range
      const sessions = await getSessionsByDate({
        startDate: startDate,
        endDate: endDate
      });
      
      const productivityTrend = await analyzer.analyzeProductivityTrends(sessions, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: 'custom'
      });
      
      return productivityTrend;
    } catch (error) {
      console.error('Failed to get productivity trend:', error);
      throw error;
    }
  });

  ipcMain.handle('analytics:get-insights', async (_, startDate: string, endDate: string) => {
    try {
      if (DEBUG_LOGGING) {
        console.log('IPC: analytics:get-insights called with:', { startDate, endDate });
      }
      
      const { createPatternAnalyzer } = await import('@/main/analytics/pattern-analyzer');
      const analyzer = createPatternAnalyzer();
      
      // Get sessions for the date range
      const sessions = await getSessionsByDate({
        startDate: startDate,
        endDate: endDate
      });
      
      // Get all analysis results
      const focusPatterns = await analyzer.analyzeFocusPatterns(sessions, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: 'custom'
      });
      
      const distractionPatterns = await analyzer.analyzeDistractionPatterns(sessions);
      
      const productivityTrend = await analyzer.analyzeProductivityTrends(sessions, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: 'custom'
      });
      
      // Generate personalized insights
      const insights = await analyzer.generatePersonalizedInsights(
        focusPatterns,
        distractionPatterns,
        productivityTrend
      );
      
      return insights;
    } catch (error) {
      console.error('Failed to get insights:', error);
      throw error;
    }
  });

  if (DEBUG_LOGGING) {
    console.log('IPC handlers registered successfully');
  }
}

// === APPLICATION LIFECYCLE ===

/**
 * Initializes the application
 */
async function initializeApp(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    
    if (DEBUG_LOGGING) {
      console.log('=== DEBUG: Checking database after initialization ===');
      
      // Quick database health check
      const healthOk = await checkDatabaseHealth();
      console.log(`Database health check: ${healthOk ? '✅ OK' : '❌ FAILED'}`);
      
      // Check if we have any existing activities
      try {
        const allActivities = getActivities({ limit: 5 });
        console.log(`Activities in database: ${allActivities.length}`);
        
        if (allActivities.length > 0) {
          console.log('Latest activity:', allActivities[0]);
          
          // Check if enhanced fields are present
          const latestActivity = allActivities[0];
          const hasEnhancedFields = 
            latestActivity.activity_level !== undefined &&
            latestActivity.interaction_count !== undefined &&
            latestActivity.is_processing !== undefined &&
            latestActivity.cpu_usage !== undefined;
          
          console.log(`Enhanced fields present: ${hasEnhancedFields ? '✅ YES' : '❌ NO'}`);
          
          if (hasEnhancedFields) {
            console.log('Enhanced monitoring features detected in database');
          } else {
            console.log('⚠️ Enhanced monitoring migration may not have been applied');
          }
        } else {
          console.log('⚠️ No activities found in database');
        }
      } catch (error) {
        console.error('❌ Failed to query activities:', error);
      }
    }
    
    // Start enhanced monitoring
    const monitoringStarted = await startMonitoring();
    
    if (DEBUG_LOGGING) {
      console.log(`Enhanced monitoring started: ${monitoringStarted ? '✅ OK' : '❌ FAILED'}`);
      
      // Check monitoring status
      const isActive = isMonitoringSystemActive();
      console.log(`Enhanced monitoring active: ${isActive ? '✅ YES' : '❌ NO'}`);
    }
    
    // Create system tray
    createSystemTray();
    
    // Setup IPC handlers
    setupIpcHandlers();

    // Initialize workflow manager (Phase 3)
    try {
      // Temporarily disabled to avoid N8N startup issues
      // await initializeWorkflowManager({
      //   debug: DEBUG_LOGGING,
      //   autoStart: true // Auto-start N8N with FocusFlare
      // });
      
      if (DEBUG_LOGGING) {
        console.log('⚠️ Workflow Manager initialization temporarily disabled');
      }
    } catch (error) {
      console.error('⚠️ Failed to initialize Workflow Manager:', error);
      // Continue without workflow automation - not critical for core functionality
    }
    
    // Auto-create and show window in development mode
    if (DEBUG_LOGGING) {
      createMainWindow();
    }
    
    isAppReady = true;
    
    if (DEBUG_LOGGING) {
      console.log('Application initialized successfully');
      
      // Wait a bit and check if activities are being logged
      setTimeout(() => {
        console.log('=== DEBUG: Checking activity logging after 10 seconds ===');
        try {
          const recentActivities = getActivities({ 
            startDate: new Date(Date.now() - 30000), // Last 30 seconds
            limit: 10 
          });
          console.log(`New activities in last 30 seconds: ${recentActivities.length}`);
          
          if (recentActivities.length > 0) {
            console.log('✅ Enhanced monitoring is working!');
            console.log('Recent activities with enhanced data:', recentActivities.slice(0, 3));
            
            // Show enhanced monitoring information
            const enhancedActivity = recentActivities[0];
            console.log('Enhanced activity details:');
            console.log(`  • Activity Level: ${enhancedActivity.activity_level}`);
            console.log(`  • Interaction Count: ${enhancedActivity.interaction_count}`);
            console.log(`  • Is Processing: ${enhancedActivity.is_processing}`);
            console.log(`  • CPU Usage: ${enhancedActivity.cpu_usage}%`);
          } else {
            console.log('⚠️ No new activities logged in the last 30 seconds');
            console.log('This could mean:');
            console.log('1. Enhanced monitoring is not working');
            console.log('2. No window changes occurred');
            console.log('3. Current app is excluded from tracking');
          }
        } catch (error) {
          console.error('❌ Failed to check recent activities:', error);
        }
      }, 10000);
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
}

/**
 * Cleanup when application is quitting
 */
async function cleanup(): Promise<void> {
  try {
    // Stop enhanced monitoring
    await stopMonitoring();
    
    // Cleanup workflow manager (Phase 3)
    await cleanupWorkflowManager();
    
    // Close database connection
    closeDatabaseConnection();
    
    if (DEBUG_LOGGING) {
      console.log('Application cleanup completed');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// === ELECTRON EVENT HANDLERS ===

// App ready event
app.whenReady().then(initializeApp);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app activation (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Handle before quit
app.on('before-quit', async (event) => {
  if (isAppReady) {
    event.preventDefault();
    await cleanup();
    app.exit();
  }
});

// Security: Prevent new window creation (for older Electron versions)
app.on('web-contents-created', (_, contents) => {
  // Handle navigation attempts for security
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
});

// Handle certificate errors (if needed for future HTTPS requests)
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // For now, reject all certificate errors for security
  event.preventDefault();
  callback(false);
});

if (DEBUG_LOGGING) {
  console.log(`${APP_NAME} v${APP_VERSION} starting...`);
} 