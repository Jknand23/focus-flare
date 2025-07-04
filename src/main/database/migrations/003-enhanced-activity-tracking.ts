/**
 * Migration 003 - Enhanced Activity Tracking
 * 
 * Adds enhanced activity tracking fields to the activities table to support
 * per-app monitoring, resource usage tracking, and intelligent idle detection.
 * This migration enables the enhanced monitoring system that tracks user
 * interactions, system resource usage, and activity levels.
 * 
 * @module Migration003
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type Database from 'better-sqlite3';

// === MIGRATION QUERIES ===

/**
 * Add enhanced activity tracking columns to activities table
 */
const ALTER_ACTIVITIES_TABLE_QUERIES = [
  `ALTER TABLE activities ADD COLUMN activity_level TEXT DEFAULT 'active'`,
  `ALTER TABLE activities ADD COLUMN interaction_count INTEGER DEFAULT 0`,
  `ALTER TABLE activities ADD COLUMN is_processing BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE activities ADD COLUMN cpu_usage REAL DEFAULT 0.0`
];

/**
 * Create indexes for enhanced activity tracking
 */
const CREATE_ENHANCED_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_activities_activity_level ON activities(activity_level)',
  'CREATE INDEX IF NOT EXISTS idx_activities_interaction_count ON activities(interaction_count)',
  'CREATE INDEX IF NOT EXISTS idx_activities_is_processing ON activities(is_processing)',
  'CREATE INDEX IF NOT EXISTS idx_activities_cpu_usage ON activities(cpu_usage)'
];

/**
 * Create app_activity_states table for tracking per-app activity
 */
const CREATE_APP_ACTIVITY_STATES_TABLE = `
  CREATE TABLE IF NOT EXISTS app_activity_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name TEXT NOT NULL UNIQUE,
    activity_level TEXT NOT NULL DEFAULT 'idle',
    last_user_interaction DATETIME NOT NULL,
    last_system_activity DATETIME NOT NULL,
    total_active_time INTEGER DEFAULT 0,
    total_idle_time INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    is_processing BOOLEAN DEFAULT FALSE,
    is_playing_media BOOLEAN DEFAULT FALSE,
    session_start DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Create system_resource_usage table for tracking resource usage
 */
const CREATE_SYSTEM_RESOURCE_USAGE_TABLE = `
  CREATE TABLE IF NOT EXISTS system_resource_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pid INTEGER NOT NULL,
    app_name TEXT NOT NULL,
    cpu_usage REAL DEFAULT 0.0,
    memory_usage REAL DEFAULT 0.0,
    network_activity REAL DEFAULT 0.0,
    disk_activity REAL DEFAULT 0.0,
    is_active BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Create user_interaction_events table for tracking user interactions
 */
const CREATE_USER_INTERACTION_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_interaction_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_type TEXT NOT NULL,
    app_name TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
  )
`;

/**
 * Create indexes for new tables
 */
const CREATE_NEW_TABLE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_app_activity_states_app_name ON app_activity_states(app_name)',
  'CREATE INDEX IF NOT EXISTS idx_app_activity_states_activity_level ON app_activity_states(activity_level)',
  'CREATE INDEX IF NOT EXISTS idx_app_activity_states_updated_at ON app_activity_states(updated_at)',
  'CREATE INDEX IF NOT EXISTS idx_system_resource_usage_pid ON system_resource_usage(pid)',
  'CREATE INDEX IF NOT EXISTS idx_system_resource_usage_app_name ON system_resource_usage(app_name)',
  'CREATE INDEX IF NOT EXISTS idx_system_resource_usage_timestamp ON system_resource_usage(timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_user_interaction_events_app_name ON user_interaction_events(app_name)',
  'CREATE INDEX IF NOT EXISTS idx_user_interaction_events_timestamp ON user_interaction_events(timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_user_interaction_events_type ON user_interaction_events(interaction_type)'
];

// === MIGRATION FUNCTIONS ===

/**
 * Applies migration 003 - adds enhanced activity tracking
 * 
 * @param db - Database connection instance
 * @throws {Error} If migration fails
 */
export function up(db: Database.Database): void {
  try {
    // Add new columns to activities table
    for (const query of ALTER_ACTIVITIES_TABLE_QUERIES) {
      try {
        db.exec(query);
      } catch (error) {
        // Column might already exist, check if it's a duplicate column error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('duplicate column name')) {
          throw error;
        }
      }
    }
    
    // Create new tables
    db.exec(CREATE_APP_ACTIVITY_STATES_TABLE);
    db.exec(CREATE_SYSTEM_RESOURCE_USAGE_TABLE);
    db.exec(CREATE_USER_INTERACTION_EVENTS_TABLE);
    
    // Create indexes for enhanced activity tracking
    for (const indexSQL of CREATE_ENHANCED_INDEXES) {
      db.exec(indexSQL);
    }
    
    // Create indexes for new tables
    for (const indexSQL of CREATE_NEW_TABLE_INDEXES) {
      db.exec(indexSQL);
    }
    
    console.log('Migration 003: Enhanced activity tracking applied successfully');
  } catch (error) {
    console.error('Migration 003 failed:', error);
    throw error;
  }
}

/**
 * Reverts migration 003 - removes enhanced activity tracking
 * 
 * @param db - Database connection instance
 * @throws {Error} If rollback fails
 */
export function down(db: Database.Database): void {
  try {
    // Drop indexes
    const dropIndexes = [
      'DROP INDEX IF EXISTS idx_activities_activity_level',
      'DROP INDEX IF EXISTS idx_activities_interaction_count',
      'DROP INDEX IF EXISTS idx_activities_is_processing',
      'DROP INDEX IF EXISTS idx_activities_cpu_usage',
      'DROP INDEX IF EXISTS idx_app_activity_states_app_name',
      'DROP INDEX IF EXISTS idx_app_activity_states_activity_level',
      'DROP INDEX IF EXISTS idx_app_activity_states_updated_at',
      'DROP INDEX IF EXISTS idx_system_resource_usage_pid',
      'DROP INDEX IF EXISTS idx_system_resource_usage_app_name',
      'DROP INDEX IF EXISTS idx_system_resource_usage_timestamp',
      'DROP INDEX IF EXISTS idx_user_interaction_events_app_name',
      'DROP INDEX IF EXISTS idx_user_interaction_events_timestamp',
      'DROP INDEX IF EXISTS idx_user_interaction_events_type'
    ];
    
    for (const dropSQL of dropIndexes) {
      db.exec(dropSQL);
    }
    
    // Drop new tables
    db.exec('DROP TABLE IF EXISTS user_interaction_events');
    db.exec('DROP TABLE IF EXISTS system_resource_usage');
    db.exec('DROP TABLE IF EXISTS app_activity_states');
    
    // Note: SQLite doesn't support DROP COLUMN, so we can't easily remove
    // the added columns from activities table without recreating the table
    
    console.log('Migration 003: Enhanced activity tracking reverted successfully');
  } catch (error) {
    console.error('Migration 003 rollback failed:', error);
    throw error;
  }
} 