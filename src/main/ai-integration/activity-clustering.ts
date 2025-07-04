/**
 * Activity Clustering - Smart session boundary detection using ML techniques
 * 
 * Implements clustering algorithms to automatically detect optimal session
 * boundaries based on activity patterns, temporal gaps, context changes,
 * and user behavior. Part of Phase 3 enhanced AI classification system.
 * 
 * @module ActivityClustering
 * @author FocusFlare Team
 * @since 0.3.0
 */

import type { 
  RawActivityData, 
  ActivityLevel 
} from '@/shared/types/activity-types';
// import { detectApplicationContext } from '@/main/system-monitoring/context-detector';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === TYPES ===

/**
 * Activity cluster representing a potential session
 */
export interface ActivityCluster {
  /** Unique cluster identifier */
  id: string;
  /** Activities in this cluster */
  activities: RawActivityData[];
  /** Cluster start time */
  startTime: Date;
  /** Cluster end time */
  endTime: Date;
  /** Total duration in milliseconds */
  duration: number;
  /** Cluster quality score (0-1) */
  qualityScore: number;
  /** Dominant activity type in cluster */
  dominantActivityType: ActivityLevel;
  /** Primary application in cluster */
  primaryApp: string;
  /** Cluster coherence score */
  coherenceScore: number;
  /** Whether cluster represents a natural session break */
  isSessionBreak: boolean;
}

/**
 * Clustering configuration
 */
interface ClusteringConfig {
  /** Maximum time gap within cluster (ms) */
  maxIntraClusterGap: number;
  /** Minimum time gap between clusters (ms) */
  minInterClusterGap: number;
  /** Minimum cluster duration (ms) */
  minClusterDuration: number;
  /** Maximum cluster duration (ms) */
  maxClusterDuration: number;
  /** Context similarity threshold (0-1) */
  contextSimilarityThreshold: number;
  /** Minimum activities per cluster */
  minActivitiesPerCluster: number;
}

/**
 * Activity feature vector for clustering
 */
interface ActivityFeatureVector {
  /** Activity ID */
  activityId: number;
  /** Normalized timestamp (0-1) */
  normalizedTime: number;
  /** Duration weight */
  durationWeight: number;
  /** Application category weight */
  appCategoryWeight: number;
  /** Activity level weight */
  activityLevelWeight: number;
  /** Context similarity weight */
  contextWeight: number;
  /** Interaction density weight */
  interactionWeight: number;
}

// === CONSTANTS ===

/** Default clustering configuration */
const DEFAULT_CLUSTERING_CONFIG: ClusteringConfig = {
  maxIntraClusterGap: 10 * 60 * 1000, // 10 minutes
  minInterClusterGap: 5 * 60 * 1000,  // 5 minutes
  minClusterDuration: 2 * 60 * 1000,  // 2 minutes
  maxClusterDuration: 4 * 60 * 60 * 1000, // 4 hours
  contextSimilarityThreshold: 0.6,
  minActivitiesPerCluster: 2
};

/** Application category weights */
const APP_CATEGORIES = {
  'development': { weight: 1.0, keywords: ['code', 'git', 'terminal', 'ide', 'vscode', 'intellij'] },
  'productivity': { weight: 0.9, keywords: ['office', 'excel', 'word', 'docs', 'sheets', 'powerpoint'] },
  'research': { weight: 0.8, keywords: ['browser', 'chrome', 'firefox', 'edge', 'documentation'] },
  'communication': { weight: 0.7, keywords: ['teams', 'slack', 'zoom', 'skype', 'discord', 'email'] },
  'media': { weight: 0.6, keywords: ['youtube', 'spotify', 'vlc', 'media', 'player'] },
  'entertainment': { weight: 0.5, keywords: ['netflix', 'games', 'social', 'facebook', 'instagram'] },
  'system': { weight: 0.2, keywords: ['explorer', 'settings', 'control', 'system'] }
};

// === CLUSTERING ALGORITHMS ===

/**
 * Advanced activity clustering system for session boundary detection
 */
export class ActivityClusteringEngine {
  private config: ClusteringConfig;

  constructor(customConfig?: Partial<ClusteringConfig>) {
    this.config = { ...DEFAULT_CLUSTERING_CONFIG, ...customConfig };
  }

  /**
   * Clusters activities into logical sessions using multiple algorithms
   * 
   * @param activities - Raw activities to cluster
   * @returns Array of activity clusters representing potential sessions
   */
  async clusterActivities(activities: RawActivityData[]): Promise<ActivityCluster[]> {
    if (activities.length === 0) {
      return [];
    }

    const startTime = Date.now();
    
    if (DEBUG_LOGGING) {
      console.log(`🔬 Activity clustering starting with ${activities.length} activities`);
    }

    try {
      // Sort activities by timestamp
      const sortedActivities = activities.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Step 1: Extract feature vectors
      const featureVectors = await this.extractFeatureVectors(sortedActivities);

      // Step 2: Apply temporal clustering
      const temporalClusters = this.performTemporalClustering(sortedActivities, featureVectors);

      // Step 3: Apply contextual refinement
      const contextualClusters = await this.refineWithContextualAnalysis(temporalClusters);

      // Step 4: Apply density-based clustering for outlier detection
      const densityClusters = this.performDensityBasedClustering(contextualClusters);

      // Step 5: Validate and score clusters
      const finalClusters = this.validateAndScoreClusters(densityClusters);

      const processingTime = Date.now() - startTime;
      
      if (DEBUG_LOGGING) {
        console.log(`🔬 Activity clustering complete: ${finalClusters.length} clusters in ${processingTime}ms`);
      }

      return finalClusters;
    } catch (error) {
      console.error('Activity clustering failed:', error);
      // Fallback to simple time-based clustering
      return this.fallbackTimeClustering(activities);
    }
  }

  /**
   * Extracts feature vectors from activities for clustering analysis
   */
  private async extractFeatureVectors(activities: RawActivityData[]): Promise<ActivityFeatureVector[]> {
    const vectors: ActivityFeatureVector[] = [];
    
    if (activities.length === 0) return vectors;

    const timeSpan = new Date(activities[activities.length - 1].timestamp).getTime() - 
                     new Date(activities[0].timestamp).getTime();

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      
      // Normalize timestamp
      const activityTime = new Date(activity.timestamp).getTime();
      const firstTime = new Date(activities[0].timestamp).getTime();
      const normalizedTime = timeSpan > 0 ? (activityTime - firstTime) / timeSpan : 0;

      // Calculate duration weight
      const durationWeight = Math.min(activity.duration / (30 * 60 * 1000), 1.0); // Normalize to 30 min max

      // Calculate app category weight
      const appCategoryWeight = this.calculateAppCategoryWeight(activity.appName);

      // Calculate activity level weight
      const activityLevelWeight = this.calculateActivityLevelWeight(activity.activityLevel);

      // Calculate context weight (simplified for now)
      const contextWeight = this.calculateContextWeight(activity);

      // Calculate interaction weight
      const interactionWeight = Math.min((activity.interactionCount || 0) / 100, 1.0);

      vectors.push({
        activityId: activity.id,
        normalizedTime,
        durationWeight,
        appCategoryWeight,
        activityLevelWeight,
        contextWeight,
        interactionWeight
      });
    }

    return vectors;
  }

  /**
   * Performs temporal clustering based on time gaps and activity patterns
   */
  private performTemporalClustering(
    activities: RawActivityData[], 
    featureVectors: ActivityFeatureVector[]
  ): ActivityCluster[] {
    const clusters: ActivityCluster[] = [];
    let currentCluster: RawActivityData[] = [];
    let clusterId = 0;

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      
      if (currentCluster.length === 0) {
        // Start new cluster
        currentCluster = [activity];
        continue;
      }

      const lastActivity = currentCluster[currentCluster.length - 1];
      const timeSinceLastActivity = new Date(activity.timestamp).getTime() - 
                                    new Date(lastActivity.timestamp).getTime();

      // Check if activity should be in current cluster
      if (this.shouldContinueCluster(currentCluster, activity, timeSinceLastActivity, featureVectors[i])) {
        currentCluster.push(activity);
      } else {
        // Finalize current cluster and start new one
        if (this.isValidCluster(currentCluster)) {
          clusters.push(this.createCluster(currentCluster, `temporal-${clusterId++}`));
        }
        currentCluster = [activity];
      }
    }

    // Finalize last cluster
    if (currentCluster.length > 0 && this.isValidCluster(currentCluster)) {
      clusters.push(this.createCluster(currentCluster, `temporal-${clusterId}`));
    }

    return clusters;
  }

  /**
   * Determines if an activity should continue the current cluster
   */
  private shouldContinueCluster(
    currentCluster: RawActivityData[],
    nextActivity: RawActivityData,
    timeSinceLastActivity: number,
    _featureVector: ActivityFeatureVector
  ): boolean {
    // Time-based check
    if (timeSinceLastActivity > this.config.maxIntraClusterGap) {
      return false;
    }

    // Duration-based check
    const clusterDuration = this.calculateClusterDuration(currentCluster) + nextActivity.duration;
    if (clusterDuration > this.config.maxClusterDuration) {
      return false;
    }

    // Context similarity check
    if (currentCluster.length > 0) {
      const contextSimilarity = this.calculateContextSimilarity(
        currentCluster[currentCluster.length - 1],
        nextActivity
      );
      if (contextSimilarity < this.config.contextSimilarityThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Refines clusters using contextual analysis
   */
  private async refineWithContextualAnalysis(clusters: ActivityCluster[]): Promise<ActivityCluster[]> {
    const refinedClusters: ActivityCluster[] = [];

    for (const cluster of clusters) {
      try {
        // Analyze context coherence within cluster
        const contextCoherence = await this.analyzeContextCoherence(cluster.activities);
        
        if (contextCoherence.shouldSplit) {
          // Split cluster based on context changes
          const splitClusters = await this.splitClusterByContext(cluster, contextCoherence.splitPoints);
          refinedClusters.push(...splitClusters);
        } else {
          // Keep cluster as is but update coherence score
          cluster.coherenceScore = contextCoherence.score;
          refinedClusters.push(cluster);
        }
      } catch (error) {
        if (DEBUG_LOGGING) {
          console.warn('Context analysis failed for cluster:', cluster.id, error);
        }
        refinedClusters.push(cluster);
      }
    }

    return refinedClusters;
  }

  /**
   * Performs density-based clustering to detect outliers and session breaks
   */
  private performDensityBasedClustering(clusters: ActivityCluster[]): ActivityCluster[] {
    // Simple implementation: identify clusters with very low activity density
    return clusters.filter(cluster => {
      const activityDensity = cluster.activities.length / (cluster.duration / (60 * 1000)); // activities per minute
      
      // Mark very sparse clusters as potential session breaks
      if (activityDensity < 0.1) { // Less than 1 activity per 10 minutes
        cluster.isSessionBreak = true;
      }
      
      return true; // Keep all clusters for now
    });
  }

  /**
   * Validates clusters and assigns quality scores
   */
  private validateAndScoreClusters(clusters: ActivityCluster[]): ActivityCluster[] {
    return clusters
      .filter(cluster => this.isValidCluster(cluster.activities))
      .map(cluster => {
        cluster.qualityScore = this.calculateClusterQualityScore(cluster);
        return cluster;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  /**
   * Fallback clustering when advanced algorithms fail
   */
  private fallbackTimeClustering(activities: RawActivityData[]): ActivityCluster[] {
    const clusters: ActivityCluster[] = [];
    let currentGroup: RawActivityData[] = [];
    let clusterId = 0;

    for (const activity of activities) {
      if (currentGroup.length === 0) {
        currentGroup = [activity];
        continue;
      }

      const lastActivity = currentGroup[currentGroup.length - 1];
      const timeSinceLastActivity = new Date(activity.timestamp).getTime() - 
                                    new Date(lastActivity.timestamp).getTime();

      if (timeSinceLastActivity <= this.config.maxIntraClusterGap) {
        currentGroup.push(activity);
      } else {
        if (currentGroup.length >= this.config.minActivitiesPerCluster) {
          clusters.push(this.createCluster(currentGroup, `fallback-${clusterId++}`));
        }
        currentGroup = [activity];
      }
    }

    if (currentGroup.length >= this.config.minActivitiesPerCluster) {
      clusters.push(this.createCluster(currentGroup, `fallback-${clusterId}`));
    }

    return clusters;
  }

  // === HELPER METHODS ===

  private calculateAppCategoryWeight(appName: string): number {
    const normalizedAppName = appName.toLowerCase();
    
    for (const [_category, config] of Object.entries(APP_CATEGORIES)) {
      if (config.keywords.some(keyword => normalizedAppName.includes(keyword))) {
        return config.weight;
      }
    }
    
    return 0.3; // Default weight for unknown apps
  }

  private calculateActivityLevelWeight(activityLevel: ActivityLevel): number {
    const weights = {
      'active': 1.0,
      'passive': 0.6,
      'background': 0.3,
      'idle': 0.1
    };
    return weights[activityLevel] || 0.5;
  }

  private calculateContextWeight(activity: RawActivityData): number {
    // Simplified context weight based on window title analysis
    const title = activity.windowTitle.toLowerCase();
    
    if (title.includes('github') || title.includes('stackoverflow') || title.includes('documentation')) {
      return 0.9; // High value content
    }
    if (title.includes('youtube') && (title.includes('tutorial') || title.includes('course'))) {
      return 0.8; // Educational content
    }
    if (title.includes('youtube') || title.includes('netflix') || title.includes('entertainment')) {
      return 0.3; // Entertainment content
    }
    
    return 0.5; // Default weight
  }

  private calculateContextSimilarity(activity1: RawActivityData, activity2: RawActivityData): number {
    // Simple similarity based on app name and window title keywords
    const app1 = activity1.appName.toLowerCase();
    const app2 = activity2.appName.toLowerCase();
    
    if (app1 === app2) {
      return 0.8; // Same app = high similarity
    }
    
    // Check for related apps (e.g., browsers, office apps)
    const relatedApps = [
      ['chrome', 'firefox', 'edge', 'safari'],
      ['word', 'excel', 'powerpoint', 'outlook'],
      ['vscode', 'intellij', 'webstorm', 'atom', 'sublime'],
      ['teams', 'zoom', 'skype', 'discord']
    ];
    
    for (const group of relatedApps) {
      if (group.some(app => app1.includes(app)) && group.some(app => app2.includes(app))) {
        return 0.6; // Related apps
      }
    }
    
    return 0.2; // Different apps
  }

  private async analyzeContextCoherence(activities: RawActivityData[]): Promise<{
    score: number;
    shouldSplit: boolean;
    splitPoints: number[];
  }> {
    // Simplified implementation
    const splitPoints: number[] = [];
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 1; i < activities.length; i++) {
      const similarity = this.calculateContextSimilarity(activities[i-1], activities[i]);
      totalSimilarity += similarity;
      comparisons++;
      
      // Mark potential split points
      if (similarity < 0.3) {
        splitPoints.push(i);
      }
    }

    const averageSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 1.0;
    const shouldSplit = splitPoints.length > 0 && averageSimilarity < 0.5;

    return {
      score: averageSimilarity,
      shouldSplit,
      splitPoints
    };
  }

  private async splitClusterByContext(
    cluster: ActivityCluster, 
    splitPoints: number[]
  ): Promise<ActivityCluster[]> {
    const splitClusters: ActivityCluster[] = [];
    let lastSplit = 0;
    
    for (let i = 0; i < splitPoints.length; i++) {
      const splitPoint = splitPoints[i];
      const activities = cluster.activities.slice(lastSplit, splitPoint);
      
      if (activities.length >= this.config.minActivitiesPerCluster) {
        splitClusters.push(this.createCluster(activities, `${cluster.id}-split-${i}`));
      }
      
      lastSplit = splitPoint;
    }
    
    // Add remaining activities
    const remainingActivities = cluster.activities.slice(lastSplit);
    if (remainingActivities.length >= this.config.minActivitiesPerCluster) {
      splitClusters.push(this.createCluster(remainingActivities, `${cluster.id}-split-final`));
    }
    
    return splitClusters;
  }

  private calculateClusterDuration(activities: RawActivityData[]): number {
    if (activities.length === 0) return 0;
    
    const startTime = new Date(activities[0].timestamp).getTime();
    const endTime = new Date(activities[activities.length - 1].timestamp).getTime() + 
                   activities[activities.length - 1].duration;
    
    return endTime - startTime;
  }

  private calculateClusterQualityScore(cluster: ActivityCluster): number {
    let score = 0;
    
    // Duration factor (longer sessions are generally better)
    const durationFactor = Math.min(cluster.duration / (60 * 60 * 1000), 1.0); // Normalize to 1 hour
    score += durationFactor * 0.3;
    
    // Activity density factor
    const densityFactor = Math.min(cluster.activities.length / (cluster.duration / (60 * 1000)), 1.0);
    score += densityFactor * 0.2;
    
    // Coherence factor
    score += cluster.coherenceScore * 0.3;
    
    // App consistency factor
    const uniqueApps = new Set(cluster.activities.map(a => a.appName));
    const consistencyFactor = uniqueApps.size <= 3 ? 1.0 : Math.max(0.3, 3 / uniqueApps.size);
    score += consistencyFactor * 0.2;
    
    return Math.min(score, 1.0);
  }

  private isValidCluster(activities: RawActivityData[]): boolean {
    if (activities.length < this.config.minActivitiesPerCluster) {
      return false;
    }
    
    const duration = this.calculateClusterDuration(activities);
    return duration >= this.config.minClusterDuration;
  }

  private createCluster(activities: RawActivityData[], id: string): ActivityCluster {
    const startTime = new Date(activities[0].timestamp);
    const lastActivity = activities[activities.length - 1];
    const endTime = new Date(lastActivity.timestamp.getTime() + lastActivity.duration);
    const duration = endTime.getTime() - startTime.getTime();
    
    // Determine dominant activity type
    const activityLevels = activities.map(a => a.activityLevel);
    const dominantActivityType = this.findMostCommon(activityLevels) || 'active';
    
    // Determine primary app
    const appNames = activities.map(a => a.appName);
    const primaryApp = this.findMostCommon(appNames) || 'Unknown';
    
    return {
      id,
      activities,
      startTime,
      endTime,
      duration,
      qualityScore: 0, // Will be calculated later
      dominantActivityType,
      primaryApp,
      coherenceScore: 0.5, // Default value
      isSessionBreak: false
    };
  }

  private findMostCommon<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    
    const counts = new Map<T, number>();
    for (const item of array) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    
    let maxCount = 0;
    let mostCommon: T | null = null;
    
    for (const [item, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }
    
    return mostCommon;
  }
}

// === FACTORY FUNCTIONS ===

/**
 * Creates a new activity clustering engine with default configuration
 */
export function createActivityClusteringEngine(
  config?: Partial<ClusteringConfig>
): ActivityClusteringEngine {
  return new ActivityClusteringEngine(config);
}

/**
 * Convenience function for clustering activities
 */
export async function clusterActivitiesIntoSessions(
  activities: RawActivityData[],
  config?: Partial<ClusteringConfig>
): Promise<ActivityCluster[]> {
  const engine = createActivityClusteringEngine(config);
  return await engine.clusterActivities(activities);
} 