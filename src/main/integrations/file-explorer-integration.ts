/**
 * File Explorer Integration - Local File Access Pattern Tracking
 * 
 * Provides read-only monitoring of file access patterns during focus sessions
 * using Windows APIs and PowerShell commands. This integration maintains complete
 * privacy by only accessing local file system events and metadata.
 * 
 * Features:
 * - File access pattern monitoring
 * - Project directory detection
 * - File type categorization
 * - Productivity scoring based on file activity
 * - Privacy-first local processing
 * 
 * @module FileExplorerIntegration
 * @author FocusFlare Team
 * @since Phase 4
 */

import { spawn } from 'child_process';
import { dirname, basename, extname } from 'path';
import type {
  FileAccessEvent,
  FileExplorerIntegrationConfig,
  TimeRange,
  IntegrationQueryOptions
} from '@/shared/types/windows-integration-types';

// === TYPES ===

/**
 * Raw file event data from Windows Event Log
 */
interface RawFileEvent {
  TimeCreated: string;
  ProcessName: string;
  FileName: string;
  EventType: string;
  ProcessId: string;
  FilePath: string;
  FileSize?: string;
}



/**
 * PowerShell execution result
 */
interface PowerShellResult {
  stdout: string;
  stderr: string;
  success: boolean;
  error?: Error;
}

// === CONSTANTS ===

/** Default configuration for file explorer integration */
const DEFAULT_CONFIG: FileExplorerIntegrationConfig = {
  enabled: false,
  monitoredDirectories: [],
  excludedDirectories: [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\$Recycle.Bin',
    'C:\\System Volume Information'
  ],
  includedExtensions: [
    '.txt', '.md', '.doc', '.docx', '.pdf', '.xlsx', '.pptx',
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h',
    '.html', '.css', '.json', '.xml', '.yaml', '.yml',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp',
    '.mp4', '.avi', '.mkv', '.mov', '.wmv',
    '.zip', '.rar', '.7z', '.tar', '.gz'
  ],
  excludedExtensions: [
    '.tmp', '.temp', '.log', '.cache', '.bak', '.old',
    '.exe', '.dll', '.sys', '.msi', '.lnk'
  ],
  trackFileOpens: true,
  trackFileModifications: true,
  trackFileCreations: true,
  minFileSize: 0,
  maxFileSize: 100 * 1024 * 1024 // 100MB
};

/** File category mappings */
const FILE_CATEGORIES = {
  document: ['.txt', '.md', '.doc', '.docx', '.pdf', '.rtf', '.odt'],
  code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.css', '.html', '.php', '.rb', '.go', '.rs'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp', '.tiff'],
  media: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.mp3', '.wav', '.flac'],
  data: ['.json', '.xml', '.yaml', '.yml', '.csv', '.xlsx', '.xls', '.db', '.sql'],
  other: [] // Default fallback
};

/** PowerShell command to get recent file access events */
const FILE_ACCESS_QUERY_COMMAND = `
# Get recent file access events from Windows Event Log
try {
  $startTime = (Get-Date).AddHours(-{hours})
  $endTime = Get-Date
  
  # Query file system events
  $events = @()
  
  # Get recent file modifications from Security log (if available)
  try {
    $securityEvents = Get-WinEvent -FilterHashtable @{
      LogName = 'Security'
      ID = 4663
      StartTime = $startTime
      EndTime = $endTime
    } -MaxEvents 1000 -ErrorAction SilentlyContinue
    
    foreach ($event in $securityEvents) {
      $xml = [xml]$event.ToXml()
      $objectName = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'ObjectName' } | Select-Object -ExpandProperty '#text'
      
      if ($objectName -and $objectName -like '*.*') {
        $events += @{
          TimeCreated = $event.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss')
          ProcessName = 'Unknown'
          FileName = Split-Path $objectName -Leaf
          EventType = 'accessed'
          ProcessId = '0'
          FilePath = $objectName
        }
      }
    }
  } catch {
    # Security log access may be restricted
  }
  
  # Get file system events using alternative methods
  # This is a simplified version - in practice you'd use more sophisticated monitoring
  $recentFiles = @()
  
  # Get recently modified files in common directories
  $commonDirs = @(
    [Environment]::GetFolderPath('MyDocuments'),
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('Downloads'),
    "$($env:USERPROFILE)\\Code",
    "$($env:USERPROFILE)\\Projects",
    "$($env:USERPROFILE)\\Development"
  )
  
  foreach ($dir in $commonDirs) {
    if (Test-Path $dir) {
      try {
        $files = Get-ChildItem -Path $dir -Recurse -File | Where-Object { 
          $_.LastWriteTime -gt $startTime -and $_.Length -gt 0 
        } | Sort-Object LastWriteTime -Descending | Select-Object -First 100
        
        foreach ($file in $files) {
          $events += @{
            TimeCreated = $file.LastWriteTime.ToString('yyyy-MM-ddTHH:mm:ss')
            ProcessName = 'FileSystem'
            FileName = $file.Name
            EventType = 'modified'
            ProcessId = '0'
            FilePath = $file.FullName
            FileSize = $file.Length
          }
        }
      } catch {
        # Directory access may be restricted
      }
    }
  }
  
  $events | ConvertTo-Json -Depth 3
} catch {
  Write-Error "Failed to access file events: $_"
  "[]"
}
`;

// === MAIN CLASS ===

/**
 * File Explorer Integration Manager
 * 
 * Manages monitoring of file access patterns during focus sessions using
 * Windows APIs and PowerShell commands. Provides file activity context for
 * productivity insights while maintaining complete privacy.
 */
export class FileExplorerIntegration {
  private config: FileExplorerIntegrationConfig;
  private isAvailable: boolean = false;
  private lastSync: Date | null = null;
  private eventCache: Map<string, FileAccessEvent> = new Map();
  private activeWatchers: Map<string, any> = new Map();

  constructor(config: Partial<FileExplorerIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log = this.log.bind(this);
    this.logError = this.logError.bind(this);
  }

  // === LIFECYCLE METHODS ===

  /**
   * Initialize the file explorer integration and check availability
   */
  async initialize(): Promise<void> {
    try {
      this.log('Initializing File Explorer Integration...');
      
      // Check if file monitoring is available
      this.isAvailable = await this.checkFileMonitoringAvailability();
      
      if (!this.isAvailable) {
        this.log('File monitoring not available - integration disabled');
        return;
      }

      // Set up default monitored directories if none specified
      if (this.config.monitoredDirectories.length === 0) {
        this.config.monitoredDirectories = await this.getDefaultMonitoredDirectories();
      }

      this.log('File Explorer Integration initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize file explorer integration:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Check if file monitoring is available on this system
   */
  private async checkFileMonitoringAvailability(): Promise<boolean> {
    try {
      // Test basic PowerShell file system access
      const result = await this.executePowerShell(`
        try {
          $testPath = [Environment]::GetFolderPath('MyDocuments')
          Test-Path $testPath
          "available"
        } catch {
          "unavailable"
        }
      `);

      return result.success && result.stdout.trim() === 'available';
    } catch (error) {
      this.logError('File monitoring availability check failed:', error);
      return false;
    }
  }

  /**
   * Get default directories to monitor
   */
  private async getDefaultMonitoredDirectories(): Promise<string[]> {
    try {
      const result = await this.executePowerShell(`
        $dirs = @()
        $dirs += [Environment]::GetFolderPath('MyDocuments')
        $dirs += [Environment]::GetFolderPath('Desktop')
        $dirs += [Environment]::GetFolderPath('Downloads')
        $dirs += "$($env:USERPROFILE)\\Code"
        $dirs += "$($env:USERPROFILE)\\Projects"
        $dirs += "$($env:USERPROFILE)\\Development"
        $dirs += "$($env:USERPROFILE)\\Documents\\GitHub"
        $dirs += "$($env:USERPROFILE)\\Documents\\Visual Studio"
        
        $existingDirs = $dirs | Where-Object { Test-Path $_ }
        $existingDirs | ConvertTo-Json
      `);

      if (result.success) {
        try {
          const dirs = JSON.parse(result.stdout);
          return Array.isArray(dirs) ? dirs : [dirs];
        } catch {
          // Fall back to basic directories
        }
      }

      return [
        'C:\\Users\\' + process.env.USERNAME + '\\Documents',
        'C:\\Users\\' + process.env.USERNAME + '\\Desktop',
        'C:\\Users\\' + process.env.USERNAME + '\\Downloads'
      ];
    } catch (error) {
      this.logError('Failed to get default monitored directories:', error);
      return [];
    }
  }

  // === FILE ACCESS MONITORING ===

  /**
   * Get recent file access events for the specified time range
   */
  async getFileAccessEvents(options: IntegrationQueryOptions = {}): Promise<FileAccessEvent[]> {
    try {
      if (!this.isAvailable || !this.config.enabled) {
        this.log('File explorer integration not available or disabled');
        return [];
      }

      const timeRange = options.timeRange || {
        start: new Date(Date.now() - (24 * 60 * 60 * 1000)), // Last 24 hours
        end: new Date()
      };

      this.log(`Fetching file access events from ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`);

      // Get recent file access events
      const rawEvents = await this.getRecentFileEvents(timeRange);
      
      // Process and filter events
      const events = this.processRawFileEvents(rawEvents);
      
      // Apply additional filtering
      const filteredEvents = this.filterFileEvents(events);
      
      // Cache events
      this.cacheFileEvents(filteredEvents);
      
      this.lastSync = new Date();
      this.log(`Successfully retrieved ${filteredEvents.length} file access events`);
      
      return filteredEvents;
    } catch (error) {
      this.logError('Failed to get file access events:', error);
      return [];
    }
  }

  /**
   * Get recent file events using PowerShell
   */
  private async getRecentFileEvents(timeRange: TimeRange): Promise<RawFileEvent[]> {
    const hours = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (60 * 60 * 1000));
    const command = FILE_ACCESS_QUERY_COMMAND.replace('{hours}', hours.toString());

    const result = await this.executePowerShell(command);
    
    if (!result.success) {
      this.log(`PowerShell file query failed: ${result.stderr}`);
      return [];
    }

    try {
      const events = JSON.parse(result.stdout);
      return Array.isArray(events) ? events : [];
    } catch (parseError) {
      this.logError('Failed to parse file access data:', parseError);
      return [];
    }
  }

  // === DATA PROCESSING ===

  /**
   * Process raw file events into structured format
   */
  private processRawFileEvents(rawEvents: RawFileEvent[]): FileAccessEvent[] {
    return rawEvents.map(event => this.processRawFileEvent(event)).filter(event => event !== null) as FileAccessEvent[];
  }

  /**
   * Process a single raw file event
   */
  private processRawFileEvent(raw: RawFileEvent): FileAccessEvent | null {
    try {
      const accessTime = new Date(raw.TimeCreated);
      
      // Validate date
      if (isNaN(accessTime.getTime())) {
        this.log(`Invalid date in file event: ${raw.FileName}`);
        return null;
      }

      const fileName = basename(raw.FilePath || raw.FileName);
      const fileExtension = extname(fileName).toLowerCase();
      const filePath = raw.FilePath || raw.FileName;
      const fileSize = raw.FileSize ? parseInt(raw.FileSize, 10) : 0;

      return {
        filePath,
        fileName,
        fileExtension,
        fileSize,
        accessTime,
        accessType: this.mapAccessType(raw.EventType),
        accessedBy: raw.ProcessName || 'Unknown',
        projectDirectory: this.detectProjectDirectory(filePath),
        category: this.categorizeFile(fileExtension)
      };
    } catch (error) {
      this.logError(`Failed to process file event: ${raw.FileName}`, error);
      return null;
    }
  }

  /**
   * Map event type to access type
   */
  private mapAccessType(eventType: string): 'opened' | 'modified' | 'created' {
    const type = (eventType || '').toLowerCase();
    if (type.includes('created')) return 'created';
    if (type.includes('modified') || type.includes('written')) return 'modified';
    return 'opened';
  }

  /**
   * Detect project directory from file path
   */
  private detectProjectDirectory(filePath: string): string | undefined {
    try {
      const normalizedPath = filePath.toLowerCase();
      const _commonProjectIndicators = [
        'package.json', 'tsconfig.json', '.git', '.gitignore',
        'pom.xml', 'build.gradle', 'Cargo.toml', 'setup.py',
        'requirements.txt', 'composer.json', 'Gemfile'
      ];

      // Walk up directory tree looking for project indicators
      let currentDir = dirname(filePath);
      let depth = 0;
      const maxDepth = 5;

      while (depth < maxDepth && currentDir !== dirname(currentDir)) {
        try {
          // Check if this directory contains project indicators
          // In a real implementation, you'd use fs.readdir here
          // For now, we'll use heuristics based on path structure
          
          if (normalizedPath.includes('\\projects\\') || 
              normalizedPath.includes('\\code\\') ||
              normalizedPath.includes('\\development\\') ||
              normalizedPath.includes('\\github\\') ||
              normalizedPath.includes('\\src\\')) {
            return currentDir;
          }
        } catch {
          // Directory access may fail
        }
        
        currentDir = dirname(currentDir);
        depth++;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Categorize file based on extension
   */
  private categorizeFile(extension: string): 'document' | 'code' | 'image' | 'media' | 'data' | 'other' {
    const ext = extension.toLowerCase();
    
    for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
      if (extensions.includes(ext)) {
        return category as any;
      }
    }
    
    return 'other';
  }

  /**
   * Filter file events based on configuration
   */
  private filterFileEvents(events: FileAccessEvent[]): FileAccessEvent[] {
    return events.filter(event => {
      // Filter by file size
      if (event.fileSize < this.config.minFileSize || event.fileSize > this.config.maxFileSize) {
        return false;
      }

      // Filter by access type
      if (!this.config.trackFileOpens && event.accessType === 'opened') return false;
      if (!this.config.trackFileModifications && event.accessType === 'modified') return false;
      if (!this.config.trackFileCreations && event.accessType === 'created') return false;

      // Filter by file extension
      if (this.config.includedExtensions.length > 0 && 
          !this.config.includedExtensions.includes(event.fileExtension)) {
        return false;
      }

      if (this.config.excludedExtensions.includes(event.fileExtension)) {
        return false;
      }

      // Filter by directory
      const isInMonitoredDirectory = this.config.monitoredDirectories.length === 0 ||
        this.config.monitoredDirectories.some(dir => 
          event.filePath.toLowerCase().startsWith(dir.toLowerCase())
        );

      if (!isInMonitoredDirectory) {
        return false;
      }

      const isInExcludedDirectory = this.config.excludedDirectories.some(dir => 
        event.filePath.toLowerCase().startsWith(dir.toLowerCase())
      );

      if (isInExcludedDirectory) {
        return false;
      }

      return true;
    });
  }

  /**
   * Cache file events for quick access
   */
  private cacheFileEvents(events: FileAccessEvent[]): void {
    events.forEach(event => {
      const key = `${event.filePath}-${event.accessTime.getTime()}`;
      this.eventCache.set(key, event);
    });
  }

  // === UTILITY METHODS ===

  /**
   * Execute PowerShell command
   */
  private async executePowerShell(command: string): Promise<PowerShellResult> {
    return new Promise((resolve) => {
      const process = spawn('powershell', ['-Command', command], {
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          success: code === 0,
          error: code !== 0 ? new Error(`PowerShell exited with code ${code}`) : undefined
        });
      });

      process.on('error', (error) => {
        resolve({
          stdout,
          stderr,
          success: false,
          error
        });
      });
    });
  }

  /**
   * Get integration status
   */
  getStatus(): { available: boolean; enabled: boolean; lastSync?: Date; eventCount: number } {
    return {
      available: this.isAvailable,
      enabled: this.config.enabled,
      lastSync: this.lastSync || undefined,
      eventCount: this.eventCache.size
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FileExplorerIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('File explorer integration configuration updated');
  }

  // === LOGGING ===

  private log(message: string, ...args: any[]): void {
    console.log(`[FileExplorerIntegration] ${message}`, ...args);
  }

  private logError(message: string, error?: any): void {
    console.error(`[FileExplorerIntegration] ${message}`, error);
  }
}

// === SINGLETON INSTANCE ===

/** Global file explorer integration instance */
let fileExplorerIntegrationInstance: FileExplorerIntegration | null = null;

/**
 * Get or create the file explorer integration singleton
 */
export function getFileExplorerIntegration(config?: Partial<FileExplorerIntegrationConfig>): FileExplorerIntegration {
  if (!fileExplorerIntegrationInstance) {
    fileExplorerIntegrationInstance = new FileExplorerIntegration(config);
  }
  return fileExplorerIntegrationInstance;
}

/**
 * Initialize file explorer integration
 */
export async function initializeFileExplorerIntegration(config?: Partial<FileExplorerIntegrationConfig>): Promise<FileExplorerIntegration> {
  const integration = getFileExplorerIntegration(config);
  await integration.initialize();
  return integration;
}

// === EXPORTS ===

export type { FileExplorerIntegrationConfig, FileAccessEvent }; 