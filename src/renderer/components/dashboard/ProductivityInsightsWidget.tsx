/**
 * ProductivityInsightsWidget - Windows Integration Insights Display
 * 
 * Dashboard widget that displays productivity insights generated from Windows
 * Calendar and File Explorer integrations. Shows meeting context, file activity
 * patterns, and actionable productivity recommendations.
 * 
 * Features:
 * - Meeting preparation and follow-up insights
 * - File activity productivity scoring
 * - Context tags and session categorization
 * - Productivity trends and recommendations
 * - Interactive insight exploration
 * 
 * @component
 * @author FocusFlare Team
 * @since Phase 4
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { Button } from '@/renderer/components/ui/button';
import { 
  Calendar, 
  Files, 
  Clock, 
  Lightbulb,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react';
import type { 
  ProductivityInsights
} from '@/shared/types/windows-integration-types';
import type { _ClassifiedSession } from '@/shared/types/activity-types';

// === TYPES ===

interface ProductivityInsightsWidgetProps {
  /** Array of productivity insights to display */
  insights: ProductivityInsights[];
  /** Whether to show detailed view */
  expanded?: boolean;
  /** Time range for insights */
  timeRange?: 'today' | 'week' | 'month';
  /** Callback when insight is clicked */
  onInsightClick?: (insight: ProductivityInsights) => void;
}

interface InsightCardProps {
  /** Individual productivity insight */
  insight: ProductivityInsights;
  /** Whether card is expanded */
  expanded: boolean;
  /** Toggle expansion handler */
  onToggle: () => void;
  /** Click handler */
  onClick?: () => void;
}

interface ProductivityMetrics {
  /** Average productivity score */
  averageScore: number;
  /** Total insights count */
  totalInsights: number;
  /** Meeting context sessions */
  meetingContextSessions: number;
  /** File activity sessions */
  fileActivitySessions: number;
  /** High productivity sessions */
  highProductivitySessions: number;
  /** Most common context tags */
  topContextTags: string[];
}

// === UTILITY FUNCTIONS ===

/**
 * Calculate productivity metrics from insights array
 */
function calculateProductivityMetrics(insights: ProductivityInsights[]): ProductivityMetrics {
  if (insights.length === 0) {
    return {
      averageScore: 0,
      totalInsights: 0,
      meetingContextSessions: 0,
      fileActivitySessions: 0,
      highProductivitySessions: 0,
      topContextTags: []
    };
  }

  const totalScore = insights.reduce((sum, insight) => sum + insight.productivityScore, 0);
  const averageScore = totalScore / insights.length;

  const meetingContextSessions = insights.filter(i => i.meetingContext).length;
  const fileActivitySessions = insights.filter(i => i.fileContext).length;
  const highProductivitySessions = insights.filter(i => i.productivityScore >= 75).length;

  // Count context tags
  const tagCounts: Record<string, number> = {};
  insights.forEach(insight => {
    insight.contextTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topContextTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    averageScore,
    totalInsights: insights.length,
    meetingContextSessions,
    fileActivitySessions,
    highProductivitySessions,
    topContextTags
  };
}

/**
 * Get productivity score color
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get productivity score badge variant
 */
function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'destructive';
}

// === MAIN COMPONENT ===

/**
 * Productivity Insights Widget
 * 
 * Displays aggregated productivity insights from Windows integrations
 * with interactive exploration and actionable recommendations.
 */
export function ProductivityInsightsWidget({
  insights,
  expanded: _expanded = false,
  timeRange = 'today',
  onInsightClick
}: ProductivityInsightsWidgetProps) {
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [showAllInsights, setShowAllInsights] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => calculateProductivityMetrics(insights), [insights]);

  // Sort insights by productivity score (highest first)
  const sortedInsights = useMemo(() => 
    [...insights].sort((a, b) => b.productivityScore - a.productivityScore),
    [insights]
  );

  // Display insights (show top 3 by default)
  const displayInsights = showAllInsights ? sortedInsights : sortedInsights.slice(0, 3);

  const handleInsightClick = (insight: ProductivityInsights) => {
    setSelectedInsightId(selectedInsightId === insight.sessionId ? null : insight.sessionId);
    onInsightClick?.(insight);
  };

  // No insights state
  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Productivity Insights
          </CardTitle>
          <CardDescription>
            Insights from Windows Calendar and File Explorer integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No insights available
            </h3>
            <p className="text-sm text-muted-foreground">
              Enable Windows integrations to see productivity insights
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Productivity Insights
            <Badge variant="outline">{timeRange}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getScoreBadgeVariant(metrics.averageScore)}>
              {Math.round(metrics.averageScore)}% avg
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Insights from {metrics.totalInsights} sessions with Windows app data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metrics.meetingContextSessions}
            </div>
            <div className="text-xs text-muted-foreground">
              Meeting Context
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {metrics.fileActivitySessions}
            </div>
            <div className="text-xs text-muted-foreground">
              File Activity
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {metrics.highProductivitySessions}
            </div>
            <div className="text-xs text-muted-foreground">
              High Productivity
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(metrics.averageScore)}`}>
              {Math.round(metrics.averageScore)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Average Score
            </div>
          </div>
        </div>

        {/* Top Context Tags */}
        {metrics.topContextTags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Common Patterns</h4>
            <div className="flex flex-wrap gap-1">
              {metrics.topContextTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Individual Insights */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Session Insights</h4>
            {sortedInsights.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllInsights(!showAllInsights)}
              >
                {showAllInsights ? 'Show Less' : `Show All (${sortedInsights.length})`}
                {showAllInsights ? (
                  <ChevronDown className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-1" />
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {displayInsights.map((insight) => (
              <InsightCard
                key={insight.sessionId}
                insight={insight}
                expanded={selectedInsightId === insight.sessionId}
                onToggle={() => handleInsightClick(insight)}
                onClick={() => onInsightClick?.(insight)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === INSIGHT CARD COMPONENT ===

/**
 * Individual Insight Card Component
 * 
 * Displays detailed information about a single productivity insight
 * including meeting context, file activity, and recommendations.
 */
function InsightCard({ insight, expanded, onToggle, onClick: _onClick }: InsightCardProps) {
  const scoreBadgeVariant = getScoreBadgeVariant(insight.productivityScore);

  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={scoreBadgeVariant} className="text-xs">
              {Math.round(insight.productivityScore)}%
            </Badge>
            <span className="text-sm font-medium">
              {new Date(insight.sessionDate).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {insight.meetingContext && (
              <Calendar className="h-4 w-4 text-blue-600" />
            )}
            {insight.fileContext && (
              <Files className="h-4 w-4 text-green-600" />
            )}
            {insight.contextTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag.replace('-', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {insight.insights.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {insight.insights.length} insights
            </Badge>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {/* Meeting Context */}
          {insight.meetingContext && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Meeting Context
              </h5>
              <div className="text-sm text-muted-foreground space-y-1">
                {insight.meetingContext.meetingBefore && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Prep before: {insight.meetingContext.meetingBefore.title}
                  </div>
                )}
                {insight.meetingContext.meetingDuring && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    During: {insight.meetingContext.meetingDuring.title}
                  </div>
                )}
                {insight.meetingContext.meetingAfter && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Follow-up after: {insight.meetingContext.meetingAfter.title}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File Activity Context */}
          {insight.fileContext && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <Files className="h-4 w-4" />
                File Activity
              </h5>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  {insight.fileContext.filesAccessed.length} files accessed
                </div>
                {insight.fileContext.primaryProject && (
                  <div>
                    Primary project: {insight.fileContext.primaryProject}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  File types:
                  {insight.fileContext.fileTypes.slice(0, 3).map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                  {insight.fileContext.fileTypes.length > 3 && (
                    <span className="text-xs">
                      +{insight.fileContext.fileTypes.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Insights & Recommendations */}
          {insight.insights.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Insights
              </h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                {insight.insights.map((insightText, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">â€¢</span>
                    {insightText}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === EXPORTS ===

// Function is already exported above
export type { ProductivityInsightsWidgetProps }; 
