/**
 * Session Store - State management for session data and classification
 * 
 * Zustand-based store that manages session data state for the dashboard.
 * Handles fetching, caching, updating, and correcting session information.
 * Integrates with AI classification system and user feedback for continuous
 * learning. Core state management for Phase 2 MVP session functionality.
 * 
 * @module SessionStore
 * @author FocusFlare Team
 * @since 0.2.0
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  SessionData,
  LoadingState,
  ErrorInfo,
  GetSessionsByDateRequest,
  UpdateSessionRequest,
  SessionType
} from '@/shared/types/activity-types';
import { DEBUG_LOGGING } from '@/shared/constants/app-constants';

// === STORE STATE INTERFACE ===

/**
 * Session store state interface
 */
interface SessionStore {
  // === DATA STATE ===
  /** Array of session data */
  sessions: SessionData[];
  /** Current loading state */
  loadingState: LoadingState;
  /** Last error information */
  error: ErrorInfo | null;
  /** Last fetch timestamp */
  lastFetched: Date | null;
  /** Total number of sessions available */
  totalCount: number;
  
  // === UI STATE ===
  /** Currently selected session */
  selectedSession: SessionData | null;
  /** Date range filter */
  dateFilter: {
    startDate: Date | null;
    endDate: Date | null;
  };
  /** Session type filter */
  typeFilter: SessionType | 'all';
  /** Current page for pagination */
  currentPage: number;
  /** Items per page */
  itemsPerPage: number;
  /** Update operation loading state */
  isUpdating: boolean;
  
  // === ACTIONS ===
  /** Fetch sessions for date range */
  fetchSessionsByDateRange: (startDate: Date, endDate: Date, limit?: number) => Promise<void>;
  /** Fetch sessions for specific date */
  fetchSessionsForDate: (date: Date) => Promise<void>;
  /** Update session classification */
  updateSession: (sessionId: number, updates: UpdateSessionRequest) => Promise<void>;
  /** Refresh current data */
  refreshData: () => Promise<void>;
  /** Clear all data */
  clearData: () => void;
  /** Clear error state */
  clearError: () => void;
  /** Select a session */
  selectSession: (session: SessionData | null) => void;
  /** Update date filter */
  updateDateFilter: (startDate: Date | null, endDate: Date | null) => void;
  /** Update type filter */
  updateTypeFilter: (type: SessionType | 'all') => void;
  /** Update pagination */
  updatePagination: (page: number, itemsPerPage?: number) => void;
  /** Trigger session classification for recent activities */
  triggerClassification: () => Promise<void>;
}

// === HELPER FUNCTIONS ===

/**
 * Checks if sessions need to be refetched based on date range
 * 
 * @param currentFilter - Current date filter
 * @param newFilter - New date filter
 * @returns True if refetch is needed
 */
function shouldRefetchSessions(
  currentFilter: { startDate: Date | null; endDate: Date | null },
  newFilter: { startDate: Date | null; endDate: Date | null }
): boolean {
  const currentStart = currentFilter.startDate?.getTime();
  const currentEnd = currentFilter.endDate?.getTime();
  const newStart = newFilter.startDate?.getTime();
  const newEnd = newFilter.endDate?.getTime();
  
  return currentStart !== newStart || currentEnd !== newEnd;
}

// === STORE IMPLEMENTATION ===

/**
 * Session store implementation using Zustand
 */
export const useSessionStore = create<SessionStore>()(
  devtools(
    (set, get) => ({
      // === INITIAL STATE ===
      sessions: [],
      loadingState: 'idle',
      error: null,
      lastFetched: null,
      totalCount: 0,
      selectedSession: null,
      dateFilter: {
        startDate: null,
        endDate: null
      },
      typeFilter: 'all',
      currentPage: 1,
      itemsPerPage: 20,
      isUpdating: false,

      // === ACTIONS ===

      /**
       * Fetches sessions within a specific date range
       */
      fetchSessionsByDateRange: async (startDate: Date, endDate: Date, limit?: number) => {
        set({ loadingState: 'loading', error: null });
        
        if (DEBUG_LOGGING) {
          console.log(`[SESSION STORE] fetchSessionsByDateRange called with:`, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit
          });
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          const request: GetSessionsByDateRequest = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit
          };
          
          if (DEBUG_LOGGING) {
            console.log('[SESSION STORE] Making IPC call to electronAPI.sessions.getByDateRange with:', request);
          }
          
          const sessions = await window.electronAPI.sessions.getByDateRange(request);
          
          if (DEBUG_LOGGING) {
            console.log(`[SESSION STORE] Received ${sessions.length} sessions from IPC:`, sessions);
          }
          
          set({
            sessions,
            loadingState: 'success',
            lastFetched: new Date(),
            totalCount: sessions.length,
            error: null,
            dateFilter: { startDate, endDate }
          });
          
          if (DEBUG_LOGGING) {
            console.log(`[SESSION STORE] Store updated with ${sessions.length} sessions, loadingState: success`);
          }
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to fetch sessions',
            code: 'FETCH_SESSIONS_FAILED',
            timestamp: new Date()
          };
          
          set({
            loadingState: 'error',
            error: errorInfo
          });
          
          console.error('[SESSION STORE] Failed to fetch sessions by date range:', error);
        }
      },

      /**
       * Fetches sessions for a specific date (helper for common use case)
       */
      fetchSessionsForDate: async (date: Date) => {
        if (DEBUG_LOGGING) {
          console.log(`[SESSION STORE] fetchSessionsForDate called with date:`, date.toISOString());
        }
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        if (DEBUG_LOGGING) {
          console.log(`[SESSION STORE] Converted to date range:`, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });
        }
        
        return get().fetchSessionsByDateRange(startDate, endDate);
      },

      /**
       * Updates a session with new classification or feedback
       */
      updateSession: async (sessionId: number, updates: UpdateSessionRequest) => {
        set({ isUpdating: true, error: null });
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          await window.electronAPI.sessions.update(updates);
          
          // Update the session in local state
          const currentSessions = get().sessions;
          const updatedSessions = currentSessions.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                sessionType: updates.sessionType || session.sessionType,
                userFeedback: updates.userFeedback || session.userFeedback,
                userCorrected: updates.userCorrected ?? session.userCorrected,
                updatedAt: new Date()
              };
            }
            return session;
          });
          
          set({
            sessions: updatedSessions,
            isUpdating: false
          });
          
          // Update selected session if it's the one being updated
          const selectedSession = get().selectedSession;
          if (selectedSession?.id === sessionId) {
            const updatedSession = updatedSessions.find(s => s.id === sessionId);
            if (updatedSession) {
              set({ selectedSession: updatedSession });
            }
          }
          
          if (DEBUG_LOGGING) {
            console.log(`Updated session ${sessionId}:`, updates);
          }
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to update session',
            code: 'UPDATE_SESSION_FAILED',
            timestamp: new Date()
          };
          
          set({
            isUpdating: false,
            error: errorInfo
          });
          
          console.error('Failed to update session:', error);
          throw error; // Re-throw for component error handling
        }
      },

      /**
       * Refreshes current session data
       */
      refreshData: async () => {
        const { dateFilter } = get();
        
        if (DEBUG_LOGGING) {
          console.log(`[SESSION STORE] refreshData called with current dateFilter:`, {
            startDate: dateFilter.startDate?.toISOString(),
            endDate: dateFilter.endDate?.toISOString()
          });
        }
        
        if (dateFilter.startDate && dateFilter.endDate) {
          if (DEBUG_LOGGING) {
            console.log('[SESSION STORE] Using existing date filter for refresh');
          }
          return get().fetchSessionsByDateRange(dateFilter.startDate, dateFilter.endDate);
        } else {
          // Default to today's sessions
          const today = new Date();
          if (DEBUG_LOGGING) {
            console.log('[SESSION STORE] No date filter set, defaulting to today:', today.toISOString());
          }
          return get().fetchSessionsForDate(today);
        }
      },

      /**
       * Triggers session classification for recent activities
       */
      triggerClassification: async () => {
        set({ loadingState: 'loading', error: null });
        
        if (DEBUG_LOGGING) {
          console.log('[SESSION STORE] triggerClassification called');
        }
        
        try {
          if (!window.electronAPI) {
            throw new Error('Electron API not available');
          }
          
          if (DEBUG_LOGGING) {
            console.log('[SESSION STORE] Making IPC call to electronAPI.sessions.classify');
          }
          
          await window.electronAPI.sessions.classify();
          
          if (DEBUG_LOGGING) {
            console.log('[SESSION STORE] Session classification completed, refreshing data...');
          }
          
          // Refresh data after classification
          await get().refreshData();
          
          if (DEBUG_LOGGING) {
            console.log('[SESSION STORE] Session classification and refresh completed successfully');
          }
        } catch (error) {
          const errorInfo: ErrorInfo = {
            message: error instanceof Error ? error.message : 'Failed to classify sessions',
            code: 'CLASSIFY_SESSIONS_FAILED',
            timestamp: new Date()
          };
          
          set({
            loadingState: 'error',
            error: errorInfo
          });
          
          console.error('[SESSION STORE] Failed to trigger session classification:', error);
        }
      },

      /**
       * Clears all session data
       */
      clearData: () => {
        set({
          sessions: [],
          loadingState: 'idle',
          error: null,
          lastFetched: null,
          totalCount: 0,
          selectedSession: null,
          currentPage: 1
        });
      },

      /**
       * Clears error state
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Selects a session for detailed view
       */
      selectSession: (session: SessionData | null) => {
        set({ selectedSession: session });
      },

      /**
       * Updates date filter and refetches if needed
       */
      updateDateFilter: (startDate: Date | null, endDate: Date | null) => {
        const currentFilter = get().dateFilter;
        const newFilter = { startDate, endDate };
        
        set({ dateFilter: newFilter });
        
        // Refetch if date range changed
        if (shouldRefetchSessions(currentFilter, newFilter)) {
          if (startDate && endDate) {
            get().fetchSessionsByDateRange(startDate, endDate);
          }
        }
      },

      /**
       * Updates session type filter
       */
      updateTypeFilter: (type: SessionType | 'all') => {
        set({ typeFilter: type, currentPage: 1 });
      },

      /**
       * Updates pagination settings
       */
      updatePagination: (page: number, itemsPerPage?: number) => {
        set({
          currentPage: page,
          ...(itemsPerPage && { itemsPerPage })
        });
      }
    }),
    {
      name: 'session-store',
      partialize: (state: SessionStore) => ({
        // Persist filter settings but not data
        typeFilter: state.typeFilter,
        itemsPerPage: state.itemsPerPage
      })
    }
  )
);

// === COMPUTED SELECTORS ===

/**
 * Hook for getting filtered sessions based on current filters
 */
export function useFilteredSessions() {
  return useSessionStore((state) => {
    let filtered = state.sessions;
    
    // Apply type filter
    if (state.typeFilter !== 'all') {
      filtered = filtered.filter(session => session.sessionType === state.typeFilter);
    }
    
    return filtered;
  });
}

/**
 * Hook for getting paginated sessions
 */
export function usePaginatedSessions() {
  return useSessionStore((state) => {
    // Apply type filter directly instead of calling useFilteredSessions
    let filtered = state.sessions;
    if (state.typeFilter !== 'all') {
      filtered = filtered.filter(session => session.sessionType === state.typeFilter);
    }
    
    const { currentPage, itemsPerPage } = state;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      sessions: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      currentPage,
      totalItems: filtered.length
    };
  });
}

/**
 * Hook for getting session statistics
 */
export function useSessionStats() {
  return useSessionStore((state) => {
    const sessions = state.sessions;
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalDuration: 0,
        averageDuration: 0,
        typeBreakdown: {},
        mostCommonType: null
      };
    }
    
    // Calculate statistics
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    const averageDuration = totalDuration / sessions.length;
    
    // Calculate type breakdown
    const typeBreakdown = sessions.reduce((acc, session) => {
      acc[session.sessionType] = (acc[session.sessionType] || 0) + 1;
      return acc;
    }, {} as Record<SessionType, number>);
    
    // Find most common type
    const mostCommonType = Object.entries(typeBreakdown)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as SessionType | null;
    
    return {
      totalSessions: sessions.length,
      totalDuration,
      averageDuration,
      typeBreakdown,
      mostCommonType
    };
  });
}

/**
 * Hook for getting session store status
 */
export function useSessionStatus() {
  return useSessionStore((state) => ({
    loadingState: state.loadingState,
    error: state.error,
    lastFetched: state.lastFetched,
    isUpdating: state.isUpdating,
    totalCount: state.totalCount
  }));
} 