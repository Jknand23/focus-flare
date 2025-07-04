/**
 * Windows Integration Types - Local App Data Structures
 * 
 * Defines TypeScript interfaces for integrating with Windows pre-installed
 * applications that store data locally. Focuses on privacy-first, read-only
 * access to enhance productivity insights without compromising user privacy.
 * 
 * Supported Windows Apps:
 * - Windows Calendar (meetings/events context)
 * - File Explorer (file access patterns)
 * 
 * @module WindowsIntegrationTypes
 * @author FocusFlare Team
 * @since Phase 4
 */

// === WINDOWS CALENDAR INTEGRATION ===

/**
 * Windows Calendar event data structure
 */
export interface WindowsCalendarEvent {
  /** Unique event identifier */
  id: string;
  /** Event title/subject */
  title: string;
  /** Event description/notes */
  description?: string;
  /** Event start time */
  startTime: Date;
  /** Event end time */
  endTime: Date;
  /** Event location */
  location?: string;
  /** Is this an all-day event */
  isAllDay: boolean;
  /** Event attendees count */
  attendeesCount?: number;
  /** Event status (busy, free, tentative) */
  status: 'busy' | 'free' | 'tentative' | 'outOfOffice';
  /** Event category/calendar name */
  calendar: string;
  /** Event recurrence pattern */
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
}

/**
 * Calendar integration configuration
 */
export interface CalendarIntegrationConfig {
  /** Enable calendar integration */
  enabled: boolean;
  /** Calendars to include (empty = all) */
  includedCalendars: string[];
  /** Calendars to exclude */
  excludedCalendars: string[];
  /** Look-ahead days for events */
  lookAheadDays: number;
  /** Look-behind days for events */
  lookBehindDays: number;
  /** Include all-day events */
  includeAllDayEvents: boolean;
  /** Minimum event duration to include (minutes) */
  minEventDuration: number;
}

// === FILE EXPLORER INTEGRATION ===

/**
 * File access event data structure
 */
export interface FileAccessEvent {
  /** File path */
  filePath: string;
  /** File name */
  fileName: string;
  /** File extension */
  fileExtension: string;
  /** File size in bytes */
  fileSize: number;
  /** Access timestamp */
  accessTime: Date;
  /** Access type (opened, modified, created) */
  accessType: 'opened' | 'modified' | 'created';
  /** Application that accessed the file */
  accessedBy: string;
  /** Project directory (if detectable) */
  projectDirectory?: string;
  /** File category based on extension */
  category: 'document' | 'code' | 'image' | 'media' | 'data' | 'other';
}

/**
 * File Explorer integration configuration
 */
export interface FileExplorerIntegrationConfig {
  /** Enable file access tracking */
  enabled: boolean;
  /** Directories to monitor */
  monitoredDirectories: string[];
  /** Directories to exclude */
  excludedDirectories: string[];
  /** File extensions to track */
  includedExtensions: string[];
  /** File extensions to exclude */
  excludedExtensions: string[];
  /** Track file opens */
  trackFileOpens: boolean;
  /** Track file modifications */
  trackFileModifications: boolean;
  /** Track file creations */
  trackFileCreations: boolean;
  /** Minimum file size to track (bytes) */
  minFileSize: number;
  /** Maximum file size to track (bytes) */
  maxFileSize: number;
}

// === PRODUCTIVITY INSIGHTS ===

/**
 * Meeting context correlation with focus sessions
 */
export interface MeetingContext {
  /** Associated focus session ID */
  sessionId: string;
  /** Meeting before session */
  meetingBefore?: WindowsCalendarEvent;
  /** Meeting after session */
  meetingAfter?: WindowsCalendarEvent;
  /** Meeting during session */
  meetingDuring?: WindowsCalendarEvent;
  /** Time between meeting and session (minutes) */
  timeBetweenMeetingAndSession?: number;
  /** Meeting preparation time detected */
  preparationTime?: number;
  /** Meeting follow-up time detected */
  followUpTime?: number;
}

/**
 * File activity correlation with focus sessions
 */
export interface FileActivityContext {
  /** Associated focus session ID */
  sessionId: string;
  /** Files accessed during session */
  filesAccessed: FileAccessEvent[];
  /** Primary project directory */
  primaryProject?: string;
  /** File types worked on */
  fileTypes: string[];
  /** Total files modified */
  filesModified: number;
  /** Total files created */
  filesCreated: number;
  /** Productivity score based on file activity */
  productivityScore: number;
}

/**
 * Combined productivity insights
 */
export interface ProductivityInsights {
  /** Focus session ID */
  sessionId: string;
  /** Session date */
  sessionDate: Date;
  /** Meeting context */
  meetingContext?: MeetingContext;
  /** File activity context */
  fileContext?: FileActivityContext;
  /** Overall productivity score */
  productivityScore: number;
  /** Insights and recommendations */
  insights: string[];
  /** Session tags based on context */
  contextTags: string[];
}

// === INTEGRATION MANAGER ===

/**
 * Windows integrations configuration
 */
export interface WindowsIntegrationsConfig {
  /** Calendar integration settings */
  calendar: CalendarIntegrationConfig;
  /** File Explorer integration settings */
  fileExplorer: FileExplorerIntegrationConfig;
  /** Global integration settings */
  global: {
    /** Enable all Windows integrations */
    enabled: boolean;
    /** Data retention days */
    dataRetentionDays: number;
    /** Sync interval (minutes) */
    syncIntervalMinutes: number;
    /** Privacy mode (anonymize sensitive data) */
    privacyMode: boolean;
  };
}

/**
 * Integration status information
 */
export interface IntegrationStatus {
  /** Integration name */
  name: string;
  /** Is integration available */
  available: boolean;
  /** Is integration enabled */
  enabled: boolean;
  /** Last sync timestamp */
  lastSync?: Date;
  /** Number of items synced */
  itemCount?: number;
  /** Any error messages */
  error?: string;
  /** Integration health score */
  healthScore: number;
}

/**
 * Integration data summary
 */
export interface IntegrationDataSummary {
  /** Calendar events count */
  calendarEvents: number;
  /** File access events count */
  fileAccessEvents: number;
  /** Sessions with meeting context */
  sessionsWithMeetingContext: number;
  /** Sessions with file context */
  sessionsWithFileContext: number;
  /** Average productivity score */
  averageProductivityScore: number;
  /** Most active project */
  mostActiveProject?: string;
  /** Most common file types */
  commonFileTypes: string[];
}

// === UTILITY TYPES ===

/**
 * Windows app integration types
 */
export type WindowsAppType = 'calendar' | 'fileExplorer';

/**
 * Integration data types
 */
export type IntegrationDataType = 'calendarEvent' | 'fileAccess' | 'productivity';

/**
 * Time range for data queries
 */
export interface TimeRange {
  /** Start time */
  start: Date;
  /** End time */
  end: Date;
}

/**
 * Integration query options
 */
export interface IntegrationQueryOptions {
  /** Time range to query */
  timeRange?: TimeRange;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Include related data */
  includeRelated?: boolean;
}

// === EXPORTS ===
// All types are exported inline with their declarations above 