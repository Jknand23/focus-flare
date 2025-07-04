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

// === ENHANCED ACTIVITY MONITORING TYPES ===

/**
 * Activity engagement levels for enhanced monitoring
 */
export type ActivityLevel = 'active' | 'passive' | 'idle' | 'background';

/**
 * Per-app activity state for enhanced monitoring
 */
export interface AppActivityState {
  /** Application name */
  appName: string;
  /** Current activity level */
  activityLevel: ActivityLevel;
  /** Last user interaction timestamp */
  lastUserInteraction: Date;
  /** Last system activity timestamp */
  lastSystemActivity: Date;
  /** Total active time in current session */
  totalActiveTime: number;
  /** Total idle time in current session */
  totalIdleTime: number;
  /** Number of user interactions in current session */
  interactionCount: number;
  /** Whether app is currently processing (CPU/network activity) */
  isProcessing: boolean;
  /** Whether app is playing media */
  isPlayingMedia: boolean;
  /** Current session start time */
  sessionStart: Date;
}

/**
 * System resource usage information
 */
export interface SystemResourceUsage {
  /** Process ID */
  pid: number;
  /** Application name */
  appName: string;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Network activity (bytes/second) */
  networkActivity: number;
  /** Disk I/O activity (bytes/second) */
  diskActivity: number;
  /** Whether process is actively using resources */
  isActive: boolean;
}

/**
 * User interaction event types
 */
export type InteractionType = 'keyboard' | 'mouse' | 'scroll' | 'click' | 'file_operation';

/**
 * User interaction event data
 */
export interface UserInteractionEvent {
  /** Type of interaction */
  type: InteractionType;
  /** Application receiving the interaction */
  appName: string;
  /** Timestamp of interaction */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Media playback state
 */
export type MediaState = 'playing' | 'paused' | 'none';

/**
 * Application focus state
 */
export type AppFocusState = 'foreground' | 'background' | 'minimized';

/**
 * Activity context for enhanced AI classification
 */
export interface ActivityContext {
  /** Application focus state */
  focusState: AppFocusState;
  /** Media playback state */
  mediaState: MediaState;
  /** Whether audio is playing */
  audioPlaying: boolean;
  /** Whether video is playing */
  videoPlaying: boolean;
  /** Resource usage context */
  resourceUsage: {
    cpuUsage: number;
    memoryUsage: number;
    networkActivity: number;
    diskActivity: number;
  };
  /** User interaction patterns */
  interactionPatterns: {
    recentInteractions: number;
    timeSinceLastInteraction: number;
    usagePattern: 'active' | 'passive' | 'background' | 'intermittent';
  };
}

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
  /** Activity level during this period */
  activityLevel: ActivityLevel;
  /** User interaction count during this period */
  interactionCount: number;
  /** Whether system was processing during this period */
  isProcessing: boolean;
  /** CPU usage percentage during this period */
  cpuUsage: number;
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
  /** Activity level during this period */
  activityLevel: ActivityLevel;
  /** User interaction count during this period */
  interactionCount: number;
  /** Whether system was processing during this period */
  isProcessing: boolean;
  /** CPU usage percentage during this period */
  cpuUsage: number;
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
 * Type alias for classified session data (same as SessionData)
 */
export type ClassifiedSession = SessionData;

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
  /** Custom theme ID (for advanced theming) */
  customTheme?: string;
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
  activity_level: ActivityLevel;
  interaction_count: number;
  is_processing: boolean;
  cpu_usage: number;
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

// === MULTI-DAY ANALYSIS TYPES ===

/**
 * Multi-day timeline data structure
 */
export interface MultiDayTimelineData {
  /** Date for this day's data */
  date: Date;
  /** Sessions for this day */
  sessions: SessionData[];
  /** Total focus time for the day (in minutes) */
  totalFocusTime: number;
  /** Total active time for the day (in minutes) */
  totalActiveTime: number;
  /** Whether the day met the focus goal */
  metFocusGoal: boolean;
  /** Day of week (0-6, Sunday-Saturday) */
  dayOfWeek: number;
}

/**
 * Pattern recognition result for recurring activities
 */
export interface RecurringPattern {
  /** Session type that recurs */
  sessionType: SessionType;
  /** Time range when pattern typically occurs */
  timeRange: {
    startHour: number;
    endHour: number;
  };
  /** Days of week when pattern occurs (0-6) */
  daysOfWeek: number[];
  /** Frequency score (0-1, higher means more consistent) */
  frequency: number;
  /** Average duration of sessions in this pattern */
  averageDuration: number;
  /** Total occurrences found */
  occurrences: number;
}

/**
 * Focus streak information
 */
export interface FocusStreak {
  /** Current streak length in days */
  currentStreak: number;
  /** Longest streak achieved */
  longestStreak: number;
  /** Last date the streak was active */
  lastStreakDate: Date | null;
  /** Whether today continues the streak */
  todayCount: boolean;
  /** Focus goal target in minutes */
  focusGoalMinutes: number;
}

/**
 * Daily summary statistics
 */
export interface DailySummary {
  /** Date for this summary */
  date: Date;
  /** Total focus time (focused-work + research) in minutes */
  focusTime: number;
  /** Total active time in minutes */
  activeTime: number;
  /** Total break time in minutes */
  breakTime: number;
  /** Total entertainment time in minutes */
  entertainmentTime: number;
  /** Number of focus sessions */
  focusSessionCount: number;
  /** Average focus session duration in minutes */
  averageFocusSession: number;
  /** Longest focus session in minutes */
  longestFocusSession: number;
  /** Whether day met focus goal */
  metFocusGoal: boolean;
  /** Productivity score (0-100) */
  productivityScore: number;
}

/**
 * Weekly summary statistics
 */
export interface WeeklySummary {
  /** Week start date (Monday) */
  weekStart: Date;
  /** Week end date (Sunday) */
  weekEnd: Date;
  /** Daily summaries for the week */
  dailySummaries: DailySummary[];
  /** Total focus time for the week */
  totalFocusTime: number;
  /** Average daily focus time */
  averageDailyFocus: number;
  /** Days that met focus goal */
  daysMetGoal: number;
  /** Weekly productivity score */
  weeklyProductivityScore: number;
  /** Most productive day */
  mostProductiveDay: DailySummary;
  /** Least productive day */
  leastProductiveDay: DailySummary;
}

/**
 * Comparative analysis between two periods
 */
export interface ComparativeAnalysis {
  /** Current period summary */
  currentPeriod: WeeklySummary;
  /** Previous period summary */
  previousPeriod: WeeklySummary;
  /** Focus time change (positive = improvement) */
  focusTimeChange: number;
  /** Focus time change percentage */
  focusTimeChangePercent: number;
  /** Goal achievement change */
  goalAchievementChange: number;
  /** Productivity score change */
  productivityScoreChange: number;
  /** Trend direction */
  trendDirection: 'improving' | 'declining' | 'stable';
  /** Key insights */
  insights: string[];
}

/**
 * Time range for analysis
 */
export interface AnalysisTimeRange {
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Type of range */
  type: 'day' | 'week' | 'month' | 'custom';
}

// === PATTERN ANALYSIS TYPES ===

/**
 * Focus pattern detection result
 */
export interface FocusPattern {
  /** Pattern type */
  type: 'peak_hours' | 'optimal_session_length' | 'distraction_trigger' | 'productivity_rhythm';
  /** Pattern data specific to type */
  data: {
    /** Peak focus hours (0-23) */
    peakHours?: number[];
    /** Optimal session duration in minutes */
    optimalDuration?: number;
    /** Apps that commonly trigger distractions */
    triggerApps?: string[];
    /** Weekly productivity rhythm */
    weeklyPattern?: number[];
  };
  /** Confidence score (0-1) */
  confidence: number;
  /** Frequency of occurrence */
  frequency: number;
  /** Sample size used for analysis */
  sampleSize: number;
  /** When pattern was identified */
  identifiedAt: Date;
}

/**
 * Distraction pattern analysis result
 */
export interface DistractionPattern {
  /** Distraction trigger (app or activity) */
  trigger: string;
  /** Average distraction duration in minutes */
  averageDuration: number;
  /** Frequency of distraction per day */
  frequencyPerDay: number;
  /** Time of day when distraction commonly occurs */
  commonTimeRanges: Array<{ start: number; end: number }>;
  /** Context when distraction occurs */
  context: {
    /** Previous activity before distraction */
    previousActivity: string;
    /** Session type when distraction occurs */
    sessionType: SessionType;
    /** Duration of focus before distraction */
    focusDurationBefore: number;
  };
  /** Severity score (0-1, higher is more disruptive) */
  severity: number;
}

/**
 * Productivity trend analysis result
 */
export interface ProductivityTrend {
  /** Time period analyzed */
  period: 'daily' | 'weekly' | 'monthly';
  /** Trend direction */
  direction: 'improving' | 'declining' | 'stable';
  /** Confidence in trend direction */
  confidence: number;
  /** Metrics analyzed */
  metrics: {
    /** Focus time trend */
    focusTime: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
    /** Session quality trend */
    sessionQuality: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
    /** Distraction rate trend */
    distractionRate: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
  };
  /** Forecast for next period */
  forecast: {
    /** Predicted focus time */
    predictedFocusTime: number;
    /** Predicted session quality */
    predictedQuality: number;
    /** Confidence in forecast */
    confidence: number;
  };
}

/**
 * Personalized insight with actionable recommendations
 */
export interface PersonalizedInsight {
  /** Insight ID */
  id: string;
  /** Insight type */
  type: 'focus_optimization' | 'distraction_reduction' | 'schedule_adjustment' | 'goal_adjustment';
  /** Insight title */
  title: string;
  /** Detailed description */
  description: string;
  /** Actionable recommendations */
  recommendations: string[];
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Confidence in insight */
  confidence: number;
  /** Supporting data */
  supportingData: {
    /** Metrics that support this insight */
    metrics: Record<string, number>;
    /** Patterns that support this insight */
    patterns: string[];
  };
  /** When insight was generated */
  generatedAt: Date;
}

/**
 * Complete pattern analysis result
 */
export interface PatternAnalysisResult {
  /** Detected focus patterns */
  focusPatterns: FocusPattern[];
  /** Detected distraction patterns */
  distractionPatterns: DistractionPattern[];
  /** Productivity trend analysis */
  productivityTrend: ProductivityTrend | null;
  /** Personalized insights */
  insights: PersonalizedInsight[];
  /** When analysis was performed */
  analyzedAt: Date;
  /** Date range analyzed */
  dateRange: AnalysisTimeRange;
}

// === EXPORT TYPES ===
export type { }; 