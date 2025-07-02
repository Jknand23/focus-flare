/**
 * Database Connection - SQLite database management and connection handling
 * 
 * Manages the local SQLite database connection for FocusFlare activity tracking.
 * Handles database initialization, schema creation, migrations, and provides
 * a centralized connection interface for all database operations.
 * Uses better-sqlite3 for high performance native SQLite access.
 * 
 * @module DatabaseConnection
 * @author FocusFlare Team
 * @since 0.1.0
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { 
  DB_FILENAME, 
  DEBUG_LOGGING,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES 
} from '@/shared/constants/app-constants';
import type { 
  ActivityTableRow,
  SessionData,
  SessionTableRow,
  UpdateSessionRequest,
  GetSessionsByDateRequest,
  RawActivityData
} from '@/shared/types/activity-types';
import { up as runMigration002 } from './migrations/002-add-sessions-schema';

// === DATABASE INSTANCE ===

/** Global database instance */
let database: Database.Database | null = null;
/** Database file path */
let dbPath: string = '';

// === PREPARED STATEMENTS ===

/** Prepared statement for inserting activities */
let insertActivityStatement: Database.Statement | null = null;
/** Prepared statement for getting activities with pagination */
let getActivitiesStatement: Database.Statement | null = null;
/** Prepared statement for counting activities */
let countActivitiesStatement: Database.Statement | null = null;
/** Prepared statement for deleting old activities */
let deleteOldActivitiesStatement: Database.Statement | null = null;

// === DATABASE SCHEMA ===

/**
 * SQL schema for activities table
 */
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

/**
 * SQL indexes for performance optimization
 */
const ACTIVITY_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_activities_app_name ON activities(app_name)',
  'CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at)'
];

// === DATABASE INITIALIZATION ===

/**
 * Initializes the SQLite database connection and creates necessary tables
 * 
 * Creates the database file in the user data directory, establishes connection,
 * creates tables and indexes, and configures database settings for optimal
 * performance and reliability.
 * 
 * @returns Promise resolving to true if initialization successful
 * @throws {Error} If database initialization fails
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Get user data directory path
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, DB_FILENAME);
    
    // Ensure user data directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    if (DEBUG_LOGGING) {
      console.log(`Initializing database at: ${dbPath}`);
    }
    
    // Create database connection
    database = new Database(dbPath, {
      verbose: DEBUG_LOGGING ? console.log : undefined,
    });
    
    // Configure database for optimal performance
    database.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging
    database.pragma('synchronous = NORMAL'); // Balance safety and performance
    database.pragma('cache_size = 10000'); // 10MB cache
    database.pragma('foreign_keys = ON'); // Enable foreign key constraints
    
    // Create tables
    database.exec(ACTIVITIES_TABLE_SCHEMA);
    
    // Create indexes
    for (const indexSQL of ACTIVITY_INDEXES) {
      database.exec(indexSQL);
    }
    
    // Run Phase 2 migration (sessions schema)
    runMigration002(database);
    
    // Prepare frequently used statements
    prepareStatements();
    
    if (DEBUG_LOGGING) {
      console.log(SUCCESS_MESSAGES.DB_CONNECTED);
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new Error(`${ERROR_MESSAGES.DB_CONNECTION_FAILED}: ${error}`);
  }
}

/**
 * Prepares commonly used SQL statements for better performance
 */
function prepareStatements(): void {
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
    
    if (DEBUG_LOGGING) {
      console.log('Prepared statements initialized successfully');
    }
  } catch (error) {
    console.error('Failed to prepare statements:', error);
  }
}

/**
 * Gets the current database connection instance
 * 
 * @returns Database instance or null if not initialized
 * @throws {Error} If database is not initialized
 */
export function getDatabaseConnection(): Database.Database {
  if (!database) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return database;
}

/**
 * Closes the database connection gracefully
 * 
 * Performs any necessary cleanup operations and closes the database
 * connection. Should be called when the application is shutting down.
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (database) {
    try {
      // Prepared statements are automatically finalized when database is closed
      
      // Close database connection
      database.close();
      database = null;
      
      // Reset prepared statements
      insertActivityStatement = null;
      getActivitiesStatement = null;
      countActivitiesStatement = null;
      deleteOldActivitiesStatement = null;
      
      if (DEBUG_LOGGING) {
        console.log('Database connection closed successfully');
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

/**
 * Performs a health check on the database connection
 * 
 * Executes a simple query to verify the database is accessible and
 * responding correctly. Used for monitoring and diagnostics.
 * 
 * @returns Promise resolving to true if database is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!database) {
      return false;
    }
    
    // Perform a simple query to test connectivity
    const result = database.prepare('SELECT 1 as test').get() as { test: number } | undefined;
    return result?.test === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// === BASIC ACTIVITY OPERATIONS ===

/**
 * Inserts a new activity record into the database
 * 
 * Creates a new activity entry with the provided information. Automatically
 * handles timestamp generation if not provided and validates required fields.
 * Uses prepared statements for optimal performance and security.
 * 
 * @param activityData - Activity information to insert
 * @param activityData.appName - Name of the application
 * @param activityData.windowTitle - Title of the window
 * @param activityData.duration - Duration in seconds (optional, default: 0)
 * @param activityData.timestamp - When the activity occurred (optional, default: now)
 * @returns Promise resolving to the ID of the inserted record
 * 
 * @throws {Error} If required fields are missing or database operation fails
 */
export async function insertActivity(activityData: {
  appName: string;
  windowTitle: string;
  duration?: number;
  timestamp?: Date;
}): Promise<number> {
  if (!database || !insertActivityStatement) {
    throw new Error('Database not initialized');
  }
  
  if (!activityData.appName || typeof activityData.appName !== 'string') {
    throw new Error('App name is required and must be a string');
  }
  
  try {
    const timestamp = activityData.timestamp || new Date();
    const duration = activityData.duration || 0;
    
    const result = insertActivityStatement.run(
      timestamp.toISOString(),
      activityData.appName,
      activityData.windowTitle || '',
      duration
    );
    
    if (DEBUG_LOGGING) {
      console.log(`Inserted activity: ${activityData.appName} (ID: ${result.lastInsertRowid})`);
    }
    
    return Number(result.lastInsertRowid);
  } catch (error) {
    console.error('Failed to insert activity:', error);
    throw new Error(`Failed to insert activity: ${error}`);
  }
}

/**
 * Retrieves activity records from the database with pagination and filtering
 * 
 * Fetches activity data based on the provided options. Supports pagination
 * through limit/offset and date range filtering. Results are ordered by
 * timestamp in descending order (most recent first).
 * 
 * @param options - Query options for filtering and pagination
 * @param options.limit - Maximum number of records to return (default: 100)
 * @param options.offset - Number of records to skip (default: 0)
 * @param options.startDate - Filter activities after this date (optional)
 * @param options.endDate - Filter activities before this date (optional)
 * @returns Array of activity records matching the criteria
 * 
 * @throws {Error} If database query fails
 */
export function getActivities(options: {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
} = {}): ActivityTableRow[] {
  if (!database || !getActivitiesStatement) {
    throw new Error('Database not initialized');
  }
  
  try {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate
    } = options;
    
    const startDateISO = startDate?.toISOString() || null;
    const endDateISO = endDate?.toISOString() || null;
    
    const results = getActivitiesStatement.all(
      startDateISO, startDateISO,
      endDateISO, endDateISO,
      limit, offset
    ) as any[];
    
         return results.map(row => ({
       id: row.id,
       timestamp: row.timestamp, // Keep as ISO string as expected by ActivityTableRow
       app_name: row.app_name,
       window_title: row.window_title,
       duration: row.duration,
       created_at: row.created_at // Keep as ISO string as expected by ActivityTableRow
     }));
  } catch (error) {
    console.error('Failed to get activities:', error);
    throw new Error(`Failed to get activities: ${error}`);
  }
}

/**
 * Gets the total count of activity records matching the given criteria
 * 
 * Returns the number of activity records that match the optional date range
 * filter. Useful for pagination calculations and statistics.
 * 
 * @param options - Query options for filtering
 * @param options.startDate - Count activities after this date (optional)
 * @param options.endDate - Count activities before this date (optional)
 * @returns Total number of matching activity records
 * 
 * @throws {Error} If database query fails
 */
export function getActivityCount(options: {
  startDate?: Date;
  endDate?: Date;
} = {}): number {
  if (!database || !countActivitiesStatement) {
    throw new Error('Database not initialized');
  }
  
  try {
    const { startDate, endDate } = options;
    
    const startDateISO = startDate?.toISOString() || null;
    const endDateISO = endDate?.toISOString() || null;
    
    const result = countActivitiesStatement.get(
      startDateISO, startDateISO,
      endDateISO, endDateISO
    ) as any;
    
    return result?.count || 0;
  } catch (error) {
    console.error('Failed to get activity count:', error);
    throw new Error(`Failed to get activity count: ${error}`);
  }
}

/**
 * Deletes activity records older than the specified date
 * 
 * Removes old activity records to manage database size and maintain
 * performance. This is typically used for implementing data retention
 * policies based on user preferences.
 * 
 * @param olderThan - Delete activities recorded before this date
 * @returns Promise resolving to number of records deleted
 * 
 * @throws {Error} If database operation fails
 */
export async function deleteOldActivities(olderThan: Date): Promise<number> {
  if (!database || !deleteOldActivitiesStatement) {
    throw new Error('Database not initialized');
  }
  
  try {
    const result = deleteOldActivitiesStatement.run(olderThan.toISOString());
    
    if (DEBUG_LOGGING) {
      console.log(`Deleted ${result.changes} old activities`);
    }
    
    return result.changes || 0;
  } catch (error) {
    console.error('Failed to delete old activities:', error);
    throw new Error(`Failed to delete old activities: ${error}`);
  }
}

/**
 * Transforms database session rows to UI-friendly session data
 */
function transformSessionData(rows: SessionTableRow[]): SessionData[] {
  return rows.map(row => ({
    id: row.id,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    duration: row.duration,
    sessionType: row.session_type,
    confidenceScore: row.confidence_score,
    userCorrected: row.user_corrected,
    userFeedback: row.user_feedback,
    activities: [], // Will be populated separately
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }));
}

/**
 * Gets sessions by date range
 */
export function getSessionsByDate(request: GetSessionsByDateRequest): SessionData[] {
  if (!database) {
    throw new Error('Database not initialized');
  }

  try {
    const { startDate, endDate, limit = 100 } = request;
    
    const stmt = database.prepare(`
      SELECT * FROM sessions 
      WHERE start_time >= ? AND end_time <= ?
      ORDER BY start_time DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(startDate, endDate, limit) as SessionTableRow[];
    const sessions = transformSessionData(rows);
    
    // Get activities for each session
    for (const session of sessions) {
      const activityStmt = database.prepare(`
        SELECT * FROM activities 
        WHERE session_id = ?
        ORDER BY timestamp ASC
      `);
      const activityRows = activityStmt.all(session.id) as ActivityTableRow[];
      
      session.activities = activityRows.map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        appName: row.app_name,
        windowTitle: row.window_title,
        duration: row.duration,
        formattedDuration: formatDuration(row.duration),
        sessionId: row.session_id,
        isIdle: row.is_idle
      }));
    }
    
    return sessions;
  } catch (error) {
    console.error('Failed to get sessions by date:', error);
    throw error;
  }
}

/**
 * Updates an existing session
 */
export function updateSession(request: UpdateSessionRequest): void {
  if (!database) {
    throw new Error('Database not initialized');
  }

  try {
    const { sessionId, sessionType, userFeedback, userCorrected } = request;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (sessionType !== undefined) {
      updates.push('session_type = ?');
      values.push(sessionType);
    }
    
    if (userFeedback !== undefined) {
      updates.push('user_feedback = ?');
      values.push(userFeedback);
    }
    
    if (userCorrected !== undefined) {
      updates.push('user_corrected = ?');
      // Convert boolean to integer for SQLite compatibility
      values.push(userCorrected ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return; // Nothing to update
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(sessionId);
    
    const stmt = database.prepare(`
      UPDATE sessions 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
  } catch (error) {
    console.error('Failed to update session:', error);
    throw error;
  }
}

/**
 * Gets recent unclassified activities for session processing
 */
export function getUnclassifiedActivities(hours: number = 24): RawActivityData[] {
  if (!database) {
    throw new Error('Database not initialized');
  }

  try {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    const stmt = database.prepare(`
      SELECT * FROM activities 
      WHERE session_id IS NULL 
        AND timestamp >= ?
        AND (is_idle IS NULL OR is_idle = FALSE)
      ORDER BY timestamp ASC
    `);
    
    const rows = stmt.all(cutoffTime.toISOString()) as ActivityTableRow[];
    
    return rows.map(row => ({
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
    console.error('Failed to get unclassified activities:', error);
    throw error;
  }
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

// === SETTINGS OPERATIONS ===

/**
 * Gets user settings from database
 * 
 * Retrieves all user settings from the user_settings table and returns
 * them as a structured object. Settings are stored as key-value pairs
 * in the database for flexibility.
 * 
 * @returns Promise resolving to user settings object
 * @throws {Error} If database query fails
 */
export async function getUserSettings(): Promise<Record<string, any>> {
  if (!database) {
    throw new Error('Database not initialized');
  }

  try {
    const stmt = database.prepare('SELECT key, value FROM user_settings');
    const rows = stmt.all() as { key: string; value: string }[];
    
    const settings: Record<string, any> = {};
    rows.forEach(row => {
      try {
        // Parse JSON values, fallback to string for simple values
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    
    if (DEBUG_LOGGING) {
      console.log('Retrieved user settings:', Object.keys(settings));
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to get user settings:', error);
    throw new Error(`Failed to retrieve settings: ${error}`);
  }
}

/**
 * Updates user settings in database
 * 
 * Updates or inserts user settings into the user_settings table.
 * Settings values are JSON stringified for storage consistency.
 * 
 * @param updates - Object containing settings to update
 * @returns Promise resolving when update is complete
 * @throws {Error} If database operation fails
 */
export async function updateUserSettings(updates: Record<string, any>): Promise<void> {
  if (!database) {
    throw new Error('Database not initialized');
  }

  try {
    const updateStmt = database.prepare(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    
    const transaction = database.transaction((settingsUpdates: Record<string, any>) => {
      for (const [key, value] of Object.entries(settingsUpdates)) {
        const jsonValue = JSON.stringify(value);
        updateStmt.run(key, jsonValue);
      }
    });
    
    transaction(updates);
    
    if (DEBUG_LOGGING) {
      console.log('Updated settings keys:', Object.keys(updates));
    }
  } catch (error) {
    console.error('Failed to update user settings:', error);
    throw new Error(`Failed to update settings: ${error}`);
  }
}

/**
 * Resets all user settings to defaults
 * 
 * Clears all settings from the user_settings table. The application
 * will fall back to default values defined in the settings store.
 * 
 * @returns Promise resolving when reset is complete
 * @throws {Error} If database operation fails
 */
export async function resetUserSettings(): Promise<void> {
  if (!database) {
    throw new Error('Database not initialized');
  }

  try {
    const deleteStmt = database.prepare('DELETE FROM user_settings');
    deleteStmt.run();
    
    if (DEBUG_LOGGING) {
      console.log('All user settings reset to defaults');
    }
  } catch (error) {
    console.error('Failed to reset user settings:', error);
    throw new Error(`Failed to reset settings: ${error}`);
  }
}

/**
 * Clears all activity data from database
 * 
 * Removes all activity logs and sessions from the database.
 * This is a destructive operation that cannot be undone.
 * 
 * @returns Promise resolving to number of records deleted
 * @throws {Error} If database operation fails
 */
export async function clearAllActivityData(): Promise<{ activities: number; sessions: number }> {
  if (!database) {
    throw new Error('Database not initialized');
  }

  try {
    const deleteActivitiesStmt = database.prepare('DELETE FROM activities');
    const deleteSessionsStmt = database.prepare('DELETE FROM sessions');
    
    const transaction = database.transaction(() => {
      const activitiesResult = deleteActivitiesStmt.run();
      const sessionsResult = deleteSessionsStmt.run();
      
      return {
        activities: activitiesResult.changes,
        sessions: sessionsResult.changes
      };
    });
    
    const result = transaction();
    
    if (DEBUG_LOGGING) {
      console.log(`Cleared ${result.activities} activities and ${result.sessions} sessions`);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to clear activity data:', error);
    throw new Error(`Failed to clear activity data: ${error}`);
  }
}

// === EXPORTS ===

export type { Database } from 'better-sqlite3'; 