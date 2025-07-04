/**
 * Workflow Types - Type definitions for N8N workflow and backup operations
 * 
 * Contains TypeScript interfaces and types used for workflow management,
 * backup operations, and N8N integration across the FocusFlare application.
 * 
 * @module WorkflowTypes
 * @author FocusFlare Team
 * @since Phase 3
 */

// === WORKFLOW BACKUP TYPES ===

/**
 * Metadata for a workflow backup
 */
export interface BackupMetadata {
  /** Unique identifier for the backup */
  id: string;
  /** Human-readable name for the backup */
  name: string;
  /** ISO timestamp when backup was created */
  timestamp: string;
  /** Number of workflows included in the backup */
  workflowCount: number;
  /** Size of the backup file in bytes */
  size: number;
  /** File system location of the backup */
  location: string;
}

/**
 * Options for creating a new backup
 */
export interface CreateBackupOptions {
  /** Optional custom name for the backup */
  name?: string;
  /** Optional custom location for the backup file */
  location?: string;
}

/**
 * Options for listing available backups
 */
export interface ListBackupsOptions {
  /** Optional custom location to search for backups */
  location?: string;
}

/**
 * Options for restoring from a backup
 */
export interface RestoreBackupOptions {
  /** ID of the backup to restore */
  backupId: string;
  /** Optional custom location where the backup is stored */
  location?: string;
}

/**
 * Options for deleting a backup
 */
export interface DeleteBackupOptions {
  /** ID of the backup to delete */
  backupId: string;
  /** Optional custom location where the backup is stored */
  location?: string;
}

/**
 * Result of a backup creation operation
 */
export interface BackupCreateResult {
  /** ID of the created backup */
  id: string;
  /** Name of the created backup */
  name: string;
  /** Number of workflows included in the backup */
  workflowCount: number;
  /** Size of the backup file in bytes */
  size: number;
  /** File system location of the backup */
  location: string;
}

/**
 * Result of a backup restore operation
 */
export interface BackupRestoreResult {
  /** Number of workflows successfully restored */
  workflowCount: number;
  /** Names of the restored workflows */
  workflowNames: string[];
}

// === N8N WORKFLOW TYPES ===

/**
 * Basic N8N workflow information
 */
export interface N8NWorkflow {
  /** N8N workflow ID */
  id: string;
  /** Name of the workflow */
  name: string;
  /** Whether the workflow is active */
  active: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Workflow nodes and configuration */
  nodes: any[];
  /** Workflow connections */
  connections: any;
  /** Workflow settings */
  settings?: any;
}

/**
 * N8N instance status information
 */
export interface N8NStatus {
  /** Whether N8N is running */
  isRunning: boolean;
  /** Port number N8N is running on */
  port: number;
  /** Process ID of N8N instance */
  processId?: number;
  /** N8N version */
  version?: string;
  /** Number of active workflows */
  activeWorkflows?: number;
}

/**
 * N8N workflow execution result
 */
export interface N8NExecutionResult {
  /** Execution ID */
  id: string;
  /** Workflow ID that was executed */
  workflowId: string;
  /** Execution status */
  status: 'success' | 'error' | 'waiting' | 'running';
  /** Execution start time */
  startTime: string;
  /** Execution end time */
  endTime?: string;
  /** Execution data */
  data?: any;
  /** Error message if execution failed */
  error?: string;
}

// === DIALOG TYPES ===

/**
 * Options for directory selection dialog
 */
export interface SelectDirectoryOptions {
  /** Dialog title */
  title?: string;
  /** Default path to show */
  defaultPath?: string;
  /** Button label for selection */
  buttonLabel?: string;
}

/**
 * Result of directory selection dialog
 */
export interface SelectDirectoryResult {
  /** Whether the dialog was canceled */
  canceled: boolean;
  /** Selected file paths */
  filePaths: string[];
}

// === WORKFLOW MANAGER TYPES ===

/**
 * Configuration for the workflow manager
 */
export interface WorkflowManagerConfig {
  /** N8N installation path */
  n8nPath?: string;
  /** N8N data directory */
  dataDir?: string;
  /** N8N port number */
  port?: number;
  /** Additional N8N startup arguments */
  additionalArgs?: string[];
}

/**
 * Workflow template definition
 */
export interface WorkflowTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: 'productivity' | 'organization' | 'analysis' | 'custom';
  /** N8N workflow definition */
  workflow: N8NWorkflow;
  /** Configurable parameters */
  configurableParams: WorkflowParameter[];
}

/**
 * Workflow parameter definition
 */
export interface WorkflowParameter {
  /** Parameter key */
  key: string;
  /** Parameter name */
  name: string;
  /** Parameter description */
  description: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  /** Default value */
  defaultValue?: any;
  /** Required flag */
  required?: boolean;
  /** Options for select/multiselect types */
  options?: Array<{ label: string; value: any }>;
}

// === ERROR TYPES ===

/**
 * Workflow backup error
 */
export class WorkflowBackupError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WorkflowBackupError';
  }
}

/**
 * N8N connection error
 */
export class N8NConnectionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'N8NConnectionError';
  }
}

/**
 * Workflow execution error
 */
export class WorkflowExecutionError extends Error {
  constructor(message: string, public executionId?: string) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
} 