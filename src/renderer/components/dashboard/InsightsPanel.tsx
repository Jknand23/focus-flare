/**
 * InsightsPanel - Display personalized insights from pattern analysis
 * 
 * Renders personalized insights and recommendations based on pattern analysis.
 * Shows focus optimization tips, distraction reduction suggestions, schedule
 * adjustments, and goal recommendations. Includes filtering and interaction
 * capabilities for insight management.
 * 
 * @component
 * @example
 * ```tsx
 * <InsightsPanel
 *   dateRange={{ startDate: new Date(), endDate: new Date(), type: 'week' }}
 *   onInsightAction={(insightId, action) => handleInsightAction(insightId, action)}
 * />
 * ```
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { Button } from '@/renderer/components/ui/button';
import { Progress } from '@/renderer/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  X,
  Filter,
  BarChart3,
  Brain
} from 'lucide-react';
import { cn } from '@/renderer/utils/cn';
import type { 
  PersonalizedInsight, 
  AnalysisTimeRange,
  ProductivityTrend 
} from '@/shared/types/activity-types';

type _FocusPattern = any;
type _DistractionPattern = any;
import { 
  usePatternAnalyticsStore,
  useFilteredInsights,
  usePatternAnalysisStats
} from '@/renderer/stores/pattern-analytics-store';

// === COMPONENT PROPS ===

/**
 * Props for the InsightsPanel component
 */
interface InsightsPanelProps {
  /** Date range for analysis */
  dateRange: AnalysisTimeRange;
  /** Callback when user takes action on an insight */
  onInsightAction?: (insightId: string, action: 'act' | 'dismiss') => void;
  /** Custom class name */
  className?: string;
}

/**
 * Props for individual insight card
 */
interface InsightCardProps {
  /** Insight data */
  insight: PersonalizedInsight;
  /** Callback for insight actions */
  onAction?: (action: 'act' | 'dismiss') => void;
}

// === HELPER FUNCTIONS ===

/**
 * Gets icon for insight type
 */
function getInsightIcon(type: PersonalizedInsight['type']) {
  switch (type) {
    case 'focus_optimization':
      return Brain;
    case 'distraction_reduction':
      return AlertTriangle;
    case 'schedule_adjustment':
      return Clock;
    case 'goal_adjustment':
      return Target;
    default:
      return Lightbulb;
  }
}

/**
 * Gets color class for insight priority
 */
function getPriorityColor(priority: PersonalizedInsight['priority']) {
  switch (priority) {
    case 'high':
      return 'border-red-500 bg-red-50 text-red-900';
    case 'medium':
      return 'border-yellow-500 bg-yellow-50 text-yellow-900';
    case 'low':
      return 'border-blue-500 bg-blue-50 text-blue-900';
    default:
      return 'border-gray-500 bg-gray-50 text-gray-900';
  }
}

/**
 * Gets trend icon based on direction
 */
function _getTrendIcon(direction: ProductivityTrend['direction']) {
  switch (direction) {
    case 'improving':
      return TrendingUp;
    case 'declining':
      return TrendingDown;
    default:
      return BarChart3;
  }
}

// === INSIGHT CARD COMPONENT ===

/**
 * Individual insight card component
 */
function InsightCard({ insight, onAction }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const IconComponent = getInsightIcon(insight.type);
  
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      getPriorityColor(insight.priority)
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-medium leading-tight">
                {insight.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {insight.type.replace('_', ' ')}
                </Badge>
                <Badge 
                  variant={insight.priority === 'high' ? 'destructive' : 
                          insight.priority === 'medium' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {insight.priority} priority
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Confidence</div>
              <div className="text-sm font-medium">
                {Math.round(insight.confidence * 100)}%
              </div>
            </div>
            <Progress 
              value={insight.confidence * 100} 
              className="w-12 h-2"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <CardDescription className="text-sm leading-relaxed mb-4">
          {insight.description}
        </CardDescription>
        
        {insight.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Recommendations</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show Less' : 'Show More'}
              </Button>
            </div>
            
            <ul className={cn(
              "space-y-2 text-sm",
              !isExpanded && insight.recommendations.length > 2 && "line-clamp-2"
            )}>
              {(isExpanded ? insight.recommendations : insight.recommendations.slice(0, 2))
                .map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                  <span className="leading-relaxed">{recommendation}</span>
                </li>
              ))}
            </ul>
            
            {!isExpanded && insight.recommendations.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{insight.recommendations.length - 2} more recommendations
              </div>
            )}
          </div>
        )}
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium">Generated:</span>
                <div className="text-muted-foreground">
                  {insight.generatedAt.toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="font-medium">Based on:</span>
                <div className="text-muted-foreground">
                  {insight.supportingData.patterns.join(', ')}
                </div>
              </div>
            </div>
            
            {Object.keys(insight.supportingData.metrics).length > 0 && (
              <div>
                <span className="text-xs font-medium">Supporting Metrics:</span>
                <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                  {Object.entries(insight.supportingData.metrics).map(([key, value]) => (
                    <div key={key}>
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                      <span className="ml-1 font-medium">
                        {typeof value === 'number' ? value.toFixed(1) : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            ID: {insight.id}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction?.('act')}
              className="text-xs"
            >
              I&apos;ll Act on This
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction?.('dismiss')}
              className="text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === MAIN COMPONENT ===

/**
 * InsightsPanel component
 */
export function InsightsPanel({ 
  dateRange, 
  onInsightAction,
  className 
}: InsightsPanelProps) {
  const {
    insights,
    loadingState,
    error,
    insightTypeFilter,
    insightPriorityFilter,
    showOnlyActionable,
    analyzePatterns,
    updateInsightTypeFilter,
    updateInsightPriorityFilter,
    toggleActionableFilter,
    markInsightActedUpon,
    dismissInsight,
    clearError
  } = usePatternAnalyticsStore();
  
  const filteredInsights = useFilteredInsights();
  const stats = usePatternAnalysisStats();
  
  // Load insights when date range changes
  useEffect(() => {
    if (dateRange) {
      analyzePatterns(dateRange.startDate, dateRange.endDate);
    }
  }, [dateRange, analyzePatterns]);
  
  const handleInsightAction = (insightId: string, action: 'act' | 'dismiss') => {
    if (action === 'act') {
      markInsightActedUpon(insightId);
    } else {
      dismissInsight(insightId);
    }
    
    onInsightAction?.(insightId, action);
  };
  
  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Failed to Load Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-red-700 mb-4">
            {error.message}
          </CardDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={clearError}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personalized Insights
          </CardTitle>
          <CardDescription>
            AI-powered recommendations based on your activity patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalPatterns}</div>
              <div className="text-xs text-muted-foreground">Patterns Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.criticalInsights}</div>
              <div className="text-xs text-muted-foreground">Critical Insights</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.averageConfidence}</div>
              <div className="text-xs text-muted-foreground">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredInsights.length}</div>
              <div className="text-xs text-muted-foreground">Active Insights</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <select
              value={insightTypeFilter}
              onChange={(e) => updateInsightTypeFilter(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-md"
            >
              <option value="all">All Types</option>
              <option value="focus_optimization">Focus Optimization</option>
              <option value="distraction_reduction">Distraction Reduction</option>
              <option value="schedule_adjustment">Schedule Adjustment</option>
              <option value="goal_adjustment">Goal Adjustment</option>
            </select>
            
            <select
              value={insightPriorityFilter}
              onChange={(e) => updateInsightPriorityFilter(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-md"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            
            <Button
              variant={showOnlyActionable ? "default" : "outline"}
              size="sm"
              onClick={toggleActionableFilter}
            >
              Actionable Only
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Insights List */}
      {loadingState === 'loading' ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-sm text-muted-foreground">Analyzing patterns...</div>
            </div>
          </CardContent>
        </Card>
      ) : filteredInsights.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-lg mb-2">No Insights Available</CardTitle>
              <CardDescription>
                {insights.length === 0 
                  ? "Not enough data to generate insights. Keep using FocusFlare to build your pattern profile."
                  : "No insights match your current filters. Try adjusting the filter settings."
                }
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAction={(action) => handleInsightAction(insight.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 