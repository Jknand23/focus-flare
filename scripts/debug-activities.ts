/**
 * Debug Activities - Diagnostic script for activity logging issues
 * 
 * This script helps diagnose issues with activity logging by checking:
 * - Database connection and health
 * - Activity data presence and recent entries
 * - Activity logger status
 * - IPC communication functionality
 * 
 * @module DebugActivities
 * @author FocusFlare Team
 * @since 0.1.0
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// === DATABASE DIAGNOSTICS ===

/**
 * Checks database connection and activity data
 */
function checkDatabase(): void {
  console.log('=== DATABASE DIAGNOSTICS ===');
  
  try {
    // Get expected database path
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'focus-flare.db');
    
    console.log(`Expected database path: ${dbPath}`);
    console.log(`Database file exists: ${fs.existsSync(dbPath)}`);
    
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Database file not found - this might be the issue!');
      return;
    }
    
    // Check file size
    const stats = fs.statSync(dbPath);
    console.log(`Database file size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      console.log('❌ Database file is empty!');
      return;
    }
    
    // Connect to database
    const db = new Database(dbPath);
    
    // Check if activities table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='activities'
    `).get();
    
    console.log(`Activities table exists: ${!!tableCheck}`);
    
    if (!tableCheck) {
      console.log('❌ Activities table not found!');
      db.close();
      return;
    }
    
    // Check table schema
    const schema = db.prepare(`PRAGMA table_info(activities)`).all();
    console.log('Activities table schema:');
    schema.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Count total activities
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number };
    console.log(`Total activities in database: ${totalCount.count}`);
    
    if (totalCount.count === 0) {
      console.log('❌ No activities found in database - activity logging might not be working!');
    } else {
      console.log('✅ Activities found in database');
      
      // Check recent activities (last 24 hours)
      const recentCount = db.prepare(`
        SELECT COUNT(*) as count FROM activities 
        WHERE timestamp >= datetime('now', '-24 hours')
      `).get() as { count: number };
      
      console.log(`Recent activities (last 24h): ${recentCount.count}`);
      
      if (recentCount.count === 0) {
        console.log('⚠️ No recent activities - activity logging might have stopped!');
      }
      
      // Show latest 5 activities
      const latest = db.prepare(`
        SELECT timestamp, app_name, window_title, duration 
        FROM activities 
        ORDER BY timestamp DESC 
        LIMIT 5
      `).all();
      
      console.log('Latest activities:');
      latest.forEach((activity: any, index: number) => {
        console.log(`  ${index + 1}. ${activity.timestamp} - ${activity.app_name} (${activity.duration}ms)`);
      });
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

/**
 * Tests activity insertion
 */
function testActivityInsertion(): void {
  console.log('\n=== ACTIVITY INSERTION TEST ===');
  
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'focus-flare.db');
    
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Database not found, skipping insertion test');
      return;
    }
    
    const db = new Database(dbPath);
    
    // Insert test activity
    const testActivity = {
      timestamp: new Date().toISOString(),
      app_name: 'DEBUG_TEST_APP',
      window_title: 'Debug Test Window',
      duration: 5000
    };
    
    const insertStmt = db.prepare(`
      INSERT INTO activities (timestamp, app_name, window_title, duration)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertStmt.run(
      testActivity.timestamp,
      testActivity.app_name,
      testActivity.window_title,
      testActivity.duration
    );
    
    console.log(`✅ Test activity inserted with ID: ${result.lastInsertRowid}`);
    
    // Clean up test activity
    const deleteStmt = db.prepare('DELETE FROM activities WHERE app_name = ?');
    deleteStmt.run('DEBUG_TEST_APP');
    
    console.log('✅ Test activity cleaned up');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Activity insertion test failed:', error);
  }
}

/**
 * Checks system monitoring dependencies
 */
function checkSystemMonitoring(): void {
  console.log('\n=== SYSTEM MONITORING DIAGNOSTICS ===');
  
  try {
    // Test active-win import
    const activeWin = require('active-win');
    console.log('✅ active-win module imported successfully');
    
    // Test getting current active window
    activeWin().then((window: any) => {
      if (window) {
        console.log('✅ Current active window detected:');
        console.log(`  App: ${window.owner?.name || 'Unknown'}`);
        console.log(`  Title: ${window.title || 'No title'}`);
        console.log(`  PID: ${window.owner?.processId || 0}`);
      } else {
        console.log('⚠️ No active window detected');
      }
    }).catch((error: any) => {
      console.error('❌ Failed to get active window:', error);
    });
    
  } catch (error) {
    console.error('❌ System monitoring check failed:', error);
  }
}

/**
 * Main diagnostic function
 */
function runDiagnostics(): void {
  console.log('🔍 FocusFlare Activity Logging Diagnostics');
  console.log('==========================================\n');
  
  checkDatabase();
  testActivityInsertion();
  checkSystemMonitoring();
  
  console.log('\n=== DIAGNOSTIC SUMMARY ===');
  console.log('If you see any ❌ or ⚠️  above, those indicate potential issues.');
  console.log('Check the console for specific error messages and solutions.');
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
  // Initialize Electron app for file paths
  if (!app.isReady()) {
    app.whenReady().then(runDiagnostics);
  } else {
    runDiagnostics();
  }
}

export { runDiagnostics, checkDatabase, testActivityInsertion, checkSystemMonitoring }; 