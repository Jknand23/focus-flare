/**
 * Session Classifier - Transform raw activities into meaningful work sessions
 * 
 * Processes raw activity logs into intelligent session groupings using idle
 * detection, temporal clustering, and AI classification. Handles session
 * boundary detection, duration calculation, and persistence. Core component
 * for Phase 2 MVP session management functionality.
 * 
 * @module SessionClassifier
 * @author FocusFlare Team
 * @since 0.2.0
 */

import type { 
  RawActivityData, 
  SessionData, 
  CreateSessionData, 
  SessionType 
} from '@/shared/types/activity-types';
import { classifyActivities } from './ollama-client';
import { getDatabaseConnection } from '../database/connection';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === CONSTANTS ===

/** Session processing configuration */
const SESSION_CONFIG = {
  /** Maximum idle time before creating new session (milliseconds) */
  maxIdleGap: 10 * 60 * 1000, // 10 minutes
  /** Minimum session duration to classify (milliseconds) */
  minSessionDuration: 2 * 60 * 1000, // 2 minutes
  /** Maximum session duration before splitting (milliseconds) */
  maxSessionDuration: 4 * 60 * 60 * 1000, // 4 hours
  /** Minimum activities required for AI classification */
  minActivitiesForAI: 3,
  /** Batch size for processing activities */
  batchSize: 50
} as const;

// === INTERFACES ===

/**
 * Session boundary data
 */
interface SessionBoundary {
  startTime: Date;
  endTime: Date;
  activities: RawActivityData[];
}

/**
 * Session processing options
 */
interface ProcessingOptions {
  /** Whether to use AI classification */
  useAI?: boolean;
  /** Custom session configuration */
  config?: Partial<typeof SESSION_CONFIG>;
  /** Additional context for AI classification */
  context?: string;
}

/**
 * Processing statistics
 */
interface ProcessingStats {
  totalActivities: number;
  sessionsCreated: number;
  sessionsClassified: number;
  aiFailures: number;
  processingTime: number;
}

// === SESSION PROCESSOR CLASS ===

/**
 * Session classifier for transforming activities into sessions
 */
export class SessionClassifier {
  private config: typeof SESSION_CONFIG;
  private db: any;

  constructor(options: ProcessingOptions = {}) {
    this.config = { ...SESSION_CONFIG, ...options.config };
    this.db = getDatabaseConnection();
  }

  /**
   * Processes raw activities into classified sessions
   * 
   * @param activities - Raw activity data to process
   * @param options - Processing options
   * @returns Promise resolving to processing statistics
   */
  async processActivities(
    activities: RawActivityData[], 
    options: ProcessingOptions = {}
  ): Promise<ProcessingStats> {
    const startTime = Date.now();
    const stats: ProcessingStats = {
      totalActivities: activities.length,
      sessionsCreated: 0,
      sessionsClassified: 0,
      aiFailures: 0,
      processingTime: 0
    };

    if (activities.length === 0) {
      stats.processingTime = Date.now() - startTime;
      return stats;
    }

    try {
      // Sort activities by timestamp
      const sortedActivities = activities.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Detect session boundaries
      const sessionBoundaries = this.detectSessionBoundaries(sortedActivities);
      
      if (DEBUG_LOGGING) {
        console.log(`Detected ${sessionBoundaries.length} session boundaries`);
      }

      // Process each session boundary
      for (const boundary of sessionBoundaries) {
        try {
          const session = await this.createSession(boundary, options);
          if (session) {
            stats.sessionsCreated++;
            if (session.sessionType !== 'unclear') {
              stats.sessionsClassified++;
            }
          }
        } catch (error) {
          if (DEBUG_LOGGING) {
            console.warn('Failed to create session:', error);
          }
          stats.aiFailures++;
        }
      }

      stats.processingTime = Date.now() - startTime;

      if (DEBUG_LOGGING) {
        console.log('Session processing complete:', stats);
      }

      return stats;
    } catch (error) {
      stats.processingTime = Date.now() - startTime;
      console.error('Session processing failed:', error);
      throw error;
    }
  }

  /**
   * Detects session boundaries based on temporal gaps and activity patterns
   * 
   * @param activities - Sorted activity data
   * @returns Array of session boundaries
   */
  private detectSessionBoundaries(activities: RawActivityData[]): SessionBoundary[] {
    const boundaries: SessionBoundary[] = [];
    let currentSession: RawActivityData[] = [];
    let sessionStartTime: Date | null = null;

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const activityTime = new Date(activity.timestamp);

      // Initialize first session
      if (!sessionStartTime) {
        sessionStartTime = activityTime;
        currentSession = [activity];
        continue;
      }

      // Check for session boundary conditions
      const shouldCreateBoundary = this.shouldCreateSessionBoundary(
        currentSession,
        activity,
        sessionStartTime
      );

      if (shouldCreateBoundary) {
        // Create boundary for current session
        if (currentSession.length > 0) {
          const lastActivity = currentSession[currentSession.length - 1];
          boundaries.push({
            startTime: sessionStartTime,
            endTime: new Date(lastActivity.timestamp),
            activities: [...currentSession]
          });
        }

        // Start new session
        sessionStartTime = activityTime;
        currentSession = [activity];
      } else {
        // Add to current session
        currentSession.push(activity);
      }
    }

    // Create final boundary
    if (currentSession.length > 0 && sessionStartTime) {
      const lastActivity = currentSession[currentSession.length - 1];
      boundaries.push({
        startTime: sessionStartTime,
        endTime: new Date(lastActivity.timestamp),
        activities: currentSession
      });
    }

    return boundaries.filter(boundary => 
      this.isValidSessionBoundary(boundary)
    );
  }

  /**
   * Determines if a session boundary should be created
   * 
   * @param currentSession - Current session activities
   * @param nextActivity - Next activity to consider
   * @param sessionStartTime - When current session started
   * @returns True if boundary should be created
   */
  private shouldCreateSessionBoundary(
    currentSession: RawActivityData[],
    nextActivity: RawActivityData,
    sessionStartTime: Date
  ): boolean {
    if (currentSession.length === 0) return false;

    const lastActivity = currentSession[currentSession.length - 1];
    const lastActivityTime = new Date(lastActivity.timestamp);
    const nextActivityTime = new Date(nextActivity.timestamp);
    const sessionDuration = nextActivityTime.getTime() - sessionStartTime.getTime();

    // Create boundary if idle gap is too large
    const idleGap = nextActivityTime.getTime() - lastActivityTime.getTime();
    if (idleGap > this.config.maxIdleGap) {
      return true;
    }

    // Create boundary if session is too long
    if (sessionDuration > this.config.maxSessionDuration) {
      return true;
    }

    // Create boundary if there's a significant context switch
    if (this.isSignificantContextSwitch(lastActivity, nextActivity)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if there's a significant context switch between activities
   * 
   * @param lastActivity - Previous activity
   * @param nextActivity - Next activity
   * @returns True if significant context switch detected
   */
  private isSignificantContextSwitch(
    lastActivity: RawActivityData, 
    nextActivity: RawActivityData
  ): boolean {
    // Different applications might indicate context switch
    if (lastActivity.appName !== nextActivity.appName) {
      // Some app switches are not significant (e.g., notifications)
      const nonSignificantApps = ['Explorer', 'Taskbar', 'Desktop'];
      const isLastSignificant = !nonSignificantApps.includes(lastActivity.appName);
      const isNextSignificant = !nonSignificantApps.includes(nextActivity.appName);
      
      return isLastSignificant && isNextSignificant;
    }

    return false;
  }

  /**
   * Validates if a session boundary meets minimum requirements
   * 
   * @param boundary - Session boundary to validate
   * @returns True if boundary is valid
   */
  private isValidSessionBoundary(boundary: SessionBoundary): boolean {
    // Minimum duration check
    const duration = boundary.endTime.getTime() - boundary.startTime.getTime();
    if (duration < this.config.minSessionDuration) {
      return false;
    }

    // Minimum activities check
    if (boundary.activities.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Creates a session from a boundary with AI classification
   * 
   * @param boundary - Session boundary data
   * @param options - Processing options
   * @returns Promise resolving to created session or null
   */
  private async createSession(
    boundary: SessionBoundary, 
    options: ProcessingOptions
  ): Promise<SessionData | null> {
    try {
      const duration = boundary.endTime.getTime() - boundary.startTime.getTime();
      
      // Determine session type
      let sessionType: SessionType = 'unclear';
      let confidence = 0.0;
      let reasoning = 'Not classified';

      const useAI = options.useAI !== false; // Default to true
      const hasEnoughActivities = boundary.activities.length >= this.config.minActivitiesForAI;

      if (useAI && hasEnoughActivities) {
        try {
          const classification = await classifyActivities(
            boundary.activities, 
            options.context
          );
          
          sessionType = classification.type;
          confidence = classification.confidence;
          reasoning = classification.reasoning;
        } catch (error) {
          if (DEBUG_LOGGING) {
            console.warn('AI classification failed, using fallback:', error);
          }
          // Fall back to rule-based classification
          sessionType = this.fallbackClassification(boundary.activities);
          confidence = 0.3;
          reasoning = `Rule-based classification: ${this.generateFallbackReasoning(boundary.activities)}`;
        }
      } else {
        // Use rule-based classification
        sessionType = this.fallbackClassification(boundary.activities);
        confidence = 0.3;
        reasoning = `Rule-based classification: ${this.generateFallbackReasoning(boundary.activities)}`;
      }

      // Create session data
      const sessionData: CreateSessionData = {
        startTime: boundary.startTime,
        endTime: boundary.endTime,
        duration,
        sessionType,
        confidenceScore: confidence,
        userFeedback: reasoning
      };

      // Save to database
      const sessionId = await this.saveSession(sessionData);
      
      // Update activities with session ID
      await this.linkActivitiesToSession(boundary.activities, sessionId);

      // Convert activities for response
      const processedActivities = boundary.activities.map(activity => ({
        ...activity,
        sessionId,
        formattedDuration: this.formatDuration(activity.duration),
        category: this.getAppCategory(activity.appName)
      }));

      return {
        id: sessionId,
        startTime: boundary.startTime,
        endTime: boundary.endTime,
        duration,
        sessionType,
        confidenceScore: confidence,
        userCorrected: false,
        userFeedback: reasoning,
        activities: processedActivities,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }

  /**
   * Enhanced rule-based fallback classification with sophisticated scoring
   * 
   * @param activities - Activities to classify
   * @returns Fallback session type with improved accuracy
   */
  private fallbackClassification(activities: RawActivityData[]): SessionType {
    if (activities.length === 0) return 'unclear';

    // === PREPROCESSING ===
    const appNames = activities.map(a => a.appName.toLowerCase());
    const windowTitles = activities.map(a => a.windowTitle.toLowerCase());
    const uniqueApps = new Set(appNames);
    const combinedText = [...appNames, ...windowTitles].join(' ');

    // === METRICS ===
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDuration / activities.length;
    const sessionLengthMinutes = totalDuration / (1000 * 60);
    const appSwitchFrequency = activities.length / Math.max(sessionLengthMinutes, 1);

    // === SCORING SYSTEM ===
    const scores = {
      'focused-work': 0,
      'research': 0,
      'entertainment': 0,
      'break': 0,
      'unclear': 0
    };

    // === DEVELOPMENT WORK SCORING ===
    const developmentTools = [
      { keywords: ['visual studio', 'vscode', 'vs code'], score: 15 },
      { keywords: ['intellij', 'webstorm', 'pycharm'], score: 15 },
      { keywords: ['sublime', 'atom', 'notepad++'], score: 12 },
      { keywords: ['github', 'gitlab', 'bitbucket'], score: 10 },
      { keywords: ['terminal', 'cmd', 'powershell', 'bash'], score: 8 },
      { keywords: ['git', 'commit', 'pull request', 'merge'], score: 12 },
      { keywords: ['docker', 'kubernetes', 'aws', 'azure'], score: 10 }
    ];

    developmentTools.forEach(tool => {
      const matches = tool.keywords.filter(keyword => combinedText.includes(keyword)).length;
      scores['focused-work'] += matches * tool.score;
    });

    // === FILE EXTENSION ANALYSIS ===
    const codeExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.cs', '.php', '.rb', '.go', '.rs', '.vue', '.svelte', '.html', '.css', '.scss', '.sql'];
    const codeFileCount = codeExtensions.filter(ext => combinedText.includes(ext)).length;
    scores['focused-work'] += codeFileCount * 8;

    // === PROFESSIONAL SOFTWARE SCORING ===
    const professionalSoftware = [
      { keywords: ['figma', 'sketch', 'adobe'], score: 12 },
      { keywords: ['photoshop', 'illustrator', 'indesign'], score: 12 },
      { keywords: ['excel', 'powerpoint', 'word'], score: 10 },
      { keywords: ['google docs', 'sheets', 'slides'], score: 10 },
      { keywords: ['slack', 'teams', 'zoom'], score: 8 },
      { keywords: ['jira', 'confluence', 'trello'], score: 8 },
      { keywords: ['database', 'sql', 'mongodb'], score: 10 }
    ];

    professionalSoftware.forEach(software => {
      const matches = software.keywords.filter(keyword => combinedText.includes(keyword)).length;
      scores['focused-work'] += matches * software.score;
    });

    // === RESEARCH & LEARNING SCORING ===
    const researchPlatforms = [
      { keywords: ['stack overflow', 'stackoverflow'], score: 20 },
      { keywords: ['wikipedia', 'wiki'], score: 15 },
      { keywords: ['coursera', 'udemy', 'khan academy'], score: 18 },
      { keywords: ['documentation', 'docs', 'api'], score: 15 },
      { keywords: ['tutorial', 'guide', 'how to'], score: 12 },
      { keywords: ['arxiv', 'scholar', 'pubmed'], score: 18 },
      { keywords: ['medium', 'dev.to', 'blog'], score: 8 }
    ];

    researchPlatforms.forEach(platform => {
      const matches = platform.keywords.filter(keyword => combinedText.includes(keyword)).length;
      scores['research'] += matches * platform.score;
    });

    // === EDUCATIONAL CONTENT ANALYSIS ===
    if (combinedText.includes('youtube')) {
      if (combinedText.includes('tutorial') || combinedText.includes('course') || 
          combinedText.includes('learn') || combinedText.includes('lesson')) {
        scores['research'] += 15;
      } else if (combinedText.includes('music') || combinedText.includes('playlist')) {
        // Background music during work
        if (scores['focused-work'] > 10) {
          scores['focused-work'] += 5; // Boost work score for music during work
        } else {
          scores['entertainment'] += 5;
        }
      } else {
        scores['entertainment'] += 12;
      }
    }

    // === ENTERTAINMENT SCORING ===
    const entertainmentPlatforms = [
      { keywords: ['netflix', 'hulu', 'disney', 'prime video'], score: 18 },
      { keywords: ['twitch', 'streaming', 'stream'], score: 15 },
      { keywords: ['facebook', 'instagram', 'twitter', 'tiktok'], score: 12 },
      { keywords: ['reddit', 'meme', 'funny'], score: 10 },
      { keywords: ['game', 'gaming', 'steam'], score: 15 },
      { keywords: ['shopping', 'amazon', 'ebay'], score: 8 },
      { keywords: ['news', 'sports', 'entertainment'], score: 6 }
    ];

    entertainmentPlatforms.forEach(platform => {
      const matches = platform.keywords.filter(keyword => combinedText.includes(keyword)).length;
      scores['entertainment'] += matches * platform.score;
    });

    // === BREAK PATTERN SCORING ===
    
    // Duration-based break detection
    if (avgDuration < 120000) { // <2 minutes average
      scores['break'] += 15;
    }

    // High switching frequency
    if (appSwitchFrequency > 3) { // >3 app switches per minute
      scores['break'] += 12;
    }

    // Quick task indicators
    const quickTaskIndicators = ['quick', 'brief', 'check', 'glance', 'notification'];
    const quickTaskMatches = quickTaskIndicators.filter(indicator => combinedText.includes(indicator)).length;
    scores['break'] += quickTaskMatches * 8;

    // Email/calendar quick checks
    if (combinedText.includes('email') || combinedText.includes('gmail') || combinedText.includes('calendar')) {
      if (avgDuration < 300000) { // <5 minutes
        scores['break'] += 10;
      } else {
        scores['focused-work'] += 5; // Longer email work
      }
    }

    // System idle indicators
    const idleIndicators = ['idle', 'screen saver', 'lock', 'away'];
    const idleMatches = idleIndicators.filter(indicator => combinedText.includes(indicator)).length;
    scores['break'] += idleMatches * 12;

    // === DURATION-BASED ADJUSTMENTS ===
    
    // Long duration boosts for focus work and research
    if (avgDuration > 900000) { // >15 minutes average
      scores['focused-work'] += 10;
      scores['research'] += 8;
      scores['break'] -= 15; // Penalty for break classification
    }

    // Session length considerations
    if (sessionLengthMinutes > 30) {
      if (uniqueApps.size <= 2) { // Few apps for long time = focus
        scores['focused-work'] += 8;
        scores['research'] += 6;
      }
    }

    // === CONTEXT-SPECIFIC ADJUSTMENTS ===
    
    // Professional context indicators
    const professionalContext = ['project', 'client', 'meeting', 'deadline', 'report', 'proposal'];
    const professionalMatches = professionalContext.filter(context => combinedText.includes(context)).length;
    scores['focused-work'] += professionalMatches * 6;

    // Learning context indicators
    const learningContext = ['study', 'learn', 'course', 'training', 'certification'];
    const learningMatches = learningContext.filter(context => combinedText.includes(context)).length;
    scores['research'] += learningMatches * 8;

    // === BROWSER-SPECIFIC ANALYSIS ===
    if (combinedText.includes('chrome') || combinedText.includes('firefox') || combinedText.includes('edge')) {
      // Analyze browser content more carefully
      const workDomains = ['github', 'gitlab', 'aws', 'azure', 'google workspace', 'office 365'];
      const researchDomains = ['stackoverflow', 'wikipedia', 'documentation', 'tutorial'];
      const entertainmentDomains = ['youtube', 'netflix', 'facebook', 'instagram', 'reddit'];

      const workDomainMatches = workDomains.filter(domain => combinedText.includes(domain)).length;
      const researchDomainMatches = researchDomains.filter(domain => combinedText.includes(domain)).length;
      const entertainmentDomainMatches = entertainmentDomains.filter(domain => combinedText.includes(domain)).length;

      scores['focused-work'] += workDomainMatches * 5;
      scores['research'] += researchDomainMatches * 5;
      scores['entertainment'] += entertainmentDomainMatches * 5;
    }

    // === FINAL CLASSIFICATION ===
    
    // Apply minimum thresholds
    const minThreshold = 8;
    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore < minThreshold) {
      return 'unclear';
    }

    // Find the category with highest score
    const topCategory = Object.entries(scores).reduce((a, b) => 
      scores[a[0] as SessionType] > scores[b[0] as SessionType] ? a : b
    )[0] as SessionType;

    // Additional validation rules
    if (topCategory === 'break' && sessionLengthMinutes > 20) {
      // Long sessions are unlikely to be breaks
      return avgDuration > 600000 ? 'focused-work' : 'unclear';
    }

    if (topCategory === 'entertainment' && scores['focused-work'] > scores['entertainment'] * 0.7) {
      // Close call between work and entertainment, lean towards work if professional context
      if (professionalMatches > 0) {
        return 'focused-work';
      }
    }

    if (topCategory === 'research' && scores['focused-work'] > scores['research'] * 0.8) {
      // Close call between research and work - favor work if development tools present
      if (scores['focused-work'] > 15 && combinedText.includes('code')) {
        return 'focused-work';
      }
    }

    return topCategory;
  }

  /**
   * Generates a descriptive reasoning for rule-based classification
   * 
   * @param activities - Activities that were classified
   * @returns Descriptive reasoning for the classification
   */
  private generateFallbackReasoning(activities: RawActivityData[]): string {
    if (activities.length === 0) return 'No activities to analyze';

    const appNames = activities.map(a => a.appName.toLowerCase());
    const uniqueApps = new Set(appNames);
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDuration / activities.length;

    const workApps = ['code', 'visual studio', 'intellij', 'sublime', 'notepad++', 'atom'];
    const hasWorkApps = workApps.some(app => 
      [...uniqueApps].some(appName => appName.includes(app))
    );

    const entertainmentApps = ['chrome', 'firefox', 'youtube', 'netflix', 'spotify', 'game'];
    const hasEntertainmentApps = entertainmentApps.some(app =>
      [...uniqueApps].some(appName => appName.includes(app))
    );

    const researchApps = ['browser', 'pdf', 'reader', 'documentation'];
    const hasResearchApps = researchApps.some(app =>
      [...uniqueApps].some(appName => appName.includes(app))
    );

    if (hasWorkApps) {
      return `Detected development/work applications: ${[...uniqueApps].filter(app => 
        workApps.some(workApp => app.includes(workApp))
      ).join(', ')}`;
    }

    if (hasResearchApps) {
      return `Detected research/reading applications: ${[...uniqueApps].filter(app => 
        researchApps.some(researchApp => app.includes(researchApp))
      ).join(', ')}`;
    }

    if (hasEntertainmentApps) {
      return `Detected entertainment applications: ${[...uniqueApps].filter(app => 
        entertainmentApps.some(entApp => app.includes(entApp))
      ).join(', ')}`;
    }

    if (avgDuration < 30000) {
      return `Short average activity duration (${Math.round(avgDuration / 1000)}s) suggests break/idle time`;
    }

    return `Mixed activity patterns across ${uniqueApps.size} applications - unable to clearly classify`;
  }

  /**
   * Saves session data to database
   * 
   * @param sessionData - Session data to save
   * @returns Promise resolving to session ID
   */
  private async saveSession(sessionData: CreateSessionData): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        start_time, end_time, duration, session_type, 
        confidence_score, user_feedback
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sessionData.startTime.toISOString(),
      sessionData.endTime.toISOString(),
      sessionData.duration,
      sessionData.sessionType,
      sessionData.confidenceScore,
      sessionData.userFeedback
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Links activities to a session in the database
   * 
   * @param activities - Activities to link
   * @param sessionId - Session ID to link to
   */
  private async linkActivitiesToSession(
    activities: RawActivityData[], 
    sessionId: number
  ): Promise<void> {
    const stmt = this.db.prepare('UPDATE activities SET session_id = ? WHERE id = ?');
    
    for (const activity of activities) {
      stmt.run(sessionId, activity.id);
    }
  }

  /**
   * Formats duration in milliseconds to human-readable string
   * 
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string
   */
  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Gets application category for UI display
   * 
   * @param appName - Application name
   * @returns Application category
   */
  private getAppCategory(appName: string): string {
    const name = appName.toLowerCase();
    
    if (name.includes('chrome') || name.includes('firefox') || name.includes('edge')) {
      return 'Browser';
    }
    if (name.includes('code') || name.includes('visual studio')) {
      return 'Development';
    }
    if (name.includes('word') || name.includes('excel') || name.includes('powerpoint')) {
      return 'Office';
    }
    if (name.includes('slack') || name.includes('teams') || name.includes('discord')) {
      return 'Communication';
    }
    
    return 'Application';
  }
}

// === CONVENIENCE FUNCTIONS ===

/**
 * Creates a session classifier instance
 * 
 * @param options - Processing options
 * @returns SessionClassifier instance
 */
export function createSessionClassifier(options?: ProcessingOptions): SessionClassifier {
  return new SessionClassifier(options);
}

/**
 * Processes activities into sessions using default configuration
 * 
 * @param activities - Activities to process
 * @param options - Processing options
 * @returns Promise resolving to processing statistics
 */
export async function processActivitiesIntoSessions(
  activities: RawActivityData[],
  options: ProcessingOptions = {}
): Promise<ProcessingStats> {
  const classifier = createSessionClassifier(options);
  return await classifier.processActivities(activities, options);
}
