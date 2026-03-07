/**
 * Performance Monitoring Hooks
 * 
 * Provides hooks for monitoring app performance including FPS, memory usage,
 * render times, and component lifecycle metrics.
 */

import { useEffect, useRef, useCallback } from "react";
import { AppState, InteractionManager, Platform } from "react-native";
import { analytics } from "../services/analytics";

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to measure component mount/unmount performance
 */
export function useComponentPerformance(
  componentName: string,
  metadata?: Record<string, unknown>
): void {
  const mountTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;
    
    analytics.logPerformance({
      name: `${componentName}_mount`,
      duration: mountDuration,
      metadata: {
        ...metadata,
        render_count: renderCount.current,
      },
    });

    return () => {
      const unmountDuration = Date.now() - mountTime.current;
      
      analytics.logPerformance({
        name: `${componentName}_lifetime`,
        duration: unmountDuration,
        metadata: {
          ...metadata,
          render_count: renderCount.current,
        },
      });
    };
  }, [componentName, metadata]);

  renderCount.current += 1;
}

/**
 * Hook to measure async operations
 */
export function usePerformanceTimer() {
  const timers = useRef<Map<string, PerformanceEntry>>(new Map());

  const start = useCallback((name: string, metadata?: Record<string, unknown>) => {
    timers.current.set(name, {
      name,
      startTime: Date.now(),
      metadata,
    });
  }, []);

  const end = useCallback((name: string) => {
    const entry = timers.current.get(name);
    if (!entry) {
      console.warn(`Performance timer "${name}" was never started`);
      return;
    }

    const duration = Date.now() - entry.startTime;
    
    analytics.logPerformance({
      name,
      duration,
      metadata: entry.metadata,
    });

    timers.current.delete(name);
  }, []);

  const measure = useCallback(
    async <T,>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> => {
      const startTime = Date.now();
      
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        analytics.logPerformance({
          name,
          duration,
          metadata: {
            ...metadata,
            status: "success",
          },
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        analytics.logPerformance({
          name,
          duration,
          metadata: {
            ...metadata,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          },
        });
        
        throw error;
      }
    },
    []
  );

  return { start, end, measure };
}

/**
 * Hook to measure screen navigation performance
 */
export function useNavigationPerformance(screenName: string): void {
  const mountTime = useRef<number>(Date.now());
  const interactionComplete = useRef<boolean>(false);

  useEffect(() => {
    // Measure time to interactive
    const task = InteractionManager.runAfterInteractions(() => {
      if (!interactionComplete.current) {
        const tti = Date.now() - mountTime.current;
        
        analytics.logPerformance({
          name: "screen_time_to_interactive",
          duration: tti,
          metadata: {
            screen_name: screenName,
          },
        });
        
        interactionComplete.current = true;
      }
    });

    return () => {
      task.cancel();
    };
  }, [screenName]);
}

/**
 * Hook to track app state changes and background/foreground transitions
 */
export function useAppStatePerformance(): void {
  const backgroundTime = useRef<number | null>(null);
  const foregroundTime = useRef<number>(Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        backgroundTime.current = Date.now();
        
        const foregroundDuration = Date.now() - foregroundTime.current;
        analytics.logPerformance({
          name: "app_foreground_session",
          duration: foregroundDuration,
        });
      } else if (nextAppState === "active") {
        if (backgroundTime.current) {
          const backgroundDuration = Date.now() - backgroundTime.current;
          
          analytics.logPerformance({
            name: "app_background_duration",
            duration: backgroundDuration,
          });
          
          backgroundTime.current = null;
        }
        
        foregroundTime.current = Date.now();
        analytics.logEvent("app_foreground");
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

/**
 * Hook to monitor memory usage (Android only)
 */
export function useMemoryMonitoring(interval: number = 60000): void {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const checkMemory = async () => {
      // In production, you would use react-native-device-info or similar
      // For now, this is a placeholder
      if (__DEV__) {
        console.log("[Performance] Memory check (placeholder)");
      }
    };

    const timer = setInterval(checkMemory, interval);

    return () => {
      clearInterval(timer);
    };
  }, [interval]);
}

/**
 * Hook to measure list/FlatList scroll performance
 */
export function useScrollPerformance(listName: string) {
  const scrollMetrics = useRef({
    scrollStartTime: 0,
    totalScrollDistance: 0,
    scrollEvents: 0,
  });

  const onScrollBeginDrag = useCallback(() => {
    scrollMetrics.current.scrollStartTime = Date.now();
  }, []);

  const onScrollEndDrag = useCallback(() => {
    if (scrollMetrics.current.scrollStartTime > 0) {
      const scrollDuration = Date.now() - scrollMetrics.current.scrollStartTime;
      
      analytics.logPerformance({
        name: `${listName}_scroll_interaction`,
        duration: scrollDuration,
        metadata: {
          scroll_events: scrollMetrics.current.scrollEvents,
          total_distance: scrollMetrics.current.totalScrollDistance,
        },
      });
      
      scrollMetrics.current = {
        scrollStartTime: 0,
        totalScrollDistance: 0,
        scrollEvents: 0,
      };
    }
  }, [listName]);

  const onScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollMetrics.current.scrollEvents += 1;
    scrollMetrics.current.totalScrollDistance = Math.abs(event.nativeEvent.contentOffset.y);
  }, []);

  return {
    onScrollBeginDrag,
    onScrollEndDrag,
    onScroll,
  };
}

/**
 * Utility to measure network request performance
 */
export async function measureNetworkRequest<T>(
  name: string,
  request: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await request();
    const duration = Date.now() - startTime;
    
    analytics.logPerformance({
      name: `network_${name}`,
      duration,
      metadata: {
        ...metadata,
        status: "success",
      },
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    analytics.logPerformance({
      name: `network_${name}`,
      duration,
      metadata: {
        ...metadata,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    
    throw error;
  }
}

/**
 * Measure image loading performance
 */
export function useImageLoadPerformance(imageName: string) {
  const loadStart = useRef<number>(0);

  const onLoadStart = useCallback(() => {
    loadStart.current = Date.now();
  }, []);

  const onLoadEnd = useCallback(() => {
    if (loadStart.current > 0) {
      const duration = Date.now() - loadStart.current;
      
      analytics.logPerformance({
        name: "image_load",
        duration,
        metadata: {
          image_name: imageName,
        },
      });
      
      loadStart.current = 0;
    }
  }, [imageName]);

  const onError = useCallback((error: unknown) => {
    if (loadStart.current > 0) {
      const duration = Date.now() - loadStart.current;
      
      analytics.logPerformance({
        name: "image_load_failed",
        duration,
        metadata: {
          image_name: imageName,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      
      loadStart.current = 0;
    }
  }, [imageName]);

  return {
    onLoadStart,
    onLoadEnd,
    onError,
  };
}
