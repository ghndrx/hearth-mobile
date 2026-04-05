import { useMemo, useCallback, useEffect, useRef } from "react";
import {
  GestureService,
  type TapConfig,
  type LongPressConfig,
  type SwipeConfig,
  type PanConfig,
} from "../services/gesture";
import type { GestureType } from "react-native-gesture-handler";

/**
 * Hook providing access to the GestureService for creating gesture recognizers.
 *
 * Returns factory methods for tap, long-press, swipe, and pan gestures,
 * plus register/unregister helpers for the app-wide gesture system.
 */
export function useGesture() {
  const service = useMemo(() => GestureService.getInstance(), []);
  const registeredIds = useRef<string[]>([]);

  const createTap = useCallback(
    (config?: TapConfig): GestureType => service.createTap(config),
    [service]
  );

  const createLongPress = useCallback(
    (config?: LongPressConfig): GestureType => service.createLongPress(config),
    [service]
  );

  const createSwipe = useCallback(
    (config?: SwipeConfig): GestureType => service.createSwipe(config),
    [service]
  );

  const createPan = useCallback(
    (config?: PanConfig): GestureType => service.createPan(config),
    [service]
  );

  const register = useCallback(
    (id: string, gesture: GestureType) => {
      const registration = service.register(id, gesture);
      registeredIds.current.push(id);
      return registration;
    },
    [service]
  );

  const unregister = useCallback(
    (id: string) => {
      service.unregister(id);
      registeredIds.current = registeredIds.current.filter((i) => i !== id);
    },
    [service]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      registeredIds.current.forEach((id) => service.unregister(id));
    };
  }, [service]);

  return {
    createTap,
    createLongPress,
    createSwipe,
    createPan,
    register,
    unregister,
  };
}
