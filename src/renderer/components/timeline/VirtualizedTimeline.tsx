/**
 * VirtualizedTimeline - High-performance timeline for large datasets
 * 
 * Provides virtualized rendering for timeline components to handle thousands
 * of sessions efficiently. Uses windowing techniques to render only visible
 * elements, enabling smooth scrolling and interactions with large datasets
 * without performance degradation.
 * 
 * @module VirtualizedTimeline
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import type { 
  SessionData, 
  SessionType, 
  AnalysisTimeRange 
} from '@/shared/types/activity-types';
import { useContainerSize } from '@/renderer/hooks/use-container-size';
import { cn } from '@/renderer/utils/cn';

// === COMPONENT TYPES ===

/**
 * Props for VirtualizedTimeline component
 */
interface VirtualizedTimelineProps {
  /** Sessions data to display */
  sessions: SessionData[];
  /** Date range for the timeline */
  dateRange: AnalysisTimeRange;
  /** Callback when session is selected */
  onSessionSelect?: (session: SessionData) => void;
  /** Callback when date range changes */
  onDateRangeChange?: (range: AnalysisTimeRange) => void;
  /** Custom session colors */
  sessionColors?: Record<SessionType, string>;
  /** Timeline height in pixels */
  height?: number;
  /** Enable zoom functionality */
  enableZoom?: boolean;
  /** Enable horizontal scrolling */
  enableHorizontalScroll?: boolean;
  /** Show time labels */
  showTimeLabels?: boolean;
  /** Custom row height */
  rowHeight?: number;
  /** Custom column width for grid mode */
  columnWidth?: number;
  /** Rendering mode */
  mode?: 'list' | 'grid' | 'calendar';
}

/**
 * Timeline item data for virtualization
 */
interface TimelineItemData {
  /** Session data */
  session: SessionData;
  /** Display position */
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Date for this item */
  date: Date;
  /** Row index */
  rowIndex: number;
  /** Column index */
  columnIndex: number;
}

/**
 * Virtualization configuration
 */
interface VirtualizationConfig {
  /** Items per row */
  itemsPerRow: number;
  /** Row height */
  rowHeight: number;
  /** Column width */
  columnWidth: number;
  /** Overscan count for smoother scrolling */
  overscanCount: number;
  /** Enable caching */
  enableCaching: boolean;
}

// === CONSTANTS ===

/** Default session colors */
const DEFAULT_SESSION_COLORS: Record<SessionType, string> = {
  'focused-work': '#22c55e',
  'research': '#3b82f6',
  'entertainment': '#f59e0b',
  'break': '#8b5cf6',
  'unclear': '#6b7280'
};

/** Default virtualization configuration */
const DEFAULT_VIRTUALIZATION_CONFIG: VirtualizationConfig = {
  itemsPerRow: 1,
  rowHeight: 80,
  columnWidth: 300,
  overscanCount: 5,
  enableCaching: true
};

// === UTILITY FUNCTIONS ===

/**
 * Calculate timeline layout for virtualization
 */
function calculateTimelineLayout(
  sessions: SessionData[],
  dateRange: AnalysisTimeRange,
  config: VirtualizationConfig
): TimelineItemData[] {
  const items: TimelineItemData[] = [];
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  let currentRow = 0;
  let currentColumn = 0;

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.startTime);
    
    // Skip sessions outside date range
    if (sessionDate < dateRange.startDate || sessionDate > dateRange.endDate) {
      continue;
    }

    const item: TimelineItemData = {
      session,
      position: {
        x: currentColumn * config.columnWidth,
        y: currentRow * config.rowHeight,
        width: config.columnWidth - 8, // Padding
        height: config.rowHeight - 8
      },
      date: sessionDate,
      rowIndex: currentRow,
      columnIndex: currentColumn
    };

    items.push(item);

    // Move to next position
    currentColumn++;
    if (currentColumn >= config.itemsPerRow) {
      currentColumn = 0;
      currentRow++;
    }
  }

  return items;
}

/**
 * Group sessions by date for calendar view
 */
function groupSessionsByDate(sessions: SessionData[]): Map<string, SessionData[]> {
  const groups = new Map<string, SessionData[]>();
  
  for (const session of sessions) {
    const dateKey = new Date(session.startTime).toISOString().split('T')[0];
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(session);
  }
  
  return groups;
}

// === TIMELINE ITEM COMPONENTS ===

/**
 * Individual timeline item component
 */
interface TimelineItemProps {
  item: TimelineItemData;
  colors: Record<SessionType, string>;
  onSelect: (session: SessionData) => void;
  isSelected: boolean;
}

function TimelineItem({ item, colors, onSelect, isSelected }: TimelineItemProps) {
  const { session, position } = item;
  const color = colors[session.sessionType] || DEFAULT_SESSION_COLORS[session.sessionType];
  
  const handleClick = useCallback(() => {
    onSelect(session);
  }, [session, onSelect]);

  const duration = session.duration / (1000 * 60); // Convert to minutes
  const startTime = new Date(session.startTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={cn(
        'absolute rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md',
        'border-2 border-transparent',
        isSelected && 'border-blue-500 shadow-lg',
        'bg-white dark:bg-gray-800'
      )}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        borderLeftColor: color,
        borderLeftWidth: '4px'
      }}
      onClick={handleClick}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
            {session.sessionType.replace('-', ' ')}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {startTime} â€¢ {Math.round(duration)}min
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {session.activities.length} activities
          </div>
          <div className="text-xs text-gray-500">
            {Math.round(session.confidenceScore * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * List row component for virtualization
 */
function ListRow({ index, style, data }: ListChildComponentProps) {
  const { items, colors, onSelect, selectedSession } = data;
  const item = items[index];
  
  if (!item) return null;

  return (
    <div style={style}>
      <TimelineItem
        item={item}
        colors={colors}
        onSelect={onSelect}
        isSelected={selectedSession?.id === item.session.id}
      />
    </div>
  );
}

/**
 * Grid cell component for virtualization
 */
function GridCell({ columnIndex, rowIndex, style, data }: any) {
  const { items, colors, onSelect, selectedSession, itemsPerRow } = data;
  const itemIndex = rowIndex * itemsPerRow + columnIndex;
  const item = items[itemIndex];
  
  if (!item) return null;

  return (
    <div style={style}>
      <TimelineItem
        item={item}
        colors={colors}
        onSelect={onSelect}
        isSelected={selectedSession?.id === item.session.id}
      />
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * VirtualizedTimeline component
 */
export function VirtualizedTimeline({
  sessions,
  dateRange,
  onSessionSelect,
  onDateRangeChange: _onDateRangeChange,
  sessionColors = DEFAULT_SESSION_COLORS,
  height = 600,
  enableZoom = true,
  enableHorizontalScroll: _enableHorizontalScroll = true,
  showTimeLabels: _showTimeLabels = true,
  rowHeight = 80,
  columnWidth = 300,
  mode = 'list'
}: VirtualizedTimelineProps) {
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [virtualizationConfig, setVirtualizationConfig] = useState<VirtualizationConfig>({
    ...DEFAULT_VIRTUALIZATION_CONFIG,
    rowHeight,
    columnWidth
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const { size: containerSize } = useContainerSize({
    initialWidth: 800,
    trackHeight: false
  });

  // Calculate items per row based on container width
  const itemsPerRow = useMemo(() => {
    if (mode === 'list') return 1;
    return Math.floor(containerSize.width / virtualizationConfig.columnWidth);
  }, [containerSize.width, virtualizationConfig.columnWidth, mode]);

  // Calculate timeline layout
  const timelineItems = useMemo(() => {
    const config = {
      ...virtualizationConfig,
      itemsPerRow
    };
    return calculateTimelineLayout(sessions, dateRange, config);
  }, [sessions, dateRange, virtualizationConfig, itemsPerRow]);

  // Calculate total rows needed
  const totalRows = useMemo(() => {
    return Math.ceil(timelineItems.length / itemsPerRow);
  }, [timelineItems.length, itemsPerRow]);

  // Handle session selection
  const handleSessionSelect = useCallback((session: SessionData) => {
    setSelectedSession(session);
    onSessionSelect?.(session);
  }, [onSessionSelect]);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoomLevel(newZoom);
    setVirtualizationConfig(prev => ({
      ...prev,
      rowHeight: rowHeight * newZoom,
      columnWidth: columnWidth * newZoom
    }));
  }, [rowHeight, columnWidth]);

  // Prepare data for virtualization
  const virtualizationData = useMemo(() => ({
    items: timelineItems,
    colors: sessionColors,
    onSelect: handleSessionSelect,
    selectedSession,
    itemsPerRow
  }), [timelineItems, sessionColors, handleSessionSelect, selectedSession, itemsPerRow]);

  // Render zoom controls
  const renderZoomControls = () => {
    if (!enableZoom) return null;

    return (
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={() => handleZoomChange(Math.max(0.5, zoomLevel - 0.25))}
          className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          -
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => handleZoomChange(Math.min(2, zoomLevel + 0.25))}
          className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          +
        </button>
      </div>
    );
  };

  // Render timeline statistics
  const renderStats = () => {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Showing {timelineItems.length} of {sessions.length} sessions
      </div>
    );
  };

  // Render virtualized list
  const renderList = () => (
    <AutoSizer>
      {({ height: autoHeight, width }) => (
        <List
          height={autoHeight}
          width={width}
          itemCount={timelineItems.length}
          itemSize={virtualizationConfig.rowHeight}
          itemData={virtualizationData}
          overscanCount={virtualizationConfig.overscanCount}
        >
          {ListRow}
        </List>
      )}
    </AutoSizer>
  );

  // Render virtualized grid
  const renderGrid = () => (
    <AutoSizer>
      {({ height: autoHeight, width }) => (
        <Grid
          height={autoHeight}
          width={width}
          columnCount={itemsPerRow}
          columnWidth={virtualizationConfig.columnWidth}
          rowCount={totalRows}
          rowHeight={virtualizationConfig.rowHeight}
          itemData={virtualizationData}
          overscanColumnCount={virtualizationConfig.overscanCount}
          overscanRowCount={virtualizationConfig.overscanCount}
        >
          {GridCell}
        </Grid>
      )}
    </AutoSizer>
  );

  // Render calendar view
  const renderCalendar = () => {
    const sessionsByDate = groupSessionsByDate(sessions);
    const dates = Array.from(sessionsByDate.keys()).sort();
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {dates.map(dateStr => {
          const dateSessions = sessionsByDate.get(dateStr) || [];
          const totalFocusTime = dateSessions.reduce((sum, session) => {
            return sum + (session.sessionType === 'focused-work' ? session.duration : 0);
          }, 0);
          
          return (
            <div key={dateStr} className="p-2 border rounded">
              <div className="text-sm font-medium">{dateStr}</div>
              <div className="text-xs text-gray-600">
                {dateSessions.length} sessions
              </div>
              <div className="text-xs text-gray-600">
                {Math.round(totalFocusTime / (1000 * 60))}min focus
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Timeline</h3>
        <div className="flex items-center space-x-4">
          {renderZoomControls()}
          <select
            value={mode}
            onChange={(e) => setVirtualizationConfig(prev => ({ ...prev, mode: e.target.value as any }))}
            className="px-3 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="list">List View</option>
            <option value="grid">Grid View</option>
            <option value="calendar">Calendar View</option>
          </select>
        </div>
      </div>

      {renderStats()}

      <div style={{ height }}>
        {mode === 'list' && renderList()}
        {mode === 'grid' && renderGrid()}
        {mode === 'calendar' && renderCalendar()}
      </div>

      {selectedSession && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-2">Selected Session</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Type:</span> {selectedSession.sessionType}
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Duration:</span> {Math.round(selectedSession.duration / (1000 * 60))}min
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Activities:</span> {selectedSession.activities.length}
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Confidence:</span> {Math.round(selectedSession.confidenceScore * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === PERFORMANCE OPTIMIZATIONS ===

/**
 * Memoized timeline item for performance
 */
export const MemoizedTimelineItem = React.memo(TimelineItem);

/**
 * Memoized list row for performance
 */
export const MemoizedListRow = React.memo(ListRow);

/**
 * Memoized grid cell for performance
 */
export const MemoizedGridCell = React.memo(GridCell);

// === EXPORTS ===

export type {
  VirtualizedTimelineProps,
  TimelineItemData,
  VirtualizationConfig
}; 
