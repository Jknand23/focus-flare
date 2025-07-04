/**
 * Migration 004 - Windows Integrations Tables
 * 
 * Adds database tables for Windows app integrations introduced in Phase 4.
 * Creates tables for calendar events, file access monitoring, and productivity insights.
 * These tables support the Windows Calendar and File Explorer integrations.
 * 
 * @module Migration004
 * @author FocusFlare Team
 * @since 0.4.0
 */

import type Database from 'better-sqlite3';

/**
 * Migration up - creates Windows integration tables
 * 
 * @param db - Database instance
 */
export function up(db: Database.Database): void {
  console.log('Running migration 004: Windows Integrations Tables');
  
  // Windows Calendar Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS windows_calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      subject TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      calendar_name TEXT,
      location TEXT,
      attendees TEXT, -- JSON string of attendee emails
      is_all_day INTEGER DEFAULT 0,
      is_meeting INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      meeting_type TEXT, -- 'in-person', 'virtual', 'hybrid'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Windows File Access Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS windows_file_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_extension TEXT,
      file_size INTEGER,
      access_type TEXT NOT NULL, -- 'open', 'create', 'modify', 'delete'
      process_name TEXT,
      process_path TEXT,
      timestamp DATETIME NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      project_context TEXT, -- detected project or directory context
      file_category TEXT, -- 'document', 'code', 'image', 'media', 'other'
      is_work_related INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Productivity Insights table
  db.exec(`
    CREATE TABLE IF NOT EXISTS productivity_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      insight_type TEXT NOT NULL, -- 'meeting-context', 'file-activity', 'productivity-score', 'general'
      insight_category TEXT NOT NULL, -- 'preparation', 'execution', 'follow-up', 'context'
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      context_data TEXT, -- JSON string with supporting data
      confidence_score REAL DEFAULT 0.0, -- 0.0 to 1.0
      productivity_score REAL DEFAULT 0.0, -- 0.0 to 1.0
      impact_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
      tags TEXT, -- JSON array of tags
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Indexes for performance optimization
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_windows_calendar_events_start_time 
    ON windows_calendar_events(start_time)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_windows_calendar_events_end_time 
    ON windows_calendar_events(end_time)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_windows_calendar_events_event_id 
    ON windows_calendar_events(event_id)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_windows_file_events_timestamp 
    ON windows_file_events(timestamp)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_windows_file_events_file_path 
    ON windows_file_events(file_path)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_windows_file_events_access_type 
    ON windows_file_events(access_type)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_windows_file_events_process_name 
    ON windows_file_events(process_name)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_productivity_insights_session_id 
    ON productivity_insights(session_id)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_productivity_insights_insight_type 
    ON productivity_insights(insight_type)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_productivity_insights_created_at 
    ON productivity_insights(created_at)
  `);
  
  console.log('Migration 004: Windows Integrations Tables completed successfully');
}

/**
 * Migration down - removes Windows integration tables
 * 
 * @param db - Database instance
 */
export function down(db: Database.Database): void {
  console.log('Rolling back migration 004: Windows Integrations Tables');
  
  // Drop tables in reverse order
  db.exec('DROP TABLE IF EXISTS productivity_insights');
  db.exec('DROP TABLE IF EXISTS windows_file_events');
  db.exec('DROP TABLE IF EXISTS windows_calendar_events');
  
  console.log('Migration 004: Windows Integrations Tables rollback completed');
} 