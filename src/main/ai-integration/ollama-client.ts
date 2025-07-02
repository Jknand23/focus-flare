/**
 * Ollama Client - Local AI integration for session classification
 * 
 * Manages communication with the local Ollama instance for intelligent
 * session classification. Handles connection management, prompt templating,
 * batch processing, and error recovery. Uses Llama 3.2 3B model for
 * privacy-preserving local AI processing.
 * 
 * @module OllamaClient
 * @author FocusFlare Team
 * @since 0.2.0
 */

import { 
  RawActivityData, 
  SessionClassification, 
  ClassificationRequest,
  OllamaResponse 
} from '@/shared/types/activity-types';

/** Debug logging flag - enable for development/testing */
const DEBUG_LOGGING = true;

// === CONSTANTS ===

/** Default Ollama server configuration */
const OLLAMA_CONFIG = {
  baseUrl: 'http://127.0.0.1:11434',
  model: 'llama3.2:3b',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 2000 // 2 seconds
} as const;

/** Classification prompt template */
const CLASSIFICATION_PROMPT = `You are an expert AI system for analyzing computer activity patterns. Your job is to classify work sessions with high accuracy using contextual clues and established patterns.

=== CLASSIFICATION CATEGORIES ===

🎯 focused-work (Concentrated productive work)
KEY INDICATORS:
• Code/development: VS Code, IntelliJ, GitHub, terminal, database tools
• Document creation: Word, Google Docs, LaTeX, technical writing
• Design work: Figma, Photoshop, CAD software, graphic design
• Data analysis: Excel, SQL tools, analytics platforms, spreadsheets
• Professional software: Industry-specific tools, business applications

PATTERN RECOGNITION:
• Single application focus >15 minutes OR multiple related tools
• Deep engagement with minimal switching
• Professional window titles (project names, file editing, dashboards)

EXAMPLES:
✅ "VS Code - my-project.tsx" + "Chrome - GitHub Pull Request" (45 min) = focused-work
✅ "Figma - Website Redesign" (30 min) = focused-work  
✅ "Excel - Q4 Budget Analysis" + "Calculator" (25 min) = focused-work

🔍 research (Learning and information gathering)
KEY INDICATORS:
• Educational content: Stack Overflow, Wikipedia, documentation, tutorials
• Technical resources: API docs, GitHub exploration, technical blogs
• Learning platforms: Coursera, YouTube educational, PDF papers
• Reference materials: Manuals, guides, troubleshooting, forums

PATTERN RECOGNITION:
• Active information seeking with clear learning intent
• Movement between reference sources
• Educational/technical window titles

EXAMPLES:
✅ "Chrome - Stack Overflow React Hooks" + "Medium - TypeScript Tutorial" = research
✅ "YouTube - Docker Container Tutorial" + "Chrome - Docker Documentation" = research
✅ "PDF Reader - Machine Learning Paper.pdf" (20 min) = research

🎮 entertainment (Leisure and recreational)
KEY INDICATORS:
• Social media: Facebook, Instagram, Twitter, TikTok, Reddit (non-work)
• Entertainment videos: YouTube fun content, Netflix, streaming
• Gaming: Games, game platforms, gaming websites
• Casual browsing: News, shopping, memes, personal interests

PATTERN RECOGNITION:
• Recreational content consumption
• Non-work-related window titles
• Casual, entertainment-focused activities

EXAMPLES:
✅ "YouTube - Funny Cat Videos" + "Reddit - r/memes" = entertainment
✅ "Netflix - TV Show" (45 min) = entertainment
✅ "Instagram - Feed" + "Facebook - Social Posts" = entertainment

⏸️ break (Short pauses and personal tasks)
KEY INDICATORS:
• Very short activities (<2 min average per activity)
• Frequent app switching (>3 different apps in <10 minutes)
• Personal maintenance: Quick email, calendar check, messaging
• System idle: Screen savers, lock screens, away from computer

PATTERN RECOGNITION:
• High switching frequency with low engagement
• Brief, task-oriented activities
• Clear break-like behavior patterns

EXAMPLES:
✅ "Gmail - Quick Check" (1 min) + "Calendar - Today" (30 sec) + "Idle" (5 min) = break
✅ Multiple 30-second app switches across 5 different apps = break

❓ unclear (Insufficient or genuinely ambiguous data)
USE WHEN:
• Truly mixed signals with no dominant pattern
• Generic system activities without clear context
• Insufficient data to make confident determination
• Activities that legitimately don't fit other categories

=== ENHANCED ANALYSIS FRAMEWORK ===

STEP 1 - DURATION ANALYSIS:
• <2 min average → likely break
• 2-15 min → analyze context and switching patterns  
• >15 min single focus → likely focused-work or research

STEP 2 - CONTEXT KEYWORD MATCHING:
High-value indicators (prioritize these):
• Stack Overflow, GitHub, documentation, Wikipedia → research
• VS Code, IntelliJ, Figma, professional tools → focused-work
• YouTube entertainment, social media, games, Netflix → entertainment
• Spotify music, playlists (non-educational) → entertainment
• Quick switching + short durations → break

STEP 3 - PATTERN ANALYSIS:
• Deep focus (1-2 apps, long durations) → focused-work
• Information seeking (multiple reference sources) → research  
• Casual consumption (entertainment platforms, music) → entertainment
• Rapid switching (many apps, short times) → break

STEP 4 - CONFIDENCE CALIBRATION:
• 0.9-1.0: Perfect indicators, zero ambiguity (e.g., "VS Code" solo for 30min = focused-work)
• 0.7-0.8: Strong indicators with minor ambiguity
• 0.5-0.6: Mixed signals but one pattern dominates
• 0.3-0.4: Weak indicators, mostly rule-based
• 0.1-0.2: Very uncertain, use unclear

STEP 5 - ENTERTAINMENT VS RESEARCH CHECK:
• Music/playlists without learning context = entertainment
• YouTube without "tutorial", "course", "learning" = entertainment  
• Social media browsing = entertainment
• If genuinely mixed work+entertainment+unclear → use unclear

=== SESSION DATA ===
Activities: {activities}
Session Duration: {duration} minutes  
Additional Context: {context}
Session Start: {startTime}

=== CRITICAL RULES ===
1. NEVER default to entertainment when uncertain - use unclear instead
2. research requires clear learning/information-seeking intent
3. break is for short activities and high switching, not unclear content
4. Consider the FULL context, not just individual app names
5. Window titles are often more revealing than app names
6. When genuinely mixed signals (work+entertainment, or work+break patterns) → use unclear
7. Music/playlists are entertainment unless clearly educational/work-focused
8. Be conservative with confidence - if in doubt, lower confidence or use unclear

=== RESPONSE FORMAT ===
Respond with ONLY this JSON format (no markdown, no extra text):
{"type": "focused-work", "confidence": 0.8, "reasoning": "Step-by-step analysis: [1] Duration: X minutes suggests Y. [2] Key indicators: specific apps/titles that led to decision. [3] Pattern: behavioral pattern observed. [4] Conclusion: final reasoning for classification."}

The type must be exactly one of: focused-work, research, entertainment, break, unclear

Analyze the session data above and classify it now:`;

// === ERROR CLASSES ===

/**
 * Custom error for Ollama connection issues
 */
export class OllamaConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'OllamaConnectionError';
  }
}

/**
 * Custom error for classification failures
 */
export class ClassificationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ClassificationError';
  }
}

// === CLIENT CLASS ===

/**
 * Ollama client for local AI session classification
 */
export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private isConnected: boolean = false;
  private lastHealthCheck: Date | null = null;

  constructor(config: Partial<typeof OLLAMA_CONFIG> = {}) {
    this.baseUrl = config.baseUrl ?? OLLAMA_CONFIG.baseUrl;
    this.model = config.model ?? OLLAMA_CONFIG.model;
    this.timeout = config.timeout ?? OLLAMA_CONFIG.timeout;
    this.maxRetries = config.maxRetries ?? OLLAMA_CONFIG.maxRetries;
    this.retryDelay = config.retryDelay ?? OLLAMA_CONFIG.retryDelay;
  }

  /**
   * Checks if Ollama server is available and model is loaded
   * 
   * @returns Promise resolving to true if Ollama is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      if (!response.ok) {
        this.isConnected = false;
        return false;
      }

      const data = await response.json();
      const modelExists = data.models?.some((model: any) => 
        model.name.includes(this.model.split(':')[0])
      );

      this.isConnected = modelExists;
      this.lastHealthCheck = new Date();

      if (DEBUG_LOGGING) {
        console.log(`Ollama health check: ${this.isConnected ? 'OK' : 'FAILED'}`);
      }

      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      if (DEBUG_LOGGING) {
        console.warn('Ollama health check failed:', error);
      }
      return false;
    }
  }

  /**
   * Analyzes user feedback patterns to improve future classifications
   * 
   * @param activities - Activity data for analysis
   * @returns Enhanced context based on learned patterns
   */
  private async getLearnedContext(activities: RawActivityData[]): Promise<string> {
    try {
      // Get recent user corrections from database
      const userFeedback = await this.getUserFeedbackPatterns();
      
      if (userFeedback.length === 0) {
        return 'No learned patterns available yet';
      }

      const combinedText = activities.map(a => `${a.appName} ${a.windowTitle}`).join(' ').toLowerCase();
      const relevantFeedback = this.findRelevantFeedback(userFeedback, combinedText);
      
      if (relevantFeedback.length === 0) {
        return 'No similar patterns found in user feedback';
      }

      // Generate contextual insights from feedback
      const insights = this.generateFeedbackInsights(relevantFeedback);
      
      return `Learned patterns: ${insights}`;
    } catch (error) {
      if (DEBUG_LOGGING) {
        console.warn('Failed to get learned context:', error);
      }
      return 'Failed to retrieve learned patterns';
    }
  }

  /**
   * Retrieves user feedback patterns from database
   * 
   * @returns Array of user feedback data
   */
  private async getUserFeedbackPatterns(): Promise<Array<{
    originalClassification: string;
    correctedClassification: string;
    userContext: string;
    activityPattern: string;
    createdAt: Date;
  }>> {
    try {
      const db = require('../database/connection').getDatabaseConnection();
      
      const query = `
        SELECT 
          af.original_classification,
          af.corrected_classification,
          af.user_context,
          s.session_type,
          s.start_time,
          s.end_time,
          s.duration,
          GROUP_CONCAT(a.app_name || '|' || a.window_title, ';;') as activity_pattern
        FROM ai_feedback af
        JOIN sessions s ON af.session_id = s.id
        LEFT JOIN activities a ON a.session_id = s.id
        WHERE af.created_at > datetime('now', '-30 days')
        GROUP BY af.id
        ORDER BY af.created_at DESC
        LIMIT 50
      `;
      
      const feedbackRows = db.prepare(query).all();
      
      return feedbackRows.map((row: any) => ({
        originalClassification: row.original_classification,
        correctedClassification: row.corrected_classification,
        userContext: row.user_context || '',
        activityPattern: row.activity_pattern || '',
        createdAt: new Date(row.created_at || Date.now())
      }));
    } catch (error) {
      if (DEBUG_LOGGING) {
        console.warn('Failed to fetch user feedback:', error);
      }
      return [];
    }
  }

  /**
   * Finds relevant feedback based on activity similarity
   * 
   * @param userFeedback - All user feedback
   * @param currentText - Current activity text to match
   * @returns Relevant feedback entries
   */
  private findRelevantFeedback(
    userFeedback: Array<{
      originalClassification: string;
      correctedClassification: string;
      userContext: string;
      activityPattern: string;
      createdAt: Date;
    }>,
    currentText: string
  ): typeof userFeedback {
    const relevantFeedback = [];
    
    for (const feedback of userFeedback) {
      const similarity = this.calculateTextSimilarity(currentText, feedback.activityPattern.toLowerCase());
      
      if (similarity > 0.3) { // 30% similarity threshold
        relevantFeedback.push({
          ...feedback,
          similarity
        });
      }
    }
    
    // Sort by similarity and recency
    return relevantFeedback
      .sort((a, b) => {
        const similarityDiff = (b.similarity || 0) - (a.similarity || 0);
        if (Math.abs(similarityDiff) < 0.1) {
          // If similarity is close, prefer more recent feedback
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return similarityDiff;
      })
      .slice(0, 5); // Top 5 most relevant
  }

  /**
   * Calculates text similarity using keyword overlap
   * 
   * @param text1 - First text
   * @param text2 - Second text
   * @returns Similarity score (0-1)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const getKeywords = (text: string) => {
      return text.split(/\s+/)
        .filter(word => word.length > 2)
        .map(word => word.replace(/[^\w]/g, ''));
    };
    
    const keywords1 = new Set(getKeywords(text1));
    const keywords2 = new Set(getKeywords(text2));
    
    const intersection = new Set(Array.from(keywords1).filter(x => keywords2.has(x)));
    const union = new Set([...Array.from(keywords1), ...Array.from(keywords2)]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generates insights from relevant user feedback
   * 
   * @param relevantFeedback - Filtered user feedback
   * @returns Human-readable insights
   */
  private generateFeedbackInsights(relevantFeedback: any[]): string {
    const insights = [];
    
    // Pattern analysis
    const corrections = relevantFeedback.map(f => ({
      from: f.originalClassification,
      to: f.correctedClassification,
      context: f.userContext
    }));
    
    // Common correction patterns
    const correctionPatterns = new Map<string, number>();
    corrections.forEach(correction => {
      const key = `${correction.from}→${correction.to}`;
      correctionPatterns.set(key, (correctionPatterns.get(key) || 0) + 1);
    });
    
    // Most common corrections
    const topCorrections = Array.from(correctionPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topCorrections.length > 0) {
      insights.push(`Common corrections: ${topCorrections.map(([pattern, count]) => `${pattern} (${count}x)`).join(', ')}`);
    }
    
    // User context insights
    const userContexts = relevantFeedback
      .map(f => f.userContext)
      .filter(context => context && context.length > 0);
    
    if (userContexts.length > 0) {
      const contextKeywords = userContexts
        .join(' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .reduce((acc, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      const topContextKeywords = Object.entries(contextKeywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);
      
      if (topContextKeywords.length > 0) {
        insights.push(`User insights: ${topContextKeywords.join(', ')}`);
      }
    }
    
    // Recency insights
    const recentCorrections = relevantFeedback.filter(f => 
      (Date.now() - f.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
    
    if (recentCorrections.length > 0) {
      insights.push(`Recent trend: ${recentCorrections.length} similar corrections in past week`);
    }
    
    return insights.length > 0 ? insights.join('; ') : 'No clear patterns identified';
  }

  /**
   * Classifies a batch of activities into session types
   * 
   * @param request - Classification request with activities and options
   * @returns Promise resolving to session classification results
   * @throws {OllamaConnectionError} If Ollama is not available
   * @throws {ClassificationError} If classification fails
   */
  async classifySession(request: ClassificationRequest): Promise<SessionClassification> {
    // Check if Ollama is available
    if (!this.isConnected || this.shouldCheckHealth()) {
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        throw new OllamaConnectionError(
          'Ollama server is not available. Please ensure Ollama is running and the model is loaded.'
        );
      }
    }

    // Prepare activity summary for classification
    const activitySummary = this.prepareActivitySummary(request.activities);
    const duration = this.calculateSessionDuration(request.activities);
    const context = request.context || 'No additional context provided';
    const startTime = request.activities.length > 0 
      ? new Date(request.activities[0].timestamp).toLocaleString() 
      : 'Unknown';
    
    // Get learned context from user feedback
    const learnedContext = await this.getLearnedContext(request.activities);

    const prompt = CLASSIFICATION_PROMPT
      .replace('{activities}', activitySummary)
      .replace('{duration}', duration.toString())
      .replace('{context}', `${context}\n\nLearned Patterns: ${learnedContext}`)
      .replace('{startTime}', startTime);

    // Perform classification with retry logic
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const classification = await this.performClassification(prompt);
        
        if (DEBUG_LOGGING) {
          console.log(`Session classified as: ${classification.type} (confidence: ${classification.confidence})`);
        }
        
        return classification;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          if (DEBUG_LOGGING) {
            console.warn(`Classification attempt ${attempt} failed, retrying...`, error);
          }
          await this.delay(this.retryDelay);
        }
      }
    }

    throw new ClassificationError(
      `Failed to classify session after ${this.maxRetries} attempts`,
      lastError || undefined
    );
  }

  /**
   * Performs the actual classification request to Ollama
   * 
   * @param prompt - Formatted prompt for classification
   * @returns Promise resolving to session classification
   * @throws {Error} If request fails or response is invalid
   */
  private async performClassification(prompt: string): Promise<SessionClassification> {
    const requestBody = {
      model: this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.4, // Balanced temperature for accuracy and creativity
        top_k: 20,
        top_p: 0.95
      }
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();

    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`);
    }

    // Parse the AI response
    return this.parseClassificationResponse(data.response);
  }

  /**
   * Parses AI response into structured classification data
   * 
   * @param response - Raw AI response text
   * @returns Parsed session classification
   * @throws {Error} If response cannot be parsed
   */
  private parseClassificationResponse(response: string): SessionClassification {
    try {
      if (DEBUG_LOGGING) {
        console.log('Raw AI response:', response);
      }

      // Clean up response - remove markdown code blocks and extra whitespace
      let cleanResponse = response.trim()
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]+/gm, '');

      // Try to extract JSON with proper matching
      let jsonStr = '';
      
      // Look for JSON object
      const jsonStart = cleanResponse.indexOf('{');
      if (jsonStart === -1) {
        throw new Error('No JSON object found in AI response');
      }

      // Find matching closing brace
      let braceCount = 0;
      let jsonEnd = -1;
      
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') {
          braceCount++;
        } else if (cleanResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }

      if (jsonEnd === -1) {
        throw new Error('Unclosed JSON object in AI response');
      }

      jsonStr = cleanResponse.substring(jsonStart, jsonEnd + 1);
      
      if (DEBUG_LOGGING) {
        console.log('Extracted JSON:', jsonStr);
      }

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.type || typeof parsed.confidence !== 'number') {
        throw new Error(`Invalid classification response format. Got: ${JSON.stringify(parsed)}`);
      }

      // Normalize and validate session type
      const normalizedType = parsed.type.toLowerCase().trim();
      const validTypes = ['focused-work', 'research', 'entertainment', 'break', 'unclear'];
      
      if (!validTypes.includes(normalizedType)) {
        if (DEBUG_LOGGING) {
          console.warn(`Invalid session type: "${parsed.type}" (normalized: "${normalizedType}"), defaulting to 'unclear'`);
        }
        return {
          type: 'unclear',
          confidence: Math.min(parsed.confidence || 0.1, 0.3),
          reasoning: `Invalid type "${parsed.type}" - ${parsed.reasoning || 'No reasoning provided'}`
        };
      }

      // Ensure confidence is within valid range
      const confidence = Math.max(0, Math.min(1, parsed.confidence));

      return {
        type: normalizedType as SessionClassification['type'],
        confidence,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      if (DEBUG_LOGGING) {
        console.error('Failed to parse AI response:', error);
        console.error('Response was:', response);
      }
      
      // Return fallback classification
      return {
        type: 'unclear',
        confidence: 0.1,
        reasoning: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Prepares activity data for AI analysis with enhanced context
   * 
   * @param activities - Raw activity data
   * @returns Formatted activity summary string with semantic context
   */
  private prepareActivitySummary(activities: RawActivityData[]): string {
    if (activities.length === 0) {
      return 'No activities recorded';
    }

    // Group consecutive activities in the same app to show patterns
    const groupedActivities = this.groupConsecutiveActivities(activities);
    
    let summary = `Session contains ${activities.length} activities across ${new Set(activities.map(a => a.appName)).size} applications:\n\n`;
    
    groupedActivities.forEach((group, index) => {
      const startTime = new Date(group.startTime).toLocaleTimeString();
      const endTime = new Date(group.endTime).toLocaleTimeString();
      const durationMinutes = Math.round(group.totalDuration / (1000 * 60));
      const activityCount = group.activities.length;
      
      summary += `${index + 1}. ${startTime}-${endTime} (${durationMinutes}m) - ${group.appName}\n`;
      
      // Add context clues from window titles
      const contextClues = this.extractContextClues(group.activities);
      if (contextClues.length > 0) {
        summary += `   Context: ${contextClues.join(', ')}\n`;
      }
      
      // Show switching behavior for short activities
      if (activityCount > 3 && group.totalDuration / activityCount < 60000) {
        summary += `   Pattern: Frequent switching (${activityCount} windows, avg ${Math.round(group.totalDuration / activityCount / 1000)}s each)\n`;
      }
      
      summary += '\n';
    });

    // Add session-level patterns
    const sessionPatterns = this.analyzeSessionPatterns(activities);
    if (sessionPatterns.length > 0) {
      summary += `Session Patterns: ${sessionPatterns.join(', ')}\n`;
    }

    return summary;
  }

  /**
   * Groups consecutive activities in the same application
   */
  private groupConsecutiveActivities(activities: RawActivityData[]): Array<{
    appName: string;
    startTime: Date;
    endTime: Date;
    totalDuration: number;
    activities: RawActivityData[];
  }> {
    const groups: Array<{
      appName: string;
      startTime: Date;
      endTime: Date;
      totalDuration: number;
      activities: RawActivityData[];
    }> = [];

    let currentGroup: RawActivityData[] = [];
    let currentApp = '';

    for (const activity of activities) {
      if (activity.appName !== currentApp) {
        // Save previous group
        if (currentGroup.length > 0) {
          groups.push(this.createActivityGroup(currentGroup));
        }
        // Start new group
        currentGroup = [activity];
        currentApp = activity.appName;
      } else {
        currentGroup.push(activity);
      }
    }

    // Save final group
    if (currentGroup.length > 0) {
      groups.push(this.createActivityGroup(currentGroup));
    }

    return groups;
  }

  /**
   * Creates an activity group from consecutive activities
   */
  private createActivityGroup(activities: RawActivityData[]) {
    return {
      appName: activities[0].appName,
      startTime: new Date(activities[0].timestamp),
      endTime: new Date(activities[activities.length - 1].timestamp),
      totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
      activities
    };
  }

  /**
   * Enhanced context clue extraction with semantic analysis
   * 
   * @param activities - Activity group to analyze
   * @returns Array of contextual clues for AI classification
   */
  private extractContextClues(activities: RawActivityData[]): string[] {
    const clues: string[] = [];
    const combinedText = activities.map(a => `${a.appName} ${a.windowTitle}`).join(' ').toLowerCase();
    
    // === WORK INDICATORS ===
    const workKeywords = [
      // Development
      'github', 'git', 'pull request', 'commit', 'repository', 'code review',
      'visual studio', 'intellij', 'sublime', 'atom', 'vscode', 'vs code',
      'npm', 'node', 'typescript', 'javascript', 'python', 'java', 'react', 'vue', 'angular',
      'terminal', 'command line', 'bash', 'powershell', 'cmd',
      'database', 'sql', 'mongodb', 'postgres', 'mysql',
      
      // Business/Professional
      'dashboard', 'analytics', 'metrics', 'report', 'presentation',
      'meeting', 'calendar', 'schedule', 'appointment',
      'project', 'task', 'deadline', 'milestone',
      'client', 'customer', 'business', 'proposal', 'contract',
      'budget', 'finance', 'expense', 'invoice',
      
      // Design/Creative
      'figma', 'sketch', 'photoshop', 'illustrator', 'canva',
      'design', 'mockup', 'wireframe', 'prototype', 'ui', 'ux',
      
      // Document/Content
      'document', 'docs', 'word', 'excel', 'powerpoint', 'sheets', 'slides',
      'writing', 'editing', 'draft', 'article', 'blog'
    ];
    
    // === RESEARCH INDICATORS ===
    const researchKeywords = [
      // Educational Platforms
      'stack overflow', 'stackoverflow', 'wikipedia', 'coursera', 'udemy', 'khan academy',
      'tutorial', 'guide', 'how to', 'learn', 'course', 'lesson',
      'documentation', 'docs', 'api', 'reference', 'manual',
      
      // Academic/Technical
      'research', 'paper', 'study', 'analysis', 'academic', 'journal',
      'arxiv', 'scholar', 'pubmed', 'ieee', 'acm',
      'conference', 'symposium', 'workshop',
      
      // Information Seeking
      'comparison', 'review', 'evaluation', 'benchmark',
      'best practices', 'patterns', 'architecture', 'methodology',
      'troubleshooting', 'debugging', 'solution', 'fix', 'error',
      
      // Learning Content
      'webinar', 'lecture', 'seminar', 'training',
      'certification', 'exam', 'quiz', 'test'
    ];
    
    // === ENTERTAINMENT INDICATORS ===
    const entertainmentKeywords = [
      // Social Media
      'facebook', 'instagram', 'twitter', 'tiktok', 'snapchat', 'linkedin personal',
      'social', 'feed', 'timeline', 'post', 'story', 'reel',
      
      // Entertainment Content
      'youtube entertainment', 'netflix', 'hulu', 'disney', 'prime video',
      'twitch', 'streaming', 'stream', 'live', 'gaming', 'game',
      'meme', 'funny', 'comedy', 'humor', 'viral',
      'celebrity', 'gossip', 'entertainment news',
      
      // Leisure Activities
      'shopping', 'amazon personal', 'ebay', 'store', 'cart',
      'music', 'spotify personal', 'playlist', 'album', 'song',
      'video', 'movie', 'tv show', 'series', 'episode',
      'sports', 'news personal', 'weather', 'horoscope'
    ];
    
    // === BREAK INDICATORS ===
    const breakKeywords = [
      'idle', 'screen saver', 'lock', 'away', 'break',
      'quick check', 'brief', 'glance', 'peek',
      'inbox check', 'notification', 'reminder',
      'personal', 'family', 'friend', 'chat', 'message'
    ];

    // === CONTEXT ANALYSIS ===
    
    // Check for work patterns
    const workMatches = workKeywords.filter(keyword => combinedText.includes(keyword));
    if (workMatches.length > 0) {
      clues.push(`Work indicators: ${workMatches.slice(0, 3).join(', ')}`);
    }
    
    // Check for research patterns
    const researchMatches = researchKeywords.filter(keyword => combinedText.includes(keyword));
    if (researchMatches.length > 0) {
      clues.push(`Learning/Research indicators: ${researchMatches.slice(0, 3).join(', ')}`);
    }
    
    // Check for entertainment patterns
    const entertainmentMatches = entertainmentKeywords.filter(keyword => combinedText.includes(keyword));
    if (entertainmentMatches.length > 0) {
      clues.push(`Entertainment indicators: ${entertainmentMatches.slice(0, 3).join(', ')}`);
    }
    
    // Check for break patterns
    const breakMatches = breakKeywords.filter(keyword => combinedText.includes(keyword));
    if (breakMatches.length > 0) {
      clues.push(`Break indicators: ${breakMatches.slice(0, 3).join(', ')}`);
    }

    // === BEHAVIORAL PATTERNS ===
    
    // Analyze file extensions for development work
    const codeExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.cs', '.php', '.rb', '.go', '.rs', '.vue', '.svelte'];
    const codeFileMatches = codeExtensions.filter(ext => combinedText.includes(ext));
    if (codeFileMatches.length > 0) {
      clues.push(`Code files: ${codeFileMatches.join(', ')}`);
    }
    
    // Analyze educational content duration patterns
    if (combinedText.includes('tutorial') || combinedText.includes('course')) {
      const longDuration = activities.some(a => a.duration > 600000); // >10 minutes
      if (longDuration) {
        clues.push('Extended educational content (>10min)');
      }
    }
    
    // Analyze productivity app combinations
    const productivityApps = ['vscode', 'intellij', 'figma', 'photoshop', 'excel', 'word'];
    const productivityCount = productivityApps.filter(app => combinedText.includes(app)).length;
    if (productivityCount >= 2) {
      clues.push('Multiple productivity tools used');
    }
    
    // Analyze browser context
    if (combinedText.includes('chrome') || combinedText.includes('firefox') || combinedText.includes('edge')) {
      if (researchMatches.length > entertainmentMatches.length) {
        clues.push('Browser: Research-oriented');
      } else if (entertainmentMatches.length > researchMatches.length) {
        clues.push('Browser: Entertainment-oriented');
      } else if (workMatches.length > 0) {
        clues.push('Browser: Work-related');
      }
    }

    // === TEMPORAL PATTERNS ===
    
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDuration / activities.length;
    
    if (avgDuration < 120000) { // <2 minutes average
      clues.push('Very short activities (avg <2min)');
    } else if (avgDuration > 900000) { // >15 minutes average
      clues.push('Extended focus sessions (avg >15min)');
    }
    
    // Check for rapid switching behavior
    if (activities.length > 3 && avgDuration < 300000) { // >3 activities, <5min avg
      clues.push('Rapid app switching pattern');
    }

    // === DOMAIN-SPECIFIC CONTEXT ===
    
    // GitHub/Git activity context
    if (combinedText.includes('github') || combinedText.includes('git')) {
      if (combinedText.includes('pull request') || combinedText.includes('commit') || combinedText.includes('merge')) {
        clues.push('Active code collaboration');
      } else {
        clues.push('Code repository browsing');
      }
    }
    
    // YouTube context analysis
    if (combinedText.includes('youtube')) {
      if (combinedText.includes('tutorial') || combinedText.includes('course') || combinedText.includes('learn')) {
        clues.push('Educational video content');
      } else if (combinedText.includes('music') || combinedText.includes('playlist')) {
        clues.push('Background music/audio');
      } else {
        clues.push('General video consumption');
      }
    }
    
    // Document editing context
    if (combinedText.includes('word') || combinedText.includes('docs') || combinedText.includes('document')) {
      if (combinedText.includes('project') || combinedText.includes('proposal') || combinedText.includes('report')) {
        clues.push('Professional document work');
      } else {
        clues.push('General document editing');
      }
    }

    return clues.slice(0, 8); // Limit to most relevant clues
  }

  /**
   * Analyzes overall session patterns with classification hints
   */
  private analyzeSessionPatterns(activities: RawActivityData[]): string[] {
    const patterns: string[] = [];
    
    // Duration analysis (critical for break detection)
    const avgDuration = activities.reduce((sum, a) => sum + a.duration, 0) / activities.length;
    const avgDurationSeconds = avgDuration / 1000;
    const avgDurationMinutes = avgDuration / (1000 * 60);
    
    if (avgDurationSeconds < 120) {
      patterns.push('⚡ BREAK PATTERN: Very short activities (avg ' + Math.round(avgDurationSeconds) + 's each)');
    } else if (avgDurationMinutes < 5) {
      patterns.push('⚡ BREAK PATTERN: Short activities (avg ' + Math.round(avgDurationMinutes) + 'm each)');
    } else if (avgDurationMinutes > 15) {
      patterns.push('🎯 FOCUS PATTERN: Sustained activities (avg ' + Math.round(avgDurationMinutes) + 'm each)');
    }
    
    // App switching analysis (critical for break detection)
    const uniqueApps = new Set(activities.map(a => a.appName)).size;
    const switchingRate = uniqueApps / activities.length;
    
    if (switchingRate > 0.7) {
      patterns.push('⚡ BREAK PATTERN: Frequent app switching (' + uniqueApps + ' apps in ' + activities.length + ' activities)');
    } else if (uniqueApps === 1) {
      patterns.push('🎯 FOCUS PATTERN: Single application focus');
    } else if (uniqueApps <= 3) {
      patterns.push('📚 RESEARCH PATTERN: Limited app set, focused browsing');
    }
    
    // Session duration analysis
    const timestamps = activities.map(a => new Date(a.timestamp));
    const sessionDuration = timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime();
    const sessionMinutes = sessionDuration / (1000 * 60);
    
    if (sessionMinutes < 10) {
      patterns.push('⚡ BREAK PATTERN: Very short session (' + Math.round(sessionMinutes) + 'm total)');
    } else if (sessionMinutes > 120) {
      patterns.push('🎯 FOCUS PATTERN: Extended session (' + Math.round(sessionMinutes) + 'm total)');
    }
    
    // Activity type clustering
    const hasSystemIdle = activities.some(a => 
      a.appName.toLowerCase().includes('idle') || 
      a.windowTitle.toLowerCase().includes('idle') ||
      a.windowTitle.toLowerCase().includes('screen')
    );
    if (hasSystemIdle) {
      patterns.push('⚡ BREAK PATTERN: System idle time detected');
    }
    
    return patterns;
  }

  /**
   * Calculates total session duration in minutes
   * 
   * @param activities - Activity data array
   * @returns Total duration in minutes
   */
  private calculateSessionDuration(activities: RawActivityData[]): number {
    const totalMs = activities.reduce((sum, activity) => sum + activity.duration, 0);
    return Math.round(totalMs / (1000 * 60));
  }

  /**
   * Determines if a health check is needed
   * 
   * @returns True if health check should be performed
   */
  private shouldCheckHealth(): boolean {
    if (!this.lastHealthCheck) return true;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastHealthCheck < fiveMinutesAgo;
  }

  /**
   * Utility function for adding delays between retries
   * 
   * @param ms - Delay in milliseconds
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets current connection status
   * 
   * @returns Current connection status
   */
  getConnectionStatus(): { 
    isConnected: boolean; 
    lastHealthCheck: Date | null;
    model: string;
  } {
    return {
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      model: this.model
    };
  }
}

// === SINGLETON INSTANCE ===

/** Global Ollama client instance */
let ollamaClient: OllamaClient | null = null;

/**
 * Gets or creates the global Ollama client instance
 * 
 * @param config - Optional configuration override
 * @returns Ollama client instance
 */
export function getOllamaClient(config?: Partial<typeof OLLAMA_CONFIG>): OllamaClient {
  if (!ollamaClient || config) {
    ollamaClient = new OllamaClient(config);
  }
  return ollamaClient;
}

/**
 * Convenience function for checking Ollama availability
 * 
 * @returns Promise resolving to true if Ollama is available
 */
export async function checkOllamaStatus(): Promise<boolean> {
  const client = getOllamaClient();
  return await client.checkHealth();
}

/**
 * Convenience function for session classification
 * 
 * @param activities - Activities to classify
 * @param context - Optional context for classification
 * @returns Promise resolving to session classification
 */
export async function classifyActivities(
  activities: RawActivityData[], 
  context?: string
): Promise<SessionClassification> {
  const client = getOllamaClient();
  return await client.classifySession({ activities, context });
} 