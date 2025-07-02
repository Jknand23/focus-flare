/**
 * TimelineChart - Interactive timeline visualization for daily activity sessions
 * 
 * Displays a horizontal timeline showing color-coded activity sessions throughout
 * the day. Supports zooming, filtering, and session selection. Integrates with
 * the activity store for real-time updates and handles user customization of
 * session colors. Core component for Phase 2 MVP dashboard interface.
 * 
 * @module TimelineChart
 * @author FocusFlare Team
 * @since 0.2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { SessionData, SessionType, TimelineDataPoint } from '@/shared/types/activity-types';
import { useContainerSize } from '@/renderer/hooks/use-container-size';

// === COMPONENT TYPES ===

/**
 * Props interface for TimelineChart component
 */
interface TimelineChartProps {
  /** Date to display timeline for */
  date: Date;
  /** Array of classified session data to visualize */
  sessions: SessionData[];
  /** Callback fired when user clicks on a session block */
  onSessionClick?: (session: SessionData) => void;
  /** Custom height for the timeline (default: 60px) */
  height?: number;
  /** Custom session colors */
  sessionColors?: Record<SessionType, string>;
  /** Time range to display (24 hours by default) */
  timeRange?: {
    start: number; // Hour (0-23)
    end: number; // Hour (0-23)
  };
}

// === CONSTANTS ===

/** Default color scheme for session types */
const DEFAULT_SESSION_COLORS: Record<SessionType, string> = {
  'focused-work': '#22c55e', // Green
  'research': '#3b82f6', // Blue
  'entertainment': '#f59e0b', // Orange
  'break': '#8b5cf6', // Purple
  'unclear': '#6b7280' // Gray
};

/** Timeline configuration */
const TIMELINE_CONFIG = {
  minBlockWidth: 4, // Minimum width for session blocks in pixels
  maxBlockHeight: 48, // Maximum height for session blocks
  padding: 8, // Padding around timeline
  hourLabelHeight: 20, // Height for hour labels
  sessionGap: 2, // Gap between session blocks
  hoverDelay: 300 // Delay before showing hover tooltip
} as const;

// === UTILITY FUNCTIONS ===

/**
 * Converts time to pixel position on timeline
 * 
 * @param hour - Hour (0-23)
 * @param totalWidth - Total width of timeline
 * @param timeRange - Time range being displayed
 * @returns Pixel position
 */
function timeToPixel(
  hour: number, 
  totalWidth: number, 
  timeRange: { start: number; end: number }
): number {
  const totalHours = timeRange.end - timeRange.start;
  const relativeHour = hour - timeRange.start;
  return (relativeHour / totalHours) * totalWidth;
}

/**
 * Formats duration for tooltip display
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// === TOOLTIP COMPONENT ===

/**
 * Tooltip component for session information
 */
interface TooltipProps {
  session: SessionData;
  position: { x: number; y: number };
  isVisible: boolean;
}

function SessionTooltip({ session, position, isVisible }: TooltipProps) {
  if (!isVisible) return null;

  const duration = formatDuration(session.duration);
  const startTime = session.startTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const endTime = session.endTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return (
    <div
      className="absolute z-50 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-w-xs"
      style={{
        left: position.x,
        top: position.y - 10,
        transform: 'translateX(-50%) translateY(-100%)'
      }}
    >
      <div className="space-y-2">
        <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
          {session.sessionType.replace('-', ' ')}
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <div>{startTime} - {endTime}</div>
          <div>Duration: {duration}</div>
          <div>Confidence: {Math.round(session.confidenceScore * 100)}%</div>
        </div>
        
        {session.userCorrected && (
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            User corrected
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {session.activities.length} activities
        </div>
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * TimelineChart component for displaying daily activity sessions
 */
export function TimelineChart({
  date,
  sessions,
  onSessionClick,
  height = 60,
  sessionColors = DEFAULT_SESSION_COLORS,
  timeRange = { start: 6, end: 24 } // 6 AM to midnight by default
}: TimelineChartProps) {
  const [hoveredSession, setHoveredSession] = useState<SessionData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Use custom hook for responsive container width tracking
  const { size: containerSize, ref: containerRef } = useContainerSize({
    initialWidth: 800,
    trackHeight: false
  });
  
  const containerWidth = containerSize.width;

  // Calculate timeline data points
  const timelineData = useMemo(() => {
    const dataPoints: TimelineDataPoint[] = [];
    
    // Filter sessions for the selected date
    const dateSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return (
        sessionDate.getFullYear() === date.getFullYear() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getDate() === date.getDate()
      );
    });

    // Sort sessions by start time
    const sortedSessions = dateSessions.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Convert sessions to timeline data points
    for (const session of sortedSessions) {
      const startHour = session.startTime.getHours() + 
                      session.startTime.getMinutes() / 60;
      const endHour = session.endTime.getHours() + 
                     session.endTime.getMinutes() / 60;

      // Only include sessions within time range
      if (endHour >= timeRange.start && startHour <= timeRange.end) {
        dataPoints.push({
          time: session.startTime,
          session,
          isIdle: false,
          duration: session.duration
        });
      }
    }

    return dataPoints;
  }, [sessions, date, timeRange]);

  // Handle session hover
  const handleSessionHover = useCallback((
    session: SessionData | null, 
    event?: React.MouseEvent
  ) => {
    setHoveredSession(session);
    
    if (session && event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  }, []);

  // Handle session click
  const handleSessionClick = useCallback((session: SessionData) => {
    onSessionClick?.(session);
  }, [onSessionClick]);

  // Calculate session block positions and dimensions
  const sessionBlocks = useMemo(() => {
    const availableWidth = containerWidth - (TIMELINE_CONFIG.padding * 2);
    
    return timelineData.map((dataPoint) => {
      if (!dataPoint.session) return null;

      const session = dataPoint.session;
      const startHour = session.startTime.getHours() + 
                       session.startTime.getMinutes() / 60;
      const endHour = session.endTime.getHours() + 
                     session.endTime.getMinutes() / 60;

      // Calculate position and width
      const x = timeToPixel(startHour, availableWidth, timeRange);
      const endX = timeToPixel(endHour, availableWidth, timeRange);
      const width = Math.max(endX - x, TIMELINE_CONFIG.minBlockWidth);

      return {
        session,
        x: x + TIMELINE_CONFIG.padding,
        y: TIMELINE_CONFIG.hourLabelHeight + TIMELINE_CONFIG.sessionGap,
        width,
        height: height - TIMELINE_CONFIG.hourLabelHeight - (TIMELINE_CONFIG.sessionGap * 2),
        color: sessionColors[session.sessionType] || DEFAULT_SESSION_COLORS[session.sessionType]
      };
    }).filter(Boolean);
  }, [timelineData, containerWidth, height, timeRange, sessionColors]);

  // Generate hour labels
  const hourLabels = useMemo(() => {
    const labels = [];
    const availableWidth = containerWidth - (TIMELINE_CONFIG.padding * 2);
    
    for (let hour = timeRange.start; hour <= timeRange.end; hour += 2) {
      const x = timeToPixel(hour, availableWidth, timeRange);
      labels.push({
        hour,
        x: x + TIMELINE_CONFIG.padding,
        label: `${hour.toString().padStart(2, '0')}:00`
      });
    }
    
    return labels;
  }, [containerWidth, timeRange]);

  return (
    <div className="relative">
      {/* Timeline Container */}
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>}
        data-testid="timeline-container"
        className="relative bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600"
        style={{ height: height + TIMELINE_CONFIG.hourLabelHeight }}
      >
        {/* Hour Labels */}
        <div className="absolute top-0 left-0 right-0 h-5">
          {hourLabels.map((label) => (
            <div
              key={label.hour}
              className="absolute text-xs text-gray-500 dark:text-gray-400 transform -translate-x-1/2"
              style={{ left: label.x }}
            >
              {label.label}
            </div>
          ))}
        </div>

        {/* Session Blocks */}
        <div className="absolute inset-0">
          {sessionBlocks.map((block, index) => {
            if (!block) return null;
            
            return (
              <div
                key={`${block.session.id}-${index}`}
                className="absolute rounded cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-105"
                style={{
                  left: block.x,
                  top: block.y,
                  width: block.width,
                  height: block.height,
                  backgroundColor: block.color,
                  border: hoveredSession?.id === block.session.id 
                    ? '2px solid rgba(0, 0, 0, 0.3)' 
                    : '1px solid rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => handleSessionHover(block.session, e)}
                onMouseLeave={() => handleSessionHover(null)}
                onClick={() => handleSessionClick(block.session)}
                title={`${block.session.sessionType.replace('-', ' ')} - ${formatDuration(block.session.duration)}`}
              >
                {/* Session Type Indicator */}
                {block.width > 20 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-xs font-medium truncate px-1">
                      {block.session.sessionType.split('-')[0]}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {sessionBlocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400 dark:text-gray-500 text-sm">
              No sessions recorded for this time range
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      <SessionTooltip
        session={hoveredSession!}
        position={tooltipPosition}
        isVisible={!!hoveredSession}
      />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {Object.entries(sessionColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600 dark:text-gray-300 capitalize">
              {type.replace('-', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 