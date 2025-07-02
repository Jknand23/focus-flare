/**
 * Activity Types - Shared type definitions for activity tracking data
 * 
 * Contains all TypeScript interfaces and types used throughout FocusFlare
 * for activity logging, session classification, and data management.
 * These types are shared between main and renderer processes.
 * 
 * @module ActivityTypes
 * @author FocusFlare Team
 * @since 0.1.0
 */

// === CORE ACTIVITY DATA ===

/**
 * Raw activity log entry captured from system monitoring
 */
export interface RawActivityData {
  /** Unique identifier for the activity entry */
  id: number;
  /** Timestamp when the activity was recorded */
  timestamp: Date;
  /** Name of the application (e.g., "Chrome", "VSCode") */
  appName: string;
  /** Title of the active window */
  windowTitle: string;
  /** Duration of activity in milliseconds */
  duration: number;
  /** When this record was created in the database */
  createdAt: Date;
  /** Associated session ID (if classified) */
  sessionId?: number;
  /** Whether this activity represents idle time */
  isIdle?: boolean;
}

/**
 * Processed activity data for UI display
 */
export interface ActivityData {
  /** Unique identifier */
  id: number;
  /** When the activity occurred */
  timestamp: Date;
  /** Application name */
  appName: string;
  /** Window title (sanitized for privacy) */
  windowTitle: string;
  /** Duration in milliseconds */
  duration: number;
  /** Formatted duration string (e.g., "5m 30s") */
  formattedDuration: string;
  /** Application category (if known) */
  category?: string;
  /** Associated session ID (if classified) */
  sessionId?: number;
  /** Whether this activity represents idle time */
  isIdle?: boolean;
}

// === SESSION CLASSIFICATION TYPES ===

/**
 * Session types for AI classification
 */
export type SessionType = 
  | 'focused-work'
  | 'research' 
  | 'entertainment'
  | 'break'
  | 'unclear';

/**
 * Session classification result from AI
 */
export interface SessionClassification {
  /** Classified session type */
  type: SessionType;
  /** AI confidence score (0-1) */
  confidence: number;
  /** AI reasoning for classification */
  reasoning: string;
}

/**
 * Complete session data structure
 */
export interface SessionData {
  /** Unique session identifier */
  id: number;
  /** Session start timestamp */
  startTime: Date;
  /** Session end timestamp */
  endTime: Date;
  /** Total session duration in milliseconds */
  duration: number;
  /** AI-classified session type */
  sessionType: SessionType;
  /** AI confidence score for classification */
  confidenceScore: number;
  /** Whether user has manually corrected the classification */
  userCorrected: boolean;
  /** Optional user feedback or context */
  userFeedback?: string;
  /** Activities included in this session */
  activities: ActivityData[];
  /** When this session was created */
  createdAt: Date;
  /** When this session was last updated */
  updatedAt: Date;
}

/**
 * Session creation input data
 */
export interface CreateSessionData {
  /** Session start timestamp */
  startTime: Date;
  /** Session end timestamp */
  endTime: Date;
  /** Total session duration in milliseconds */
  duration: number;
  /** AI-classified session type */
  sessionType: SessionType;
  /** AI confidence score for classification */
  confidenceScore: number;
  /** Optional user feedback or context */
  userFeedback?: string;
}

// === AI INTEGRATION TYPES ===

/**
 * AI feedback record for learning and improvement
 */
export interface AIFeedback {
  /** Unique feedback identifier */
  id: number;
  /** Associated session ID */
  sessionId: number;
  /** Original AI classification */
  originalClassification: SessionType;
  /** User-corrected classification */
  correctedClassification: SessionType;
  /** Optional user context for the correction */
  userContext?: string;
  /** When this feedback was created */
  createdAt: Date;
}

/**
 * Ollama API response format
 */
export interface OllamaResponse {
  /** Response content */
  response: string;
  /** Whether the response is complete */
  done: boolean;
  /** Optional error message */
  error?: string;
}

/**
 * Session classification request to AI
 */
export interface ClassificationRequest {
  /** Activities to classify */
  activities: RawActivityData[];
  /** Additional context for classification */
  context?: string;
  /** Processing options */
  options?: {
    /** Batch size for processing */
    batchSize?: number;
    /** Include surrounding context */
    includeContext?: boolean;
  };
}

// === USER SETTINGS TYPES ===

/**
 * User preference settings
 */
export interface UserSettings {
  /** Work hours start time (HH:MM format) */
  workHoursStart: string;
  /** Work hours end time (HH:MM format) */
  workHoursEnd: string;
  /** Break duration in minutes */
  breakDurationMinutes: number;
  /** Daily focus session goal in minutes */
  focusSessionGoalMinutes: number;
  /** Theme preference */
  themePreference: 'light' | 'dark' | 'system';
  /** Whether notifications are enabled */
  notificationsEnabled: boolean;
  /** Whether morning nudge notifications are enabled */
  morningNudgeEnabled: boolean;
  /** Data retention period in days */
  dataRetentionDays: number;
  /** Whether AI classification is enabled */
  aiClassificationEnabled: boolean;
  /** Custom colors for session types */
  sessionColors?: Record<SessionType, string>;
}

/**
 * Settings update payload
 */
export type SettingsUpdate = Partial<UserSettings>;

// === DATABASE SCHEMA TYPES ===

/**
 * Database row structure for activities table
 */
export interface ActivityTableRow {
  id: number;
  timestamp: string; // ISO string in database
  app_name: string;
  window_title: string;
  duration: number;
  created_at: string; // ISO string in database
  session_id?: number;
  is_idle?: boolean;
}

/**
 * Database row structure for sessions table
 */
export interface SessionTableRow {
  id: number;
  start_time: string; // ISO string in database
  end_time: string; // ISO string in database
  duration: number;
  session_type: SessionType;
  confidence_score: number;
  user_corrected: boolean;
  user_feedback?: string;
  created_at: string; // ISO string in database
  updated_at: string; // ISO string in database
}

/**
 * Database row structure for user_settings table
 */
export interface UserSettingsTableRow {
  key: string;
  value: string;
  updated_at: string; // ISO string in database
}

/**
 * Database row structure for ai_feedback table
 */
export interface AIFeedbackTableRow {
  id: number;
  session_id: number;
  original_classification: SessionType;
  corrected_classification: SessionType;
  user_context?: string;
  created_at: string; // ISO string in database
}

// === IPC COMMUNICATION TYPES ===

/**
 * IPC channel names for communication between main and renderer
 */
export const IPC_CHANNELS = {
  // Activity data operations
  GET_ACTIVITIES: 'activity:get-all',
  GET_RECENT_ACTIVITIES: 'activity:get-recent',
  GET_ACTIVITIES_BY_DATE: 'activity:get-by-date',
  
  // Session operations
  GET_SESSIONS: 'session:get-all',
  GET_SESSIONS_BY_DATE: 'session:get-by-date',
  CREATE_SESSION: 'session:create',
  UPDATE_SESSION: 'session:update',
  DELETE_SESSION: 'session:delete',
  CLASSIFY_SESSION: 'session:classify',
  
  // AI operations
  SUBMIT_AI_FEEDBACK: 'ai:submit-feedback',
  CHECK_OLLAMA_STATUS: 'ai:check-ollama',
  
  // Settings operations
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  RESET_SETTINGS: 'settings:reset',
  
  // System operations
  SHOW_DASHBOARD: 'system:show-dashboard',
  HIDE_DASHBOARD: 'system:hide-dashboard',
  GET_APP_VERSION: 'system:get-version',
  
  // Database operations
  DB_HEALTH_CHECK: 'db:health-check'
} as const;

/**
 * Request payload for getting activities by date range
 */
export interface GetActivitiesByDateRequest {
  /** Start date (ISO string) */
  startDate: string;
  /** End date (ISO string) */
  endDate: string;
  /** Maximum number of records to return */
  limit?: number;
}

/**
 * Request payload for getting recent activities
 */
export interface GetRecentActivitiesRequest {
  /** Number of hours to look back */
  hours: number;
  /** Maximum number of records to return */
  limit?: number;
}

/**
 * Request payload for getting sessions by date range
 */
export interface GetSessionsByDateRequest {
  /** Start date (ISO string) */
  startDate: string;
  /** End date (ISO string) */
  endDate: string;
  /** Maximum number of records to return */
  limit?: number;
}

/**
 * Request payload for session classification
 */
export interface ClassifySessionRequest {
  /** Activities to classify into a session */
  activities: RawActivityData[];
  /** Additional context for classification */
  context?: string;
}

/**
 * Request payload for updating a session
 */
export interface UpdateSessionRequest {
  /** Session ID to update */
  sessionId: number;
  /** Updated session type */
  sessionType?: SessionType;
  /** User feedback or context */
  userFeedback?: string;
  /** Mark as user corrected */
  userCorrected?: boolean;
}

// === UI STATE TYPES ===

/**
 * Loading states for async operations
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Error information for failed operations
 */
export interface ErrorInfo {
  /** Error message */
  message: string;
  /** Error code (if available) */
  code?: string;
  /** Timestamp when error occurred */
  timestamp: Date;
}

/**
 * Timeline visualization data point
 */
export interface TimelineDataPoint {
  /** Time on timeline */
  time: Date;
  /** Session data for this time point */
  session?: SessionData;
  /** Whether this represents idle time */
  isIdle: boolean;
  /** Duration for this time segment */
  duration: number;
}

/**
 * Session color configuration
 */
export interface SessionColorConfig {
  /** Primary color for session type */
  primary: string;
  /** Secondary/background color */
  secondary: string;
  /** Text color that contrasts well */
  text: string;
}

// === EXPORT TYPES ===
export type { }; 