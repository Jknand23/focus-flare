/**
 * App Constants - Shared application constants and configuration values
 * 
 * Contains all configuration constants, default values, timeouts, and other
 * application-wide settings used throughout FocusFlare. These constants are
 * shared between main and renderer processes to ensure consistency.
 * 
 * @module AppConstants
 * @author FocusFlare Team
 * @since 0.1.0
 */

// === APPLICATION METADATA ===

/** Application name */
export const APP_NAME = 'FocusFlare';

/** Application version (should match package.json) */
export const APP_VERSION = '0.1.0';

/** Application identifier for system integration */
export const APP_ID = 'com.focusflare.app';

// === SYSTEM MONITORING CONFIGURATION ===

/** Default polling interval for activity monitoring (milliseconds) */
export const DEFAULT_POLLING_INTERVAL = 5000;

/** Minimum polling interval allowed (milliseconds) */
export const MIN_POLLING_INTERVAL = 1000;

/** Maximum polling interval allowed (milliseconds) */
export const MAX_POLLING_INTERVAL = 30000;

/** Maximum retry attempts for system monitoring operations */
export const MAX_MONITORING_RETRIES = 3;

/** Timeout for individual monitoring operations (milliseconds) */
export const MONITORING_TIMEOUT = 10000;

// === DATABASE CONFIGURATION ===

/** Default database filename */
export const DB_FILENAME = 'focusflare.db';

/** Maximum number of activity records to keep (0 = unlimited) */
export const MAX_ACTIVITY_RECORDS = 0;

/** Default number of days to retain activity data */
export const DEFAULT_DATA_RETENTION_DAYS = 365;

/** Maximum database file size in bytes (100MB) */
export const MAX_DB_SIZE = 100 * 1024 * 1024;

/** Database vacuum frequency (days) */
export const DB_VACUUM_FREQUENCY_DAYS = 7;

// === UI CONFIGURATION ===

/** Default window width for dashboard */
export const DEFAULT_WINDOW_WIDTH = 1200;

/** Default window height for dashboard */
export const DEFAULT_WINDOW_HEIGHT = 800;

/** Minimum window width */
export const MIN_WINDOW_WIDTH = 800;

/** Minimum window height */
export const MIN_WINDOW_HEIGHT = 600;

/** Default number of recent activities to display */
export const DEFAULT_ACTIVITY_LIMIT = 100;

/** Maximum number of activities to display in UI */
export const MAX_ACTIVITY_DISPLAY_LIMIT = 1000;

// === PRIVACY SETTINGS ===

/** List of application names to exclude from tracking */
export const EXCLUDED_APPS = [
  'keepass',
  'bitwarden',
  'lastpass',
  '1password',
  'windows security',
  'windows defender',
  'task manager',
  'password',
  'credential'
];

/** List of window title patterns to exclude (case-insensitive) */
export const EXCLUDED_TITLE_PATTERNS = [
  'password',
  'credential',
  'login',
  'sign in',
  'sign up',
  'private',
  'incognito',
  'private browsing'
];

// === PERFORMANCE SETTINGS ===

/** Maximum number of concurrent database operations */
export const MAX_CONCURRENT_DB_OPS = 5;

/** Default timeout for IPC operations (milliseconds) */
export const IPC_TIMEOUT = 5000;

/** Memory usage warning threshold (MB) */
export const MEMORY_WARNING_THRESHOLD = 200;

/** CPU usage warning threshold (percentage) */
export const CPU_WARNING_THRESHOLD = 10;

// === ENHANCED MONITORING SETTINGS ===

/** Resource monitoring interval for system usage tracking (milliseconds) */
export const RESOURCE_MONITORING_INTERVAL = 10000;

/** CPU usage threshold for determining active processing (percentage) */
export const CPU_USAGE_THRESHOLD = 5.0;

/** Network activity threshold for determining active processing (bytes/second) */
export const NETWORK_ACTIVITY_THRESHOLD = 1024 * 10; // 10KB/s

/** Disk activity threshold for determining active processing (operations/second) */
export const DISK_ACTIVITY_THRESHOLD = 10;

/** User interaction idle timeout (milliseconds) */
export const USER_INTERACTION_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/** Activity level check interval (milliseconds) */
export const ACTIVITY_LEVEL_CHECK_INTERVAL = 30000; // 30 seconds

// === DEVELOPMENT SETTINGS ===

/** Enable debug logging in development */
export const DEBUG_LOGGING = process.env.NODE_ENV === 'development';

/** Enable performance monitoring */
export const ENABLE_PERFORMANCE_MONITORING = process.env.NODE_ENV === 'development';

// === SYSTEM TRAY CONFIGURATION ===

/** System tray tooltip text */
export const TRAY_TOOLTIP = 'FocusFlare - Activity Tracker';

/** System tray menu labels */
export const TRAY_MENU = {
  SHOW_DASHBOARD: 'Open Dashboard',
  HIDE_DASHBOARD: 'Hide Dashboard',
  SETTINGS: 'Settings',
  QUIT: 'Quit FocusFlare'
} as const;

// === ERROR MESSAGES ===

/** Standard error messages for user display */
export const ERROR_MESSAGES = {
  DB_CONNECTION_FAILED: 'Failed to connect to database',
  DB_OPERATION_FAILED: 'Database operation failed',
  DB_READ_FAILED: 'Failed to read from database',
  DB_WRITE_FAILED: 'Failed to write to database',
  MONITORING_FAILED: 'Activity monitoring failed',
  PERMISSION_DENIED: 'Permission denied for system monitoring',
  UNKNOWN_ERROR: 'An unknown error occurred'
} as const;

// === SUCCESS MESSAGES ===

/** Standard success messages for user display */
export const SUCCESS_MESSAGES = {
  DB_CONNECTED: 'Database connected successfully',
  MONITORING_STARTED: 'Activity monitoring started',
  MONITORING_STOPPED: 'Activity monitoring stopped',
  SETTINGS_SAVED: 'Settings saved successfully'
} as const;

// === SMART SESSION CONFIGURATION ===

/**
 * Smart Session Processing feature flags and configuration
 */
export const SMART_SESSION_CONFIG = {
  /** Whether Smart Session Processing is enabled by default */
  ENABLED: true,
  /** Grace period for brief app switches (30 seconds) */
  GRACE_PERIOD_MS: 30 * 1000,
  /** Minimum idle time to be considered a break (20 seconds) */
  MINIMUM_BREAK_IDLE_MS: 20 * 1000,
  /** Maximum idle time before definitely ending session (5 minutes) */
  MAXIMUM_IDLE_MS: 5 * 60 * 1000,
  /** Maximum time to look back for potential merging (15 minutes) */
  MERGE_LOOKBACK_MS: 15 * 60 * 1000,
  /** Confidence threshold for AI merging decisions */
  AI_MERGE_CONFIDENCE_THRESHOLD: 0.7,
  /** Maximum session duration before forced split (4 hours) */
  MAX_SESSION_DURATION_MS: 4 * 60 * 60 * 1000
} as const;

/**
 * Smart session processing messages for user feedback
 */
export const SMART_SESSION_MESSAGES = {
  ENABLED: '🧠 Smart Session Processing enabled - preventing session fragmentation',
  DISABLED: '📊 Using standard session processing',
  GRACE_PERIOD_APPLIED: 'Grace period applied for brief app switch',
  CONTEXTUAL_MERGE: 'Sessions merged based on contextual analysis',
  AI_MERGE_SUCCESS: 'AI successfully merged related work sessions',
  AI_MERGE_FAILED: 'Using rule-based merging due to AI unavailability'
} as const; 