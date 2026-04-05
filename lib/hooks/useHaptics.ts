import { useMemo, useCallback } from "react";
import {
  HapticService,
  type HapticIntensity,
  type ImpactStyle,
  type NotificationType,
} from "../services/gesture";

/**
 * Hook providing access to the HapticService for triggering haptic feedback.
 */
export function useHaptics() {
  const service = useMemo(() => HapticService.getInstance(), []);

  const impact = useCallback(
    (style?: ImpactStyle) => service.impact(style),
    [service]
  );

  const notification = useCallback(
    (type?: NotificationType) => service.notification(type),
    [service]
  );

  const selection = useCallback(() => service.selection(), [service]);

  const setIntensity = useCallback(
    (intensity: HapticIntensity) => service.setIntensity(intensity),
    [service]
  );

  const getIntensity = useCallback(
    () => service.getIntensity(),
    [service]
  );

  const isAvailable = useCallback(() => service.isAvailable(), [service]);

  return {
    impact,
    notification,
    selection,
    setIntensity,
    getIntensity,
    isAvailable,
  };
}
