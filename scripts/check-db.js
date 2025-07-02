/**
 * Database Check Script - Simple script to check database contents
 * 
 * This script directly connects to the database and checks for activities
 * to help diagnose the issue with the refresh/classify buttons.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get the expected database path (same as Electron app.getPath('userData'))
function getDatabasePath() {
  const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'focusflare');
  return path.join(userDataPath, 'focusflare.db');
}

function checkDatabase() {
  console.log('🔍 FocusFlare Database Check');
  console.log('============================\n');
  
  const dbPath = getDatabasePath();
  console.log(`Expected database path: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found!');
    console.log('This means either:');
    console.log('1. The app has never been run');
    console.log('2. The app failed to initialize the database');
    console.log('3. The database is in a different location');
    return;
  }
  
  const stats = fs.statSync(dbPath);
  console.log(`✅ Database file exists (${stats.size} bytes)`);
  
  if (stats.size === 0) {
    console.log('❌ Database file is empty!');
    return;
  }
  
  try {
    const db = new Database(dbPath, { readonly: true });
    
    // Check table structure
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📋 Tables in database:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check activities table
    if (tables.some(t => t.name === 'activities')) {
      const schema = db.prepare("PRAGMA table_info(activities)").all();
      console.log('\n🏗️ Activities table schema:');
      schema.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? 'PK' : ''}`);
      });
      
      // Count activities
      const totalCount = db.prepare('SELECT COUNT(*) as count FROM activities').get();
      console.log(`\n📊 Total activities: ${totalCount.count}`);
      
      if (totalCount.count > 0) {
        // Get latest activities
        const latest = db.prepare(`
          SELECT timestamp, app_name, window_title, duration 
          FROM activities 
          ORDER BY timestamp DESC 
          LIMIT 10
        `).all();
        
        console.log('\n🕒 Latest 10 activities:');
        latest.forEach((activity, index) => {
          const date = new Date(activity.timestamp);
          console.log(`  ${index + 1}. ${date.toLocaleString()} - ${activity.app_name} (${activity.duration}ms)`);
          if (activity.window_title) {
            console.log(`     Title: ${activity.window_title.substring(0, 60)}${activity.window_title.length > 60 ? '...' : ''}`);
          }
        });
        
        // Check recent activities (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentCount = db.prepare('SELECT COUNT(*) as count FROM activities WHERE timestamp >= ?').get(oneHourAgo);
        console.log(`\n⏰ Activities in last hour: ${recentCount.count}`);
        
        if (recentCount.count === 0) {
          console.log('⚠️ No recent activities found. Activity logging might have stopped.');
        }
      } else {
        console.log('❌ No activities found in database!');
      }
    } else {
      console.log('❌ Activities table not found!');
    }
    
    // Check sessions table if it exists
    if (tables.some(t => t.name === 'sessions')) {
      const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
      console.log(`\n🎯 Total sessions: ${sessionCount.count}`);
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

// Run the check
checkDatabase(); 