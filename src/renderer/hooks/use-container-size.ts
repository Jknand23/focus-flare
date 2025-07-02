/**
 * use-container-size - Custom hook for tracking container dimensions
 * 
 * Provides reactive container width and height tracking using ResizeObserver
 * for efficient resize detection. Optimized for timeline components and other
 * responsive visualizations that need to recalculate layout on resize.
 * 
 * @module use-container-size
 * @author FocusFlare Team
 * @since 0.2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// === TYPES ===

/**
 * Container dimensions interface
 */
interface ContainerSize {
  /** Container width in pixels */
  width: number;
  /** Container height in pixels */
  height: number;
}

/**
 * Hook options configuration
 */
interface UseContainerSizeOptions {
  /** Initial width fallback (default: 0) */
  initialWidth?: number;
  /** Initial height fallback (default: 0) */
  initialHeight?: number;
  /** Whether to track height changes (default: false) */
  trackHeight?: boolean;
  /** Debounce delay for resize events in ms (default: 0) */
  debounceMs?: number;
}

/**
 * Hook return value interface
 */
interface UseContainerSizeReturn {
  /** Current container dimensions */
  size: ContainerSize;
  /** Ref to attach to the container element */
  ref: React.RefObject<HTMLElement>;
  /** Whether the container is currently being observed */
  isObserving: boolean;
}

// === MAIN HOOK ===

/**
 * Custom hook for tracking container size changes with ResizeObserver
 * 
 * Efficiently tracks container width and optionally height changes using
 * ResizeObserver API. Provides debouncing for performance optimization
 * and graceful fallbacks for SSR environments.
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing size, ref, and observation status
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { size, ref } = useContainerSize({
 *     initialWidth: 800,
 *     trackHeight: true,
 *     debounceMs: 100
 *   });
 * 
 *   return (
 *     <div ref={ref}>
 *       Container is {size.width}px wide and {size.height}px tall
 *     </div>
 *   );
 * }
 * ```
 */
export function useContainerSize(
  options: UseContainerSizeOptions = {}
): UseContainerSizeReturn {
  const {
    initialWidth = 0,
    initialHeight = 0,
    trackHeight = false,
    debounceMs = 0
  } = options;

  const [size, setSize] = useState<ContainerSize>({
    width: initialWidth,
    height: initialHeight
  });
  
  const [isObserving, setIsObserving] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create size update function with proper debouncing
  const updateSize = useCallback((newSize: ContainerSize) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (debounceMs > 0) {
      debounceTimeoutRef.current = setTimeout(() => {
        setSize(newSize);
      }, debounceMs);
    } else {
      setSize(newSize);
    }
  }, [debounceMs]);

  // Set up ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if ResizeObserver is available (browser support)
    if (typeof ResizeObserver === 'undefined') {
      console.warn('ResizeObserver not supported, using fallback');
      
      // Fallback: Set initial size and add window resize listener
      const rect = container.getBoundingClientRect();
      setSize({
        width: rect.width,
        height: trackHeight ? rect.height : initialHeight
      });

      const handleWindowResize = () => {
        const newRect = container.getBoundingClientRect();
        updateSize({
          width: newRect.width,
          height: trackHeight ? newRect.height : initialHeight
        });
      };

      window.addEventListener('resize', handleWindowResize);
      setIsObserving(true);

      return () => {
        window.removeEventListener('resize', handleWindowResize);
        setIsObserving(false);
      };
    }

    // Create ResizeObserver instance
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateSize({
          width,
          height: trackHeight ? height : initialHeight
        });
      }
    });

    // Start observing
    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;
    setIsObserving(true);

    // Set initial size
    const rect = container.getBoundingClientRect();
    setSize({
      width: rect.width,
      height: trackHeight ? rect.height : initialHeight
    });

    // Cleanup function
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      setIsObserving(false);
    };
  }, [trackHeight, initialHeight, updateSize]);

  return {
    size,
    ref: containerRef,
    isObserving
  };
}

// === EXPORTS ===
export type { ContainerSize, UseContainerSizeOptions, UseContainerSizeReturn }; 