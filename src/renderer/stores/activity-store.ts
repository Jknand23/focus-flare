/**
 * Activity Store - State management for activity tracking data
 * 
 * Zustand-based store that manages activity data state for the dashboard.
 * Handles fetching, caching, and updating activity information from the
 * main process through IPC communication. Provides reactive state updates
 * for UI components.
 * 
 * @module ActivityStore
 * @author FocusFlare Team
 * @since 0.1.0
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  ActivityData,
  LoadingState,
  ErrorInfo,
  GetRecentActivitiesRequest,
  GetActivitiesByDateRequest
} from '@/shared/types/activity-types';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === STORE STATE INTERFACE ===

/**
 * Activity store state interface
 */
interface ActivityStore {
  // === DATA STATE ===
  /** Array of activity data */
  activities: ActivityData[];
  /** Current loading state */
  loadingState: LoadingState;
  /** Last error information */
  error: ErrorInfo | null;
  /** Last fetch timestamp */
  lastFetched: Date | null;
  /** Total number of activities available */
  totalCount: number;
  
  // === UI STATE ===
  /** Currently selected activity */
  selectedActivity: ActivityData | null;
  /** Date range filter */
  dateFilter: {
    startDate: Date | null;
    endDate: Date | null;
  };
  /** Search/filter text */
  searchText: string;
  /** Current page for pagination */
  currentPage: number;
  /** Items per page */
  itemsPerPage: number;
  
  // === ACTIONS ===
  /** Fetch all activities */
  fetchAllActivities: () => Promise<void>;
  /** Fetch recent activities by hours */
  fetchRecentActivities: (hours: number, limit?: number) => Promise<void>;
  /** Fetch activities by date range */
  fetchActivitiesByDateRange: (startDate: Date, endDate: Date, limit?: number) => Promise<void>;
  /** Refresh current data */
  refreshData: () => Promise<void>;
  /** Clear all data */
  clearData: () => void;
  /** Clear error state */
  clearError: () => void;
  /** Select an activity */
  selectActivity: (activity: ActivityData | null) => void;
  /** Update date filter */
  updateDateFilter: (startDate: Date | null, endDate: Date | null) => void;
  /** Update search text */
  updateSearchText: (text: string) => void;
  /** Update pagination */
  updatePagination: (page: number, itemsPerPage?: number) => void;
}

// === STORE IMPLEMENTATION ===

/**
 * Activity store implementation using Zustand
 */
export const useActivityStore = create<ActivityStore>()(
  devtools(
    (set, get) => ({
      // === INITIAL STATE ===
      activities: [],
      loadingState: 'idle',
      error: null,
      lastFetched: null,
      totalCount: 0,
      selectedActivity: null,
      dateFilter: {
        startDate: null,
        endDate: null
      },
      searchText: '',
      currentPage: 1,
      itemsPerPage: 50,

      // === ACTIONS ===

      /**
       * Fetches all activities from the main process
       */
      fetchAllActivities: async () => {
        set({ loadingState: 'loading', error: null });
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const activities = await window.electronAPI.activities.getAll();
          
          set({
            activities,
            loadingState: 'success',
            lastFetched: new Date(),
            totalCount: activities.length,
            error: null
          });
          
          if (DEBUG_LOGGING) {
            console.log(`Fetched ${activities.length} activities`);
          }
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to fetch activities',
            code: 'FETCH_ALL_FAILED',
            timestamp: new Date()
          };
          
          set({
            loadingState: 'error',
            error: errorInfo
          });
          
          console.error('Failed to fetch all activities:', error);
        }
      },

      /**
       * Fetches recent activities within specified hours
       */
      fetchRecentActivities: async (hours: number, limit?: number) => {
        set({ loadingState: 'loading', error: null });
        
        if (DEBUG_LOGGING) {
          console.log(`[STORE] fetchRecentActivities called with hours: ${hours}, limit: ${limit}`);
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const request: GetRecentActivitiesRequest = { hours, limit };
          
          if (DEBUG_LOGGING) {
            console.log('[STORE] Making IPC call to electronAPI.activities.getRecent with:', request);
          }
          
          const activities = await window.electronAPI.activities.getRecent(request);
          
          if (DEBUG_LOGGING) {
            console.log(`[STORE] Received ${activities.length} activities from IPC`);
            console.log('[STORE] Sample activities:', activities.slice(0, 3));
          }
          
          set({
            activities,
            loadingState: 'success',
            lastFetched: new Date(),
            totalCount: activities.length,
            error: null
          });
          
          if (DEBUG_LOGGING) {
            console.log(`[STORE] Store updated: ${activities.length} activities, loadingState: success`);
          }
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to fetch recent activities',
            code: 'FETCH_RECENT_FAILED',
            timestamp: new Date()
          };
          
          set({
            loadingState: 'error',
            error: errorInfo
          });
          
          console.error('[STORE] Failed to fetch recent activities:', error);
        }
      },

      /**
       * Fetches activities within a specific date range
       */
      fetchActivitiesByDateRange: async (startDate: Date, endDate: Date, limit?: number) => {
        set({ loadingState: 'loading', error: null });
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const request: GetActivitiesByDateRequest = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit
          };
          
          const activities = await window.electronAPI.activities.getByDate(request);
          
          set({
            activities,
            loadingState: 'success',
            lastFetched: new Date(),
            totalCount: activities.length,
            error: null,
            dateFilter: { startDate, endDate }
          });
          
          if (DEBUG_LOGGING) {
            console.log(`Fetched ${activities.length} activities for date range`);
          }
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to fetch activities by date',
            code: 'FETCH_BY_DATE_FAILED',
            timestamp: new Date()
          };
          
          set({
            loadingState: 'error',
            error: errorInfo
          });
          
          console.error('Failed to fetch activities by date range:', error);
        }
      },

      /**
       * Refreshes the current data based on existing filters
       */
      refreshData: async () => {
        const state = get();
        
        // Determine which fetch method to use based on current state
        if (state.dateFilter.startDate && state.dateFilter.endDate) {
          await state.fetchActivitiesByDateRange(
            state.dateFilter.startDate,
            state.dateFilter.endDate
          );
        } else {
          // Default to fetching last 24 hours of activities
          await state.fetchRecentActivities(24);
        }
      },

      /**
       * Clears all activity data and resets state
       */
      clearData: () => {
        set({
          activities: [],
          loadingState: 'idle',
          error: null,
          lastFetched: null,
          totalCount: 0,
          selectedActivity: null,
          currentPage: 1
        });
        
        if (DEBUG_LOGGING) {
          console.log('Activity data cleared');
        }
      },

      /**
       * Clears the current error state
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Selects an activity for detailed view
       */
      selectActivity: (activity: ActivityData | null) => {
        set({ selectedActivity: activity });
        
        if (DEBUG_LOGGING && activity) {
          console.log(`Selected activity: ${activity.appName}`);
        }
      },

      /**
       * Updates the date range filter
       */
      updateDateFilter: (startDate: Date | null, endDate: Date | null) => {
        set({
          dateFilter: { startDate, endDate },
          currentPage: 1 // Reset pagination
        });
        
        if (DEBUG_LOGGING) {
          console.log('Date filter updated:', { startDate, endDate });
        }
      },

      /**
       * Updates the search text filter
       */
      updateSearchText: (text: string) => {
        set({
          searchText: text,
          currentPage: 1 // Reset pagination
        });
        
        if (DEBUG_LOGGING) {
          console.log('Search text updated:', text);
        }
      },

      /**
       * Updates pagination settings
       */
      updatePagination: (page: number, itemsPerPage?: number) => {
        const updates: Partial<ActivityStore> = { currentPage: page };
        
        if (itemsPerPage !== undefined) {
          updates.itemsPerPage = itemsPerPage;
        }
        
        set(updates);
        
        if (DEBUG_LOGGING) {
          console.log('Pagination updated:', { page, itemsPerPage });
        }
      }
    }),
    {
      name: 'activity-store', // Store name for devtools
      enabled: DEBUG_LOGGING // Only enable devtools in development
    }
  )
);

// === SELECTORS ===

/**
 * Selector for filtered activities based on search text
 */
export const useFilteredActivities = () => {
  return useActivityStore((state) => {
    if (!state.searchText) {
      return state.activities;
    }
    
    const searchLower = state.searchText.toLowerCase();
    return state.activities.filter(activity =>
      activity.appName.toLowerCase().includes(searchLower) ||
      activity.windowTitle.toLowerCase().includes(searchLower)
    );
  });
};

/**
 * Selector for paginated activities
 */
export const usePaginatedActivities = () => {
  return useActivityStore((state) => {
    const filtered = state.searchText ? 
      state.activities.filter(activity =>
        activity.appName.toLowerCase().includes(state.searchText.toLowerCase()) ||
        activity.windowTitle.toLowerCase().includes(state.searchText.toLowerCase())
      ) : state.activities;
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    
    return {
      activities: filtered.slice(startIndex, endIndex),
      totalCount: filtered.length,
      currentPage: state.currentPage,
      itemsPerPage: state.itemsPerPage,
      totalPages: Math.ceil(filtered.length / state.itemsPerPage)
    };
  });
};

/**
 * Selector for loading and error states
 */
export const useActivityStatus = () => {
  return useActivityStore((state) => ({
    isLoading: state.loadingState === 'loading',
    isError: state.loadingState === 'error',
    isSuccess: state.loadingState === 'success',
    error: state.error,
    lastFetched: state.lastFetched
  }));
}; 