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
import { 
  initializeDatabase, 
  closeDatabaseConnection,
  checkDatabaseHealth,
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
  startActivityLogging, 
  stopActivityLogging,
  isActivityLoggingActive
} from '@/main/system-monitoring/activity-logger';
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
    category: undefined // Will be added in Phase 2 with AI classification
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
      await startActivityLogging();
      isMonitoringPaused = false;
      console.log('Activity monitoring resumed');
    } else {
      // Pause monitoring
      await stopActivityLogging();
      isMonitoringPaused = true;
      console.log('Activity monitoring paused');
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

  // AI/Ollama operation handlers
  ipcMain.handle('ollama:health-check', async () => {
    try {
      // Use Node.js http module for better compatibility
      const http = require('http');
      
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
  ipcMain.handle('monitoring:get-status', async () => {
    return {
      isActive: !isMonitoringPaused,
      isPaused: isMonitoringPaused
    };
  });

  ipcMain.handle('monitoring:pause', async () => {
    try {
      isMonitoringPaused = true;
      await stopActivityLogging();
      console.log('Activity monitoring paused');
      updateSystemTray();
    } catch (error) {
      console.error('Failed to pause monitoring:', error);
      throw error;
    }
  });

  ipcMain.handle('monitoring:resume', async () => {
    try {
      isMonitoringPaused = false;
      await startActivityLogging();
      console.log('Activity monitoring resumed');
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
        } else {
          console.log('⚠️ No activities found in database');
        }
      } catch (error) {
        console.error('❌ Failed to query activities:', error);
      }
    }
    
    // Start activity logging
    const monitoringStarted = await startActivityLogging();
    
    if (DEBUG_LOGGING) {
      console.log(`Activity monitoring started: ${monitoringStarted ? '✅ OK' : '❌ FAILED'}`);
      
      // Check monitoring status
      const isActive = isActivityLoggingActive();
      console.log(`Activity logging active: ${isActive ? '✅ YES' : '❌ NO'}`);
    }
    
    // Create system tray
    createSystemTray();
    
    // Setup IPC handlers
    setupIpcHandlers();
    
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
            console.log('✅ Activity logging is working!');
            console.log('Recent activities:', recentActivities.slice(0, 3));
          } else {
            console.log('⚠️ No new activities logged in the last 30 seconds');
            console.log('This could mean:');
            console.log('1. Activity logging is not working');
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
    // Stop activity logging
    await stopActivityLogging();
    
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