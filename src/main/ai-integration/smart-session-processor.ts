/**
 * Smart Session Processor - Prevents work session fragmentation through intelligent merging
 * 
 * Implements a "smart session" approach that uses grace periods, contextual analysis,
 * and AI-powered merging to prevent over-segmentation of work sessions. Instead of
 * creating new sessions for every momentary app switch, this processor considers
 * continuity, context, and user workflow patterns.
 * 
 * Key Features:
 * - Grace periods for brief app switches (15-30 seconds)
 * - Contextual merging using AI analysis
 * - Intelligent idle handling with session continuation
 * - Learning from user corrections and feedback
 * 
 * @module SmartSessionProcessor
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type { 
  RawActivityData, 
  SessionData, 
  CreateSessionData, 
  SessionType
} from '@/shared/types/activity-types';
import { classifyActivities } from './ollama-client';
import { getDatabaseConnection } from '@/main/database/connection';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === SMART SESSION CONFIGURATION ===

/** Smart session processing configuration */
const SMART_SESSION_CONFIG = {
  /** Grace period for brief app switches (30 seconds) */
  gracePeriodMs: 30 * 1000,
  /** Minimum idle time to be considered a break (20 seconds) */
  minimumBreakIdleMs: 20 * 1000,
  /** Maximum idle time before definitely ending session (5 minutes) */
  maximumIdleMs: 5 * 60 * 1000,
  /** Maximum time to look back for potential merging (15 minutes) */
  mergeLookbackMs: 15 * 60 * 1000,
  /** Minimum session duration to consider for merging (10 seconds) */
  minimumMergeDurationMs: 10 * 1000,
  /** Confidence threshold for AI merging decisions */
  aiMergeConfidenceThreshold: 0.7,
  /** Maximum session duration before forced split (4 hours) */
  maxSessionDurationMs: 4 * 60 * 60 * 1000
} as const;

// === INTERFACES ===

/**
 * Session candidate for potential merging
 */
interface SessionCandidate {
  /** Raw activities in chronological order */
  activities: RawActivityData[];
  /** Potential start time */
  startTime: Date;
  /** Potential end time */
  endTime: Date;
  /** Total duration including gaps */
  totalDuration: number;
  /** Primary app name */
  primaryApp: string;
  /** All unique apps in session */
  appNames: Set<string>;
  /** Gap periods within session */
  gaps: Array<{ start: Date; end: Date; duration: number; type: 'idle' | 'switch' }>;
}

/**
 * Merging decision from AI analysis
 */
interface MergingDecision {
  /** Whether activities should be merged */
  shouldMerge: boolean;
  /** Confidence in the decision (0-1) */
  confidence: number;
  /** Reasoning for the decision */
  reasoning: string;
  /** Suggested session type for merged session */
  sessionType?: SessionType;
}

/**
 * Context for app relationships
 */
interface AppRelationshipContext {
  /** Primary work apps */
  workApps: Set<string>;
  /** Support/utility apps */
  supportApps: Set<string>;
  /** Media/entertainment apps */
  mediaApps: Set<string>;
  /** File management apps */
  fileApps: Set<string>;
  /** Communication apps */
  communicationApps: Set<string>;
}

// === SMART SESSION PROCESSOR CLASS ===

/**
 * Intelligent session processor that prevents fragmentation
 */
export class SmartSessionProcessor {
  private config: typeof SMART_SESSION_CONFIG;
  private db: any;
  private appContext: AppRelationshipContext;

  constructor(customConfig?: Partial<typeof SMART_SESSION_CONFIG>) {
    this.config = { ...SMART_SESSION_CONFIG, ...customConfig };
    this.db = getDatabaseConnection();
    this.appContext = this.initializeAppContext();
  }

  /**
   * Processes activities using smart session logic
   * 
   * @param activities - Raw activities to process
   * @returns Promise resolving to created sessions
   */
  async processActivitiesWithSmartMerging(activities: RawActivityData[]): Promise<SessionData[]> {
    if (activities.length === 0) return [];

    const startTime = Date.now();
    
    if (DEBUG_LOGGING) {
      console.log(`🧠 Smart session processing starting with ${activities.length} activities`);
    }

    try {
      // Sort activities by timestamp
      const sortedActivities = activities.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Step 1: Create initial session candidates with grace periods
      const initialCandidates = this.createInitialSessionCandidates(sortedActivities);
      
      if (DEBUG_LOGGING) {
        console.log(`   Created ${initialCandidates.length} initial session candidates`);
      }

      // Step 2: Apply contextual merging using AI analysis
      const mergedCandidates = await this.applyContextualMerging(initialCandidates);
      
      if (DEBUG_LOGGING) {
        console.log(`   After contextual merging: ${mergedCandidates.length} session candidates`);
      }

      // Step 3: Create final sessions with AI classification
      const sessions = await this.createFinalSessions(mergedCandidates);

      const processingTime = Date.now() - startTime;
      
      if (DEBUG_LOGGING) {
        console.log(`🧠 Smart session processing complete: ${sessions.length} sessions created in ${processingTime}ms`);
      }

      return sessions;
    } catch (error) {
      console.error('Smart session processing failed:', error);
      throw error;
    }
  }

  /**
   * Creates initial session candidates with grace period logic
   */
  private createInitialSessionCandidates(activities: RawActivityData[]): SessionCandidate[] {
    const candidates: SessionCandidate[] = [];
    let currentCandidate: SessionCandidate | null = null;

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const activityTime = new Date(activity.timestamp);

      if (!currentCandidate) {
        // Start first candidate
        currentCandidate = this.createNewCandidate(activity);
        continue;
      }

      const lastActivity = currentCandidate.activities[currentCandidate.activities.length - 1];
      const timeSinceLastActivity = activityTime.getTime() - new Date(lastActivity.timestamp).getTime();
      const sessionDuration = activityTime.getTime() - currentCandidate.startTime.getTime();

      // Check if we should continue current candidate or start new one
      if (this.shouldContinueSession(currentCandidate, activity, timeSinceLastActivity, sessionDuration)) {
        // Add to current candidate
        this.addActivityToCandidate(currentCandidate, activity, timeSinceLastActivity);
      } else {
        // Finalize current candidate and start new one
        this.finalizeCandidate(currentCandidate);
        candidates.push(currentCandidate);
        currentCandidate = this.createNewCandidate(activity);
      }
    }

    // Finalize last candidate
    if (currentCandidate) {
      this.finalizeCandidate(currentCandidate);
      candidates.push(currentCandidate);
    }

    return candidates.filter(c => c.activities.length > 0);
  }

  /**
   * Determines if session should continue based on smart logic
   */
  private shouldContinueSession(
    candidate: SessionCandidate,
    nextActivity: RawActivityData,
    timeSinceLastActivity: number,
    sessionDuration: number
  ): boolean {
    // Hard limits
    if (sessionDuration > this.config.maxSessionDurationMs) {
      return false;
    }

    if (timeSinceLastActivity > this.config.maximumIdleMs) {
      return false;
    }

    // Grace period logic - allow brief switches
    if (timeSinceLastActivity <= this.config.gracePeriodMs) {
      if (DEBUG_LOGGING) {
        console.log(`   Grace period applied: ${nextActivity.appName} (${timeSinceLastActivity}ms gap)`);
      }
      return true;
    }

    // Contextual continuation - check if apps are related
    if (this.areAppsRelated(candidate.primaryApp, nextActivity.appName)) {
      if (timeSinceLastActivity <= this.config.mergeLookbackMs) {
        if (DEBUG_LOGGING) {
          console.log(`   Contextual continuation: ${candidate.primaryApp} -> ${nextActivity.appName}`);
        }
        return true;
      }
    }

    // Short idle periods might be thinking time
    if (timeSinceLastActivity <= this.config.minimumBreakIdleMs) {
      return true;
    }

    return false;
  }

  /**
   * Applies contextual merging using AI analysis
   */
  private async applyContextualMerging(candidates: SessionCandidate[]): Promise<SessionCandidate[]> {
    const mergedCandidates: SessionCandidate[] = [];
    
    for (let i = 0; i < candidates.length; i++) {
      const currentCandidate = candidates[i];
      
      // Look for merge opportunities with subsequent candidates
      let mergeTarget = currentCandidate;
      let j = i + 1;
      
      while (j < candidates.length) {
        const nextCandidate = candidates[j];
        const gapBetween = nextCandidate.startTime.getTime() - mergeTarget.endTime.getTime();
        
        // Only consider merging if gap is within reasonable bounds
        if (gapBetween <= this.config.mergeLookbackMs) {
          const mergingDecision = await this.evaluateMergingWithAI(mergeTarget, nextCandidate, gapBetween);
          
          if (mergingDecision.shouldMerge && mergingDecision.confidence >= this.config.aiMergeConfidenceThreshold) {
            if (DEBUG_LOGGING) {
              console.log(`   AI merging: ${mergeTarget.primaryApp} + ${nextCandidate.primaryApp} (confidence: ${mergingDecision.confidence})`);
              console.log(`   Reasoning: ${mergingDecision.reasoning}`);
            }
            
            mergeTarget = this.mergeCandidates(mergeTarget, nextCandidate, gapBetween);
            j++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      
      mergedCandidates.push(mergeTarget);
      i = j - 1; // Skip the merged candidates
    }
    
    return mergedCandidates;
  }

  /**
   * Uses AI to evaluate whether two session candidates should be merged
   */
  private async evaluateMergingWithAI(
    first: SessionCandidate,
    second: SessionCandidate,
    gapDuration: number
  ): Promise<MergingDecision> {
    try {
      // Use rule-based fallback for now (AI integration can be enhanced)
      return this.fallbackMergingDecision(first, second, gapDuration);
      
    } catch (error) {
      if (DEBUG_LOGGING) {
        console.warn('AI merging analysis failed, using fallback logic:', error);
      }
      
      // Fallback to rule-based merging decision
      return this.fallbackMergingDecision(first, second, gapDuration);
    }
  }

  // /**
  //  * Creates analysis context for AI merging decision
  //  */
  // private createMergingAnalysisContext(
  //   first: SessionCandidate,
  //   second: SessionCandidate,
  //   gapDuration: number
  // ): string {
  //   const gapMinutes = Math.round(gapDuration / 1000 / 60 * 10) / 10;
  //   const firstDuration = Math.round(first.totalDuration / 1000 / 60 * 10) / 10;
  //   const secondDuration = Math.round(second.totalDuration / 1000 / 60 * 10) / 10;

  //   return `
  // Merging Analysis Context:
  // - First session: ${first.primaryApp} (${firstDuration} min) with apps: ${Array.from(first.appNames).join(', ')}
  // - Gap duration: ${gapMinutes} minutes
  // - Second session: ${second.primaryApp} (${secondDuration} min) with apps: ${Array.from(second.appNames).join(', ')}
  // - App relationship: ${this.getAppRelationshipDescription(first.primaryApp, second.primaryApp)}
  //     `.trim();
  // }

  /**
   * Rule-based fallback for merging decisions
   */
  private fallbackMergingDecision(
    first: SessionCandidate,
    second: SessionCandidate,
    gapDuration: number
  ): MergingDecision {
    const shouldMerge = 
      // Short gap and related apps
      (gapDuration <= 2 * 60 * 1000 && this.areAppsRelated(first.primaryApp, second.primaryApp)) ||
      // Very short gap regardless of apps (thinking time)
      (gapDuration <= 30 * 1000) ||
      // Same primary app after brief interruption
      (first.primaryApp === second.primaryApp && gapDuration <= 5 * 60 * 1000);

    return {
      shouldMerge,
      confidence: shouldMerge ? 0.6 : 0.8,
      reasoning: shouldMerge 
        ? `Rule-based merge: short gap (${Math.round(gapDuration/1000)}s) between related activities`
        : `Rule-based no-merge: gap too long or apps unrelated`
    };
  }

  /**
   * Helper methods for app context and relationships
   */
  private initializeAppContext(): AppRelationshipContext {
    return {
      workApps: new Set([
        'visual studio code', 'vscode', 'cursor', 'webstorm', 'intellij',
        'sublime text', 'notepad++', 'atom', 'vim', 'emacs'
      ]),
      supportApps: new Set([
        'terminal', 'cmd', 'powershell', 'git', 'github desktop',
        'postman', 'insomnia', 'docker', 'figma', 'photoshop'
      ]),
      fileApps: new Set([
        'explorer', 'finder', 'file manager', 'total commander'
      ]),
      communicationApps: new Set([
        'slack', 'teams', 'discord', 'zoom', 'skype', 'telegram'
      ]),
      mediaApps: new Set([
        'youtube', 'netflix', 'spotify', 'vlc', 'media player'
      ])
    };
  }

  private areAppsRelated(app1: string, app2: string): boolean {
    const norm1 = app1.toLowerCase();
    const norm2 = app2.toLowerCase();

    // Same app category
    const categories = [
      this.appContext.workApps,
      this.appContext.supportApps,
      this.appContext.mediaApps,
      this.appContext.fileApps,
      this.appContext.communicationApps
    ];
    
    for (const category of categories) {
      const has1 = Array.from(category).some(app => norm1.includes(app));
      const has2 = Array.from(category).some(app => norm2.includes(app));
      if (has1 && has2) return true;
    }

    // Work + support apps are related
    const isWork1 = Array.from(this.appContext.workApps).some(app => norm1.includes(app));
    const isSupport1 = Array.from(this.appContext.supportApps).some(app => norm1.includes(app));
    const isWork2 = Array.from(this.appContext.workApps).some(app => norm2.includes(app));
    const isSupport2 = Array.from(this.appContext.supportApps).some(app => norm2.includes(app));

    if ((isWork1 || isSupport1) && (isWork2 || isSupport2)) return true;

    return false;
  }

  // Note: This method is currently unused but may be needed for future app relationship analysis
  /*
  private getAppRelationshipDescription(app1: string, app2: string): string {
    if (this.areAppsRelated(app1, app2)) {
      return 'Related (same category or work+support)';
    }
    return 'Unrelated';
  }
  */

  // Helper methods for candidate management
  private createNewCandidate(activity: RawActivityData): SessionCandidate {
    return {
      activities: [activity],
      startTime: new Date(activity.timestamp),
      endTime: new Date(activity.timestamp.getTime() + activity.duration),
      totalDuration: activity.duration,
      primaryApp: activity.appName,
      appNames: new Set([activity.appName]),
      gaps: []
    };
  }

  private addActivityToCandidate(
    candidate: SessionCandidate,
    activity: RawActivityData,
    gapDuration: number
  ): void {
    // Add gap if there is one
    if (gapDuration > 1000) {
      const lastActivity = candidate.activities[candidate.activities.length - 1];
      candidate.gaps.push({
        start: new Date(lastActivity.timestamp.getTime() + lastActivity.duration),
        end: new Date(activity.timestamp),
        duration: gapDuration,
        type: gapDuration > this.config.minimumBreakIdleMs ? 'idle' : 'switch'
      });
    }

    candidate.activities.push(activity);
    candidate.endTime = new Date(activity.timestamp.getTime() + activity.duration);
    candidate.totalDuration = candidate.endTime.getTime() - candidate.startTime.getTime();
    candidate.appNames.add(activity.appName);
  }

  private finalizeCandidate(candidate: SessionCandidate): void {
    // Update primary app (most time spent)
    const appDurations = new Map<string, number>();
    candidate.activities.forEach(activity => {
      const current = appDurations.get(activity.appName) || 0;
      appDurations.set(activity.appName, current + activity.duration);
    });

    let maxDuration = 0;
    for (const [app, duration] of appDurations) {
      if (duration > maxDuration) {
        maxDuration = duration;
        candidate.primaryApp = app;
      }
    }
  }

  private mergeCandidates(first: SessionCandidate, second: SessionCandidate, gapDuration: number): SessionCandidate {
    const merged: SessionCandidate = {
      activities: [...first.activities, ...second.activities],
      startTime: first.startTime,
      endTime: second.endTime,
      totalDuration: second.endTime.getTime() - first.startTime.getTime(),
      primaryApp: first.primaryApp, // Will be updated in finalize
      appNames: new Set([...first.appNames, ...second.appNames]),
      gaps: [
        ...first.gaps,
        {
          start: first.endTime,
          end: second.startTime,
          duration: gapDuration,
          type: gapDuration > this.config.minimumBreakIdleMs ? 'idle' : 'switch'
        },
        ...second.gaps
      ]
    };

    this.finalizeCandidate(merged);
    return merged;
  }

  /**
   * Creates final sessions with AI classification
   */
  private async createFinalSessions(candidates: SessionCandidate[]): Promise<SessionData[]> {
    const sessions: SessionData[] = [];

    for (const candidate of candidates) {
      try {
        // Classify the session
        const classification = await classifyActivities(candidate.activities);
        
        // Create session data
        const sessionData: CreateSessionData = {
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          duration: candidate.totalDuration,
          sessionType: classification.type,
          confidenceScore: classification.confidence,
          userFeedback: `${classification.reasoning} (Smart session: ${candidate.gaps.length} gaps handled)`
        };

        // Save to database
        const sessionId = await this.saveSession(sessionData);
        
        // Link activities to session
        await this.linkActivitiesToSession(candidate.activities, sessionId);

        // Create session response
        const session: SessionData = {
          id: sessionId,
          ...sessionData,
          userCorrected: false,
          activities: candidate.activities.map(activity => ({
            ...activity,
            sessionId,
            formattedDuration: this.formatDuration(activity.duration),
            category: this.getAppCategory(activity.appName)
          })),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        sessions.push(session);
      } catch (error) {
        console.error('Failed to create session from candidate:', error);
      }
    }

    return sessions;
  }

  // Database and utility methods
  private async saveSession(sessionData: CreateSessionData): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (start_time, end_time, duration, session_type, confidence_score, user_feedback)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      sessionData.startTime.toISOString(),
      sessionData.endTime.toISOString(),
      sessionData.duration,
      sessionData.sessionType,
      sessionData.confidenceScore,
      sessionData.userFeedback || ''
    ) as { lastInsertRowid: number };
    
    return result.lastInsertRowid;
  }

  private async linkActivitiesToSession(activities: RawActivityData[], sessionId: number): Promise<void> {
    const stmt = this.db.prepare('UPDATE activities SET session_id = ? WHERE id = ?');
    
    for (const activity of activities) {
      stmt.run(sessionId, activity.id);
    }
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  private getAppCategory(appName: string): string {
    const normalized = appName.toLowerCase();
    
    if (Array.from(this.appContext.workApps).some(app => normalized.includes(app))) {
      return 'Development';
    }
    if (Array.from(this.appContext.mediaApps).some(app => normalized.includes(app))) {
      return 'Media';
    }
    if (Array.from(this.appContext.communicationApps).some(app => normalized.includes(app))) {
      return 'Communication';
    }
    
    return 'Other';
  }
}

// === EXPORTS ===

/**
 * Creates a new smart session processor instance
 */
export function createSmartSessionProcessor(
  config?: Partial<typeof SMART_SESSION_CONFIG>
): SmartSessionProcessor {
  return new SmartSessionProcessor(config);
}

/**
 * Main entry point for smart session processing
 */
export async function processActivitiesWithSmartSessions(
  activities: RawActivityData[],
  config?: Partial<typeof SMART_SESSION_CONFIG>
): Promise<SessionData[]> {
  const processor = createSmartSessionProcessor(config);
  return processor.processActivitiesWithSmartMerging(activities);
} 