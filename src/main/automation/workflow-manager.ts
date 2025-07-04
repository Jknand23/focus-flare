/**
 * Workflow Manager - N8N Instance Management for FocusFlare
 * 
 * Manages the local N8N instance, handles workflow execution monitoring,
 * and provides APIs for workflow automation. Integrates with the FocusFlare
 * main process to enable powerful productivity automation while maintaining
 * complete privacy through local-only operation.
 * 
 * @module WorkflowManager
 * @author FocusFlare Team
 * @since Phase 3
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';

// === TYPES ===

/**
 * N8N workflow management configuration
 */
interface WorkflowManagerConfig {
  /** N8N host address (default: localhost) */
  host: string;
  /** N8N port (default: 5678) */
  port: number;
  /** Working directory for N8N instance */
  workingDirectory: string;
  /** Enable debug logging */
  debug: boolean;
  /** Auto-start N8N on FocusFlare startup */
  autoStart: boolean;
}

/**
 * N8N instance status information
 */
interface N8NInstanceStatus {
  /** Whether N8N process is running */
  isRunning: boolean;
  /** Process ID if running */
  processId?: number;
  /** Port N8N is listening on */
  port: number;
  /** Last startup time */
  startTime?: Date;
  /** Last error message if any */
  lastError?: string;
}

/**
 * Workflow execution result
 */
interface WorkflowExecutionResult {
  /** Execution ID from N8N */
  executionId: string;
  /** Whether execution was successful */
  success: boolean;
  /** Execution start time */
  startTime: Date;
  /** Execution end time */
  endTime?: Date;
  /** Result data from workflow */
  data?: any;
  /** Error message if failed */
  error?: string;
}

/**
 * Workflow template definition
 */
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'organization' | 'analysis' | 'custom';
  workflow: any; // N8N workflow JSON
  configurable_params: WorkflowParameter[];
}

/**
 * Configurable workflow parameter
 */
interface WorkflowParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description: string;
  defaultValue?: any;
  options?: string[]; // For select type
}

// === CONSTANTS ===

const DEFAULT_CONFIG: WorkflowManagerConfig = {
  host: '127.0.0.1',
  port: 5678,
  workingDirectory: path.join(process.cwd(), 'n8n-workspace'),
  debug: process.env.NODE_ENV === 'development',
  autoStart: true
};

const N8N_STARTUP_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const MAX_RESTART_ATTEMPTS = 3;

// === WORKFLOW MANAGER CLASS ===

/**
 * Main workflow manager class for N8N integration
 */
class WorkflowManager {
  private config: WorkflowManagerConfig;
  private n8nProcess: ChildProcess | null = null;
  private status: N8NInstanceStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private restartAttempts = 0;

  constructor(config: Partial<WorkflowManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = {
      isRunning: false,
      port: this.config.port
    };

    this.log('WorkflowManager initialized with config:', this.config);
  }

  // === LIFECYCLE MANAGEMENT ===

  /**
   * Initialize the workflow manager and optionally start N8N
   */
  async initialize(): Promise<void> {
    try {
      this.log('Initializing WorkflowManager...');

      // Verify N8N workspace exists
      await this.ensureWorkspaceExists();

      // Check if N8N is already running
      const isAlreadyRunning = await this.checkN8NStatus();
      if (isAlreadyRunning) {
        this.log('N8N instance already running, connecting to existing instance');
        this.status.isRunning = true;
        return;
      }

      // Auto-start if configured
      if (this.config.autoStart) {
        await this.startN8N();
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.log('WorkflowManager initialization complete');
    } catch (error) {
      this.logError('Failed to initialize WorkflowManager:', error);
      throw error;
    }
  }

  /**
   * Start the local N8N instance
   */
  async startN8N(): Promise<void> {
    try {
      if (this.status.isRunning) {
        this.log('N8N is already running');
        return;
      }

      this.log('Starting N8N instance...');

      // Setup environment variables for N8N
      const env = {
        ...process.env,
        N8N_HOST: this.config.host,
        N8N_PORT: this.config.port.toString(),
        N8N_PROTOCOL: 'http',
        DB_TYPE: 'sqlite',
        DB_SQLITE_DATABASE: path.join(this.config.workingDirectory, 'focusflare-workflows.db'),
        DB_SQLITE_ENABLE_WAL: 'true',
        N8N_BASIC_AUTH_ACTIVE: 'false',
        N8N_DISABLE_UI: 'false',
        N8N_EXECUTION_TIMEOUT: '300',
        N8N_EXECUTION_TIMEOUT_MAX: '600',
        N8N_EXECUTION_DATA_SAVE_ON_SUCCESS: 'all',
        N8N_EXECUTION_DATA_SAVE_ON_ERROR: 'all',
        N8N_LOG_LEVEL: this.config.debug ? 'debug' : 'info',
        N8N_LOG_OUTPUT: 'file',
        N8N_LOG_FILE_LOCATION: path.join(this.config.workingDirectory, 'logs', 'n8n.log'),
        N8N_DIAGNOSTICS_ENABLED: 'false',
        N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
        N8N_TEMPLATES_ENABLED: 'false',
        N8N_ONBOARDING_FLOW_DISABLED: 'true',
        N8N_USER_MANAGEMENT_DISABLED: 'true',
        N8N_WEBHOOK_URL: `http://${this.config.host}:${this.config.port}/`,
        N8N_USER_FOLDER: path.join(this.config.workingDirectory, '.n8n'),
        N8N_RUNNERS_ENABLED: 'true' // Address deprecation warning
      };

      // Find N8N executable
      const n8nPath = await this.findN8NExecutable();

      // Spawn N8N process
      this.n8nProcess = spawn('node', [n8nPath, 'start'], {
        cwd: this.config.workingDirectory,
        env,
        stdio: this.config.debug ? 'pipe' : 'ignore',
        detached: false
      });

      // Handle process events
      this.setupProcessHandlers();

      // Wait for N8N to be ready
      await this.waitForN8NReady();

      // Update status
      this.status = {
        isRunning: true,
        processId: this.n8nProcess.pid,
        port: this.config.port,
        startTime: new Date()
      };

      this.restartAttempts = 0;
      this.log(`N8N started successfully on port ${this.config.port} (PID: ${this.n8nProcess.pid})`);

    } catch (error) {
      this.logError('Failed to start N8N:', error);
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Stop the local N8N instance
   */
  async stopN8N(): Promise<void> {
    try {
      if (!this.status.isRunning || !this.n8nProcess) {
        this.log('N8N is not running');
        return;
      }

      this.log('Stopping N8N instance...');

      // Graceful shutdown
      this.n8nProcess.kill('SIGTERM');

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Force kill if still running
      if (this.n8nProcess && !this.n8nProcess.killed) {
        this.n8nProcess.kill('SIGKILL');
      }

      this.n8nProcess = null;
      this.status.isRunning = false;
      this.status.processId = undefined;

      this.log('N8N stopped successfully');

    } catch (error) {
      this.logError('Failed to stop N8N:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow by webhook trigger
   */
  async executeWorkflow(webhookPath: string, data?: any): Promise<WorkflowExecutionResult> {
    try {
      if (!this.status.isRunning) {
        throw new Error('N8N instance is not running');
      }

      const startTime = new Date();
      const url = `http://${this.config.host}:${this.config.port}/webhook/${webhookPath}`;

      this.log(`Executing workflow via webhook: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });

      const endTime = new Date();
      const responseData = await response.json().catch(() => null);

      const result: WorkflowExecutionResult = {
        executionId: `webhook-${Date.now()}`,
        success: response.ok,
        startTime,
        endTime,
        data: responseData
      };

      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      this.log(`Workflow execution completed:`, result);
      return result;

    } catch (error) {
      this.logError('Failed to execute workflow:', error);
      
      return {
        executionId: `error-${Date.now()}`,
        success: false,
        startTime: new Date(),
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current N8N instance status
   */
  getStatus(): N8NInstanceStatus {
    return { ...this.status };
  }

  // === PRIVATE METHODS ===

  /**
   * Find N8N executable path
   */
  private async findN8NExecutable(): Promise<string> {
    // Try local N8N installation in workspace first
    const workspaceN8NPath = path.join(this.config.workingDirectory, 'node_modules', 'n8n', 'bin', 'n8n');
    if (existsSync(workspaceN8NPath)) {
      this.log(`Found N8N executable at: ${workspaceN8NPath}`);
      return workspaceN8NPath;
    }

    // Try common global npm installation paths as fallback
    const possiblePaths = [
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'n8n', 'bin', 'n8n'),
      path.join('/', 'usr', 'local', 'lib', 'node_modules', 'n8n', 'bin', 'n8n'),
      path.join(process.cwd(), 'node_modules', 'n8n', 'bin', 'n8n')
    ];

    for (const n8nPath of possiblePaths) {
      if (existsSync(n8nPath)) {
        this.log(`Found N8N executable at: ${n8nPath}`);
        return n8nPath;
      }
    }

    throw new Error('N8N executable not found. Please ensure N8N is installed locally in n8n-workspace or globally with: npm install -g n8n');
  }

  /**
   * Check if N8N is already running on the configured port
   */
  private async checkN8NStatus(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for N8N to be ready and responsive
   */
  private async waitForN8NReady(): Promise<void> {
    const startTime = Date.now();
    const timeout = N8N_STARTUP_TIMEOUT;

    while (Date.now() - startTime < timeout) {
      try {
        const isReady = await this.checkN8NStatus();
        if (isReady) {
          this.log('N8N is ready and responsive');
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`N8N failed to start within ${timeout}ms`);
  }

  /**
   * Ensure N8N workspace directory exists
   */
  private async ensureWorkspaceExists(): Promise<void> {
    try {
      if (!existsSync(this.config.workingDirectory)) {
        await fs.mkdir(this.config.workingDirectory, { recursive: true });
        this.log(`Created N8N workspace directory: ${this.config.workingDirectory}`);
      }

      // Ensure logs directory exists
      const logsDir = path.join(this.config.workingDirectory, 'logs');
      if (!existsSync(logsDir)) {
        await fs.mkdir(logsDir, { recursive: true });
        this.log(`Created logs directory: ${logsDir}`);
      }

      // Ensure .n8n directory exists for N8N user settings
      const n8nUserDir = path.join(this.config.workingDirectory, '.n8n');
      if (!existsSync(n8nUserDir)) {
        await fs.mkdir(n8nUserDir, { recursive: true });
        this.log(`Created N8N user directory: ${n8nUserDir}`);
      }

      // Create basic N8N configuration file if it doesn't exist
      const configPath = path.join(n8nUserDir, 'config');
      if (!existsSync(configPath)) {
        await fs.writeFile(configPath, JSON.stringify({
          host: this.config.host,
          port: this.config.port,
          protocol: 'http'
        }, null, 2));
        this.log(`Created N8N config file: ${configPath}`);
      }

    } catch (error) {
      this.logError('Failed to create workspace directories:', error);
      throw error;
    }
  }

  /**
   * Setup handlers for N8N process events
   */
  private setupProcessHandlers(): void {
    if (!this.n8nProcess) return;

    this.n8nProcess.on('exit', (code, signal) => {
      this.log(`N8N process exited with code ${code} and signal ${signal}`);
      this.status.isRunning = false;
      this.status.processId = undefined;

      // Auto-restart on unexpected exit
      if (code !== 0 && this.restartAttempts < MAX_RESTART_ATTEMPTS) {
        this.log(`Attempting to restart N8N (attempt ${this.restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})`);
        this.restartAttempts++;
        setTimeout(() => this.startN8N().catch(error => this.logError('Auto-restart failed:', error)), 5000);
      }
    });

    this.n8nProcess.on('error', (error) => {
      this.logError('N8N process error:', error);
      this.status.lastError = error.message;
    });

    // Log N8N output in debug mode
    if (this.config.debug && this.n8nProcess.stdout && this.n8nProcess.stderr) {
      this.n8nProcess.stdout.on('data', (data) => {
        this.log('N8N stdout:', data.toString().trim());
      });

      this.n8nProcess.stderr.on('data', (data) => {
        this.logError('N8N stderr:', data.toString().trim());
      });
    }
  }

  /**
   * Start health monitoring for N8N instance
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await this.checkN8NStatus();
        if (!isHealthy && this.status.isRunning) {
          this.log('Health check failed, N8N may be unresponsive');
          this.status.lastError = 'Health check failed';
        }
      } catch (error) {
        this.logError('Health check error:', error);
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * Clean up resources and stop N8N
   */
  async cleanup(): Promise<void> {
    this.log('Cleaning up WorkflowManager...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.status.isRunning) {
      await this.stopN8N();
    }
    
    this.log('WorkflowManager cleanup complete');
  }

  /**
   * Log debug message
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[WorkflowManager] ${message}`, ...args);
    }
  }

  /**
   * Log error message
   */
  private logError(message: string, error?: any): void {
    console.error(`[WorkflowManager] ${message}`, error);
  }
}

// === SINGLETON INSTANCE ===

/** Global workflow manager instance */
let workflowManagerInstance: WorkflowManager | null = null;

/**
 * Get or create the workflow manager singleton
 */
export function getWorkflowManager(config?: Partial<WorkflowManagerConfig>): WorkflowManager {
  if (!workflowManagerInstance) {
    workflowManagerInstance = new WorkflowManager(config);
  }
  return workflowManagerInstance;
}

/**
 * Initialize workflow manager with FocusFlare
 */
export async function initializeWorkflowManager(config?: Partial<WorkflowManagerConfig>): Promise<WorkflowManager> {
  const manager = getWorkflowManager(config);
  await manager.initialize();
  return manager;
}

/**
 * Cleanup workflow manager resources
 */
export async function cleanupWorkflowManager(): Promise<void> {
  if (workflowManagerInstance) {
    await workflowManagerInstance.cleanup();
    workflowManagerInstance = null;
  }
}

// === EXPORTS ===

export { WorkflowManager };
export type {
  WorkflowManagerConfig,
  N8NInstanceStatus,
  WorkflowExecutionResult,
  WorkflowTemplate,
  WorkflowParameter
}; 