/**
 * Check Sessions - Diagnostic script for sessions table
 * 
 * Simple script to check if sessions are being created in the database.
 * Helps debug why the dashboard shows no sessions.
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

function checkSessions() {
  try {
    // Get the database path
    const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'focusflare');
    const dbPath = path.join(appDataPath, 'focusflare.db');
    
    console.log('🔍 FocusFlare Sessions Check');
    console.log('=============================');
    console.log(`Database path: ${dbPath}`);
    
    // Check if database exists
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Database file not found');
      return;
    }
    
    const db = new Database(dbPath);
    
    // Check sessions table
    console.log('\n📋 Sessions table info:');
    const sessionsInfo = db.pragma('table_info(sessions)');
    sessionsInfo.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? 'PK' : ''}`);
    });
    
    // Count sessions
    const sessionsCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    console.log(`\n📊 Total sessions: ${sessionsCount.count}`);
    
    if (sessionsCount.count > 0) {
      // Show latest sessions
      console.log('\n🕒 Latest 10 sessions:');
      const latestSessions = db.prepare(`
        SELECT 
          id, session_type, start_time, end_time, duration,
          confidence_score, created_at, user_corrected
        FROM sessions 
        ORDER BY start_time DESC 
        LIMIT 10
      `).all();
      
      latestSessions.forEach(session => {
        const startTime = new Date(session.start_time).toLocaleString();
        const endTime = new Date(session.end_time).toLocaleString();
        const durationMins = Math.round(session.duration / (1000 * 60));
        console.log(`  ${session.id}: ${session.session_type} (${durationMins}m) ${startTime} - ${endTime} [${Math.round(session.confidence_score * 100)}%]`);
      });
      
      // Check sessions for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const todaysSessions = db.prepare(`
        SELECT COUNT(*) as count 
        FROM sessions 
        WHERE start_time >= ? AND start_time <= ?
      `).get(today.toISOString(), endOfDay.toISOString());
      
      console.log(`\n📅 Sessions for today: ${todaysSessions.count}`);
    } else {
      console.log('\n❌ No sessions found in database');
      
      // Check if there are activities that could be classified
      const activitiesCount = db.prepare('SELECT COUNT(*) as count FROM activities').get();
      console.log(`\n📊 Total activities: ${activitiesCount.count}`);
      
      if (activitiesCount.count > 0) {
        console.log('\n💡 There are activities but no sessions. This suggests:');
        console.log('   1. Session classification hasn\'t been run');
        console.log('   2. Session classification failed');
        console.log('   3. AI classification is not working');
        
        // Show latest activities
        console.log('\n🕒 Latest 5 activities:');
        const latestActivities = db.prepare(`
          SELECT id, app_name, window_title, duration, timestamp
          FROM activities 
          ORDER BY timestamp DESC 
          LIMIT 5
        `).all();
        
        latestActivities.forEach(activity => {
          const time = new Date(activity.timestamp).toLocaleString();
          const durationMins = Math.round(activity.duration / (1000 * 60));
          console.log(`  ${activity.id}: ${activity.app_name} (${durationMins}m) ${time}`);
        });
      }
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error checking sessions:', error);
  }
}

// Run the check
checkSessions(); 