/**
 * Data Archiver - Efficient data archiving and compression system
 * 
 * Manages data archiving for FocusFlare to handle large datasets efficiently.
 * Compresses old records, creates archive files, and maintains performance
 * while preserving data integrity. Supports configurable retention policies
 * and automatic cleanup routines.
 * 
 * @module DataArchiver
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';
import type { UserSettings } from '@/shared/types/activity-types';

// === ARCHIVING CONFIGURATION ===

/**
 * Data archiving configuration
 */
export interface ArchivingConfig {
  /** Directory to store archive files */
  archiveDirectory: string;
  /** Maximum age of data before archiving (in days) */
  maxAge: number;
  /** Compression level (1-9, higher = better compression) */
  compressionLevel: number;
  /** Batch size for archiving operations */
  batchSize: number;
  /** Enable archiving logs */
  enableLogging: boolean;
  /** Archive file name format */
  archiveFileFormat: string;
  /** Maximum archive file size in MB */
  maxArchiveSize: number;
}

/**
 * Default archiving configuration
 */
const DEFAULT_ARCHIVING_CONFIG: ArchivingConfig = {
  archiveDirectory: 'archives',
  maxAge: 180, // 6 months
  compressionLevel: 6,
  batchSize: 1000,
  enableLogging: DEBUG_LOGGING,
  archiveFileFormat: 'focusflare-archive-{date}.json.gz',
  maxArchiveSize: 50 // 50MB per archive file
};

/**
 * Archive metadata
 */
export interface ArchiveMetadata {
  /** Archive file path */
  filePath: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Date range archived */
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  /** Number of records archived */
  recordCount: number;
  /** Original data size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Archive type */
  type: 'activities' | 'sessions' | 'mixed';
}

/**
 * Archiving statistics
 */
export interface ArchivingStats {
  /** Total archives created */
  totalArchives: number;
  /** Total records archived */
  totalRecordsArchived: number;
  /** Total space saved (bytes) */
  totalSpaceSaved: number;
  /** Average compression ratio */
  averageCompressionRatio: number;
  /** Last archiving operation */
  lastArchiving: Date | null;
  /** Current database size */
  currentDatabaseSize: number;
  /** Available archives */
  availableArchives: ArchiveMetadata[];
}

// === DATA ARCHIVER CLASS ===

/**
 * Data archiver for managing database growth
 */
export class DataArchiver {
  private database: Database.Database;
  private config: ArchivingConfig;
  private archiveStats: ArchivingStats;
  private archiveDirectory: string;

  constructor(database: Database.Database, config: Partial<ArchivingConfig> = {}) {
    this.database = database;
    this.config = { ...DEFAULT_ARCHIVING_CONFIG, ...config };
    this.archiveDirectory = path.join(app.getPath('userData'), this.config.archiveDirectory);
    this.archiveStats = this.initializeStats();
    this.ensureArchiveDirectory();
  }

  /**
   * Initialize archiving statistics
   */
  private initializeStats(): ArchivingStats {
    return {
      totalArchives: 0,
      totalRecordsArchived: 0,
      totalSpaceSaved: 0,
      averageCompressionRatio: 0,
      lastArchiving: null,
      currentDatabaseSize: 0,
      availableArchives: []
    };
  }

  /**
   * Ensure archive directory exists
   */
  private ensureArchiveDirectory(): void {
    if (!fs.existsSync(this.archiveDirectory)) {
      fs.mkdirSync(this.archiveDirectory, { recursive: true });
      this.log(`Created archive directory: ${this.archiveDirectory}`);
    }
  }

  /**
   * Archive old data based on retention policy
   */
  public async archiveOldData(retentionDays?: number): Promise<ArchiveMetadata[]> {
    const maxAge = retentionDays || this.config.maxAge;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    this.log(`Starting data archiving for records older than ${cutoffDate.toISOString()}`);

    const archiveResults: ArchiveMetadata[] = [];

    try {
      // Archive activities
      const activitiesArchive = await this.archiveActivities(cutoffDate);
      if (activitiesArchive) {
        archiveResults.push(activitiesArchive);
      }

      // Archive sessions
      const sessionsArchive = await this.archiveSessions(cutoffDate);
      if (sessionsArchive) {
        archiveResults.push(sessionsArchive);
      }

      // Archive system resource usage
      const resourcesArchive = await this.archiveResourceUsage(cutoffDate);
      if (resourcesArchive) {
        archiveResults.push(resourcesArchive);
      }

      // Archive user interaction events
      const interactionsArchive = await this.archiveUserInteractions(cutoffDate);
      if (interactionsArchive) {
        archiveResults.push(interactionsArchive);
      }

      // Update statistics
      this.updateArchiveStats(archiveResults);

      this.log(`Archiving completed. Created ${archiveResults.length} archive files.`);
      return archiveResults;

    } catch (error) {
      console.error('Data archiving failed:', error);
      throw error;
    }
  }

  /**
   * Archive activities older than cutoff date
   */
  private async archiveActivities(cutoffDate: Date): Promise<ArchiveMetadata | null> {
    const activities = this.database.prepare(`
      SELECT * FROM activities 
      WHERE timestamp < ? 
      ORDER BY timestamp
    `).all(cutoffDate.toISOString()) as Array<{ timestamp: string; [key: string]: any }>;

    if (activities.length === 0) {
      this.log('No activities to archive');
      return null;
    }

    const archiveData = {
      type: 'activities' as const,
      dateRange: {
        startDate: new Date(activities[0].timestamp),
        endDate: new Date(activities[activities.length - 1].timestamp)
      },
      records: activities,
      metadata: {
        totalRecords: activities.length,
        archivedAt: new Date(),
        retentionPolicy: this.config.maxAge
      }
    };

    const archiveFile = this.generateArchiveFileName('activities', archiveData.dateRange.startDate);
    const archiveMetadata = await this.compressAndSaveArchive(archiveFile, archiveData);

    // Delete archived activities from database
    const deleteResult = this.database.prepare(`
      DELETE FROM activities WHERE timestamp < ?
    `).run(cutoffDate.toISOString());

    this.log(`Archived ${activities.length} activities, deleted ${deleteResult.changes} records`);

    return archiveMetadata;
  }

  /**
   * Archive sessions older than cutoff date
   */
  private async archiveSessions(cutoffDate: Date): Promise<ArchiveMetadata | null> {
    const sessions = this.database.prepare(`
      SELECT * FROM sessions 
      WHERE start_time < ? 
      ORDER BY start_time
    `).all(cutoffDate.toISOString()) as Array<{ start_time: string; [key: string]: any }>;

    if (sessions.length === 0) {
      this.log('No sessions to archive');
      return null;
    }

    const archiveData = {
      type: 'sessions' as const,
      dateRange: {
        startDate: new Date(sessions[0].start_time),
        endDate: new Date(sessions[sessions.length - 1].start_time)
      },
      records: sessions,
      metadata: {
        totalRecords: sessions.length,
        archivedAt: new Date(),
        retentionPolicy: this.config.maxAge
      }
    };

    const archiveFile = this.generateArchiveFileName('sessions', archiveData.dateRange.startDate);
    const archiveMetadata = await this.compressAndSaveArchive(archiveFile, archiveData);

    // Delete archived sessions from database
    const deleteResult = this.database.prepare(`
      DELETE FROM sessions WHERE start_time < ?
    `).run(cutoffDate.toISOString());

    this.log(`Archived ${sessions.length} sessions, deleted ${deleteResult.changes} records`);

    return archiveMetadata;
  }

  /**
   * Archive system resource usage data
   */
  private async archiveResourceUsage(cutoffDate: Date): Promise<ArchiveMetadata | null> {
    const resources = this.database.prepare(`
      SELECT * FROM system_resource_usage 
      WHERE timestamp < ? 
      ORDER BY timestamp
    `).all(cutoffDate.toISOString()) as Array<{ timestamp: string; [key: string]: any }>;

    if (resources.length === 0) {
      this.log('No resource usage data to archive');
      return null;
    }

    const archiveData = {
      type: 'system_resources' as const,
      dateRange: {
        startDate: new Date(resources[0].timestamp),
        endDate: new Date(resources[resources.length - 1].timestamp)
      },
      records: resources,
      metadata: {
        totalRecords: resources.length,
        archivedAt: new Date(),
        retentionPolicy: this.config.maxAge
      }
    };

    const archiveFile = this.generateArchiveFileName('resources', archiveData.dateRange.startDate);
    const archiveMetadata = await this.compressAndSaveArchive(archiveFile, archiveData);

    // Delete archived resource usage from database
    const deleteResult = this.database.prepare(`
      DELETE FROM system_resource_usage WHERE timestamp < ?
    `).run(cutoffDate.toISOString());

    this.log(`Archived ${resources.length} resource usage records, deleted ${deleteResult.changes} records`);

    return archiveMetadata;
  }

  /**
   * Archive user interaction events
   */
  private async archiveUserInteractions(cutoffDate: Date): Promise<ArchiveMetadata | null> {
    const interactions = this.database.prepare(`
      SELECT * FROM user_interaction_events 
      WHERE timestamp < ? 
      ORDER BY timestamp
    `).all(cutoffDate.toISOString()) as Array<{ timestamp: string; [key: string]: any }>;

    if (interactions.length === 0) {
      this.log('No user interactions to archive');
      return null;
    }

    const archiveData = {
      type: 'user_interactions' as const,
      dateRange: {
        startDate: new Date(interactions[0].timestamp),
        endDate: new Date(interactions[interactions.length - 1].timestamp)
      },
      records: interactions,
      metadata: {
        totalRecords: interactions.length,
        archivedAt: new Date(),
        retentionPolicy: this.config.maxAge
      }
    };

    const archiveFile = this.generateArchiveFileName('interactions', archiveData.dateRange.startDate);
    const archiveMetadata = await this.compressAndSaveArchive(archiveFile, archiveData);

    // Delete archived interactions from database
    const deleteResult = this.database.prepare(`
      DELETE FROM user_interaction_events WHERE timestamp < ?
    `).run(cutoffDate.toISOString());

    this.log(`Archived ${interactions.length} user interactions, deleted ${deleteResult.changes} records`);

    return archiveMetadata;
  }

  /**
   * Generate archive file name
   */
  private generateArchiveFileName(type: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0];
    const timestamp = Date.now();
    return `focusflare-${type}-${dateStr}-${timestamp}.json.gz`;
  }

  /**
   * Compress and save archive data
   */
  private async compressAndSaveArchive(fileName: string, data: any): Promise<ArchiveMetadata> {
    const filePath = path.join(this.archiveDirectory, fileName);
    const jsonData = JSON.stringify(data, null, 2);
    const originalSize = Buffer.byteLength(jsonData, 'utf8');

    // Create compressed stream
    const inputStream = Readable.from([jsonData]);
    const gzipStream = createGzip({ level: this.config.compressionLevel });
    const outputStream = fs.createWriteStream(filePath);

    // Compress and save
    await pipeline(inputStream, gzipStream, outputStream);

    // Get compressed size
    const stats = fs.statSync(filePath);
    const compressedSize = stats.size;
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    const archiveMetadata: ArchiveMetadata = {
      filePath,
      createdAt: new Date(),
      dateRange: data.dateRange,
      recordCount: data.records.length,
      originalSize,
      compressedSize,
      compressionRatio,
      type: data.type
    };

    this.log(`Created archive: ${fileName}, compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);

    return archiveMetadata;
  }

  /**
   * Update archive statistics
   */
  private updateArchiveStats(archives: ArchiveMetadata[]): void {
    this.archiveStats.totalArchives += archives.length;
    this.archiveStats.totalRecordsArchived += archives.reduce((sum, a) => sum + a.recordCount, 0);
    this.archiveStats.totalSpaceSaved += archives.reduce((sum, a) => sum + (a.originalSize - a.compressedSize), 0);
    this.archiveStats.lastArchiving = new Date();
    this.archiveStats.availableArchives.push(...archives);

    // Calculate average compression ratio
    const totalOriginalSize = archives.reduce((sum, a) => sum + a.originalSize, 0);
    const totalCompressedSize = archives.reduce((sum, a) => sum + a.compressedSize, 0);
    const overallCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;
    
    this.archiveStats.averageCompressionRatio = overallCompressionRatio;
  }

  /**
   * Get current archiving statistics
   */
  public getArchivingStats(): ArchivingStats {
    return { ...this.archiveStats };
  }

  /**
   * List available archives
   */
  public listAvailableArchives(): ArchiveMetadata[] {
    const archiveFiles = fs.readdirSync(this.archiveDirectory)
      .filter(file => file.endsWith('.json.gz'))
      .map(file => path.join(this.archiveDirectory, file));

    const archives: ArchiveMetadata[] = [];

    for (const filePath of archiveFiles) {
      try {
        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);
        
        // Parse file name to extract metadata
        const [, type, dateStr] = fileName.match(/focusflare-(\w+)-(\d{4}-\d{2}-\d{2})-/) || [];
        
        if (type && dateStr) {
          const archive: ArchiveMetadata = {
            filePath,
            createdAt: stats.birthtime,
            dateRange: {
              startDate: new Date(dateStr),
              endDate: new Date(dateStr)
            },
            recordCount: 0, // Would need to decompress to get exact count
            originalSize: 0,
            compressedSize: stats.size,
            compressionRatio: 0,
            type: type as any
          };
          
          archives.push(archive);
        }
      } catch (error) {
        console.warn(`Failed to read archive metadata for ${filePath}:`, error);
      }
    }

    return archives.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cleanup old archive files
   */
  public async cleanupOldArchives(maxArchiveAge: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxArchiveAge);

    const archives = this.listAvailableArchives();
    const oldArchives = archives.filter(archive => archive.createdAt < cutoffDate);

    let deletedCount = 0;

    for (const archive of oldArchives) {
      try {
        fs.unlinkSync(archive.filePath);
        deletedCount++;
        this.log(`Deleted old archive: ${path.basename(archive.filePath)}`);
      } catch (error) {
        console.warn(`Failed to delete archive ${archive.filePath}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * Estimate disk space that would be freed by archiving
   */
  public estimateSpaceSaving(retentionDays: number = this.config.maxAge): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const queries = [
      'SELECT COUNT(*) as count FROM activities WHERE timestamp < ?',
      'SELECT COUNT(*) as count FROM sessions WHERE start_time < ?',
      'SELECT COUNT(*) as count FROM system_resource_usage WHERE timestamp < ?',
      'SELECT COUNT(*) as count FROM user_interaction_events WHERE timestamp < ?'
    ];

    let totalRecords = 0;
    for (const query of queries) {
      const result = this.database.prepare(query).get(cutoffDate.toISOString()) as any;
      totalRecords += result?.count || 0;
    }

    // Estimate space per record (rough approximation)
    const estimatedBytesPerRecord = 200; // Average record size
    const estimatedTotalSize = totalRecords * estimatedBytesPerRecord;
    const estimatedCompressedSize = estimatedTotalSize * 0.3; // Assume 70% compression
    const estimatedSpaceSaved = estimatedTotalSize - estimatedCompressedSize;

    return Promise.resolve(estimatedSpaceSaved);
  }

  /**
   * Log archiving message
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[DataArchiver] ${message}`);
    }
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Get data retention policy from user settings
 */
export function getRetentionPolicy(userSettings: UserSettings): number {
  return userSettings.dataRetentionDays || DEFAULT_ARCHIVING_CONFIG.maxAge;
}

/**
 * Calculate optimal archive frequency based on data volume
 */
export function calculateOptimalArchiveFrequency(dailyRecordCount: number): number {
  // Archive more frequently for high-volume users
  if (dailyRecordCount > 5000) {
    return 30; // Monthly
  } else if (dailyRecordCount > 1000) {
    return 60; // Every 2 months
  } else {
    return 90; // Every 3 months
  }
}

// === EXPORTS ===

export {
  DEFAULT_ARCHIVING_CONFIG
}; 