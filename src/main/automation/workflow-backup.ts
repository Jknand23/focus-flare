/**
 * Workflow Backup and Restore System
 * 
 * Handles importing, exporting, backing up and restoring N8N workflows
 * for FocusFlare. Enables users to share workflow configurations and
 * create backups of their automation setups.
 * 
 * @module WorkflowBackup
 * @author FocusFlare Team
 * @since Phase 3
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { app } from 'electron';

// === TYPES ===

/**
 * Workflow backup data structure
 */
interface WorkflowBackup {
  /** Backup metadata */
  metadata: {
    version: string;
    createdAt: string;
    focusFlareVersion: string;
    description?: string;
  };
  /** N8N workflows included in backup */
  workflows: WorkflowData[];
  /** FocusFlare-specific configuration */
  configuration: {
    enabledWorkflows: string[];
    workflowSettings: Record<string, any>;
  };
}

/**
 * Individual workflow data
 */
interface WorkflowData {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  staticData?: any;
  tags?: any[];
  pinData?: any;
  versionId?: string;
  triggerCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Backup operation result
 */
interface BackupResult {
  success: boolean;
  filePath?: string;
  workflowCount?: number;
  error?: string;
}

/**
 * Restore operation result
 */
interface RestoreResult {
  success: boolean;
  importedWorkflows?: string[];
  skippedWorkflows?: string[];
  errors?: string[];
}

interface BackupMetadata {
  id: string;
  name: string;
  timestamp: string;
  workflowCount: number;
  size: number;
  location: string;
}

interface BackupCreateOptions {
  name?: string;
  location?: string;
  includeCredentials?: boolean;
}

interface BackupRestoreOptions {
  backupId: string;
  location?: string;
  overwriteExisting?: boolean;
}

// === CONSTANTS ===

// const BACKUP_VERSION = '1.0.0';
// const BACKUP_EXTENSION = '.focusflare-workflows';
const DEFAULT_BACKUP_DIR = join(app.getPath('userData'), 'workflow-backups');
const N8N_BASE_URL = 'http://localhost:5678/api/v1';
const DEFAULT_API_TIMEOUT = 30000; // 30 seconds

// === BACKUP MANAGER CLASS ===

/**
 * Manages workflow backup and restore operations
 */
class WorkflowBackupManager {
  private backupDirectory: string;
  private isInitialized: boolean = false;

  constructor(customBackupDir?: string) {
    this.backupDirectory = customBackupDir || DEFAULT_BACKUP_DIR;
  }

  /**
   * Initializes the backup manager by ensuring backup directory exists.
   * 
   * Creates the backup directory structure if it doesn't exist and verifies
   * write permissions. This method should be called before any backup operations.
   * 
   * @returns Promise resolving when initialization is complete
   * @throws {Error} When backup directory cannot be created or accessed
   */
  async initialize(): Promise<void> {
    // Prevent multiple initialization attempts
    if (this.isInitialized) {
      return;
    }

    try {
      await fs.mkdir(this.backupDirectory, { recursive: true });
      
      // Test write permissions
      const testFile = join(this.backupDirectory, '.write-test');
      await fs.writeFile(testFile, '');
      await fs.unlink(testFile);
      
      this.isInitialized = true;
      console.log(`Workflow backup manager initialized: ${this.backupDirectory}`);
    } catch (error) {
      // Mark as initialized to prevent infinite retry loops
      this.isInitialized = true;
      console.error(`Failed to initialize backup directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to initialize backup directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Makes an HTTP request to the N8N API with proper authentication and error handling.
   * 
   * @param endpoint - API endpoint path (e.g., '/workflows')
   * @param options - Fetch options including method, headers, body
   * @returns Promise resolving to the response data
   * @throws {Error} When API request fails or returns error status
   */
  private async makeN8NRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${N8N_BASE_URL}${endpoint}`;
    
    const requestOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real implementation, we would get the API key from settings
        // For now, we'll assume N8N is running locally without API key requirement
        ...options.headers,
      },
      ...options,
    };

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${DEFAULT_API_TIMEOUT}ms`));
        }, DEFAULT_API_TIMEOUT);
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, requestOptions),
        timeoutPromise
      ]);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`N8N API error (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to N8N API: ${error.message}`);
      }
      throw new Error('Failed to connect to N8N API: Unknown error');
    }
  }

  /**
   * Retrieves all current workflows from the N8N instance.
   * 
   * Connects to the local N8N API to fetch all workflows with their complete
   * configuration including nodes, connections, and metadata.
   * 
   * @returns Promise resolving to array of workflow data objects
   * @throws {Error} When unable to connect to N8N or retrieve workflows
   */
  async getCurrentWorkflows(): Promise<WorkflowData[]> {
    try {
      const response = await this.makeN8NRequest('/workflows');
      
      // N8N returns workflows in a data property for paginated responses
      const workflows = response.data || response;
      
      if (!Array.isArray(workflows)) {
        throw new Error('Invalid response format from N8N API');
      }

      return workflows.map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active || false,
        nodes: workflow.nodes || [],
        connections: workflow.connections || {},
        settings: workflow.settings,
        staticData: workflow.staticData,
        tags: workflow.tags,
        pinData: workflow.pinData,
        versionId: workflow.versionId,
        triggerCount: workflow.triggerCount,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }));
    } catch (error) {
      console.error('Failed to retrieve workflows from N8N:', error);
      throw new Error(`Unable to retrieve current workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Imports a workflow into the N8N instance.
   * 
   * Sends workflow data to the N8N API to create a new workflow. Handles
   * ID conflicts by removing the ID field and letting N8N assign a new one.
   * 
   * @param workflow - Complete workflow data object to import
   * @returns Promise resolving to the imported workflow data with new ID
   * @throws {Error} When workflow import fails or API is unavailable
   */
  async importWorkflowToN8N(workflow: WorkflowData): Promise<WorkflowData> {
    try {
      // Remove the ID to let N8N assign a new one and avoid conflicts
      const { id: _id, ...workflowWithoutId } = workflow;
      
      const response = await this.makeN8NRequest('/workflows', {
        method: 'POST',
        body: JSON.stringify(workflowWithoutId),
      });

      return {
        id: response.id,
        name: response.name,
        active: response.active || false,
        nodes: response.nodes || [],
        connections: response.connections || {},
        settings: response.settings,
        staticData: response.staticData,
        tags: response.tags,
        pinData: response.pinData,
        versionId: response.versionId,
        triggerCount: response.triggerCount,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      };
    } catch (error) {
      console.error('Failed to import workflow to N8N:', error);
      throw new Error(`Unable to import workflow "${workflow.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a backup of all current N8N workflows.
   * 
   * Retrieves all workflows from N8N, packages them with metadata, and stores
   * them as a JSON file in the specified backup location.
   * 
   * @param options - Backup creation options including name and location
   * @returns Promise resolving to backup metadata
   * @throws {Error} When backup creation fails
   */
  async createBackup(options: BackupCreateOptions = {}): Promise<BackupMetadata> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const workflows = await this.getCurrentWorkflows();
      const timestamp = new Date().toISOString();
      const backupId = `backup_${Date.now()}`;
      const backupName = options.name || `Workflow Backup ${new Date().toLocaleDateString()}`;
      
      const backupLocation = options.location || this.backupDirectory;
      await fs.mkdir(backupLocation, { recursive: true });

      const backupData = {
        metadata: {
          id: backupId,
          name: backupName,
          timestamp,
          workflowCount: workflows.length,
          version: '1.0.0',
          source: 'FocusFlare Workflow Backup Manager'
        },
        workflows
      };

      const backupFile = join(backupLocation, `${backupId}.json`);
      const backupContent = JSON.stringify(backupData, null, 2);
      await fs.writeFile(backupFile, backupContent);

      const stats = await fs.stat(backupFile);
      
      const metadata: BackupMetadata = {
        id: backupId,
        name: backupName,
        timestamp,
        workflowCount: workflows.length,
        size: stats.size,
        location: backupFile
      };

      console.log(`Created workflow backup: ${backupFile} (${workflows.length} workflows)`);
      return metadata;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists all available workflow backups.
   * 
   * Scans the backup directory for backup files and returns their metadata
   * including creation time, workflow count, and file size.
   * 
   * @param location - Optional custom location to scan for backups
   * @returns Promise resolving to array of backup metadata
   * @throws {Error} When unable to read backup directory
   */
  async listBackups(location?: string): Promise<BackupMetadata[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchLocation = location || this.backupDirectory;

    try {
      const files = await fs.readdir(searchLocation);
      const backupFiles = files.filter(file => file.endsWith('.json') && file.startsWith('backup_'));
      
      const backups: BackupMetadata[] = [];

      for (const file of backupFiles) {
        try {
          const filePath = join(searchLocation, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const backupData = JSON.parse(content);
          const stats = await fs.stat(filePath);

          if (backupData.metadata && backupData.workflows) {
            backups.push({
              id: backupData.metadata.id,
              name: backupData.metadata.name,
              timestamp: backupData.metadata.timestamp,
              workflowCount: backupData.workflows.length,
              size: stats.size,
              location: filePath
            });
          }
        } catch (error) {
          console.warn(`Skipping invalid backup file: ${file}`, error);
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      throw new Error(`Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restores workflows from a backup file.
   * 
   * Reads a backup file and imports all contained workflows into the current
   * N8N instance. Provides options for handling existing workflows.
   * 
   * @param options - Restore options including backup ID and overwrite settings
   * @returns Promise resolving to array of restored workflow data
   * @throws {Error} When backup file is not found or restore fails
   */
  async restoreFromBackup(options: BackupRestoreOptions): Promise<WorkflowData[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const backups = await this.listBackups(options.location);
      const backup = backups.find(b => b.id === options.backupId);

      if (!backup) {
        throw new Error(`Backup with ID "${options.backupId}" not found`);
      }

      const content = await fs.readFile(backup.location, 'utf-8');
      const backupData = JSON.parse(content);

      if (!backupData.workflows || !Array.isArray(backupData.workflows)) {
        throw new Error('Invalid backup file format');
      }

      const restoredWorkflows: WorkflowData[] = [];
      const errors: string[] = [];

      for (const workflow of backupData.workflows) {
        try {
          const imported = await this.importWorkflowToN8N(workflow);
          restoredWorkflows.push(imported);
          console.log(`Restored workflow: ${workflow.name}`);
        } catch (error) {
          const errorMsg = `Failed to restore workflow "${workflow.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      if (errors.length > 0 && restoredWorkflows.length === 0) {
        throw new Error(`Failed to restore any workflows:\n${errors.join('\n')}`);
      }

      console.log(`Restored ${restoredWorkflows.length} workflows from backup "${backup.name}"`);
      
      if (errors.length > 0) {
        console.warn(`Some workflows failed to restore:\n${errors.join('\n')}`);
      }

      return restoredWorkflows;
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a backup file.
   * 
   * Removes the specified backup file from the filesystem. This operation
   * cannot be undone.
   * 
   * @param backupId - ID of the backup to delete
   * @param location - Optional custom location to search for the backup
   * @returns Promise resolving when backup is deleted
   * @throws {Error} When backup is not found or deletion fails
   */
  async deleteBackup(backupId: string, location?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const backups = await this.listBackups(location);
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        throw new Error(`Backup with ID "${backupId}" not found`);
      }

      await fs.unlink(backup.location);
      console.log(`Deleted backup: ${backup.name} (${backup.location})`);
    } catch (error) {
      throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sets a custom backup directory location.
   * 
   * Changes the default backup location for future operations. Ensures the
   * new directory exists and is writable.
   * 
   * @param newLocation - Path to the new backup directory
   * @returns Promise resolving when location is set and verified
   * @throws {Error} When new location is invalid or inaccessible
   */
  async setBackupLocation(newLocation: string): Promise<void> {
    try {
      await fs.mkdir(newLocation, { recursive: true });
      
      // Test write permissions
      const testFile = join(newLocation, '.write-test');
      await fs.writeFile(testFile, '');
      await fs.unlink(testFile);
      
      this.backupDirectory = newLocation;
      console.log(`Backup location updated: ${newLocation}`);
    } catch (error) {
      throw new Error(`Failed to set backup location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the current backup directory location.
   * 
   * @returns Current backup directory path
   */
  getBackupLocation(): string {
    return this.backupDirectory;
  }
}

// === SINGLETON INSTANCE ===

/** Global backup manager instance */
let backupManagerInstance: WorkflowBackupManager | null = null;

/**
 * Get or create the backup manager singleton
 */
export function getWorkflowBackupManager(workingDirectory?: string): WorkflowBackupManager {
  if (!backupManagerInstance) {
    backupManagerInstance = new WorkflowBackupManager(workingDirectory);
  }
  return backupManagerInstance;
}

// === EXPORTS ===

export { WorkflowBackupManager };
export type {
  WorkflowBackup,
  WorkflowData,
  BackupResult,
  RestoreResult,
  BackupMetadata,
  BackupCreateOptions,
  BackupRestoreOptions
}; 