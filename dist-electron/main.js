"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const activeWin = require("active-win");
const APP_NAME = "FocusFlare";
const APP_VERSION = "0.1.0";
const DEFAULT_POLLING_INTERVAL = 5e3;
const MAX_MONITORING_RETRIES = 3;
const DB_FILENAME = "focusflare.db";
const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 800;
const MIN_WINDOW_WIDTH = 800;
const MIN_WINDOW_HEIGHT = 600;
const DEFAULT_ACTIVITY_LIMIT = 100;
const EXCLUDED_APPS = [
  "keepass",
  "bitwarden",
  "lastpass",
  "1password",
  "windows security",
  "windows defender",
  "task manager",
  "password",
  "credential"
];
const EXCLUDED_TITLE_PATTERNS = [
  "password",
  "credential",
  "login",
  "sign in",
  "sign up",
  "private",
  "incognito",
  "private browsing"
];
const DEBUG_LOGGING$1 = true;
const TRAY_TOOLTIP = "FocusFlare - Activity Tracker";
const TRAY_MENU = {
  SHOW_DASHBOARD: "Open Dashboard",
  HIDE_DASHBOARD: "Hide Dashboard",
  SETTINGS: "Settings",
  QUIT: "Quit FocusFlare"
};
const ERROR_MESSAGES = {
  DB_CONNECTION_FAILED: "Failed to connect to database",
  MONITORING_FAILED: "Activity monitoring failed"
};
const SUCCESS_MESSAGES = {
  DB_CONNECTED: "Database connected successfully",
  MONITORING_STARTED: "Activity monitoring started",
  MONITORING_STOPPED: "Activity monitoring stopped",
  SETTINGS_SAVED: "Settings saved successfully"
};
const CREATE_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration INTEGER NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'unclear',
    confidence_score REAL DEFAULT 0.0,
    user_corrected BOOLEAN DEFAULT FALSE,
    user_feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;
const CREATE_USER_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;
const CREATE_AI_FEEDBACK_TABLE = `
  CREATE TABLE IF NOT EXISTS ai_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id),
    original_classification TEXT NOT NULL,
    corrected_classification TEXT NOT NULL,
    user_context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;
const ALTER_ACTIVITIES_TABLE = `
  ALTER TABLE activities ADD COLUMN session_id INTEGER REFERENCES sessions(id)
`;
const ALTER_ACTIVITIES_TABLE_IDLE = `
  ALTER TABLE activities ADD COLUMN is_idle BOOLEAN DEFAULT FALSE
`;
const CREATE_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_user_corrected ON sessions(user_corrected)",
  "CREATE INDEX IF NOT EXISTS idx_activities_session_id ON activities(session_id)",
  "CREATE INDEX IF NOT EXISTS idx_activities_is_idle ON activities(is_idle)",
  "CREATE INDEX IF NOT EXISTS idx_ai_feedback_session_id ON ai_feedback(session_id)",
  "CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(key)"
];
const DEFAULT_SETTINGS = [
  ["work_hours_start", "09:00"],
  ["work_hours_end", "17:00"],
  ["break_duration_minutes", "15"],
  ["focus_session_goal_minutes", "120"],
  ["theme_preference", "system"],
  ["notifications_enabled", "true"],
  ["morning_nudge_enabled", "false"],
  ["data_retention_days", "90"],
  ["ai_classification_enabled", "true"]
];
function up(db) {
  try {
    db.exec(CREATE_SESSIONS_TABLE);
    db.exec(CREATE_USER_SETTINGS_TABLE);
    db.exec(CREATE_AI_FEEDBACK_TABLE);
    try {
      db.exec(ALTER_ACTIVITIES_TABLE);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("duplicate column name")) {
        throw error;
      }
    }
    try {
      db.exec(ALTER_ACTIVITIES_TABLE_IDLE);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("duplicate column name")) {
        throw error;
      }
    }
    for (const indexSQL of CREATE_INDEXES) {
      db.exec(indexSQL);
    }
    const insertSetting = db.prepare("INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)");
    for (const [key, value] of DEFAULT_SETTINGS) {
      insertSetting.run(key, value);
    }
    console.log("Migration 002: Sessions schema applied successfully");
  } catch (error) {
    console.error("Migration 002 failed:", error);
    throw error;
  }
}
let database = null;
let dbPath = "";
let insertActivityStatement = null;
let getActivitiesStatement = null;
let countActivitiesStatement = null;
let deleteOldActivitiesStatement = null;
const ACTIVITIES_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    app_name TEXT NOT NULL,
    window_title TEXT,
    duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;
const ACTIVITY_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp)",
  "CREATE INDEX IF NOT EXISTS idx_activities_app_name ON activities(app_name)",
  "CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at)"
];
async function initializeDatabase() {
  try {
    const userDataPath = electron.app.getPath("userData");
    dbPath = path.join(userDataPath, DB_FILENAME);
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    if (DEBUG_LOGGING$1) {
      console.log(`Initializing database at: ${dbPath}`);
    }
    database = new Database(dbPath, {
      verbose: DEBUG_LOGGING$1 ? console.log : void 0
    });
    database.pragma("journal_mode = WAL");
    database.pragma("synchronous = NORMAL");
    database.pragma("cache_size = 10000");
    database.pragma("foreign_keys = ON");
    database.exec(ACTIVITIES_TABLE_SCHEMA);
    for (const indexSQL of ACTIVITY_INDEXES) {
      database.exec(indexSQL);
    }
    up(database);
    prepareStatements();
    if (DEBUG_LOGGING$1) {
      console.log(SUCCESS_MESSAGES.DB_CONNECTED);
    }
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw new Error(`${ERROR_MESSAGES.DB_CONNECTION_FAILED}: ${error}`);
  }
}
function prepareStatements() {
  if (!database) return;
  try {
    insertActivityStatement = database.prepare(`
      INSERT INTO activities (timestamp, app_name, window_title, duration)
      VALUES (?, ?, ?, ?)
    `);
    getActivitiesStatement = database.prepare(`
      SELECT * FROM activities 
      WHERE (? IS NULL OR timestamp >= ?)
        AND (? IS NULL OR timestamp <= ?)
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    countActivitiesStatement = database.prepare(`
      SELECT COUNT(*) as count FROM activities
      WHERE (? IS NULL OR timestamp >= ?)
        AND (? IS NULL OR timestamp <= ?)
    `);
    deleteOldActivitiesStatement = database.prepare(`
      DELETE FROM activities WHERE timestamp < ?
    `);
    if (DEBUG_LOGGING$1) {
      console.log("Prepared statements initialized successfully");
    }
  } catch (error) {
    console.error("Failed to prepare statements:", error);
  }
}
function getDatabaseConnection() {
  if (!database) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return database;
}
async function closeDatabaseConnection() {
  if (database) {
    try {
      database.close();
      database = null;
      insertActivityStatement = null;
      getActivitiesStatement = null;
      countActivitiesStatement = null;
      deleteOldActivitiesStatement = null;
      if (DEBUG_LOGGING$1) {
        console.log("Database connection closed successfully");
      }
    } catch (error) {
      console.error("Error closing database connection:", error);
    }
  }
}
async function checkDatabaseHealth() {
  try {
    if (!database) {
      return false;
    }
    const result = database.prepare("SELECT 1 as test").get();
    return (result == null ? void 0 : result.test) === 1;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
async function insertActivity(activityData) {
  if (!database || !insertActivityStatement) {
    throw new Error("Database not initialized");
  }
  if (!activityData.appName || typeof activityData.appName !== "string") {
    throw new Error("App name is required and must be a string");
  }
  try {
    const timestamp = activityData.timestamp || /* @__PURE__ */ new Date();
    const duration = activityData.duration || 0;
    const result = insertActivityStatement.run(
      timestamp.toISOString(),
      activityData.appName,
      activityData.windowTitle || "",
      duration
    );
    if (DEBUG_LOGGING$1) {
      console.log(`Inserted activity: ${activityData.appName} (ID: ${result.lastInsertRowid})`);
    }
    return Number(result.lastInsertRowid);
  } catch (error) {
    console.error("Failed to insert activity:", error);
    throw new Error(`Failed to insert activity: ${error}`);
  }
}
function getActivities(options = {}) {
  if (!database || !getActivitiesStatement) {
    throw new Error("Database not initialized");
  }
  try {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate
    } = options;
    const startDateISO = (startDate == null ? void 0 : startDate.toISOString()) || null;
    const endDateISO = (endDate == null ? void 0 : endDate.toISOString()) || null;
    const results = getActivitiesStatement.all(
      startDateISO,
      startDateISO,
      endDateISO,
      endDateISO,
      limit,
      offset
    );
    return results.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      // Keep as ISO string as expected by ActivityTableRow
      app_name: row.app_name,
      window_title: row.window_title,
      duration: row.duration,
      created_at: row.created_at
      // Keep as ISO string as expected by ActivityTableRow
    }));
  } catch (error) {
    console.error("Failed to get activities:", error);
    throw new Error(`Failed to get activities: ${error}`);
  }
}
function transformSessionData(rows) {
  return rows.map((row) => ({
    id: row.id,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    duration: row.duration,
    sessionType: row.session_type,
    confidenceScore: row.confidence_score,
    userCorrected: row.user_corrected,
    userFeedback: row.user_feedback,
    activities: [],
    // Will be populated separately
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }));
}
function getSessionsByDate(request) {
  if (!database) {
    throw new Error("Database not initialized");
  }
  try {
    const { startDate, endDate, limit = 100 } = request;
    const stmt = database.prepare(`
      SELECT * FROM sessions 
      WHERE start_time >= ? AND end_time <= ?
      ORDER BY start_time DESC 
      LIMIT ?
    `);
    const rows = stmt.all(startDate, endDate, limit);
    const sessions = transformSessionData(rows);
    for (const session of sessions) {
      const activityStmt = database.prepare(`
        SELECT * FROM activities 
        WHERE session_id = ?
        ORDER BY timestamp ASC
      `);
      const activityRows = activityStmt.all(session.id);
      session.activities = activityRows.map((row) => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        appName: row.app_name,
        windowTitle: row.window_title,
        duration: row.duration,
        formattedDuration: formatDuration$1(row.duration),
        sessionId: row.session_id,
        isIdle: row.is_idle
      }));
    }
    return sessions;
  } catch (error) {
    console.error("Failed to get sessions by date:", error);
    throw error;
  }
}
function updateSession(request) {
  if (!database) {
    throw new Error("Database not initialized");
  }
  try {
    const { sessionId, sessionType, userFeedback, userCorrected } = request;
    const updates = [];
    const values = [];
    if (sessionType !== void 0) {
      updates.push("session_type = ?");
      values.push(sessionType);
    }
    if (userFeedback !== void 0) {
      updates.push("user_feedback = ?");
      values.push(userFeedback);
    }
    if (userCorrected !== void 0) {
      updates.push("user_corrected = ?");
      values.push(userCorrected ? 1 : 0);
    }
    if (updates.length === 0) {
      return;
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(sessionId);
    const stmt = database.prepare(`
      UPDATE sessions 
      SET ${updates.join(", ")}
      WHERE id = ?
    `);
    stmt.run(...values);
  } catch (error) {
    console.error("Failed to update session:", error);
    throw error;
  }
}
function getUnclassifiedActivities(hours = 24) {
  if (!database) {
    throw new Error("Database not initialized");
  }
  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1e3);
    const stmt = database.prepare(`
      SELECT * FROM activities 
      WHERE session_id IS NULL 
        AND timestamp >= ?
        AND (is_idle IS NULL OR is_idle = FALSE)
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(cutoffTime.toISOString());
    return rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      appName: row.app_name,
      windowTitle: row.window_title,
      duration: row.duration,
      createdAt: new Date(row.created_at),
      sessionId: row.session_id,
      isIdle: row.is_idle
    }));
  } catch (error) {
    console.error("Failed to get unclassified activities:", error);
    throw error;
  }
}
function formatDuration$1(milliseconds) {
  const seconds = Math.floor(milliseconds / 1e3);
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
async function getUserSettings() {
  if (!database) {
    throw new Error("Database not initialized");
  }
  try {
    const stmt = database.prepare("SELECT key, value FROM user_settings");
    const rows = stmt.all();
    const settings = {};
    rows.forEach((row) => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    if (DEBUG_LOGGING$1) {
      console.log("Retrieved user settings:", Object.keys(settings));
    }
    return settings;
  } catch (error) {
    console.error("Failed to get user settings:", error);
    throw new Error(`Failed to retrieve settings: ${error}`);
  }
}
async function updateUserSettings(updates) {
  if (!database) {
    throw new Error("Database not initialized");
  }
  try {
    const updateStmt = database.prepare(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    const transaction = database.transaction((settingsUpdates) => {
      for (const [key, value] of Object.entries(settingsUpdates)) {
        const jsonValue = JSON.stringify(value);
        updateStmt.run(key, jsonValue);
      }
    });
    transaction(updates);
    if (DEBUG_LOGGING$1) {
      console.log("Updated settings keys:", Object.keys(updates));
    }
  } catch (error) {
    console.error("Failed to update user settings:", error);
    throw new Error(`Failed to update settings: ${error}`);
  }
}
async function resetUserSettings() {
  if (!database) {
    throw new Error("Database not initialized");
  }
  try {
    const deleteStmt = database.prepare("DELETE FROM user_settings");
    deleteStmt.run();
    if (DEBUG_LOGGING$1) {
      console.log("All user settings reset to defaults");
    }
  } catch (error) {
    console.error("Failed to reset user settings:", error);
    throw new Error(`Failed to reset settings: ${error}`);
  }
}
async function clearAllActivityData() {
  if (!database) {
    throw new Error("Database not initialized");
  }
  try {
    const deleteActivitiesStmt = database.prepare("DELETE FROM activities");
    const deleteSessionsStmt = database.prepare("DELETE FROM sessions");
    const transaction = database.transaction(() => {
      const activitiesResult = deleteActivitiesStmt.run();
      const sessionsResult = deleteSessionsStmt.run();
      return {
        activities: activitiesResult.changes,
        sessions: sessionsResult.changes
      };
    });
    const result = transaction();
    if (DEBUG_LOGGING$1) {
      console.log(`Cleared ${result.activities} activities and ${result.sessions} sessions`);
    }
    return result;
  } catch (error) {
    console.error("Failed to clear activity data:", error);
    throw new Error(`Failed to clear activity data: ${error}`);
  }
}
let isMonitoring = false;
let pollingTimer = null;
let currentPollingInterval = DEFAULT_POLLING_INTERVAL;
let currentSession = null;
let retryCount = 0;
function isAppExcluded(appName) {
  if (!appName) return true;
  const normalizedAppName = appName.toLowerCase();
  return EXCLUDED_APPS.some(
    (excludedApp) => normalizedAppName.includes(excludedApp.toLowerCase())
  );
}
function isTitleExcluded(windowTitle) {
  if (!windowTitle) return false;
  const normalizedTitle = windowTitle.toLowerCase();
  return EXCLUDED_TITLE_PATTERNS.some(
    (pattern) => normalizedTitle.includes(pattern.toLowerCase())
  );
}
function sanitizeWindowTitle(windowTitle, appName) {
  if (!windowTitle) return "";
  if (isTitleExcluded(windowTitle)) {
    return `${appName} - [Private]`;
  }
  const maxTitleLength = 100;
  if (windowTitle.length > maxTitleLength) {
    return windowTitle.substring(0, maxTitleLength) + "...";
  }
  return windowTitle;
}
async function getCurrentActiveWindow() {
  var _a, _b, _c, _d, _e, _f;
  try {
    const activeWindow = await activeWin();
    if (!activeWindow) {
      return null;
    }
    return {
      appName: ((_a = activeWindow.owner) == null ? void 0 : _a.name) || "Unknown",
      windowTitle: activeWindow.title || "",
      processId: ((_b = activeWindow.owner) == null ? void 0 : _b.processId) || 0,
      bounds: {
        x: ((_c = activeWindow.bounds) == null ? void 0 : _c.x) || 0,
        y: ((_d = activeWindow.bounds) == null ? void 0 : _d.y) || 0,
        width: ((_e = activeWindow.bounds) == null ? void 0 : _e.width) || 0,
        height: ((_f = activeWindow.bounds) == null ? void 0 : _f.height) || 0
      }
    };
  } catch (error) {
    console.error("Failed to get active window:", error);
    return null;
  }
}
function processActivity(windowInfo) {
  try {
    const { appName, windowTitle } = windowInfo;
    if (isAppExcluded(appName)) {
      if (DEBUG_LOGGING$1) {
        console.log(`Skipping excluded app: ${appName}`);
      }
      return;
    }
    const sanitizedTitle = sanitizeWindowTitle(windowTitle, appName);
    const now = /* @__PURE__ */ new Date();
    if (currentSession && currentSession.appName === appName && currentSession.windowTitle === sanitizedTitle) {
      currentSession.lastSeen = now;
      return;
    }
    if (currentSession) {
      const sessionDuration = currentSession.lastSeen.getTime() - currentSession.startTime.getTime();
      if (sessionDuration > 1e3) {
        insertActivity({
          appName: currentSession.appName,
          windowTitle: currentSession.windowTitle,
          duration: sessionDuration,
          timestamp: currentSession.startTime
        });
        if (DEBUG_LOGGING$1) {
          console.log(`Logged activity: ${currentSession.appName} - ${sessionDuration}ms`);
        }
      }
    }
    currentSession = {
      appName,
      windowTitle: sanitizedTitle,
      startTime: now,
      lastSeen: now
    };
  } catch (error) {
    console.error("Failed to process activity:", error);
  }
}
async function monitoringLoop() {
  try {
    const windowInfo = await getCurrentActiveWindow();
    if (windowInfo) {
      processActivity(windowInfo);
      retryCount = 0;
    }
  } catch (error) {
    console.error("Monitoring loop error:", error);
    retryCount++;
    if (retryCount >= MAX_MONITORING_RETRIES) {
      console.error(`Stopping monitoring after ${MAX_MONITORING_RETRIES} failures`);
      await stopActivityLogging();
      return;
    }
  }
  if (isMonitoring) {
    pollingTimer = setTimeout(monitoringLoop, currentPollingInterval);
  }
}
async function startActivityLogging(pollingInterval) {
  try {
    if (isMonitoring) {
      if (DEBUG_LOGGING$1) {
        console.log("Activity logging already running");
      }
      return true;
    }
    if (pollingInterval && pollingInterval > 0) ;
    retryCount = 0;
    currentSession = null;
    isMonitoring = true;
    monitoringLoop();
    if (DEBUG_LOGGING$1) {
      console.log(SUCCESS_MESSAGES.MONITORING_STARTED);
    }
    return true;
  } catch (error) {
    console.error("Failed to start activity logging:", error);
    isMonitoring = false;
    throw new Error(`${ERROR_MESSAGES.MONITORING_FAILED}: ${error}`);
  }
}
async function stopActivityLogging() {
  try {
    if (!isMonitoring) {
      return;
    }
    isMonitoring = false;
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }
    if (currentSession) {
      const sessionDuration = currentSession.lastSeen.getTime() - currentSession.startTime.getTime();
      if (sessionDuration > 1e3) {
        insertActivity({
          appName: currentSession.appName,
          windowTitle: currentSession.windowTitle,
          duration: sessionDuration,
          timestamp: currentSession.startTime
        });
      }
      currentSession = null;
    }
    if (DEBUG_LOGGING$1) {
      console.log(SUCCESS_MESSAGES.MONITORING_STOPPED);
    }
  } catch (error) {
    console.error("Error stopping activity logging:", error);
  }
}
function isActivityLoggingActive() {
  return isMonitoring;
}
const IPC_CHANNELS = {
  // Activity data operations
  GET_ACTIVITIES: "activity:get-all",
  GET_RECENT_ACTIVITIES: "activity:get-recent",
  GET_ACTIVITIES_BY_DATE: "activity:get-by-date",
  GET_SESSIONS_BY_DATE: "session:get-by-date",
  UPDATE_SESSION: "session:update",
  CLASSIFY_SESSION: "session:classify",
  // System operations
  SHOW_DASHBOARD: "system:show-dashboard",
  HIDE_DASHBOARD: "system:hide-dashboard",
  GET_APP_VERSION: "system:get-version",
  // Database operations
  DB_HEALTH_CHECK: "db:health-check"
};
const DEBUG_LOGGING = true;
const OLLAMA_CONFIG = {
  baseUrl: "http://127.0.0.1:11434",
  model: "llama3.2:3b",
  timeout: 3e4,
  // 30 seconds
  maxRetries: 3,
  retryDelay: 2e3
  // 2 seconds
};
const CLASSIFICATION_PROMPT = `You are an expert AI system for analyzing computer activity patterns. Your job is to classify work sessions with high accuracy using contextual clues and established patterns.

=== CLASSIFICATION CATEGORIES ===

🎯 focused-work (Concentrated productive work)
KEY INDICATORS:
• Code/development: VS Code, IntelliJ, GitHub, terminal, database tools
• Document creation: Word, Google Docs, LaTeX, technical writing
• Design work: Figma, Photoshop, CAD software, graphic design
• Data analysis: Excel, SQL tools, analytics platforms, spreadsheets
• Professional software: Industry-specific tools, business applications

PATTERN RECOGNITION:
• Single application focus >15 minutes OR multiple related tools
• Deep engagement with minimal switching
• Professional window titles (project names, file editing, dashboards)

EXAMPLES:
✅ "VS Code - my-project.tsx" + "Chrome - GitHub Pull Request" (45 min) = focused-work
✅ "Figma - Website Redesign" (30 min) = focused-work  
✅ "Excel - Q4 Budget Analysis" + "Calculator" (25 min) = focused-work

🔍 research (Learning and information gathering)
KEY INDICATORS:
• Educational content: Stack Overflow, Wikipedia, documentation, tutorials
• Technical resources: API docs, GitHub exploration, technical blogs
• Learning platforms: Coursera, YouTube educational, PDF papers
• Reference materials: Manuals, guides, troubleshooting, forums

PATTERN RECOGNITION:
• Active information seeking with clear learning intent
• Movement between reference sources
• Educational/technical window titles

EXAMPLES:
✅ "Chrome - Stack Overflow React Hooks" + "Medium - TypeScript Tutorial" = research
✅ "YouTube - Docker Container Tutorial" + "Chrome - Docker Documentation" = research
✅ "PDF Reader - Machine Learning Paper.pdf" (20 min) = research

🎮 entertainment (Leisure and recreational)
KEY INDICATORS:
• Social media: Facebook, Instagram, Twitter, TikTok, Reddit (non-work)
• Entertainment videos: YouTube fun content, Netflix, streaming
• Gaming: Games, game platforms, gaming websites
• Casual browsing: News, shopping, memes, personal interests

PATTERN RECOGNITION:
• Recreational content consumption
• Non-work-related window titles
• Casual, entertainment-focused activities

EXAMPLES:
✅ "YouTube - Funny Cat Videos" + "Reddit - r/memes" = entertainment
✅ "Netflix - TV Show" (45 min) = entertainment
✅ "Instagram - Feed" + "Facebook - Social Posts" = entertainment

⏸️ break (Short pauses and personal tasks)
KEY INDICATORS:
• Very short activities (<2 min average per activity)
• Frequent app switching (>3 different apps in <10 minutes)
• Personal maintenance: Quick email, calendar check, messaging
• System idle: Screen savers, lock screens, away from computer

PATTERN RECOGNITION:
• High switching frequency with low engagement
• Brief, task-oriented activities
• Clear break-like behavior patterns

EXAMPLES:
✅ "Gmail - Quick Check" (1 min) + "Calendar - Today" (30 sec) + "Idle" (5 min) = break
✅ Multiple 30-second app switches across 5 different apps = break

❓ unclear (Insufficient or genuinely ambiguous data)
USE WHEN:
• Truly mixed signals with no dominant pattern
• Generic system activities without clear context
• Insufficient data to make confident determination
• Activities that legitimately don't fit other categories

=== ENHANCED ANALYSIS FRAMEWORK ===

STEP 1 - DURATION ANALYSIS:
• <2 min average → likely break
• 2-15 min → analyze context and switching patterns  
• >15 min single focus → likely focused-work or research

STEP 2 - CONTEXT KEYWORD MATCHING:
High-value indicators (prioritize these):
• Stack Overflow, GitHub, documentation, Wikipedia → research
• VS Code, IntelliJ, Figma, professional tools → focused-work
• YouTube entertainment, social media, games, Netflix → entertainment
• Spotify music, playlists (non-educational) → entertainment
• Quick switching + short durations → break

STEP 3 - PATTERN ANALYSIS:
• Deep focus (1-2 apps, long durations) → focused-work
• Information seeking (multiple reference sources) → research  
• Casual consumption (entertainment platforms, music) → entertainment
• Rapid switching (many apps, short times) → break

STEP 4 - CONFIDENCE CALIBRATION:
• 0.9-1.0: Perfect indicators, zero ambiguity (e.g., "VS Code" solo for 30min = focused-work)
• 0.7-0.8: Strong indicators with minor ambiguity
• 0.5-0.6: Mixed signals but one pattern dominates
• 0.3-0.4: Weak indicators, mostly rule-based
• 0.1-0.2: Very uncertain, use unclear

STEP 5 - ENTERTAINMENT VS RESEARCH CHECK:
• Music/playlists without learning context = entertainment
• YouTube without "tutorial", "course", "learning" = entertainment  
• Social media browsing = entertainment
• If genuinely mixed work+entertainment+unclear → use unclear

=== SESSION DATA ===
Activities: {activities}
Session Duration: {duration} minutes  
Additional Context: {context}
Session Start: {startTime}

=== CRITICAL RULES ===
1. NEVER default to entertainment when uncertain - use unclear instead
2. research requires clear learning/information-seeking intent
3. break is for short activities and high switching, not unclear content
4. Consider the FULL context, not just individual app names
5. Window titles are often more revealing than app names
6. When genuinely mixed signals (work+entertainment, or work+break patterns) → use unclear
7. Music/playlists are entertainment unless clearly educational/work-focused
8. Be conservative with confidence - if in doubt, lower confidence or use unclear

=== RESPONSE FORMAT ===
Respond with ONLY this JSON format (no markdown, no extra text):
{"type": "focused-work", "confidence": 0.8, "reasoning": "Step-by-step analysis: [1] Duration: X minutes suggests Y. [2] Key indicators: specific apps/titles that led to decision. [3] Pattern: behavioral pattern observed. [4] Conclusion: final reasoning for classification."}

The type must be exactly one of: focused-work, research, entertainment, break, unclear

Analyze the session data above and classify it now:`;
class OllamaConnectionError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "OllamaConnectionError";
  }
}
class ClassificationError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ClassificationError";
  }
}
class OllamaClient {
  constructor(config = {}) {
    __publicField(this, "baseUrl");
    __publicField(this, "model");
    __publicField(this, "timeout");
    __publicField(this, "maxRetries");
    __publicField(this, "retryDelay");
    __publicField(this, "isConnected", false);
    __publicField(this, "lastHealthCheck", null);
    this.baseUrl = config.baseUrl ?? OLLAMA_CONFIG.baseUrl;
    this.model = config.model ?? OLLAMA_CONFIG.model;
    this.timeout = config.timeout ?? OLLAMA_CONFIG.timeout;
    this.maxRetries = config.maxRetries ?? OLLAMA_CONFIG.maxRetries;
    this.retryDelay = config.retryDelay ?? OLLAMA_CONFIG.retryDelay;
  }
  /**
   * Checks if Ollama server is available and model is loaded
   * 
   * @returns Promise resolving to true if Ollama is available
   */
  async checkHealth() {
    var _a;
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5e3)
        // 5 second timeout for health check
      });
      if (!response.ok) {
        this.isConnected = false;
        return false;
      }
      const data = await response.json();
      const modelExists = (_a = data.models) == null ? void 0 : _a.some(
        (model) => model.name.includes(this.model.split(":")[0])
      );
      this.isConnected = modelExists;
      this.lastHealthCheck = /* @__PURE__ */ new Date();
      if (DEBUG_LOGGING) {
        console.log(`Ollama health check: ${this.isConnected ? "OK" : "FAILED"}`);
      }
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      {
        console.warn("Ollama health check failed:", error);
      }
      return false;
    }
  }
  /**
   * Analyzes user feedback patterns to improve future classifications
   * 
   * @param activities - Activity data for analysis
   * @returns Enhanced context based on learned patterns
   */
  async getLearnedContext(activities) {
    try {
      const userFeedback = await this.getUserFeedbackPatterns();
      if (userFeedback.length === 0) {
        return "No learned patterns available yet";
      }
      const combinedText = activities.map((a) => `${a.appName} ${a.windowTitle}`).join(" ").toLowerCase();
      const relevantFeedback = this.findRelevantFeedback(userFeedback, combinedText);
      if (relevantFeedback.length === 0) {
        return "No similar patterns found in user feedback";
      }
      const insights = this.generateFeedbackInsights(relevantFeedback);
      return `Learned patterns: ${insights}`;
    } catch (error) {
      {
        console.warn("Failed to get learned context:", error);
      }
      return "Failed to retrieve learned patterns";
    }
  }
  /**
   * Retrieves user feedback patterns from database
   * 
   * @returns Array of user feedback data
   */
  async getUserFeedbackPatterns() {
    try {
      const db = require("../database/connection").getDatabaseConnection();
      const query = `
        SELECT 
          af.original_classification,
          af.corrected_classification,
          af.user_context,
          s.session_type,
          s.start_time,
          s.end_time,
          s.duration,
          GROUP_CONCAT(a.app_name || '|' || a.window_title, ';;') as activity_pattern
        FROM ai_feedback af
        JOIN sessions s ON af.session_id = s.id
        LEFT JOIN activities a ON a.session_id = s.id
        WHERE af.created_at > datetime('now', '-30 days')
        GROUP BY af.id
        ORDER BY af.created_at DESC
        LIMIT 50
      `;
      const feedbackRows = db.prepare(query).all();
      return feedbackRows.map((row) => ({
        originalClassification: row.original_classification,
        correctedClassification: row.corrected_classification,
        userContext: row.user_context || "",
        activityPattern: row.activity_pattern || "",
        createdAt: new Date(row.created_at || Date.now())
      }));
    } catch (error) {
      {
        console.warn("Failed to fetch user feedback:", error);
      }
      return [];
    }
  }
  /**
   * Finds relevant feedback based on activity similarity
   * 
   * @param userFeedback - All user feedback
   * @param currentText - Current activity text to match
   * @returns Relevant feedback entries
   */
  findRelevantFeedback(userFeedback, currentText) {
    const relevantFeedback = [];
    for (const feedback of userFeedback) {
      const similarity = this.calculateTextSimilarity(currentText, feedback.activityPattern.toLowerCase());
      if (similarity > 0.3) {
        relevantFeedback.push({
          ...feedback,
          similarity
        });
      }
    }
    return relevantFeedback.sort((a, b) => {
      const similarityDiff = (b.similarity || 0) - (a.similarity || 0);
      if (Math.abs(similarityDiff) < 0.1) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return similarityDiff;
    }).slice(0, 5);
  }
  /**
   * Calculates text similarity using keyword overlap
   * 
   * @param text1 - First text
   * @param text2 - Second text
   * @returns Similarity score (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    const getKeywords = (text) => {
      return text.split(/\s+/).filter((word) => word.length > 2).map((word) => word.replace(/[^\w]/g, ""));
    };
    const keywords1 = new Set(getKeywords(text1));
    const keywords2 = new Set(getKeywords(text2));
    const intersection = new Set(Array.from(keywords1).filter((x) => keywords2.has(x)));
    const union = /* @__PURE__ */ new Set([...Array.from(keywords1), ...Array.from(keywords2)]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  /**
   * Generates insights from relevant user feedback
   * 
   * @param relevantFeedback - Filtered user feedback
   * @returns Human-readable insights
   */
  generateFeedbackInsights(relevantFeedback) {
    const insights = [];
    const corrections = relevantFeedback.map((f) => ({
      from: f.originalClassification,
      to: f.correctedClassification,
      context: f.userContext
    }));
    const correctionPatterns = /* @__PURE__ */ new Map();
    corrections.forEach((correction) => {
      const key = `${correction.from}→${correction.to}`;
      correctionPatterns.set(key, (correctionPatterns.get(key) || 0) + 1);
    });
    const topCorrections = Array.from(correctionPatterns.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topCorrections.length > 0) {
      insights.push(`Common corrections: ${topCorrections.map(([pattern, count]) => `${pattern} (${count}x)`).join(", ")}`);
    }
    const userContexts = relevantFeedback.map((f) => f.userContext).filter((context) => context && context.length > 0);
    if (userContexts.length > 0) {
      const contextKeywords = userContexts.join(" ").split(/\s+/).filter((word) => word.length > 3).reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
      const topContextKeywords = Object.entries(contextKeywords).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([word]) => word);
      if (topContextKeywords.length > 0) {
        insights.push(`User insights: ${topContextKeywords.join(", ")}`);
      }
    }
    const recentCorrections = relevantFeedback.filter(
      (f) => Date.now() - f.createdAt.getTime() < 7 * 24 * 60 * 60 * 1e3
      // Last 7 days
    );
    if (recentCorrections.length > 0) {
      insights.push(`Recent trend: ${recentCorrections.length} similar corrections in past week`);
    }
    return insights.length > 0 ? insights.join("; ") : "No clear patterns identified";
  }
  /**
   * Classifies a batch of activities into session types
   * 
   * @param request - Classification request with activities and options
   * @returns Promise resolving to session classification results
   * @throws {OllamaConnectionError} If Ollama is not available
   * @throws {ClassificationError} If classification fails
   */
  async classifySession(request) {
    if (!this.isConnected || this.shouldCheckHealth()) {
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        throw new OllamaConnectionError(
          "Ollama server is not available. Please ensure Ollama is running and the model is loaded."
        );
      }
    }
    const activitySummary = this.prepareActivitySummary(request.activities);
    const duration = this.calculateSessionDuration(request.activities);
    const context = request.context || "No additional context provided";
    const startTime = request.activities.length > 0 ? new Date(request.activities[0].timestamp).toLocaleString() : "Unknown";
    const learnedContext = await this.getLearnedContext(request.activities);
    const prompt = CLASSIFICATION_PROMPT.replace("{activities}", activitySummary).replace("{duration}", duration.toString()).replace("{context}", `${context}

Learned Patterns: ${learnedContext}`).replace("{startTime}", startTime);
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const classification = await this.performClassification(prompt);
        if (DEBUG_LOGGING) {
          console.log(`Session classified as: ${classification.type} (confidence: ${classification.confidence})`);
        }
        return classification;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          {
            console.warn(`Classification attempt ${attempt} failed, retrying...`, error);
          }
          await this.delay(this.retryDelay);
        }
      }
    }
    throw new ClassificationError(
      `Failed to classify session after ${this.maxRetries} attempts`,
      lastError || void 0
    );
  }
  /**
   * Performs the actual classification request to Ollama
   * 
   * @param prompt - Formatted prompt for classification
   * @returns Promise resolving to session classification
   * @throws {Error} If request fails or response is invalid
   */
  async performClassification(prompt) {
    const requestBody = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.4,
        // Balanced temperature for accuracy and creativity
        top_k: 20,
        top_p: 0.95
      }
    };
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`);
    }
    return this.parseClassificationResponse(data.response);
  }
  /**
   * Parses AI response into structured classification data
   * 
   * @param response - Raw AI response text
   * @returns Parsed session classification
   * @throws {Error} If response cannot be parsed
   */
  parseClassificationResponse(response) {
    try {
      if (DEBUG_LOGGING) {
        console.log("Raw AI response:", response);
      }
      let cleanResponse = response.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").replace(/^\s*[\r\n]+/gm, "");
      let jsonStr = "";
      const jsonStart = cleanResponse.indexOf("{");
      if (jsonStart === -1) {
        throw new Error("No JSON object found in AI response");
      }
      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === "{") {
          braceCount++;
        } else if (cleanResponse[i] === "}") {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
      if (jsonEnd === -1) {
        throw new Error("Unclosed JSON object in AI response");
      }
      jsonStr = cleanResponse.substring(jsonStart, jsonEnd + 1);
      if (DEBUG_LOGGING) {
        console.log("Extracted JSON:", jsonStr);
      }
      const parsed = JSON.parse(jsonStr);
      if (!parsed.type || typeof parsed.confidence !== "number") {
        throw new Error(`Invalid classification response format. Got: ${JSON.stringify(parsed)}`);
      }
      const normalizedType = parsed.type.toLowerCase().trim();
      const validTypes = ["focused-work", "research", "entertainment", "break", "unclear"];
      if (!validTypes.includes(normalizedType)) {
        if (DEBUG_LOGGING) {
          console.warn(`Invalid session type: "${parsed.type}" (normalized: "${normalizedType}"), defaulting to 'unclear'`);
        }
        return {
          type: "unclear",
          confidence: Math.min(parsed.confidence || 0.1, 0.3),
          reasoning: `Invalid type "${parsed.type}" - ${parsed.reasoning || "No reasoning provided"}`
        };
      }
      const confidence = Math.max(0, Math.min(1, parsed.confidence));
      return {
        type: normalizedType,
        confidence,
        reasoning: parsed.reasoning || "No reasoning provided"
      };
    } catch (error) {
      {
        console.error("Failed to parse AI response:", error);
        console.error("Response was:", response);
      }
      return {
        type: "unclear",
        confidence: 0.1,
        reasoning: `Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  /**
   * Prepares activity data for AI analysis with enhanced context
   * 
   * @param activities - Raw activity data
   * @returns Formatted activity summary string with semantic context
   */
  prepareActivitySummary(activities) {
    if (activities.length === 0) {
      return "No activities recorded";
    }
    const groupedActivities = this.groupConsecutiveActivities(activities);
    let summary = `Session contains ${activities.length} activities across ${new Set(activities.map((a) => a.appName)).size} applications:

`;
    groupedActivities.forEach((group, index) => {
      const startTime = new Date(group.startTime).toLocaleTimeString();
      const endTime = new Date(group.endTime).toLocaleTimeString();
      const durationMinutes = Math.round(group.totalDuration / (1e3 * 60));
      const activityCount = group.activities.length;
      summary += `${index + 1}. ${startTime}-${endTime} (${durationMinutes}m) - ${group.appName}
`;
      const contextClues = this.extractContextClues(group.activities);
      if (contextClues.length > 0) {
        summary += `   Context: ${contextClues.join(", ")}
`;
      }
      if (activityCount > 3 && group.totalDuration / activityCount < 6e4) {
        summary += `   Pattern: Frequent switching (${activityCount} windows, avg ${Math.round(group.totalDuration / activityCount / 1e3)}s each)
`;
      }
      summary += "\n";
    });
    const sessionPatterns = this.analyzeSessionPatterns(activities);
    if (sessionPatterns.length > 0) {
      summary += `Session Patterns: ${sessionPatterns.join(", ")}
`;
    }
    return summary;
  }
  /**
   * Groups consecutive activities in the same application
   */
  groupConsecutiveActivities(activities) {
    const groups = [];
    let currentGroup = [];
    let currentApp = "";
    for (const activity of activities) {
      if (activity.appName !== currentApp) {
        if (currentGroup.length > 0) {
          groups.push(this.createActivityGroup(currentGroup));
        }
        currentGroup = [activity];
        currentApp = activity.appName;
      } else {
        currentGroup.push(activity);
      }
    }
    if (currentGroup.length > 0) {
      groups.push(this.createActivityGroup(currentGroup));
    }
    return groups;
  }
  /**
   * Creates an activity group from consecutive activities
   */
  createActivityGroup(activities) {
    return {
      appName: activities[0].appName,
      startTime: new Date(activities[0].timestamp),
      endTime: new Date(activities[activities.length - 1].timestamp),
      totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
      activities
    };
  }
  /**
   * Enhanced context clue extraction with semantic analysis
   * 
   * @param activities - Activity group to analyze
   * @returns Array of contextual clues for AI classification
   */
  extractContextClues(activities) {
    const clues = [];
    const combinedText = activities.map((a) => `${a.appName} ${a.windowTitle}`).join(" ").toLowerCase();
    const workKeywords = [
      // Development
      "github",
      "git",
      "pull request",
      "commit",
      "repository",
      "code review",
      "visual studio",
      "intellij",
      "sublime",
      "atom",
      "vscode",
      "vs code",
      "npm",
      "node",
      "typescript",
      "javascript",
      "python",
      "java",
      "react",
      "vue",
      "angular",
      "terminal",
      "command line",
      "bash",
      "powershell",
      "cmd",
      "database",
      "sql",
      "mongodb",
      "postgres",
      "mysql",
      // Business/Professional
      "dashboard",
      "analytics",
      "metrics",
      "report",
      "presentation",
      "meeting",
      "calendar",
      "schedule",
      "appointment",
      "project",
      "task",
      "deadline",
      "milestone",
      "client",
      "customer",
      "business",
      "proposal",
      "contract",
      "budget",
      "finance",
      "expense",
      "invoice",
      // Design/Creative
      "figma",
      "sketch",
      "photoshop",
      "illustrator",
      "canva",
      "design",
      "mockup",
      "wireframe",
      "prototype",
      "ui",
      "ux",
      // Document/Content
      "document",
      "docs",
      "word",
      "excel",
      "powerpoint",
      "sheets",
      "slides",
      "writing",
      "editing",
      "draft",
      "article",
      "blog"
    ];
    const researchKeywords = [
      // Educational Platforms
      "stack overflow",
      "stackoverflow",
      "wikipedia",
      "coursera",
      "udemy",
      "khan academy",
      "tutorial",
      "guide",
      "how to",
      "learn",
      "course",
      "lesson",
      "documentation",
      "docs",
      "api",
      "reference",
      "manual",
      // Academic/Technical
      "research",
      "paper",
      "study",
      "analysis",
      "academic",
      "journal",
      "arxiv",
      "scholar",
      "pubmed",
      "ieee",
      "acm",
      "conference",
      "symposium",
      "workshop",
      // Information Seeking
      "comparison",
      "review",
      "evaluation",
      "benchmark",
      "best practices",
      "patterns",
      "architecture",
      "methodology",
      "troubleshooting",
      "debugging",
      "solution",
      "fix",
      "error",
      // Learning Content
      "webinar",
      "lecture",
      "seminar",
      "training",
      "certification",
      "exam",
      "quiz",
      "test"
    ];
    const entertainmentKeywords = [
      // Social Media
      "facebook",
      "instagram",
      "twitter",
      "tiktok",
      "snapchat",
      "linkedin personal",
      "social",
      "feed",
      "timeline",
      "post",
      "story",
      "reel",
      // Entertainment Content
      "youtube entertainment",
      "netflix",
      "hulu",
      "disney",
      "prime video",
      "twitch",
      "streaming",
      "stream",
      "live",
      "gaming",
      "game",
      "meme",
      "funny",
      "comedy",
      "humor",
      "viral",
      "celebrity",
      "gossip",
      "entertainment news",
      // Leisure Activities
      "shopping",
      "amazon personal",
      "ebay",
      "store",
      "cart",
      "music",
      "spotify personal",
      "playlist",
      "album",
      "song",
      "video",
      "movie",
      "tv show",
      "series",
      "episode",
      "sports",
      "news personal",
      "weather",
      "horoscope"
    ];
    const breakKeywords = [
      "idle",
      "screen saver",
      "lock",
      "away",
      "break",
      "quick check",
      "brief",
      "glance",
      "peek",
      "inbox check",
      "notification",
      "reminder",
      "personal",
      "family",
      "friend",
      "chat",
      "message"
    ];
    const workMatches = workKeywords.filter((keyword) => combinedText.includes(keyword));
    if (workMatches.length > 0) {
      clues.push(`Work indicators: ${workMatches.slice(0, 3).join(", ")}`);
    }
    const researchMatches = researchKeywords.filter((keyword) => combinedText.includes(keyword));
    if (researchMatches.length > 0) {
      clues.push(`Learning/Research indicators: ${researchMatches.slice(0, 3).join(", ")}`);
    }
    const entertainmentMatches = entertainmentKeywords.filter((keyword) => combinedText.includes(keyword));
    if (entertainmentMatches.length > 0) {
      clues.push(`Entertainment indicators: ${entertainmentMatches.slice(0, 3).join(", ")}`);
    }
    const breakMatches = breakKeywords.filter((keyword) => combinedText.includes(keyword));
    if (breakMatches.length > 0) {
      clues.push(`Break indicators: ${breakMatches.slice(0, 3).join(", ")}`);
    }
    const codeExtensions = [".js", ".ts", ".tsx", ".jsx", ".py", ".java", ".cpp", ".cs", ".php", ".rb", ".go", ".rs", ".vue", ".svelte"];
    const codeFileMatches = codeExtensions.filter((ext) => combinedText.includes(ext));
    if (codeFileMatches.length > 0) {
      clues.push(`Code files: ${codeFileMatches.join(", ")}`);
    }
    if (combinedText.includes("tutorial") || combinedText.includes("course")) {
      const longDuration = activities.some((a) => a.duration > 6e5);
      if (longDuration) {
        clues.push("Extended educational content (>10min)");
      }
    }
    const productivityApps = ["vscode", "intellij", "figma", "photoshop", "excel", "word"];
    const productivityCount = productivityApps.filter((app) => combinedText.includes(app)).length;
    if (productivityCount >= 2) {
      clues.push("Multiple productivity tools used");
    }
    if (combinedText.includes("chrome") || combinedText.includes("firefox") || combinedText.includes("edge")) {
      if (researchMatches.length > entertainmentMatches.length) {
        clues.push("Browser: Research-oriented");
      } else if (entertainmentMatches.length > researchMatches.length) {
        clues.push("Browser: Entertainment-oriented");
      } else if (workMatches.length > 0) {
        clues.push("Browser: Work-related");
      }
    }
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDuration / activities.length;
    if (avgDuration < 12e4) {
      clues.push("Very short activities (avg <2min)");
    } else if (avgDuration > 9e5) {
      clues.push("Extended focus sessions (avg >15min)");
    }
    if (activities.length > 3 && avgDuration < 3e5) {
      clues.push("Rapid app switching pattern");
    }
    if (combinedText.includes("github") || combinedText.includes("git")) {
      if (combinedText.includes("pull request") || combinedText.includes("commit") || combinedText.includes("merge")) {
        clues.push("Active code collaboration");
      } else {
        clues.push("Code repository browsing");
      }
    }
    if (combinedText.includes("youtube")) {
      if (combinedText.includes("tutorial") || combinedText.includes("course") || combinedText.includes("learn")) {
        clues.push("Educational video content");
      } else if (combinedText.includes("music") || combinedText.includes("playlist")) {
        clues.push("Background music/audio");
      } else {
        clues.push("General video consumption");
      }
    }
    if (combinedText.includes("word") || combinedText.includes("docs") || combinedText.includes("document")) {
      if (combinedText.includes("project") || combinedText.includes("proposal") || combinedText.includes("report")) {
        clues.push("Professional document work");
      } else {
        clues.push("General document editing");
      }
    }
    return clues.slice(0, 8);
  }
  /**
   * Analyzes overall session patterns with classification hints
   */
  analyzeSessionPatterns(activities) {
    const patterns = [];
    const avgDuration = activities.reduce((sum, a) => sum + a.duration, 0) / activities.length;
    const avgDurationSeconds = avgDuration / 1e3;
    const avgDurationMinutes = avgDuration / (1e3 * 60);
    if (avgDurationSeconds < 120) {
      patterns.push("⚡ BREAK PATTERN: Very short activities (avg " + Math.round(avgDurationSeconds) + "s each)");
    } else if (avgDurationMinutes < 5) {
      patterns.push("⚡ BREAK PATTERN: Short activities (avg " + Math.round(avgDurationMinutes) + "m each)");
    } else if (avgDurationMinutes > 15) {
      patterns.push("🎯 FOCUS PATTERN: Sustained activities (avg " + Math.round(avgDurationMinutes) + "m each)");
    }
    const uniqueApps = new Set(activities.map((a) => a.appName)).size;
    const switchingRate = uniqueApps / activities.length;
    if (switchingRate > 0.7) {
      patterns.push("⚡ BREAK PATTERN: Frequent app switching (" + uniqueApps + " apps in " + activities.length + " activities)");
    } else if (uniqueApps === 1) {
      patterns.push("🎯 FOCUS PATTERN: Single application focus");
    } else if (uniqueApps <= 3) {
      patterns.push("📚 RESEARCH PATTERN: Limited app set, focused browsing");
    }
    const timestamps = activities.map((a) => new Date(a.timestamp));
    const sessionDuration = timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime();
    const sessionMinutes = sessionDuration / (1e3 * 60);
    if (sessionMinutes < 10) {
      patterns.push("⚡ BREAK PATTERN: Very short session (" + Math.round(sessionMinutes) + "m total)");
    } else if (sessionMinutes > 120) {
      patterns.push("🎯 FOCUS PATTERN: Extended session (" + Math.round(sessionMinutes) + "m total)");
    }
    const hasSystemIdle = activities.some(
      (a) => a.appName.toLowerCase().includes("idle") || a.windowTitle.toLowerCase().includes("idle") || a.windowTitle.toLowerCase().includes("screen")
    );
    if (hasSystemIdle) {
      patterns.push("⚡ BREAK PATTERN: System idle time detected");
    }
    return patterns;
  }
  /**
   * Calculates total session duration in minutes
   * 
   * @param activities - Activity data array
   * @returns Total duration in minutes
   */
  calculateSessionDuration(activities) {
    const totalMs = activities.reduce((sum, activity) => sum + activity.duration, 0);
    return Math.round(totalMs / (1e3 * 60));
  }
  /**
   * Determines if a health check is needed
   * 
   * @returns True if health check should be performed
   */
  shouldCheckHealth() {
    if (!this.lastHealthCheck) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1e3);
    return this.lastHealthCheck < fiveMinutesAgo;
  }
  /**
   * Utility function for adding delays between retries
   * 
   * @param ms - Delay in milliseconds
   * @returns Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Gets current connection status
   * 
   * @returns Current connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      model: this.model
    };
  }
}
let ollamaClient = null;
function getOllamaClient(config) {
  if (!ollamaClient || config) {
    ollamaClient = new OllamaClient(config);
  }
  return ollamaClient;
}
async function classifyActivities(activities, context) {
  const client = getOllamaClient();
  return await client.classifySession({ activities, context });
}
const SESSION_CONFIG = {
  /** Maximum idle time before creating new session (milliseconds) */
  maxIdleGap: 10 * 60 * 1e3,
  // 10 minutes
  /** Minimum session duration to classify (milliseconds) */
  minSessionDuration: 2 * 60 * 1e3,
  // 2 minutes
  /** Maximum session duration before splitting (milliseconds) */
  maxSessionDuration: 4 * 60 * 60 * 1e3,
  // 4 hours
  /** Minimum activities required for AI classification */
  minActivitiesForAI: 3,
  /** Batch size for processing activities */
  batchSize: 50
};
class SessionClassifier {
  constructor(options = {}) {
    __publicField(this, "config");
    __publicField(this, "db");
    this.config = { ...SESSION_CONFIG, ...options.config };
    this.db = getDatabaseConnection();
  }
  /**
   * Processes raw activities into classified sessions
   * 
   * @param activities - Raw activity data to process
   * @param options - Processing options
   * @returns Promise resolving to processing statistics
   */
  async processActivities(activities, options = {}) {
    const startTime = Date.now();
    const stats = {
      totalActivities: activities.length,
      sessionsCreated: 0,
      sessionsClassified: 0,
      aiFailures: 0,
      processingTime: 0
    };
    if (activities.length === 0) {
      stats.processingTime = Date.now() - startTime;
      return stats;
    }
    try {
      const sortedActivities = activities.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const sessionBoundaries = this.detectSessionBoundaries(sortedActivities);
      if (DEBUG_LOGGING$1) {
        console.log(`Detected ${sessionBoundaries.length} session boundaries`);
      }
      for (const boundary of sessionBoundaries) {
        try {
          const session = await this.createSession(boundary, options);
          if (session) {
            stats.sessionsCreated++;
            if (session.sessionType !== "unclear") {
              stats.sessionsClassified++;
            }
          }
        } catch (error) {
          if (DEBUG_LOGGING$1) {
            console.warn("Failed to create session:", error);
          }
          stats.aiFailures++;
        }
      }
      stats.processingTime = Date.now() - startTime;
      if (DEBUG_LOGGING$1) {
        console.log("Session processing complete:", stats);
      }
      return stats;
    } catch (error) {
      stats.processingTime = Date.now() - startTime;
      console.error("Session processing failed:", error);
      throw error;
    }
  }
  /**
   * Detects session boundaries based on temporal gaps and activity patterns
   * 
   * @param activities - Sorted activity data
   * @returns Array of session boundaries
   */
  detectSessionBoundaries(activities) {
    const boundaries = [];
    let currentSession2 = [];
    let sessionStartTime = null;
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const activityTime = new Date(activity.timestamp);
      if (!sessionStartTime) {
        sessionStartTime = activityTime;
        currentSession2 = [activity];
        continue;
      }
      const shouldCreateBoundary = this.shouldCreateSessionBoundary(
        currentSession2,
        activity,
        sessionStartTime
      );
      if (shouldCreateBoundary) {
        if (currentSession2.length > 0) {
          const lastActivity = currentSession2[currentSession2.length - 1];
          boundaries.push({
            startTime: sessionStartTime,
            endTime: new Date(lastActivity.timestamp),
            activities: [...currentSession2]
          });
        }
        sessionStartTime = activityTime;
        currentSession2 = [activity];
      } else {
        currentSession2.push(activity);
      }
    }
    if (currentSession2.length > 0 && sessionStartTime) {
      const lastActivity = currentSession2[currentSession2.length - 1];
      boundaries.push({
        startTime: sessionStartTime,
        endTime: new Date(lastActivity.timestamp),
        activities: currentSession2
      });
    }
    return boundaries.filter(
      (boundary) => this.isValidSessionBoundary(boundary)
    );
  }
  /**
   * Determines if a session boundary should be created
   * 
   * @param currentSession - Current session activities
   * @param nextActivity - Next activity to consider
   * @param sessionStartTime - When current session started
   * @returns True if boundary should be created
   */
  shouldCreateSessionBoundary(currentSession2, nextActivity, sessionStartTime) {
    if (currentSession2.length === 0) return false;
    const lastActivity = currentSession2[currentSession2.length - 1];
    const lastActivityTime = new Date(lastActivity.timestamp);
    const nextActivityTime = new Date(nextActivity.timestamp);
    const sessionDuration = nextActivityTime.getTime() - sessionStartTime.getTime();
    const idleGap = nextActivityTime.getTime() - lastActivityTime.getTime();
    if (idleGap > this.config.maxIdleGap) {
      return true;
    }
    if (sessionDuration > this.config.maxSessionDuration) {
      return true;
    }
    if (this.isSignificantContextSwitch(lastActivity, nextActivity)) {
      return true;
    }
    return false;
  }
  /**
   * Checks if there's a significant context switch between activities
   * 
   * @param lastActivity - Previous activity
   * @param nextActivity - Next activity
   * @returns True if significant context switch detected
   */
  isSignificantContextSwitch(lastActivity, nextActivity) {
    if (lastActivity.appName !== nextActivity.appName) {
      const nonSignificantApps = ["Explorer", "Taskbar", "Desktop"];
      const isLastSignificant = !nonSignificantApps.includes(lastActivity.appName);
      const isNextSignificant = !nonSignificantApps.includes(nextActivity.appName);
      return isLastSignificant && isNextSignificant;
    }
    return false;
  }
  /**
   * Validates if a session boundary meets minimum requirements
   * 
   * @param boundary - Session boundary to validate
   * @returns True if boundary is valid
   */
  isValidSessionBoundary(boundary) {
    const duration = boundary.endTime.getTime() - boundary.startTime.getTime();
    if (duration < this.config.minSessionDuration) {
      return false;
    }
    if (boundary.activities.length === 0) {
      return false;
    }
    return true;
  }
  /**
   * Creates a session from a boundary with AI classification
   * 
   * @param boundary - Session boundary data
   * @param options - Processing options
   * @returns Promise resolving to created session or null
   */
  async createSession(boundary, options) {
    try {
      const duration = boundary.endTime.getTime() - boundary.startTime.getTime();
      let sessionType = "unclear";
      let confidence = 0;
      let reasoning = "Not classified";
      const useAI = options.useAI !== false;
      const hasEnoughActivities = boundary.activities.length >= this.config.minActivitiesForAI;
      if (useAI && hasEnoughActivities) {
        try {
          const classification = await classifyActivities(
            boundary.activities,
            options.context
          );
          sessionType = classification.type;
          confidence = classification.confidence;
          reasoning = classification.reasoning;
        } catch (error) {
          if (DEBUG_LOGGING$1) {
            console.warn("AI classification failed, using fallback:", error);
          }
          sessionType = this.fallbackClassification(boundary.activities);
          confidence = 0.3;
          reasoning = `Rule-based classification: ${this.generateFallbackReasoning(boundary.activities)}`;
        }
      } else {
        sessionType = this.fallbackClassification(boundary.activities);
        confidence = 0.3;
        reasoning = `Rule-based classification: ${this.generateFallbackReasoning(boundary.activities)}`;
      }
      const sessionData = {
        startTime: boundary.startTime,
        endTime: boundary.endTime,
        duration,
        sessionType,
        confidenceScore: confidence,
        userFeedback: reasoning
      };
      const sessionId = await this.saveSession(sessionData);
      await this.linkActivitiesToSession(boundary.activities, sessionId);
      const processedActivities = boundary.activities.map((activity) => ({
        ...activity,
        sessionId,
        formattedDuration: this.formatDuration(activity.duration),
        category: this.getAppCategory(activity.appName)
      }));
      return {
        id: sessionId,
        startTime: boundary.startTime,
        endTime: boundary.endTime,
        duration,
        sessionType,
        confidenceScore: confidence,
        userCorrected: false,
        userFeedback: reasoning,
        activities: processedActivities,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    }
  }
  /**
   * Enhanced rule-based fallback classification with sophisticated scoring
   * 
   * @param activities - Activities to classify
   * @returns Fallback session type with improved accuracy
   */
  fallbackClassification(activities) {
    if (activities.length === 0) return "unclear";
    const appNames = activities.map((a) => a.appName.toLowerCase());
    const windowTitles = activities.map((a) => a.windowTitle.toLowerCase());
    const uniqueApps = new Set(appNames);
    const combinedText = [...appNames, ...windowTitles].join(" ");
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDuration / activities.length;
    const sessionLengthMinutes = totalDuration / (1e3 * 60);
    const appSwitchFrequency = activities.length / Math.max(sessionLengthMinutes, 1);
    const scores = {
      "focused-work": 0,
      "research": 0,
      "entertainment": 0,
      "break": 0,
      "unclear": 0
    };
    const developmentTools = [
      { keywords: ["visual studio", "vscode", "vs code"], score: 15 },
      { keywords: ["intellij", "webstorm", "pycharm"], score: 15 },
      { keywords: ["sublime", "atom", "notepad++"], score: 12 },
      { keywords: ["github", "gitlab", "bitbucket"], score: 10 },
      { keywords: ["terminal", "cmd", "powershell", "bash"], score: 8 },
      { keywords: ["git", "commit", "pull request", "merge"], score: 12 },
      { keywords: ["docker", "kubernetes", "aws", "azure"], score: 10 }
    ];
    developmentTools.forEach((tool) => {
      const matches = tool.keywords.filter((keyword) => combinedText.includes(keyword)).length;
      scores["focused-work"] += matches * tool.score;
    });
    const codeExtensions = [".js", ".ts", ".tsx", ".jsx", ".py", ".java", ".cpp", ".cs", ".php", ".rb", ".go", ".rs", ".vue", ".svelte", ".html", ".css", ".scss", ".sql"];
    const codeFileCount = codeExtensions.filter((ext) => combinedText.includes(ext)).length;
    scores["focused-work"] += codeFileCount * 8;
    const professionalSoftware = [
      { keywords: ["figma", "sketch", "adobe"], score: 12 },
      { keywords: ["photoshop", "illustrator", "indesign"], score: 12 },
      { keywords: ["excel", "powerpoint", "word"], score: 10 },
      { keywords: ["google docs", "sheets", "slides"], score: 10 },
      { keywords: ["slack", "teams", "zoom"], score: 8 },
      { keywords: ["jira", "confluence", "trello"], score: 8 },
      { keywords: ["database", "sql", "mongodb"], score: 10 }
    ];
    professionalSoftware.forEach((software) => {
      const matches = software.keywords.filter((keyword) => combinedText.includes(keyword)).length;
      scores["focused-work"] += matches * software.score;
    });
    const researchPlatforms = [
      { keywords: ["stack overflow", "stackoverflow"], score: 20 },
      { keywords: ["wikipedia", "wiki"], score: 15 },
      { keywords: ["coursera", "udemy", "khan academy"], score: 18 },
      { keywords: ["documentation", "docs", "api"], score: 15 },
      { keywords: ["tutorial", "guide", "how to"], score: 12 },
      { keywords: ["arxiv", "scholar", "pubmed"], score: 18 },
      { keywords: ["medium", "dev.to", "blog"], score: 8 }
    ];
    researchPlatforms.forEach((platform) => {
      const matches = platform.keywords.filter((keyword) => combinedText.includes(keyword)).length;
      scores["research"] += matches * platform.score;
    });
    if (combinedText.includes("youtube")) {
      if (combinedText.includes("tutorial") || combinedText.includes("course") || combinedText.includes("learn") || combinedText.includes("lesson")) {
        scores["research"] += 15;
      } else if (combinedText.includes("music") || combinedText.includes("playlist")) {
        if (scores["focused-work"] > 10) {
          scores["focused-work"] += 5;
        } else {
          scores["entertainment"] += 5;
        }
      } else {
        scores["entertainment"] += 12;
      }
    }
    const entertainmentPlatforms = [
      { keywords: ["netflix", "hulu", "disney", "prime video"], score: 18 },
      { keywords: ["twitch", "streaming", "stream"], score: 15 },
      { keywords: ["facebook", "instagram", "twitter", "tiktok"], score: 12 },
      { keywords: ["reddit", "meme", "funny"], score: 10 },
      { keywords: ["game", "gaming", "steam"], score: 15 },
      { keywords: ["shopping", "amazon", "ebay"], score: 8 },
      { keywords: ["news", "sports", "entertainment"], score: 6 }
    ];
    entertainmentPlatforms.forEach((platform) => {
      const matches = platform.keywords.filter((keyword) => combinedText.includes(keyword)).length;
      scores["entertainment"] += matches * platform.score;
    });
    if (avgDuration < 12e4) {
      scores["break"] += 15;
    }
    if (appSwitchFrequency > 3) {
      scores["break"] += 12;
    }
    const quickTaskIndicators = ["quick", "brief", "check", "glance", "notification"];
    const quickTaskMatches = quickTaskIndicators.filter((indicator) => combinedText.includes(indicator)).length;
    scores["break"] += quickTaskMatches * 8;
    if (combinedText.includes("email") || combinedText.includes("gmail") || combinedText.includes("calendar")) {
      if (avgDuration < 3e5) {
        scores["break"] += 10;
      } else {
        scores["focused-work"] += 5;
      }
    }
    const idleIndicators = ["idle", "screen saver", "lock", "away"];
    const idleMatches = idleIndicators.filter((indicator) => combinedText.includes(indicator)).length;
    scores["break"] += idleMatches * 12;
    if (avgDuration > 9e5) {
      scores["focused-work"] += 10;
      scores["research"] += 8;
      scores["break"] -= 15;
    }
    if (sessionLengthMinutes > 30) {
      if (uniqueApps.size <= 2) {
        scores["focused-work"] += 8;
        scores["research"] += 6;
      }
    }
    const professionalContext = ["project", "client", "meeting", "deadline", "report", "proposal"];
    const professionalMatches = professionalContext.filter((context) => combinedText.includes(context)).length;
    scores["focused-work"] += professionalMatches * 6;
    const learningContext = ["study", "learn", "course", "training", "certification"];
    const learningMatches = learningContext.filter((context) => combinedText.includes(context)).length;
    scores["research"] += learningMatches * 8;
    if (combinedText.includes("chrome") || combinedText.includes("firefox") || combinedText.includes("edge")) {
      const workDomains = ["github", "gitlab", "aws", "azure", "google workspace", "office 365"];
      const researchDomains = ["stackoverflow", "wikipedia", "documentation", "tutorial"];
      const entertainmentDomains = ["youtube", "netflix", "facebook", "instagram", "reddit"];
      const workDomainMatches = workDomains.filter((domain) => combinedText.includes(domain)).length;
      const researchDomainMatches = researchDomains.filter((domain) => combinedText.includes(domain)).length;
      const entertainmentDomainMatches = entertainmentDomains.filter((domain) => combinedText.includes(domain)).length;
      scores["focused-work"] += workDomainMatches * 5;
      scores["research"] += researchDomainMatches * 5;
      scores["entertainment"] += entertainmentDomainMatches * 5;
    }
    const minThreshold = 8;
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore < minThreshold) {
      return "unclear";
    }
    const topCategory = Object.entries(scores).reduce(
      (a, b) => scores[a[0]] > scores[b[0]] ? a : b
    )[0];
    if (topCategory === "break" && sessionLengthMinutes > 20) {
      return avgDuration > 6e5 ? "focused-work" : "unclear";
    }
    if (topCategory === "entertainment" && scores["focused-work"] > scores["entertainment"] * 0.7) {
      if (professionalMatches > 0) {
        return "focused-work";
      }
    }
    if (topCategory === "research" && scores["focused-work"] > scores["research"] * 0.8) {
      if (scores["focused-work"] > 15 && combinedText.includes("code")) {
        return "focused-work";
      }
    }
    return topCategory;
  }
  /**
   * Generates a descriptive reasoning for rule-based classification
   * 
   * @param activities - Activities that were classified
   * @returns Descriptive reasoning for the classification
   */
  generateFallbackReasoning(activities) {
    if (activities.length === 0) return "No activities to analyze";
    const appNames = activities.map((a) => a.appName.toLowerCase());
    const uniqueApps = new Set(appNames);
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDuration / activities.length;
    const workApps = ["code", "visual studio", "intellij", "sublime", "notepad++", "atom"];
    const hasWorkApps = workApps.some(
      (app) => [...uniqueApps].some((appName) => appName.includes(app))
    );
    const entertainmentApps = ["chrome", "firefox", "youtube", "netflix", "spotify", "game"];
    const hasEntertainmentApps = entertainmentApps.some(
      (app) => [...uniqueApps].some((appName) => appName.includes(app))
    );
    const researchApps = ["browser", "pdf", "reader", "documentation"];
    const hasResearchApps = researchApps.some(
      (app) => [...uniqueApps].some((appName) => appName.includes(app))
    );
    if (hasWorkApps) {
      return `Detected development/work applications: ${[...uniqueApps].filter(
        (app) => workApps.some((workApp) => app.includes(workApp))
      ).join(", ")}`;
    }
    if (hasResearchApps) {
      return `Detected research/reading applications: ${[...uniqueApps].filter(
        (app) => researchApps.some((researchApp) => app.includes(researchApp))
      ).join(", ")}`;
    }
    if (hasEntertainmentApps) {
      return `Detected entertainment applications: ${[...uniqueApps].filter(
        (app) => entertainmentApps.some((entApp) => app.includes(entApp))
      ).join(", ")}`;
    }
    if (avgDuration < 3e4) {
      return `Short average activity duration (${Math.round(avgDuration / 1e3)}s) suggests break/idle time`;
    }
    return `Mixed activity patterns across ${uniqueApps.size} applications - unable to clearly classify`;
  }
  /**
   * Saves session data to database
   * 
   * @param sessionData - Session data to save
   * @returns Promise resolving to session ID
   */
  async saveSession(sessionData) {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        start_time, end_time, duration, session_type, 
        confidence_score, user_feedback
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      sessionData.startTime.toISOString(),
      sessionData.endTime.toISOString(),
      sessionData.duration,
      sessionData.sessionType,
      sessionData.confidenceScore,
      sessionData.userFeedback
    );
    return result.lastInsertRowid;
  }
  /**
   * Links activities to a session in the database
   * 
   * @param activities - Activities to link
   * @param sessionId - Session ID to link to
   */
  async linkActivitiesToSession(activities, sessionId) {
    const stmt = this.db.prepare("UPDATE activities SET session_id = ? WHERE id = ?");
    for (const activity of activities) {
      stmt.run(sessionId, activity.id);
    }
  }
  /**
   * Formats duration in milliseconds to human-readable string
   * 
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string
   */
  formatDuration(ms) {
    const minutes = Math.floor(ms / (1e3 * 60));
    const seconds = Math.floor(ms % (1e3 * 60) / 1e3);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
  /**
   * Gets application category for UI display
   * 
   * @param appName - Application name
   * @returns Application category
   */
  getAppCategory(appName) {
    const name = appName.toLowerCase();
    if (name.includes("chrome") || name.includes("firefox") || name.includes("edge")) {
      return "Browser";
    }
    if (name.includes("code") || name.includes("visual studio")) {
      return "Development";
    }
    if (name.includes("word") || name.includes("excel") || name.includes("powerpoint")) {
      return "Office";
    }
    if (name.includes("slack") || name.includes("teams") || name.includes("discord")) {
      return "Communication";
    }
    return "Application";
  }
}
function createSessionClassifier(options) {
  return new SessionClassifier(options);
}
async function processActivitiesIntoSessions(activities, options = {}) {
  const classifier = createSessionClassifier(options);
  return await classifier.processActivities(activities, options);
}
let mainWindow = null;
let tray = null;
let isAppReady = false;
let isMonitoringPaused = false;
function getResourcePath(relativePath) {
  if (electron.app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, "..", "..", relativePath);
}
function transformActivityData(rows) {
  return rows.map((row) => ({
    id: row.id,
    timestamp: new Date(row.timestamp),
    appName: row.app_name,
    windowTitle: row.window_title,
    duration: row.duration,
    formattedDuration: formatDuration(row.duration),
    category: void 0
    // Will be added in Phase 2 with AI classification
  }));
}
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1e3);
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
function createMainWindow() {
  mainWindow = new electron.BrowserWindow({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    title: APP_NAME,
    icon: getResourcePath("assets/icons/icon.png"),
    show: false,
    // Start hidden
    webPreferences: {
      nodeIntegration: false,
      // Security: disable node integration
      contextIsolation: true,
      // Security: enable context isolation
      // Security: disable remote module (removed in newer Electron versions)
      preload: path.join(__dirname, "preload.js"),
      sandbox: false
      // Required for preload script access
    }
  });
  {
    mainWindow.webContents.openDevTools();
  }
  if (!electron.app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
  mainWindow.on("close", (event) => {
    if (electron.BrowserWindow.getAllWindows().length > 1) {
      event.preventDefault();
      hideMainWindow();
    }
  });
  mainWindow.once("ready-to-show", () => {
    {
      console.log("Main window ready to show");
      mainWindow == null ? void 0 : mainWindow.show();
    }
  });
}
function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    {
      console.log("Main window shown");
    }
  }
}
function hideMainWindow() {
  if (mainWindow) {
    mainWindow.hide();
    {
      console.log("Main window hidden");
    }
  }
}
function createSystemTray() {
  try {
    const iconPath = getResourcePath("assets/icons/tray-icon.png");
    let trayIcon = electron.nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = electron.nativeImage.createFromBuffer(Buffer.from([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10,
        0,
        0,
        0,
        13,
        73,
        72,
        68,
        82,
        0,
        0,
        0,
        16,
        0,
        0,
        0,
        16,
        8,
        6,
        0,
        0,
        0,
        31,
        243,
        255,
        97,
        0,
        0,
        0,
        13,
        73,
        68,
        65,
        84,
        56,
        17,
        99,
        248,
        255,
        255,
        63,
        0,
        5,
        254,
        2,
        254,
        220,
        204,
        89,
        231,
        0,
        0,
        0,
        0,
        73,
        69,
        78,
        68,
        174,
        66,
        96,
        130
      ]));
      if (DEBUG_LOGGING$1) {
        console.log("Using fallback tray icon (icon file not found)");
      }
    }
    tray = new electron.Tray(trayIcon);
    tray.setToolTip(TRAY_TOOLTIP);
    tray.on("double-click", () => {
      if (mainWindow == null ? void 0 : mainWindow.isVisible()) {
        hideMainWindow();
      } else {
        showMainWindow();
      }
    });
    updateSystemTray();
    if (DEBUG_LOGGING$1) {
      console.log("System tray created successfully");
    }
  } catch (error) {
    console.error("Failed to create system tray:", error);
  }
}
function updateSystemTray() {
  if (!tray) return;
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: TRAY_MENU.SHOW_DASHBOARD,
      click: showMainWindow
    },
    {
      label: TRAY_MENU.HIDE_DASHBOARD,
      click: hideMainWindow
    },
    { type: "separator" },
    {
      label: isMonitoringPaused ? "Resume Monitoring" : "Pause Monitoring",
      click: () => {
        toggleMonitoring();
      }
    },
    { type: "separator" },
    {
      label: TRAY_MENU.SETTINGS,
      click: () => {
        showMainWindow();
        mainWindow == null ? void 0 : mainWindow.webContents.send("open-settings-panel");
      }
    },
    { type: "separator" },
    {
      label: TRAY_MENU.QUIT,
      click: () => {
        electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}
async function toggleMonitoring() {
  try {
    if (isMonitoringPaused) {
      await startActivityLogging();
      isMonitoringPaused = false;
      console.log("Activity monitoring resumed");
    } else {
      await stopActivityLogging();
      isMonitoringPaused = true;
      console.log("Activity monitoring paused");
    }
    updateSystemTray();
  } catch (error) {
    console.error("Failed to toggle monitoring:", error);
  }
}
function setupIpcHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.GET_ACTIVITIES, async () => {
    try {
      if (DEBUG_LOGGING$1) {
        console.log("IPC: GET_ACTIVITIES called");
      }
      const activities = getActivities({ limit: DEFAULT_ACTIVITY_LIMIT });
      const transformed = transformActivityData(activities);
      if (DEBUG_LOGGING$1) {
        console.log(`IPC: Returning ${activities.length} raw activities, ${transformed.length} transformed`);
        console.log("First few activities:", activities.slice(0, 3));
      }
      return transformed;
    } catch (error) {
      console.error("Failed to get activities:", error);
      throw error;
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_RECENT_ACTIVITIES, async (_, request) => {
    try {
      if (DEBUG_LOGGING$1) {
        console.log("IPC: GET_RECENT_ACTIVITIES called with request:", request);
      }
      const { hours, limit = DEFAULT_ACTIVITY_LIMIT } = request;
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1e3);
      if (DEBUG_LOGGING$1) {
        console.log(`IPC: Fetching activities since ${startDate.toISOString()}, limit: ${limit}`);
      }
      const activities = getActivities({
        startDate,
        limit
      });
      const transformed = transformActivityData(activities);
      if (DEBUG_LOGGING$1) {
        console.log(`IPC: Found ${activities.length} raw activities, returning ${transformed.length} transformed`);
        if (activities.length > 0) {
          console.log("Sample activity:", activities[0]);
        }
      }
      return transformed;
    } catch (error) {
      console.error("Failed to get recent activities:", error);
      throw error;
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_ACTIVITIES_BY_DATE, async (_, request) => {
    try {
      if (DEBUG_LOGGING$1) {
        console.log("IPC: GET_ACTIVITIES_BY_DATE called with request:", request);
      }
      const { startDate, endDate, limit = DEFAULT_ACTIVITY_LIMIT } = request;
      const activities = getActivities({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        limit
      });
      const transformed = transformActivityData(activities);
      if (DEBUG_LOGGING$1) {
        console.log(`IPC: Found ${activities.length} activities for date range, returning ${transformed.length} transformed`);
      }
      return transformed;
    } catch (error) {
      console.error("Failed to get activities by date:", error);
      throw error;
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.SHOW_DASHBOARD, async () => {
    showMainWindow();
  });
  electron.ipcMain.handle(IPC_CHANNELS.HIDE_DASHBOARD, async () => {
    hideMainWindow();
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, async () => {
    return APP_VERSION;
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_SESSIONS_BY_DATE, async (_, request) => {
    try {
      return getSessionsByDate(request);
    } catch (error) {
      console.error("Failed to get sessions by date:", error);
      throw error;
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.UPDATE_SESSION, async (_, request) => {
    try {
      updateSession(request);
    } catch (error) {
      console.error("Failed to update session:", error);
      throw error;
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.CLASSIFY_SESSION, async () => {
    try {
      const activities = getUnclassifiedActivities(24);
      if (activities.length === 0) {
        if (DEBUG_LOGGING$1) {
          console.log("No unclassified activities found for session classification");
        }
        return;
      }
      const stats = await processActivitiesIntoSessions(activities, {
        useAI: true,
        context: "User-triggered classification"
      });
      if (DEBUG_LOGGING$1) {
        console.log("Session classification completed:", stats);
      }
    } catch (error) {
      console.error("Failed to classify sessions:", error);
      throw error;
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.DB_HEALTH_CHECK, async () => {
    try {
      return await checkDatabaseHealth();
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  });
  electron.ipcMain.handle("ollama:health-check", async () => {
    try {
      const http = require("http");
      if (DEBUG_LOGGING$1) {
        console.log("Starting Ollama health check...");
      }
      return new Promise((resolve) => {
        const req = http.get("http://127.0.0.1:11434/api/tags", (res) => {
          if (DEBUG_LOGGING$1) {
            console.log(`Ollama health check response: ${res.statusCode}`);
          }
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            var _a, _b;
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                const hasModel = (_a = parsed.models) == null ? void 0 : _a.some(
                  (model) => model.name.includes("llama3.2:3b") || model.name.includes("llama3.2")
                );
                if (DEBUG_LOGGING$1) {
                  console.log("Ollama models found:", (_b = parsed.models) == null ? void 0 : _b.map((m) => m.name));
                  console.log("Has required model (llama3.2):", hasModel);
                }
                resolve(hasModel);
              } catch (parseError) {
                if (DEBUG_LOGGING$1) {
                  console.warn("Failed to parse Ollama response:", parseError);
                }
                resolve(false);
              }
            } else {
              resolve(false);
            }
          });
        });
        req.on("error", (error) => {
          if (DEBUG_LOGGING$1) {
            console.warn("Ollama health check request error:", error.message);
          }
          resolve(false);
        });
        req.setTimeout(5e3, () => {
          if (DEBUG_LOGGING$1) {
            console.warn("Ollama health check timeout");
          }
          req.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      console.error("Ollama health check failed:", error);
      return false;
    }
  });
  electron.ipcMain.handle("monitoring:get-status", async () => {
    return {
      isActive: !isMonitoringPaused,
      isPaused: isMonitoringPaused
    };
  });
  electron.ipcMain.handle("monitoring:pause", async () => {
    try {
      isMonitoringPaused = true;
      await stopActivityLogging();
      console.log("Activity monitoring paused");
      updateSystemTray();
    } catch (error) {
      console.error("Failed to pause monitoring:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("monitoring:resume", async () => {
    try {
      isMonitoringPaused = false;
      await startActivityLogging();
      console.log("Activity monitoring resumed");
      updateSystemTray();
    } catch (error) {
      console.error("Failed to resume monitoring:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("settings:get", async () => {
    try {
      const settings = await getUserSettings();
      if (DEBUG_LOGGING$1) {
        console.log("Retrieved settings for renderer:", Object.keys(settings));
      }
      return settings;
    } catch (error) {
      console.error("Failed to get settings:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("settings:update", async (_, updates) => {
    try {
      await updateUserSettings(updates);
      if (DEBUG_LOGGING$1) {
        console.log("Settings updated successfully:", Object.keys(updates));
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("settings:reset", async () => {
    try {
      await resetUserSettings();
      if (DEBUG_LOGGING$1) {
        console.log("Settings reset to defaults successfully");
      }
    } catch (error) {
      console.error("Failed to reset settings:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("settings:clear-activity-data", async () => {
    try {
      const result = await clearAllActivityData();
      if (DEBUG_LOGGING$1) {
        console.log("Activity data cleared successfully:", result);
      }
      return result;
    } catch (error) {
      console.error("Failed to clear activity data:", error);
      throw error;
    }
  });
  {
    console.log("IPC handlers registered successfully");
  }
}
async function initializeApp() {
  try {
    await initializeDatabase();
    if (DEBUG_LOGGING$1) {
      console.log("=== DEBUG: Checking database after initialization ===");
      const healthOk = await checkDatabaseHealth();
      console.log(`Database health check: ${healthOk ? "✅ OK" : "❌ FAILED"}`);
      try {
        const allActivities = getActivities({ limit: 5 });
        console.log(`Activities in database: ${allActivities.length}`);
        if (allActivities.length > 0) {
          console.log("Latest activity:", allActivities[0]);
        } else {
          console.log("⚠️ No activities found in database");
        }
      } catch (error) {
        console.error("❌ Failed to query activities:", error);
      }
    }
    const monitoringStarted = await startActivityLogging();
    if (DEBUG_LOGGING$1) {
      console.log(`Activity monitoring started: ${monitoringStarted ? "✅ OK" : "❌ FAILED"}`);
      const isActive = isActivityLoggingActive();
      console.log(`Activity logging active: ${isActive ? "✅ YES" : "❌ NO"}`);
    }
    createSystemTray();
    setupIpcHandlers();
    if (DEBUG_LOGGING$1) {
      createMainWindow();
    }
    isAppReady = true;
    if (DEBUG_LOGGING$1) {
      console.log("Application initialized successfully");
      setTimeout(() => {
        console.log("=== DEBUG: Checking activity logging after 10 seconds ===");
        try {
          const recentActivities = getActivities({
            startDate: new Date(Date.now() - 3e4),
            // Last 30 seconds
            limit: 10
          });
          console.log(`New activities in last 30 seconds: ${recentActivities.length}`);
          if (recentActivities.length > 0) {
            console.log("✅ Activity logging is working!");
            console.log("Recent activities:", recentActivities.slice(0, 3));
          } else {
            console.log("⚠️ No new activities logged in the last 30 seconds");
            console.log("This could mean:");
            console.log("1. Activity logging is not working");
            console.log("2. No window changes occurred");
            console.log("3. Current app is excluded from tracking");
          }
        } catch (error) {
          console.error("❌ Failed to check recent activities:", error);
        }
      }, 1e4);
    }
  } catch (error) {
    console.error("Failed to initialize application:", error);
    electron.app.quit();
  }
}
async function cleanup() {
  try {
    await stopActivityLogging();
    closeDatabaseConnection();
    if (DEBUG_LOGGING$1) {
      console.log("Application cleanup completed");
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}
electron.app.whenReady().then(initializeApp);
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
electron.app.on("before-quit", async (event) => {
  if (isAppReady) {
    event.preventDefault();
    await cleanup();
    electron.app.exit();
  }
});
electron.app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== "http://localhost:5173" && !navigationUrl.startsWith("file://")) {
      event.preventDefault();
    }
  });
});
electron.app.on("certificate-error", (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(false);
});
{
  console.log(`${APP_NAME} v${APP_VERSION} starting...`);
}
//# sourceMappingURL=main.js.map
