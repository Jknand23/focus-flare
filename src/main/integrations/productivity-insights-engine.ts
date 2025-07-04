/**
 * Productivity Insights Engine - Windows Integration Data Correlator
 * 
 * Analyzes and correlates data from Windows Calendar and File Explorer integrations
 * with focus sessions to generate actionable productivity insights. This engine
 * processes local data only and maintains complete privacy.
 * 
 * Features:
 * - Meeting context correlation with focus sessions
 * - File activity pattern analysis
 * - Productivity scoring based on multiple factors
 * - Actionable insights generation
 * - Privacy-first data processing
 * 
 * @module ProductivityInsightsEngine
 * @author FocusFlare Team
 * @since Phase 4
 */

import type {
  WindowsCalendarEvent,
  FileAccessEvent,
  MeetingContext,
  FileActivityContext,
  ProductivityInsights
} from '@/shared/types/windows-integration-types';
import type { ClassifiedSession } from '@/shared/types/activity-types';

// === TYPES ===

/**
 * Insights generation configuration
 */
interface InsightsConfig {
  /** Meeting preparation time threshold (minutes) */
  meetingPrepTimeThreshold: number;
  /** Meeting follow-up time threshold (minutes) */
  meetingFollowUpTimeThreshold: number;
  /** Minimum file activity for productive session */
  minFileActivityThreshold: number;
  /** Weight for different productivity factors */
  productivityWeights: {
    fileActivity: number;
    meetingContext: number;
    focusTime: number;
    codeActivity: number;
  };
  /** File categories that indicate productive work */
  productiveFileCategories: string[];
}



/**
 * Meeting correlation details
 */
interface _MeetingCorrelation {
  /** Meeting event */
  meeting: WindowsCalendarEvent;
  /** Relationship type */
  relationship: 'before' | 'during' | 'after';
  /** Time difference in minutes */
  timeDifference: number;
  /** Correlation strength */
  strength: number;
}

/**
 * File correlation details
 */
interface _FileCorrelation {
  /** File access event */
  fileAccess: FileAccessEvent;
  /** Overlap with session */
  overlap: number;
  /** Relevance score */
  relevance: number;
}

// === CONSTANTS ===

/** Default configuration for insights generation */
const DEFAULT_CONFIG: InsightsConfig = {
  meetingPrepTimeThreshold: 30, // 30 minutes
  meetingFollowUpTimeThreshold: 60, // 1 hour
  minFileActivityThreshold: 3, // 3 files
  productivityWeights: {
    fileActivity: 0.3,
    meetingContext: 0.2,
    focusTime: 0.3,
    codeActivity: 0.2
  },
  productiveFileCategories: ['document', 'code', 'data']
};

/** Insight message templates */
const INSIGHT_TEMPLATES = {
  meetingPrep: "You spent {minutes} minutes preparing for the meeting '{title}' - great preparation!",
  meetingFollowUp: "You had {minutes} minutes of focused work after the meeting '{title}' - excellent follow-through!",
  codeSession: "High productivity code session: {files} files modified across {projects} projects",
  documentWork: "Document-focused session: {files} files edited, indicating writing/research work",
  multitasking: "Session involved {categories} different file types - consider focusing on one type at a time",
  shortBreak: "Short break before meeting '{title}' - good time management",
  deepWork: "Deep work session: {duration} minutes with {files} files in primary project '{project}'",
  contextSwitch: "Multiple project context switches detected - this might impact focus",
  lowActivity: "Low file activity during focus session - consider if this time was used effectively"
};

// === MAIN CLASS ===

/**
 * Productivity Insights Engine
 * 
 * Correlates Windows app data with focus sessions to generate actionable
 * productivity insights. Analyzes meeting context, file activity patterns,
 * and provides scoring and recommendations.
 */
export class ProductivityInsightsEngine {
  private config: InsightsConfig;

  constructor(config: Partial<InsightsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log = this.log.bind(this);
    this.logError = this.logError.bind(this);
  }

  // === MAIN INSIGHTS GENERATION ===

  /**
   * Generate productivity insights for a focus session
   */
  async generateInsights(
    session: ClassifiedSession,
    calendarEvents: WindowsCalendarEvent[],
    fileEvents: FileAccessEvent[]
  ): Promise<ProductivityInsights> {
    try {
      this.log(`Generating insights for session ${session.id}`);

      // Correlate meeting context
      const meetingContext = this.correlateMeetingContext(session, calendarEvents);
      
      // Correlate file activity
      const fileContext = this.correlateFileActivity(session, fileEvents);
      
      // Calculate overall productivity score
      const productivityScore = this.calculateProductivityScore(session, meetingContext, fileContext);
      
      // Generate insights and recommendations
      const insights = this.generateInsightMessages(session, meetingContext, fileContext);
      
      // Generate context tags
      const contextTags = this.generateContextTags(session, meetingContext, fileContext);

      const result: ProductivityInsights = {
        sessionId: session.id,
        sessionDate: new Date(session.startTime),
        meetingContext,
        fileContext,
        productivityScore,
        insights,
        contextTags
      };

      this.log(`Generated ${insights.length} insights for session ${session.id}`);
      return result;

    } catch (error) {
      this.logError(`Failed to generate insights for session ${session.id}:`, error);
      
      // Return minimal insights on error
      return {
        sessionId: session.id,
        sessionDate: new Date(session.startTime),
        productivityScore: 0,
        insights: ['Unable to generate insights due to data processing error'],
        contextTags: ['error']
      };
    }
  }

  /**
   * Generate insights for multiple sessions
   */
  async generateBatchInsights(
    sessions: ClassifiedSession[],
    calendarEvents: WindowsCalendarEvent[],
    fileEvents: FileAccessEvent[]
  ): Promise<ProductivityInsights[]> {
    const results: ProductivityInsights[] = [];

    for (const session of sessions) {
      // Filter events to session timeframe
      const sessionCalendarEvents = this.filterEventsToSession(calendarEvents, session);
      const sessionFileEvents = this.filterFileEventsToSession(fileEvents, session);
      
      const insights = await this.generateInsights(session, sessionCalendarEvents, sessionFileEvents);
      results.push(insights);
    }

    this.log(`Generated insights for ${results.length} sessions`);
    return results;
  }

  // === MEETING CONTEXT CORRELATION ===

  /**
   * Correlate meeting context with focus session
   */
  private correlateMeetingContext(
    session: ClassifiedSession,
    calendarEvents: WindowsCalendarEvent[]
  ): MeetingContext | undefined {
    const sessionStart = new Date(session.startTime);
    const sessionEnd = new Date(session.endTime);

    // Find meetings before, during, and after the session
    const meetingBefore = this.findMeetingBefore(sessionStart, calendarEvents);
    const meetingDuring = this.findMeetingDuring(sessionStart, sessionEnd, calendarEvents);
    const meetingAfter = this.findMeetingAfter(sessionEnd, calendarEvents);

    // If no meetings found, return undefined
    if (!meetingBefore && !meetingDuring && !meetingAfter) {
      return undefined;
    }

    const context: MeetingContext = {
      sessionId: session.id
    };

    // Analyze meeting before session (preparation time)
    if (meetingBefore) {
      const timeDiff = (sessionStart.getTime() - meetingBefore.endTime.getTime()) / (1000 * 60);
      if (timeDiff <= this.config.meetingPrepTimeThreshold) {
        context.meetingBefore = meetingBefore;
        context.timeBetweenMeetingAndSession = timeDiff;
        context.preparationTime = sessionEnd.getTime() - sessionStart.getTime();
      }
    }

    // Analyze meeting during session
    if (meetingDuring) {
      context.meetingDuring = meetingDuring;
    }

    // Analyze meeting after session (follow-up time)
    if (meetingAfter) {
      const timeDiff = (meetingAfter.startTime.getTime() - sessionEnd.getTime()) / (1000 * 60);
      if (timeDiff <= this.config.meetingFollowUpTimeThreshold) {
        context.meetingAfter = meetingAfter;
        context.timeBetweenMeetingAndSession = timeDiff;
        context.followUpTime = sessionEnd.getTime() - sessionStart.getTime();
      }
    }

    return context;
  }

  /**
   * Find meeting before session start time
   */
  private findMeetingBefore(sessionStart: Date, events: WindowsCalendarEvent[]): WindowsCalendarEvent | undefined {
    return events
      .filter(event => event.endTime <= sessionStart)
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];
  }

  /**
   * Find meeting during session
   */
  private findMeetingDuring(sessionStart: Date, sessionEnd: Date, events: WindowsCalendarEvent[]): WindowsCalendarEvent | undefined {
    return events.find(event => 
      event.startTime < sessionEnd && event.endTime > sessionStart
    );
  }

  /**
   * Find meeting after session end time
   */
  private findMeetingAfter(sessionEnd: Date, events: WindowsCalendarEvent[]): WindowsCalendarEvent | undefined {
    return events
      .filter(event => event.startTime >= sessionEnd)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
  }

  // === FILE ACTIVITY CORRELATION ===

  /**
   * Correlate file activity with focus session
   */
  private correlateFileActivity(
    session: ClassifiedSession,
    fileEvents: FileAccessEvent[]
  ): FileActivityContext {
    const sessionStart = new Date(session.startTime);
    const sessionEnd = new Date(session.endTime);

    // Filter file events to session timeframe
    const sessionFileEvents = fileEvents.filter(event => 
      event.accessTime >= sessionStart && event.accessTime <= sessionEnd
    );

    // Analyze file activity
    const fileTypes = [...new Set(sessionFileEvents.map(event => event.fileExtension))];
    const filesModified = sessionFileEvents.filter(event => event.accessType === 'modified').length;
    const filesCreated = sessionFileEvents.filter(event => event.accessType === 'created').length;
    
    // Detect primary project
    const primaryProject = this.detectPrimaryProject(sessionFileEvents);
    
    // Calculate productivity score based on file activity
    const productivityScore = this.calculateFileActivityScore(sessionFileEvents);

    return {
      sessionId: session.id,
      filesAccessed: sessionFileEvents,
      primaryProject,
      fileTypes,
      filesModified,
      filesCreated,
      productivityScore
    };
  }

  /**
   * Detect primary project from file events
   */
  private detectPrimaryProject(fileEvents: FileAccessEvent[]): string | undefined {
    const projectCounts: Record<string, number> = {};

    fileEvents.forEach(event => {
      if (event.projectDirectory) {
        projectCounts[event.projectDirectory] = (projectCounts[event.projectDirectory] || 0) + 1;
      }
    });

    // Return project with most file activity
    const entries = Object.entries(projectCounts);
    if (entries.length === 0) return undefined;
    
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Calculate productivity score based on file activity
   */
  private calculateFileActivityScore(fileEvents: FileAccessEvent[]): number {
    if (fileEvents.length === 0) return 0;

    let score = 0;
    const weights = {
      created: 3,
      modified: 2,
      opened: 1
    };

    // Base score from file activity
    fileEvents.forEach(event => {
      score += weights[event.accessType] || 0;
      
      // Bonus for productive file types
      if (this.config.productiveFileCategories.includes(event.category)) {
        score += 1;
      }
    });

    // Normalize score (0-100)
    return Math.min(100, (score / fileEvents.length) * 10);
  }

  // === PRODUCTIVITY SCORING ===

  /**
   * Calculate overall productivity score for session
   */
  private calculateProductivityScore(
    session: ClassifiedSession,
    meetingContext?: MeetingContext,
    fileContext?: FileActivityContext
  ): number {
    const weights = this.config.productivityWeights;
    let totalScore = 0;

    // File activity score
    if (fileContext) {
      totalScore += fileContext.productivityScore * weights.fileActivity;
    }

    // Meeting context score
    if (meetingContext) {
      let meetingScore = 0;
      if (meetingContext.preparationTime) meetingScore += 30;
      if (meetingContext.followUpTime) meetingScore += 20;
      if (meetingContext.meetingDuring) meetingScore += 10;
      totalScore += meetingScore * weights.meetingContext;
    }

    // Focus time score
    const sessionDuration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
    const focusScore = Math.min(100, sessionDuration / 60 * 100); // 1 hour = 100 points
    totalScore += focusScore * weights.focusTime;

    // Code activity bonus
    if (fileContext && fileContext.fileTypes.some(type => ['.js', '.ts', '.py', '.java', '.c', '.cpp'].includes(type))) {
      totalScore += 25 * weights.codeActivity;
    }

    return Math.min(100, totalScore);
  }

  // === INSIGHTS GENERATION ===

  /**
   * Generate insight messages based on correlation analysis
   */
  private generateInsightMessages(
    session: ClassifiedSession,
    meetingContext?: MeetingContext,
    fileContext?: FileActivityContext
  ): string[] {
    const insights: string[] = [];

    // Meeting-related insights
    if (meetingContext) {
      if (meetingContext.meetingBefore && meetingContext.preparationTime) {
        insights.push(
          INSIGHT_TEMPLATES.meetingPrep
            .replace('{minutes}', Math.round(meetingContext.preparationTime / (1000 * 60)).toString())
            .replace('{title}', meetingContext.meetingBefore.title)
        );
      }

      if (meetingContext.meetingAfter && meetingContext.followUpTime) {
        insights.push(
          INSIGHT_TEMPLATES.meetingFollowUp
            .replace('{minutes}', Math.round(meetingContext.followUpTime / (1000 * 60)).toString())
            .replace('{title}', meetingContext.meetingAfter.title)
        );
      }
    }

    // File activity insights
    if (fileContext) {
      const codeFiles = fileContext.filesAccessed.filter(f => f.category === 'code');
      if (codeFiles.length > 0) {
        const projects = new Set(codeFiles.map(f => f.projectDirectory).filter(p => p));
        insights.push(
          INSIGHT_TEMPLATES.codeSession
            .replace('{files}', codeFiles.length.toString())
            .replace('{projects}', projects.size.toString())
        );
      }

      const documentFiles = fileContext.filesAccessed.filter(f => f.category === 'document');
      if (documentFiles.length > 3) {
        insights.push(
          INSIGHT_TEMPLATES.documentWork
            .replace('{files}', documentFiles.length.toString())
        );
      }

      if (fileContext.fileTypes.length > 3) {
        insights.push(
          INSIGHT_TEMPLATES.multitasking
            .replace('{categories}', fileContext.fileTypes.length.toString())
        );
      }

      if (fileContext.filesAccessed.length < this.config.minFileActivityThreshold) {
        insights.push(INSIGHT_TEMPLATES.lowActivity);
      }
    }

    // Session-specific insights
    const sessionDuration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
    if (sessionDuration > 90 && fileContext && fileContext.primaryProject) {
      insights.push(
        INSIGHT_TEMPLATES.deepWork
          .replace('{duration}', Math.round(sessionDuration).toString())
          .replace('{files}', fileContext.filesAccessed.length.toString())
          .replace('{project}', fileContext.primaryProject)
      );
    }

    return insights;
  }

  /**
   * Generate context tags for the session
   */
  private generateContextTags(
    session: ClassifiedSession,
    meetingContext?: MeetingContext,
    fileContext?: FileActivityContext
  ): string[] {
    const tags: string[] = [];

    // Meeting tags
    if (meetingContext) {
      if (meetingContext.meetingBefore) tags.push('meeting-prep');
      if (meetingContext.meetingDuring) tags.push('meeting-concurrent');
      if (meetingContext.meetingAfter) tags.push('meeting-followup');
    }

    // File activity tags
    if (fileContext) {
      const mainCategory = this.getMostCommonCategory(fileContext.filesAccessed);
      if (mainCategory) tags.push(`${mainCategory}-work`);
      
      if (fileContext.primaryProject) tags.push('project-focused');
      if (fileContext.fileTypes.length > 3) tags.push('multi-type');
    }

    // Productivity tags
    const sessionDuration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
    if (sessionDuration > 90) tags.push('deep-work');
    if (sessionDuration < 30) tags.push('short-burst');

    return tags;
  }

  /**
   * Get most common file category from access events
   */
  private getMostCommonCategory(fileEvents: FileAccessEvent[]): string | undefined {
    const categoryCounts: Record<string, number> = {};
    
    fileEvents.forEach(event => {
      categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    });

    const entries = Object.entries(categoryCounts);
    if (entries.length === 0) return undefined;
    
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  // === UTILITY METHODS ===

  /**
   * Filter calendar events to session timeframe
   */
  private filterEventsToSession(events: WindowsCalendarEvent[], session: ClassifiedSession): WindowsCalendarEvent[] {
    const sessionStart = new Date(session.startTime);
    const sessionEnd = new Date(session.endTime);
    const bufferTime = 2 * 60 * 60 * 1000; // 2 hours buffer

    return events.filter(event => 
      event.startTime.getTime() >= sessionStart.getTime() - bufferTime &&
      event.startTime.getTime() <= sessionEnd.getTime() + bufferTime
    );
  }

  /**
   * Filter file events to session timeframe
   */
  private filterFileEventsToSession(events: FileAccessEvent[], session: ClassifiedSession): FileAccessEvent[] {
    const sessionStart = new Date(session.startTime);
    const sessionEnd = new Date(session.endTime);

    return events.filter(event => 
      event.accessTime >= sessionStart && event.accessTime <= sessionEnd
    );
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<InsightsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Productivity insights configuration updated');
  }

  // === LOGGING ===

  private log(message: string, ...args: any[]): void {
    console.log(`[ProductivityInsightsEngine] ${message}`, ...args);
  }

  private logError(message: string, error?: any): void {
    console.error(`[ProductivityInsightsEngine] ${message}`, error);
  }
}

// === SINGLETON INSTANCE ===

/** Global insights engine instance */
let insightsEngineInstance: ProductivityInsightsEngine | null = null;

/**
 * Get or create the insights engine singleton
 */
export function getInsightsEngine(config?: Partial<InsightsConfig>): ProductivityInsightsEngine {
  if (!insightsEngineInstance) {
    insightsEngineInstance = new ProductivityInsightsEngine(config);
  }
  return insightsEngineInstance;
}

// === EXPORTS ===

// Class is already exported above
export type { InsightsConfig, ProductivityInsights }; 