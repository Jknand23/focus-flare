/**
 * PatternAnalysisDashboard - Comprehensive pattern analysis and insights dashboard
 * 
 * Main dashboard for displaying pattern analysis results including focus patterns,
 * distraction patterns, productivity trends, and personalized insights. Provides
 * an integrated view of all Phase 3 pattern recognition features with interactive
 * visualizations and actionable recommendations.
 * 
 * @component
 * @example
 * ```tsx
 * <PatternAnalysisDashboard
 *   dateRange={{ startDate: new Date(), endDate: new Date(), type: 'month' }}
 *   onDateRangeChange={(range) => setDateRange(range)}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { Button } from '@/renderer/components/ui/button';
import { Progress } from '@/renderer/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Brain,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/renderer/utils/cn';
import { InsightsPanel } from './InsightsPanel';
import type { 
  AnalysisTimeRange,
  FocusPattern,
  DistractionPattern,
  ProductivityTrend
} from '@/shared/types/activity-types';
import { 
  usePatternAnalyticsStore,
  usePatternAnalysisStats
} from '@/renderer/stores/pattern-analytics-store';

// === COMPONENT PROPS ===

/**
 * Props for the PatternAnalysisDashboard component
 */
interface PatternAnalysisDashboardProps {
  /** Current date range for analysis */
  dateRange: AnalysisTimeRange;
  /** Callback when date range changes */
  onDateRangeChange?: (range: AnalysisTimeRange) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Props for focus pattern visualization
 */
interface FocusPatternCardProps {
  /** Focus pattern data */
  pattern: FocusPattern;
  /** Whether to show detailed view */
  showDetails?: boolean;
}

/**
 * Props for distraction pattern visualization
 */
interface DistractionPatternCardProps {
  /** Distraction pattern data */
  pattern: DistractionPattern;
  /** Whether to show detailed view */
  showDetails?: boolean;
}

/**
 * Props for productivity trend visualization
 */
interface ProductivityTrendCardProps {
  /** Productivity trend data */
  trend: ProductivityTrend;
  /** Whether to show detailed view */
  showDetails?: boolean;
}

// === HELPER FUNCTIONS ===

/**
 * Formats hour for display (12-hour format)
 */
function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}${ampm}`;
}

/**
 * Gets color class for pattern confidence
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600 bg-green-100';
  if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Gets trend color and icon
 */
function getTrendDisplay(direction: ProductivityTrend['direction']) {
  switch (direction) {
    case 'improving':
      return { 
        icon: TrendingUp, 
        color: 'text-green-600 bg-green-100',
        label: 'Improving'
      };
    case 'declining':
      return { 
        icon: TrendingDown, 
        color: 'text-red-600 bg-red-100',
        label: 'Declining'
      };
    default:
      return { 
        icon: BarChart3, 
        color: 'text-blue-600 bg-blue-100',
        label: 'Stable'
      };
  }
}

// === FOCUS PATTERN CARD ===

/**
 * Focus pattern visualization card
 */
function FocusPatternCard({ pattern, showDetails = false }: FocusPatternCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  
  const renderPatternData = () => {
    switch (pattern.type) {
      case 'peak_hours': {
        const hours = pattern.data.peakHours || [];
        return (
          <div>
            <div className="text-sm font-medium mb-2">Peak Focus Hours</div>
            <div className="flex flex-wrap gap-1">
              {hours.map(hour => (
                <Badge key={hour} variant="secondary" className="text-xs">
                  {formatHour(hour)}
                </Badge>
              ))}
            </div>
          </div>
        );
      }
        
      case 'optimal_session_length': {
        const duration = pattern.data.optimalDuration || 0;
        return (
          <div>
            <div className="text-sm font-medium mb-2">Optimal Session Length</div>
            <div className="text-2xl font-bold text-primary">
              {duration} minutes
            </div>
          </div>
        );
      }
        
      case 'productivity_rhythm': {
        const weeklyPattern = pattern.data.weeklyPattern || [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
          <div>
            <div className="text-sm font-medium mb-2">Weekly Productivity Rhythm</div>
            <div className="grid grid-cols-7 gap-1">
              {weeklyPattern.map((value, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-muted-foreground">{dayNames[index]}</div>
                  <div className="h-8 bg-muted rounded flex items-end">
                    <div 
                      className="w-full bg-primary rounded"
                      style={{ 
                        height: `${Math.max(10, (value / Math.max(...weeklyPattern)) * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs font-medium mt-1">
                    {Math.round(value)}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
        
      default:
        return <div className="text-sm text-muted-foreground">Pattern data available</div>;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {pattern.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", getConfidenceColor(pattern.confidence))}>
              {Math.round(pattern.confidence * 100)}% confident
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          Based on {pattern.sampleSize} sessions, frequency: {Math.round(pattern.frequency * 100)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderPatternData()}
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Sample Size:</span>
                <div className="text-muted-foreground">{pattern.sampleSize} sessions</div>
              </div>
              <div>
                <span className="font-medium">Identified:</span>
                <div className="text-muted-foreground">
                  {pattern.identifiedAt.toLocaleDateString()}
                </div>
              </div>
            </div>
            <Progress value={pattern.confidence * 100} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Confidence Score: {Math.round(pattern.confidence * 100)}%
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === DISTRACTION PATTERN CARD ===

/**
 * Distraction pattern visualization card
 */
function DistractionPatternCard({ pattern, showDetails = false }: DistractionPatternCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {pattern.trigger}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="destructive" 
              className="text-xs"
            >
              {Math.round(pattern.severity * 100)}% severity
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription className="text-orange-700">
          Interrupts {pattern.frequencyPerDay.toFixed(1)} times per day, 
          {pattern.averageDuration.toFixed(0)} minutes average
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Frequency</div>
            <div className="text-2xl font-bold text-orange-600">
              {pattern.frequencyPerDay.toFixed(1)}/day
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Duration</div>
            <div className="text-2xl font-bold text-orange-600">
              {pattern.averageDuration.toFixed(0)}min
            </div>
          </div>
        </div>
        
        {pattern.commonTimeRanges.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Common Times</div>
            <div className="flex flex-wrap gap-1">
              {pattern.commonTimeRanges.map((range, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {formatHour(range.start)} - {formatHour(range.end)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Context</div>
              <div className="text-sm text-muted-foreground">
                Usually happens after <span className="font-medium">{pattern.context.previousActivity}</span>
                {pattern.context.sessionType !== 'unclear' && (
                  <span> during <span className="font-medium">{pattern.context.sessionType}</span> sessions</span>
                )}
              </div>
            </div>
            
            {pattern.context.focusDurationBefore > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Focus Time Before</div>
                <div className="text-sm text-muted-foreground">
                  {pattern.context.focusDurationBefore.toFixed(0)} minutes average
                </div>
              </div>
            )}
            
            <Progress value={pattern.severity * 100} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Severity Score: {Math.round(pattern.severity * 100)}%
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === PRODUCTIVITY TREND CARD ===

/**
 * Productivity trend visualization card
 */
function ProductivityTrendCard({ trend, showDetails = false }: ProductivityTrendCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const trendDisplay = getTrendDisplay(trend.direction);
  const IconComponent = trendDisplay.icon;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            Productivity Trend
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", trendDisplay.color)}>
              {trendDisplay.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          {trend.period} analysis with {Math.round(trend.confidence * 100)}% confidence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Focus Time</div>
            <div className={cn(
              "text-lg font-bold",
              trend.metrics.focusTime.change > 0 ? "text-green-600" : 
              trend.metrics.focusTime.change < 0 ? "text-red-600" : "text-gray-600"
            )}>
              {trend.metrics.focusTime.changePercent > 0 ? '+' : ''}
              {trend.metrics.focusTime.changePercent.toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Quality</div>
            <div className={cn(
              "text-lg font-bold",
              trend.metrics.sessionQuality.change > 0 ? "text-green-600" : 
              trend.metrics.sessionQuality.change < 0 ? "text-red-600" : "text-gray-600"
            )}>
              {trend.metrics.sessionQuality.changePercent > 0 ? '+' : ''}
              {trend.metrics.sessionQuality.changePercent.toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Distractions</div>
            <div className={cn(
              "text-lg font-bold",
              trend.metrics.distractionRate.change < 0 ? "text-green-600" : 
              trend.metrics.distractionRate.change > 0 ? "text-red-600" : "text-gray-600"
            )}>
              {trend.metrics.distractionRate.changePercent > 0 ? '+' : ''}
              {trend.metrics.distractionRate.changePercent.toFixed(1)}%
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div>
              <div className="text-sm font-medium mb-2">Current vs Previous Period</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Focus Time:</span>
                  <span>
                    {trend.metrics.focusTime.current.toFixed(0)}min 
                    <span className="text-muted-foreground ml-1">
                      (was {trend.metrics.focusTime.previous.toFixed(0)}min)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Session Quality:</span>
                  <span>
                    {Math.round(trend.metrics.sessionQuality.current * 100)}%
                    <span className="text-muted-foreground ml-1">
                      (was {Math.round(trend.metrics.sessionQuality.previous * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Distraction Rate:</span>
                  <span>
                    {Math.round(trend.metrics.distractionRate.current * 100)}%
                    <span className="text-muted-foreground ml-1">
                      (was {Math.round(trend.metrics.distractionRate.previous * 100)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Forecast</div>
              <div className="text-sm text-muted-foreground">
                Next period prediction: {trend.forecast.predictedFocusTime.toFixed(0)} minutes focus time
                ({Math.round(trend.forecast.confidence * 100)}% confidence)
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === MAIN COMPONENT ===

/**
 * PatternAnalysisDashboard component
 */
export function PatternAnalysisDashboard({ 
  dateRange, 
  onDateRangeChange: _onDateRangeChange,
  className 
}: PatternAnalysisDashboardProps) {
  const {
    focusPatterns,
    distractionPatterns,
    productivityTrend,
    loadingState,
    error,
    lastAnalyzed,
    analyzePatterns,
    refreshAnalysis,
    clearError
  } = usePatternAnalyticsStore();
  
  const stats = usePatternAnalysisStats();
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'insights'>('overview');
  
  // Auto-refresh when date range changes
  useEffect(() => {
    if (dateRange) {
      analyzePatterns(dateRange.startDate, dateRange.endDate);
    }
  }, [dateRange, analyzePatterns]);
  
  const handleRefresh = () => {
    refreshAnalysis();
  };
  
  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Pattern Analysis Error
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
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Pattern Analysis Dashboard
              </CardTitle>
              <CardDescription>
                Advanced analytics and insights for {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {lastAnalyzed && (
                <div className="text-xs text-muted-foreground">
                  Updated: {lastAnalyzed.toLocaleTimeString()}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingState === 'loading'}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loadingState === 'loading' && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted rounded-lg p-1">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'patterns', label: 'Patterns', icon: Target },
          { key: 'insights', label: 'Insights', icon: Brain }
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.key as any)}
            className="flex-1"
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>
      
      {/* Content */}
      {loadingState === 'loading' ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-sm text-muted-foreground">Analyzing your patterns...</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stats Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{focusPatterns.length}</div>
                      <div className="text-xs text-muted-foreground">Focus Patterns</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{distractionPatterns.length}</div>
                      <div className="text-xs text-muted-foreground">Distractions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.criticalInsights}</div>
                      <div className="text-xs text-muted-foreground">Critical Insights</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.averageConfidence}</div>
                      <div className="text-xs text-muted-foreground">Avg Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Productivity Trend */}
              {productivityTrend && (
                <ProductivityTrendCard trend={productivityTrend} />
              )}
            </div>
          )}
          
          {activeTab === 'patterns' && (
            <div className="space-y-6">
              {/* Focus Patterns */}
              {focusPatterns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Focus Patterns</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {focusPatterns.map((pattern, index) => (
                      <FocusPatternCard key={index} pattern={pattern} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Distraction Patterns */}
              {distractionPatterns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Distraction Patterns</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {distractionPatterns.map((pattern, index) => (
                      <DistractionPatternCard key={index} pattern={pattern} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'insights' && (
            <InsightsPanel 
              dateRange={dateRange}
              onInsightAction={(insightId, action) => {
                console.log(`Insight ${insightId} action: ${action}`);
              }}
            />
          )}
        </>
      )}
    </div>
  );
} 