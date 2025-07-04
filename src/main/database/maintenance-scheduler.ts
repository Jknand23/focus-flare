/**
 * Maintenance Scheduler - Background cleanup and maintenance operations
 * 
 * Provides scheduled maintenance operations for FocusFlare database including
 * automatic data archiving, performance optimization, cleanup routines, and
 * health monitoring. Runs background tasks to maintain optimal performance
 * and prevent database bloat.
 * 
 * @module MaintenanceScheduler
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type Database from 'better-sqlite3';
import { DatabasePerformanceOptimizer } from './performance-optimizer';
import { DataArchiver } from './data-archiver';
import { getUserSettings } from './connection';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === MAINTENANCE CONFIGURATION ===

/**
 * Maintenance scheduler configuration
 */
export interface MaintenanceConfig {
  /** Enable automatic maintenance */
  enableAutoMaintenance: boolean;
  /** Interval between maintenance runs (minutes) */
  maintenanceInterval: number;
  /** Hour of day to run daily maintenance (0-23) */
  dailyMaintenanceHour: number;
  /** Day of week to run weekly maintenance (0-6, Sunday=0) */
  weeklyMaintenanceDay: number;
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Enable automatic archiving */
  enableAutoArchiving: boolean;
  /** Maximum database size before forced archiving (MB) */
  maxDatabaseSize: number;
  /** Enable maintenance logging */
  enableLogging: boolean;
}

/**
 * Default maintenance configuration
 */
const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  enableAutoMaintenance: true,
  maintenanceInterval: 60, // 1 hour
  dailyMaintenanceHour: 3, // 3 AM
  weeklyMaintenanceDay: 0, // Sunday
  enablePerformanceMonitoring: true,
  enableAutoArchiving: true,
  maxDatabaseSize: 500, // 500MB
  enableLogging: DEBUG_LOGGING
};

/**
 * Maintenance task types
 */
export type MaintenanceTaskType = 
  | 'database_optimization'
  | 'data_archiving'
  | 'performance_analysis'
  | 'cleanup_temp_data'
  | 'health_check'
  | 'statistics_update'
  | 'backup_verification';

/**
 * Maintenance task result
 */
export interface MaintenanceTaskResult {
  /** Task type */
  type: MaintenanceTaskType;
  /** Task success status */
  success: boolean;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Task details */
  details: string;
  /** Error message if failed */
  error?: string;
  /** Timestamp of execution */
  timestamp: Date;
}

/**
 * Maintenance session summary
 */
export interface MaintenanceSession {
  /** Session ID */
  id: string;
  /** Session start time */
  startTime: Date;
  /** Session end time */
  endTime: Date;
  /** Total execution time */
  totalExecutionTime: number;
  /** Tasks executed */
  tasks: MaintenanceTaskResult[];
  /** Overall success status */
  success: boolean;
  /** Database size before maintenance */
  databaseSizeBefore: number;
  /** Database size after maintenance */
  databaseSizeAfter: number;
  /** Space saved (bytes) */
  spaceSaved: number;
}

/**
 * Maintenance statistics
 */
export interface MaintenanceStats {
  /** Total maintenance sessions */
  totalSessions: number;
  /** Total tasks executed */
  totalTasks: number;
  /** Successful tasks */
  successfulTasks: number;
  /** Failed tasks */
  failedTasks: number;
  /** Total space saved (bytes) */
  totalSpaceSaved: number;
  /** Average session duration (ms) */
  averageSessionDuration: number;
  /** Last maintenance session */
  lastMaintenanceSession: Date | null;
  /** Next scheduled maintenance */
  nextScheduledMaintenance: Date | null;
}

// === MAINTENANCE SCHEDULER CLASS ===

/**
 * Background maintenance scheduler
 */
export class MaintenanceScheduler {
  private database: Database.Database;
  private config: MaintenanceConfig;
  private optimizer: DatabasePerformanceOptimizer;
  private archiver: DataArchiver;
  private stats: MaintenanceStats;
  private isRunning: boolean = false;
  private maintenanceTimer: NodeJS.Timeout | null = null;
  private dailyMaintenanceTimer: NodeJS.Timeout | null = null;
  private weeklyMaintenanceTimer: NodeJS.Timeout | null = null;

  constructor(
    database: Database.Database,
    optimizer: DatabasePerformanceOptimizer,
    archiver: DataArchiver,
    config: Partial<MaintenanceConfig> = {}
  ) {
    this.database = database;
    this.config = { ...DEFAULT_MAINTENANCE_CONFIG, ...config };
    this.optimizer = optimizer;
    this.archiver = archiver;
    this.stats = this.initializeStats();
  }

  /**
   * Initialize maintenance statistics
   */
  private initializeStats(): MaintenanceStats {
    return {
      totalSessions: 0,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      totalSpaceSaved: 0,
      averageSessionDuration: 0,
      lastMaintenanceSession: null,
      nextScheduledMaintenance: null
    };
  }

  /**
   * Start the maintenance scheduler
   */
  public start(): void {
    if (this.isRunning) {
      this.log('Maintenance scheduler is already running');
      return;
    }

    this.log('Starting maintenance scheduler...');
    this.isRunning = true;

    if (this.config.enableAutoMaintenance) {
      this.scheduleMaintenanceTasks();
    }

    this.log('Maintenance scheduler started successfully');
  }

  /**
   * Stop the maintenance scheduler
   */
  public stop(): void {
    if (!this.isRunning) {
      this.log('Maintenance scheduler is not running');
      return;
    }

    this.log('Stopping maintenance scheduler...');
    this.isRunning = false;

    // Clear all timers
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }

    if (this.dailyMaintenanceTimer) {
      clearTimeout(this.dailyMaintenanceTimer);
      this.dailyMaintenanceTimer = null;
    }

    if (this.weeklyMaintenanceTimer) {
      clearTimeout(this.weeklyMaintenanceTimer);
      this.weeklyMaintenanceTimer = null;
    }

    this.log('Maintenance scheduler stopped successfully');
  }

  /**
   * Schedule maintenance tasks
   */
  private scheduleMaintenanceTasks(): void {
    // Schedule regular maintenance checks
    this.maintenanceTimer = setInterval(() => {
      this.performMaintenanceCheck();
    }, this.config.maintenanceInterval * 60 * 1000); // Convert minutes to milliseconds

    // Schedule daily maintenance
    this.scheduleDailyMaintenance();

    // Schedule weekly maintenance
    this.scheduleWeeklyMaintenance();

    this.log(`Scheduled maintenance tasks: regular (${this.config.maintenanceInterval}min), daily (${this.config.dailyMaintenanceHour}:00), weekly (day ${this.config.weeklyMaintenanceDay})`);
  }

  /**
   * Schedule daily maintenance at specified hour
   */
  private scheduleDailyMaintenance(): void {
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(this.config.dailyMaintenanceHour, 0, 0, 0);

    // If scheduled time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilMaintenance = scheduledTime.getTime() - now.getTime();

    this.dailyMaintenanceTimer = setTimeout(() => {
      this.performDailyMaintenance();
      // Schedule next daily maintenance
      this.scheduleDailyMaintenance();
    }, timeUntilMaintenance);

    this.stats.nextScheduledMaintenance = scheduledTime;
  }

  /**
   * Schedule weekly maintenance on specified day
   */
  private scheduleWeeklyMaintenance(): void {
    const now = new Date();
    const scheduledTime = new Date(now);
    const currentDay = now.getDay();
    const targetDay = this.config.weeklyMaintenanceDay;

    // Calculate days until target day
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    if (daysUntilTarget === 0 && now.getHours() >= this.config.dailyMaintenanceHour) {
      // If it's the target day but past the maintenance hour, schedule for next week
      scheduledTime.setDate(scheduledTime.getDate() + 7);
    } else {
      scheduledTime.setDate(scheduledTime.getDate() + daysUntilTarget);
    }

    scheduledTime.setHours(this.config.dailyMaintenanceHour, 0, 0, 0);

    const timeUntilMaintenance = scheduledTime.getTime() - now.getTime();

    this.weeklyMaintenanceTimer = setTimeout(() => {
      this.performWeeklyMaintenance();
      // Schedule next weekly maintenance
      this.scheduleWeeklyMaintenance();
    }, timeUntilMaintenance);
  }

  /**
   * Perform maintenance check
   */
  private async performMaintenanceCheck(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Check database size
      const databaseSize = await this.getDatabaseSize();
      if (databaseSize > this.config.maxDatabaseSize * 1024 * 1024) {
        this.log(`Database size (${Math.round(databaseSize / 1024 / 1024)}MB) exceeds limit, triggering archiving`);
        await this.performDataArchiving();
      }

      // Check performance metrics
      if (this.config.enablePerformanceMonitoring) {
        const stats = this.optimizer.getPerformanceStats();
        if (stats.averageQueryTime > 100) {
          this.log(`Average query time (${stats.averageQueryTime}ms) is high, triggering optimization`);
          await this.performDatabaseOptimization();
        }
      }

    } catch (error) {
      console.error('Maintenance check failed:', error);
    }
  }

  /**
   * Perform daily maintenance tasks
   */
  private async performDailyMaintenance(): Promise<void> {
    this.log('Starting daily maintenance...');
    
    const session = await this.runMaintenanceSession([
      'health_check',
      'cleanup_temp_data',
      'statistics_update',
      'performance_analysis'
    ]);

    this.log(`Daily maintenance completed in ${session.totalExecutionTime}ms`);
  }

  /**
   * Perform weekly maintenance tasks
   */
  private async performWeeklyMaintenance(): Promise<void> {
    this.log('Starting weekly maintenance...');
    
    const session = await this.runMaintenanceSession([
      'database_optimization',
      'data_archiving',
      'cleanup_temp_data',
      'performance_analysis',
      'backup_verification'
    ]);

    this.log(`Weekly maintenance completed in ${session.totalExecutionTime}ms`);
  }

  /**
   * Run a maintenance session with specified tasks
   */
  private async runMaintenanceSession(tasks: MaintenanceTaskType[]): Promise<MaintenanceSession> {
    const sessionId = `maintenance-${Date.now()}`;
    const startTime = new Date();
    const databaseSizeBefore = await this.getDatabaseSize();

    this.log(`Starting maintenance session: ${sessionId}`);

    const taskResults: MaintenanceTaskResult[] = [];
    let overallSuccess = true;

    for (const taskType of tasks) {
      try {
        const result = await this.executeMaintenanceTask(taskType);
        taskResults.push(result);
        
        if (!result.success) {
          overallSuccess = false;
        }
      } catch (error) {
        const errorResult: MaintenanceTaskResult = {
          type: taskType,
          success: false,
          executionTime: 0,
          details: `Task failed: ${error}`,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        };
        taskResults.push(errorResult);
        overallSuccess = false;
      }
    }

    const endTime = new Date();
    const totalExecutionTime = endTime.getTime() - startTime.getTime();
    const databaseSizeAfter = await this.getDatabaseSize();
    const spaceSaved = databaseSizeBefore - databaseSizeAfter;

    const session: MaintenanceSession = {
      id: sessionId,
      startTime,
      endTime,
      totalExecutionTime,
      tasks: taskResults,
      success: overallSuccess,
      databaseSizeBefore,
      databaseSizeAfter,
      spaceSaved
    };

    this.updateStats(session);
    return session;
  }

  /**
   * Execute a specific maintenance task
   */
  private async executeMaintenanceTask(taskType: MaintenanceTaskType): Promise<MaintenanceTaskResult> {
    const startTime = Date.now();
    let details = '';
    let success = true;
    let error: string | undefined;

    try {
      switch (taskType) {
        case 'database_optimization':
          await this.performDatabaseOptimization();
          details = 'Database optimization completed';
          break;

        case 'data_archiving': {
          const archives = await this.performDataArchiving();
          details = `Archived ${archives.length} datasets`;
          break;
        }

        case 'performance_analysis': {
          const stats = this.optimizer.getPerformanceStats();
          details = `Analyzed ${stats.totalQueries} queries, avg time: ${stats.averageQueryTime}ms`;
          break;
        }

        case 'cleanup_temp_data':
          await this.performTempDataCleanup();
          details = 'Temporary data cleanup completed';
          break;

        case 'health_check': {
          const healthStatus = await this.performHealthCheck();
          details = `Health check completed: ${healthStatus}`;
          break;
        }

        case 'statistics_update':
          await this.performStatisticsUpdate();
          details = 'Database statistics updated';
          break;

        case 'backup_verification':
          await this.performBackupVerification();
          details = 'Backup verification completed';
          break;

        default:
          throw new Error(`Unknown maintenance task: ${taskType}`);
      }
    } catch (taskError) {
      success = false;
      error = taskError instanceof Error ? taskError.message : String(taskError);
      details = `Task failed: ${error}`;
    }

    const executionTime = Date.now() - startTime;

    return {
      type: taskType,
      success,
      executionTime,
      details,
      error,
      timestamp: new Date()
    };
  }

  /**
   * Perform database optimization
   */
  private async performDatabaseOptimization(): Promise<void> {
    await this.optimizer.optimize();
    await this.optimizer.runMaintenance();
  }

  /**
   * Perform data archiving
   */
  private async performDataArchiving(): Promise<any[]> {
    const userSettings = await getUserSettings();
    const retentionDays = userSettings.dataRetentionDays || 180;
    return await this.archiver.archiveOldData(retentionDays);
  }

  /**
   * Perform temporary data cleanup
   */
  private async performTempDataCleanup(): Promise<void> {
    // Clean up old app activity states
    const oldStatesCutoff = new Date();
    oldStatesCutoff.setHours(oldStatesCutoff.getHours() - 24); // Keep only last 24 hours

    const cleanupResult = this.database.prepare(`
      DELETE FROM app_activity_states 
      WHERE updated_at < ?
    `).run(oldStatesCutoff.toISOString());

    this.log(`Cleaned up ${cleanupResult.changes} old app activity states`);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<string> {
    try {
      // Check database integrity
      const integrityResult = this.database.prepare('PRAGMA integrity_check').get() as any;
      
      if (integrityResult.integrity_check !== 'ok') {
        return 'Database integrity issues detected';
      }

      // Check for orphaned records
      const orphanedSessions = this.database.prepare(`
        SELECT COUNT(*) as count 
        FROM sessions s 
        LEFT JOIN activities a ON s.id = a.session_id 
        WHERE a.session_id IS NULL
      `).get() as any;

      if (orphanedSessions.count > 0) {
        return `Found ${orphanedSessions.count} orphaned sessions`;
      }

      return 'All checks passed';
    } catch (error) {
      return `Health check failed: ${error}`;
    }
  }

  /**
   * Perform statistics update
   */
  private async performStatisticsUpdate(): Promise<void> {
    this.database.exec('ANALYZE');
  }

  /**
   * Perform backup verification
   */
  private async performBackupVerification(): Promise<void> {
    // Verify recent archives are readable
    const archives = this.archiver.listAvailableArchives();
    const recentArchives = archives.slice(0, 5); // Check last 5 archives
    
    for (const archive of recentArchives) {
      try {
        const fs = await import('fs');
        const stats = fs.statSync(archive.filePath);
        if (stats.size === 0) {
          throw new Error(`Archive file is empty: ${archive.filePath}`);
        }
      } catch (error) {
        throw new Error(`Archive verification failed: ${archive.filePath}`);
      }
    }
  }

  /**
   * Get current database size
   */
  private async getDatabaseSize(): Promise<number> {
    const result = this.database.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as any;
    return result ? result.size : 0;
  }

  /**
   * Update maintenance statistics
   */
  private updateStats(session: MaintenanceSession): void {
    this.stats.totalSessions++;
    this.stats.totalTasks += session.tasks.length;
    this.stats.successfulTasks += session.tasks.filter(t => t.success).length;
    this.stats.failedTasks += session.tasks.filter(t => !t.success).length;
    this.stats.totalSpaceSaved += session.spaceSaved;
    this.stats.lastMaintenanceSession = session.endTime;
    
    // Calculate average session duration
    this.stats.averageSessionDuration = 
      (this.stats.averageSessionDuration * (this.stats.totalSessions - 1) + session.totalExecutionTime) / this.stats.totalSessions;
  }

  /**
   * Get maintenance statistics
   */
  public getMaintenanceStats(): MaintenanceStats {
    return { ...this.stats };
  }

  /**
   * Force immediate maintenance run
   */
  public async forceMaintenanceRun(tasks?: MaintenanceTaskType[]): Promise<MaintenanceSession> {
    const defaultTasks: MaintenanceTaskType[] = [
      'health_check',
      'database_optimization',
      'data_archiving',
      'cleanup_temp_data',
      'performance_analysis'
    ];

    const tasksToRun = tasks || defaultTasks;
    return await this.runMaintenanceSession(tasksToRun);
  }

  /**
   * Log maintenance message
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[MaintenanceScheduler] ${message}`);
    }
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Create maintenance scheduler instance
 */
export function createMaintenanceScheduler(
  database: Database.Database,
  optimizer: DatabasePerformanceOptimizer,
  archiver: DataArchiver,
  config?: Partial<MaintenanceConfig>
): MaintenanceScheduler {
  return new MaintenanceScheduler(database, optimizer, archiver, config);
}

/**
 * Get optimal maintenance schedule based on usage patterns
 */
export function getOptimalMaintenanceSchedule(dailyActivityCount: number): Partial<MaintenanceConfig> {
  if (dailyActivityCount > 10000) {
    // High-usage users need more frequent maintenance
    return {
      maintenanceInterval: 30, // 30 minutes
      maxDatabaseSize: 200 // 200MB
    };
  } else if (dailyActivityCount > 5000) {
    // Medium-usage users
    return {
      maintenanceInterval: 60, // 1 hour
      maxDatabaseSize: 350 // 350MB
    };
  } else {
    // Low-usage users
    return {
      maintenanceInterval: 120, // 2 hours
      maxDatabaseSize: 500 // 500MB
    };
  }
}

// === EXPORTS ===

export {
  DEFAULT_MAINTENANCE_CONFIG
}; 