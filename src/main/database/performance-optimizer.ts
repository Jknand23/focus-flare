/**
 * Database Performance Optimizer - Advanced indexing and query optimization
 * 
 * Provides advanced database performance optimization for FocusFlare including
 * sophisticated indexing strategies, query optimization, performance monitoring,
 * and maintenance routines. Designed to handle large datasets efficiently 
 * with sub-100ms response times for common operations.
 * 
 * @module DatabasePerformanceOptimizer
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type Database from 'better-sqlite3';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === PERFORMANCE CONFIGURATION ===

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  /** Target query response time in milliseconds */
  targetQueryTime: number;
  /** Maximum records to process in single batch */
  maxBatchSize: number;
  /** Cache size in MB */
  cacheSize: number;
  /** Enable performance logging */
  enableLogging: boolean;
  /** Auto-optimize thresholds */
  autoOptimize: {
    /** Minimum records before optimization */
    minRecords: number;
    /** Maximum query time before optimization */
    maxQueryTime: number;
  };
}

/**
 * Default performance configuration
 */
const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  targetQueryTime: 50, // 50ms target
  maxBatchSize: 1000,
  cacheSize: 50, // 50MB cache
  enableLogging: DEBUG_LOGGING,
  autoOptimize: {
    minRecords: 10000,
    maxQueryTime: 100
  }
};

/**
 * Query performance metrics
 */
export interface QueryMetrics {
  /** Query identifier */
  queryId: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Number of rows returned */
  rowsReturned: number;
  /** Query complexity score */
  complexityScore: number;
  /** Whether query used indexes */
  usedIndexes: boolean;
  /** Timestamp of execution */
  timestamp: Date;
}

/**
 * Database performance statistics
 */
export interface DatabasePerformanceStats {
  /** Total number of queries */
  totalQueries: number;
  /** Average query time */
  averageQueryTime: number;
  /** Slowest query time */
  slowestQueryTime: number;
  /** Fastest query time */
  fastestQueryTime: number;
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Total database size in MB */
  databaseSize: number;
  /** Number of indexes */
  indexCount: number;
  /** Last optimization time */
  lastOptimization: Date | null;
}

// === ADVANCED INDEXING STRATEGIES ===

/**
 * Advanced database indexes for optimal performance
 */
const ADVANCED_INDEXES = [
  // Composite indexes for common query patterns
  'CREATE INDEX IF NOT EXISTS idx_activities_timestamp_app ON activities(timestamp, app_name)',
  'CREATE INDEX IF NOT EXISTS idx_activities_timestamp_level ON activities(timestamp, activity_level)',
  'CREATE INDEX IF NOT EXISTS idx_activities_date_range ON activities(DATE(timestamp), timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_activities_app_duration ON activities(app_name, duration)',
  
  // Sessions performance indexes
  'CREATE INDEX IF NOT EXISTS idx_sessions_start_end ON sessions(start_time, end_time)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_type_date ON sessions(session_type, DATE(start_time))',
  'CREATE INDEX IF NOT EXISTS idx_sessions_date_range ON sessions(DATE(start_time), start_time)',
  
  // Enhanced activity tracking indexes
  'CREATE INDEX IF NOT EXISTS idx_activities_interaction_level ON activities(interaction_count, activity_level)',
  'CREATE INDEX IF NOT EXISTS idx_activities_processing_cpu ON activities(is_processing, cpu_usage)',
  
  // System resource usage indexes
  'CREATE INDEX IF NOT EXISTS idx_system_resources_app_time ON system_resource_usage(app_name, timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_system_resources_active ON system_resource_usage(is_active, timestamp)',
  
  // User interaction events indexes
  'CREATE INDEX IF NOT EXISTS idx_user_interactions_type_time ON user_interaction_events(interaction_type, timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_user_interactions_app_time ON user_interaction_events(app_name, timestamp)',
  
  // App activity states indexes
  'CREATE INDEX IF NOT EXISTS idx_app_states_level_time ON app_activity_states(activity_level, updated_at)',
  'CREATE INDEX IF NOT EXISTS idx_app_states_app_updated ON app_activity_states(app_name, updated_at)'
];

/**
 * Partial indexes for specific use cases
 */
const PARTIAL_INDEXES = [
  // Only index active activities
  'CREATE INDEX IF NOT EXISTS idx_activities_active_only ON activities(timestamp, app_name) WHERE activity_level != "idle"',
  
  // Only index user-corrected sessions
  'CREATE INDEX IF NOT EXISTS idx_sessions_user_corrected ON sessions(start_time, session_type) WHERE user_corrected = 1',
  
  // Only index processing activities
  'CREATE INDEX IF NOT EXISTS idx_activities_processing ON activities(timestamp, app_name) WHERE is_processing = 1',
  
  // Only index high-interaction activities
  'CREATE INDEX IF NOT EXISTS idx_activities_high_interaction ON activities(timestamp, interaction_count) WHERE interaction_count > 10'
];

// === PERFORMANCE OPTIMIZER CLASS ===

/**
 * Database performance optimizer
 */
export class DatabasePerformanceOptimizer {
  private database: Database.Database;
  private config: PerformanceConfig;
  private queryMetrics: QueryMetrics[] = [];
  private performanceStats: DatabasePerformanceStats;
  private lastOptimization: Date | null = null;

  constructor(database: Database.Database, config: Partial<PerformanceConfig> = {}) {
    this.database = database;
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.performanceStats = this.initializeStats();
  }

  /**
   * Initialize performance statistics
   */
  private initializeStats(): DatabasePerformanceStats {
    return {
      totalQueries: 0,
      averageQueryTime: 0,
      slowestQueryTime: 0,
      fastestQueryTime: Number.MAX_VALUE,
      cacheHitRatio: 0,
      databaseSize: 0,
      indexCount: 0,
      lastOptimization: null
    };
  }

  /**
   * Apply all performance optimizations
   */
  public async optimize(): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.log('Starting database performance optimization...');
      
      // Configure SQLite for optimal performance
      await this.configureSQLitePerformance();
      
      // Create advanced indexes
      await this.createAdvancedIndexes();
      
      // Analyze and optimize query plans
      await this.analyzeQueryPlans();
      
      // Update statistics
      await this.updateStatistics();
      
      this.lastOptimization = new Date();
      this.performanceStats.lastOptimization = this.lastOptimization;
      
      const duration = Date.now() - startTime;
      this.log(`Database optimization completed in ${duration}ms`);
      
    } catch (error) {
      console.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * Configure SQLite for optimal performance
   */
  private async configureSQLitePerformance(): Promise<void> {
    const pragmaConfigs = [
      // Memory and caching
      `PRAGMA cache_size = ${this.config.cacheSize * 1024 / 4}`, // Convert MB to pages
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 268435456', // 256MB memory-mapped I/O
      
      // Write performance
      'PRAGMA journal_mode = WAL',
      'PRAGMA synchronous = NORMAL',
      'PRAGMA wal_autocheckpoint = 1000',
      
      // Query optimization
      'PRAGMA optimize = 0x10002', // Enable query planner optimizations
      'PRAGMA auto_vacuum = INCREMENTAL',
      
      // Connection handling
      'PRAGMA busy_timeout = 5000'
    ];

    for (const pragma of pragmaConfigs) {
      try {
        this.database.exec(pragma);
      } catch (error) {
        console.warn(`Failed to apply pragma: ${pragma}`, error);
      }
    }
  }

  /**
   * Create advanced indexes for optimal performance
   */
  private async createAdvancedIndexes(): Promise<void> {
    const allIndexes = [...ADVANCED_INDEXES, ...PARTIAL_INDEXES];
    
    for (const indexSQL of allIndexes) {
      try {
        this.database.exec(indexSQL);
      } catch (error) {
        console.warn(`Failed to create index: ${indexSQL}`, error);
      }
    }
    
    this.log(`Created ${allIndexes.length} advanced indexes`);
  }

  /**
   * Analyze and optimize query plans
   */
  private async analyzeQueryPlans(): Promise<void> {
    const commonQueries = [
      'SELECT * FROM activities WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC',
      'SELECT * FROM sessions WHERE DATE(start_time) = ? ORDER BY start_time',
      'SELECT app_name, COUNT(*) as count FROM activities WHERE timestamp >= ? GROUP BY app_name',
      'SELECT session_type, AVG(duration) as avg_duration FROM sessions WHERE start_time >= ? GROUP BY session_type'
    ];

    for (const query of commonQueries) {
      try {
        const plan = this.database.prepare(`EXPLAIN QUERY PLAN ${query}`).all();
        this.log(`Query plan for: ${query.substring(0, 50)}...`);
        
        // Check if query uses indexes
        const usesIndex = plan.some((row: any) => row.detail.includes('USING INDEX'));
        if (!usesIndex) {
          console.warn(`Query may need optimization: ${query}`);
        }
      } catch (error) {
        console.warn(`Failed to analyze query plan: ${query}`, error);
      }
    }
  }

  /**
   * Update performance statistics
   */
  private async updateStatistics(): Promise<void> {
    try {
      // Calculate query metrics
      if (this.queryMetrics.length > 0) {
        const totalTime = this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0);
        this.performanceStats.averageQueryTime = totalTime / this.queryMetrics.length;
        this.performanceStats.slowestQueryTime = Math.max(...this.queryMetrics.map(m => m.executionTime));
        this.performanceStats.fastestQueryTime = Math.min(...this.queryMetrics.map(m => m.executionTime));
      }

      // Get database size
      const dbSize = this.database.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as any;
      this.performanceStats.databaseSize = dbSize ? dbSize.size / (1024 * 1024) : 0;

      // Get index count
      const indexCount = this.database.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type = "index"').get() as any;
      this.performanceStats.indexCount = indexCount ? indexCount.count : 0;

      this.performanceStats.totalQueries = this.queryMetrics.length;
      
    } catch (error) {
      console.warn('Failed to update performance statistics:', error);
    }
  }

  /**
   * Record query performance metrics
   */
  public recordQueryMetrics(queryId: string, executionTime: number, rowsReturned: number): void {
    const metrics: QueryMetrics = {
      queryId,
      executionTime,
      rowsReturned,
      complexityScore: this.calculateComplexityScore(executionTime, rowsReturned),
      usedIndexes: executionTime < this.config.targetQueryTime,
      timestamp: new Date()
    };

    this.queryMetrics.push(metrics);
    
    // Keep only recent metrics (last 1000 queries)
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // Auto-optimize if performance degrades
    if (executionTime > this.config.autoOptimize.maxQueryTime && 
        this.queryMetrics.length > this.config.autoOptimize.minRecords) {
      this.autoOptimize();
    }
  }

  /**
   * Calculate query complexity score
   */
  private calculateComplexityScore(executionTime: number, rowsReturned: number): number {
    const timeScore = Math.min(executionTime / this.config.targetQueryTime, 10);
    const rowsScore = Math.min(rowsReturned / 1000, 10);
    return (timeScore + rowsScore) / 2;
  }

  /**
   * Auto-optimize database when performance degrades
   */
  private autoOptimize(): void {
    const now = Date.now();
    const timeSinceLastOptimization = this.lastOptimization ? now - this.lastOptimization.getTime() : Number.MAX_VALUE;
    
    // Don't auto-optimize more than once per hour
    if (timeSinceLastOptimization < 3600000) {
      return;
    }

    this.log('Auto-optimizing database due to performance degradation...');
    this.optimize().catch(error => {
      console.error('Auto-optimization failed:', error);
    });
  }

  /**
   * Get current performance statistics
   */
  public getPerformanceStats(): DatabasePerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * Get recent query metrics
   */
  public getRecentQueryMetrics(limit: number = 100): QueryMetrics[] {
    return this.queryMetrics.slice(-limit);
  }

  /**
   * Run database maintenance operations
   */
  public async runMaintenance(): Promise<void> {
    try {
      this.log('Running database maintenance operations...');
      
      // Analyze database to update statistics
      this.database.exec('ANALYZE');
      
      // Optimize database
      this.database.exec('PRAGMA optimize');
      
      // Incremental vacuum if needed
      const freelistCount = this.database.prepare('PRAGMA freelist_count').get() as any;
      if (freelistCount && freelistCount.freelist_count > 1000) {
        this.database.exec('PRAGMA incremental_vacuum');
      }
      
      // WAL checkpoint
      this.database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      
      this.log('Database maintenance completed');
      
    } catch (error) {
      console.error('Database maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Log performance message
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[DatabasePerformanceOptimizer] ${message}`);
    }
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Create performance-optimized prepared statement
 */
export function createOptimizedStatement(
  database: Database.Database,
  sql: string,
  optimizer: DatabasePerformanceOptimizer
): Database.Statement {
  const statement = database.prepare(sql);
  
  // Wrap statement execution to record metrics
  const originalAll = statement.all;
  const originalGet = statement.get;
  const originalRun = statement.run;
  
  statement.all = function(...args: any[]) {
    const startTime = Date.now();
    const result = originalAll.apply(this, args);
    const executionTime = Date.now() - startTime;
    
    optimizer.recordQueryMetrics(
      sql.substring(0, 50),
      executionTime,
      Array.isArray(result) ? result.length : 0
    );
    
    return result;
  };
  
  statement.get = function(...args: any[]) {
    const startTime = Date.now();
    const result = originalGet.apply(this, args);
    const executionTime = Date.now() - startTime;
    
    optimizer.recordQueryMetrics(
      sql.substring(0, 50),
      executionTime,
      result ? 1 : 0
    );
    
    return result;
  };
  
  statement.run = function(...args: any[]) {
    const startTime = Date.now();
    const result = originalRun.apply(this, args);
    const executionTime = Date.now() - startTime;
    
    optimizer.recordQueryMetrics(
      sql.substring(0, 50),
      executionTime,
      result.changes || 0
    );
    
    return result;
  };
  
  return statement;
}

/**
 * Get database performance recommendations
 */
export function getPerformanceRecommendations(
  stats: DatabasePerformanceStats,
  metrics: QueryMetrics[]
): string[] {
  const recommendations: string[] = [];
  
  if (stats.averageQueryTime > 100) {
    recommendations.push('Consider adding more indexes for slow queries');
  }
  
  if (stats.databaseSize > 100) {
    recommendations.push('Database size is large, consider implementing data archiving');
  }
  
  if (stats.cacheHitRatio < 0.8) {
    recommendations.push('Consider increasing cache size for better performance');
  }
  
  const slowQueries = metrics.filter(m => m.executionTime > 100);
  if (slowQueries.length > metrics.length * 0.1) {
    recommendations.push('More than 10% of queries are slow, review query patterns');
  }
  
  return recommendations;
}

// === EXPORTS ===

export {
  DEFAULT_PERFORMANCE_CONFIG
}; 