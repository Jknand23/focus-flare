/**
 * LazyDashboard - Lazy-loaded dashboard with paginated data fetching
 * 
 * Provides optimized dashboard loading by implementing lazy loading for
 * components and paginated data fetching. Improves startup performance
 * by loading only visible components and data on demand.
 * 
 * @module LazyDashboard
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { 
  lazy, 
  Suspense, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useInView } from 'react-intersection-observer';
import { useActivityStore } from '@/renderer/stores/activity-store';
import { useSessionStore } from '@/renderer/stores/session-store';
import { useSettingsStore } from '@/renderer/stores/settings-store';
import { cn } from '@/renderer/utils/cn';
import type { 
  ActivityData as _ActivityData
} from '@/shared/types/activity-types';

// === LAZY IMPORTS ===

// Lazy load dashboard components
const ActivityList = lazy(() => import('./ActivityList').then(m => ({ default: m.ActivityList })));
const ComparativeAnalysis = lazy(() => import('./ComparativeAnalysis').then(m => ({ default: m.ComparativeAnalysis })));
const FocusStreak = lazy(() => import('./FocusStreak').then(m => ({ default: m.FocusStreak })));
const InsightsPanel = lazy(() => import('./InsightsPanel').then(m => ({ default: m.InsightsPanel })));
const PatternAnalysisDashboard = lazy(() => import('./PatternAnalysisDashboard').then(m => ({ default: m.PatternAnalysisDashboard })));
const WeeklySummary = lazy(() => import('./WeeklySummary').then(m => ({ default: m.WeeklySummary })));
const VirtualizedTimeline = lazy(() => import('../timeline/VirtualizedTimeline').then(m => ({ default: m.VirtualizedTimeline })));
const MultiDayTimeline = lazy(() => import('../timeline/MultiDayTimeline').then(m => ({ default: m.MultiDayTimeline })));

// === TYPES ===

/**
 * Dashboard component configuration
 */
interface DashboardComponentConfig {
  /** Component identifier */
  id: string;
  /** Component display name */
  name: string;
  /** Component description */
  description: string;
  /** Load priority (1-10, higher = load first) */
  priority: number;
  /** Whether component is enabled */
  enabled: boolean;
  /** Whether component should be lazy loaded */
  lazy: boolean;
  /** Component size (affects loading order) */
  size: 'small' | 'medium' | 'large';
  /** Dependencies on other components */
  dependencies: string[];
}

/**
 * Pagination configuration
 */
interface PaginationConfig {
  /** Items per page */
  pageSize: number;
  /** Current page */
  currentPage: number;
  /** Total items */
  totalItems: number;
  /** Enable infinite scroll */
  enableInfiniteScroll: boolean;
  /** Preload next page */
  preloadNextPage: boolean;
}

/**
 * Lazy loading state
 */
interface LazyLoadingState {
  /** Components that are currently loading */
  loading: Set<string>;
  /** Components that have loaded */
  loaded: Set<string>;
  /** Components that failed to load */
  failed: Set<string>;
  /** Components that are visible */
  visible: Set<string>;
}

// === CONSTANTS ===

/** Default dashboard component configuration */
const DEFAULT_COMPONENT_CONFIG: DashboardComponentConfig[] = [
  {
    id: 'focus-streak',
    name: 'Focus Streak',
    description: 'Track daily focus streak',
    priority: 10,
    enabled: true,
    lazy: false,
    size: 'small',
    dependencies: []
  },
  {
    id: 'activity-list',
    name: 'Recent Activities',
    description: 'List of recent activities',
    priority: 9,
    enabled: true,
    lazy: false,
    size: 'medium',
    dependencies: []
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Session timeline visualization',
    priority: 8,
    enabled: true,
    lazy: true,
    size: 'large',
    dependencies: []
  },
  {
    id: 'weekly-summary',
    name: 'Weekly Summary',
    description: 'Weekly productivity summary',
    priority: 7,
    enabled: true,
    lazy: true,
    size: 'medium',
    dependencies: []
  },
  {
    id: 'insights-panel',
    name: 'Insights',
    description: 'AI-powered insights',
    priority: 6,
    enabled: true,
    lazy: true,
    size: 'medium',
    dependencies: ['activity-list']
  },
  {
    id: 'pattern-analysis',
    name: 'Pattern Analysis',
    description: 'Advanced pattern recognition',
    priority: 5,
    enabled: true,
    lazy: true,
    size: 'large',
    dependencies: ['timeline']
  },
  {
    id: 'comparative-analysis',
    name: 'Comparative Analysis',
    description: 'Compare different time periods',
    priority: 4,
    enabled: true,
    lazy: true,
    size: 'large',
    dependencies: ['weekly-summary']
  },
  {
    id: 'multi-day-timeline',
    name: 'Multi-Day Timeline',
    description: 'Extended timeline view',
    priority: 3,
    enabled: false,
    lazy: true,
    size: 'large',
    dependencies: ['timeline']
  }
];

/** Default pagination configuration */
const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  pageSize: 50,
  currentPage: 1,
  totalItems: 0,
  enableInfiniteScroll: true,
  preloadNextPage: true
};

// === CUSTOM HOOKS ===

/**
 * Hook for managing lazy loading state
 */
function useLazyLoading() {
  const [state, setState] = useState<LazyLoadingState>({
    loading: new Set(),
    loaded: new Set(),
    failed: new Set(),
    visible: new Set()
  });

  const setLoading = useCallback((componentId: string) => {
    setState(prev => ({
      ...prev,
      loading: new Set([...prev.loading, componentId]),
      failed: new Set([...prev.failed].filter(id => id !== componentId))
    }));
  }, []);

  const setLoaded = useCallback((componentId: string) => {
    setState(prev => ({
      ...prev,
      loading: new Set([...prev.loading].filter(id => id !== componentId)),
      loaded: new Set([...prev.loaded, componentId])
    }));
  }, []);

  const setFailed = useCallback((componentId: string, error?: Error) => {
    setState(prev => ({
      ...prev,
      loading: new Set([...prev.loading].filter(id => id !== componentId)),
      failed: new Set([...prev.failed, componentId])
    }));
    console.error(`Failed to load component ${componentId}:`, error);
  }, []);

  const setVisible = useCallback((componentId: string, visible: boolean) => {
    setState(prev => ({
      ...prev,
      visible: visible 
        ? new Set([...prev.visible, componentId])
        : new Set([...prev.visible].filter(id => id !== componentId))
    }));
  }, []);

  return {
    state,
    setLoading,
    setLoaded,
    setFailed,
    setVisible
  };
}

/**
 * Hook for managing paginated data
 */
function usePaginatedData<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<T[]>,
  config: PaginationConfig
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (page: number, append = false) => {
    setLoading(true);
    setError(null);

    try {
      const newData = await fetchFunction(page, config.pageSize);
      
      setData(prev => append ? [...prev, ...newData] : newData);
      setHasMore(newData.length === config.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, config.pageSize]);

  const fetchNextPage = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(config.currentPage + 1, true);
    }
  }, [fetchPage, config.currentPage, loading, hasMore]);

  const refresh = useCallback(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  return {
    data,
    loading,
    error,
    hasMore,
    fetchPage,
    fetchNextPage,
    refresh
  };
}

// === COMPONENT WRAPPERS ===

/**
 * Wrapper for lazy-loaded components
 */
interface LazyComponentWrapperProps {
  componentId: string;
  config: DashboardComponentConfig;
  lazyState: LazyLoadingState;
  onLoad: (componentId: string) => void;
  onError: (componentId: string, error: Error) => void;
  onVisible: (componentId: string, visible: boolean) => void;
  children: React.ReactNode;
}

function LazyComponentWrapper({
  componentId,
  config,
  lazyState,
  onLoad: _onLoad,
  onError,
  onVisible,
  children
}: LazyComponentWrapperProps) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: !config.lazy
  });

  useEffect(() => {
    onVisible(componentId, inView);
  }, [componentId, inView, onVisible]);

  const shouldLoad = useMemo(() => {
    if (!config.lazy) return true;
    return inView || lazyState.visible.has(componentId);
  }, [config.lazy, inView, lazyState.visible, componentId]);

  return (
    <div ref={ref} className={cn('w-full', config.size === 'small' && 'h-32', config.size === 'medium' && 'h-64', config.size === 'large' && 'h-96')}>
      {shouldLoad ? (
        <ErrorBoundary
          fallback={<ComponentErrorFallback componentId={componentId} />}
          onError={(error) => onError(componentId, error)}
        >
          <Suspense fallback={<ComponentLoadingFallback componentId={componentId} />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      ) : (
        <ComponentPlaceholder config={config} />
      )}
    </div>
  );
}

/**
 * Component loading fallback
 */
function ComponentLoadingFallback({ componentId }: { componentId: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Loading {componentId}...
        </span>
      </div>
    </div>
  );
}

/**
 * Component error fallback
 */
function ComponentErrorFallback({ componentId }: { componentId: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <div className="text-center">
        <div className="text-red-600 dark:text-red-400 mb-2">⚠️</div>
        <div className="text-sm text-red-700 dark:text-red-300">
          Failed to load {componentId}
        </div>
      </div>
    </div>
  );
}

/**
 * Component placeholder
 */
function ComponentPlaceholder({ config }: { config: DashboardComponentConfig }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-2">📊</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {config.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          {config.description}
        </div>
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * LazyDashboard component
 */
export function LazyDashboard() {
  const { activities, loadingState } = useActivityStore();
  const { sessions } = useSessionStore();
  const { settings: _settings } = useSettingsStore();
  const [componentConfig, _setComponentConfig] = useState(DEFAULT_COMPONENT_CONFIG);
  const [paginationConfig] = useState(DEFAULT_PAGINATION_CONFIG);
  const { state: lazyState, setLoading: _setLoading, setLoaded, setFailed, setVisible } = useLazyLoading();

  // Sort components by priority and dependencies
  const sortedComponents = useMemo(() => {
    const sorted = [...componentConfig].sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Non-lazy components first
      if (a.lazy !== b.lazy) {
        return a.lazy ? 1 : -1;
      }
      
      // Smaller components first
      const sizeOrder = { small: 1, medium: 2, large: 3 };
      return sizeOrder[a.size] - sizeOrder[b.size];
    });
    
    return sorted.filter(c => c.enabled);
  }, [componentConfig]);

  // Handle component loading
  const handleComponentLoad = useCallback((componentId: string) => {
    setLoaded(componentId);
  }, [setLoaded]);

  // Handle component error
  const handleComponentError = useCallback((componentId: string, error: Error) => {
    setFailed(componentId, error);
  }, [setFailed]);

  // Handle component visibility
  const handleComponentVisible = useCallback((componentId: string, visible: boolean) => {
    setVisible(componentId, visible);
  }, [setVisible]);

  // Paginated data fetching
  const {
    data: paginatedActivities,
    loading: activitiesLoading,
    fetchNextPage: fetchNextActivities,
    hasMore: hasMoreActivities
  } = usePaginatedData(
    async (page, pageSize) => {
      // Simulate API call with pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return activities.slice(start, end);
    },
    paginationConfig
  );

  // Render individual components
  const renderComponent = (config: DashboardComponentConfig) => {
    const componentProps = {
      activities: paginatedActivities,
      sessions,
      dateRange: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        type: 'week' as const
      }
    };

    switch (config.id) {
      case 'focus-streak':
        return <FocusStreak {...componentProps} />;
      
      case 'activity-list':
        return (
          <ActivityList
            activities={paginatedActivities}
            onLoadMore={hasMoreActivities ? fetchNextActivities : undefined}
            loading={activitiesLoading}
          />
        );
      
      case 'timeline':
        return <VirtualizedTimeline {...componentProps} />;
      
      case 'weekly-summary':
        return <WeeklySummary {...componentProps} />;
      
      case 'insights-panel':
        return <InsightsPanel {...componentProps} />;
      
      case 'pattern-analysis':
        return <PatternAnalysisDashboard {...componentProps} />;
      
      case 'comparative-analysis':
        return <ComparativeAnalysis {...componentProps} />;
      
      case 'multi-day-timeline':
        return <MultiDayTimeline {...componentProps} />;
      
      default:
        return <div>Unknown component: {config.id}</div>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Loaded: {lazyState.loaded.size}</span>
          <span>Loading: {lazyState.loading.size}</span>
          <span>Failed: {lazyState.failed.size}</span>
        </div>
      </div>

      {/* Loading States */}
      {loadingState === 'loading' && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedComponents.map(config => (
          <LazyComponentWrapper
            key={config.id}
            componentId={config.id}
            config={config}
            lazyState={lazyState}
            onLoad={handleComponentLoad}
            onError={handleComponentError}
            onVisible={handleComponentVisible}
          >
            {renderComponent(config)}
          </LazyComponentWrapper>
        ))}
      </div>

      {/* Performance Stats */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Performance Stats</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Components</div>
            <div className="font-medium">{sortedComponents.length}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Loaded</div>
            <div className="font-medium text-green-600">{lazyState.loaded.size}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Loading</div>
            <div className="font-medium text-blue-600">{lazyState.loading.size}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Failed</div>
            <div className="font-medium text-red-600">{lazyState.failed.size}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// === EXPORTS ===

export type {
  DashboardComponentConfig,
  PaginationConfig,
  LazyLoadingState
}; 
