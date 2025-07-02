/**
 * Migration 002 - Add Sessions Schema
 * 
 * Adds the sessions table for AI-classified activity groupings, user settings
 * table for preferences, and AI feedback table for learning. This migration
 * supports Phase 2 MVP functionality including session classification,
 * user customization, and AI improvement through feedback.
 * 
 * @module Migration002
 * @author FocusFlare Team
 * @since 0.2.0
 */

import type Database from 'better-sqlite3';

// === MIGRATION QUERIES ===

/**
 * SQL schema for sessions table
 */
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

/**
 * SQL schema for user settings table
 */
const CREATE_USER_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * SQL schema for AI feedback table
 */
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

/**
 * Add session_id and is_idle columns to activities table
 */
const ALTER_ACTIVITIES_TABLE = `
  ALTER TABLE activities ADD COLUMN session_id INTEGER REFERENCES sessions(id)
`;

const ALTER_ACTIVITIES_TABLE_IDLE = `
  ALTER TABLE activities ADD COLUMN is_idle BOOLEAN DEFAULT FALSE
`;

/**
 * Performance indexes for new tables
 */
const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user_corrected ON sessions(user_corrected)',
  'CREATE INDEX IF NOT EXISTS idx_activities_session_id ON activities(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_activities_is_idle ON activities(is_idle)',
  'CREATE INDEX IF NOT EXISTS idx_ai_feedback_session_id ON ai_feedback(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(key)'
];

/**
 * Default user settings
 */
const DEFAULT_SETTINGS = [
  ['work_hours_start', '09:00'],
  ['work_hours_end', '17:00'],
  ['break_duration_minutes', '15'],
  ['focus_session_goal_minutes', '120'],
  ['theme_preference', 'system'],
  ['notifications_enabled', 'true'],
  ['morning_nudge_enabled', 'false'],
  ['data_retention_days', '90'],
  ['ai_classification_enabled', 'true']
];

// === MIGRATION FUNCTIONS ===

/**
 * Applies migration 002 - adds sessions and related tables
 * 
 * @param db - Database connection instance
 * @throws {Error} If migration fails
 */
export function up(db: Database.Database): void {
  try {
    // Create new tables
    db.exec(CREATE_SESSIONS_TABLE);
    db.exec(CREATE_USER_SETTINGS_TABLE);
    db.exec(CREATE_AI_FEEDBACK_TABLE);
    
    // Alter existing activities table
    try {
      db.exec(ALTER_ACTIVITIES_TABLE);
    } catch (error) {
      // Column might already exist, check if it's a duplicate column error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('duplicate column name')) {
        throw error;
      }
    }
    
    try {
      db.exec(ALTER_ACTIVITIES_TABLE_IDLE);
    } catch (error) {
      // Column might already exist, check if it's a duplicate column error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('duplicate column name')) {
        throw error;
      }
    }
    
    // Create indexes
    for (const indexSQL of CREATE_INDEXES) {
      db.exec(indexSQL);
    }
    
    // Insert default settings
    const insertSetting = db.prepare('INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)');
    
    for (const [key, value] of DEFAULT_SETTINGS) {
      insertSetting.run(key, value);
    }
    
    console.log('Migration 002: Sessions schema applied successfully');
  } catch (error) {
    console.error('Migration 002 failed:', error);
    throw error;
  }
}

/**
 * Reverts migration 002 - removes sessions and related tables
 * 
 * @param db - Database connection instance
 * @throws {Error} If rollback fails
 */
export function down(db: Database.Database): void {
  try {
    // Drop indexes
    const dropIndexes = [
      'DROP INDEX IF EXISTS idx_sessions_start_time',
      'DROP INDEX IF EXISTS idx_sessions_type',
      'DROP INDEX IF EXISTS idx_sessions_user_corrected',
      'DROP INDEX IF EXISTS idx_activities_session_id',
      'DROP INDEX IF EXISTS idx_activities_is_idle',
      'DROP INDEX IF EXISTS idx_ai_feedback_session_id',
      'DROP INDEX IF EXISTS idx_user_settings_key'
    ];
    
    for (const dropSQL of dropIndexes) {
      db.exec(dropSQL);
    }
    
    // Note: SQLite doesn't support DROP COLUMN, so we can't easily remove
    // the added columns from activities table without recreating the table
    
    // Drop tables (order matters due to foreign keys)
    db.exec('DROP TABLE IF EXISTS ai_feedback');
    db.exec('DROP TABLE IF EXISTS sessions');
    db.exec('DROP TABLE IF EXISTS user_settings');
    
    console.log('Migration 002: Sessions schema reverted successfully');
  } catch (error) {
    console.error('Migration 002 rollback failed:', error);
    throw error;
  }
} 