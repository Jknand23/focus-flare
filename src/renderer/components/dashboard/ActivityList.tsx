/**
 * ActivityList - Component for displaying activity tracking data
 * 
 * Displays a list of user activities with app names, window titles, timestamps,
 * and durations. Integrates with the activity store for data management and
 * provides basic filtering and selection functionality.
 * 
 * @module ActivityList
 * @author FocusFlare Team
 * @since 0.1.0
 */

import { useEffect } from 'react';
import { usePaginatedActivities, useActivityStatus, useActivityStore } from '@/renderer/stores/activity-store';
import type { ActivityData } from '@/shared/types/activity-types';

// === COMPONENT TYPES ===

/**
 * Props interface for ActivityList component
 */
interface ActivityListProps {
  /** Optional CSS class name */
  className?: string;
  /** Callback when activity is selected */
  onActivitySelect?: (activity: ActivityData) => void;
}

/**
 * Formats a timestamp to a readable time string
 */
function formatTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * ActivityList component for displaying activity tracking data
 */
export function ActivityList({ 
  className = '', 
  onActivitySelect
}: ActivityListProps) {
  const { activities, totalCount } = usePaginatedActivities();
  const { isLoading, isError, error } = useActivityStatus();
  const { selectedActivity, selectActivity, fetchRecentActivities, clearError } = useActivityStore();
  
  // Load initial data
  useEffect(() => {
    fetchRecentActivities(24); // Load last 24 hours by default
  }, [fetchRecentActivities]);
  
  // Handle activity selection
  function handleActivitySelect(activity: ActivityData) {
    selectActivity(activity);
    onActivitySelect?.(activity);
  }
  
  // Handle retry on error
  function handleRetry() {
    clearError();
    fetchRecentActivities(24);
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading activities...</div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError && error) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            Failed to load activities: {error.message}
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="text-center py-12 text-gray-500">
          No activities found. Start using your computer and activities will appear here.
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Activities ({totalCount})
        </h2>
      </div>
      
      {/* Activity list */}
      <div className="divide-y divide-gray-200">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`
              px-6 py-4 hover:bg-gray-50 cursor-pointer
              ${selectedActivity?.id === activity.id ? 'bg-blue-50' : ''}
            `}
            onClick={() => handleActivitySelect(activity)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {activity.appName}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {activity.windowTitle || 'No title'}
                </div>
              </div>
              <div className="flex flex-col items-end ml-4">
                <div className="text-sm text-gray-900">
                  {activity.formattedDuration}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(activity.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 