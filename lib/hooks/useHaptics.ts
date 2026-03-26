import { useCallback } from "react";
import { triggerHaptic, type HapticFeedback } from "../services/haptics";

/**
 * Hook for triggering haptic feedback
 *
 * @example
 * const { trigger, light, medium, heavy, success, error } = useHaptics();
 *
 * // Trigger a custom haptic
 * trigger('success');
 *
 * // Use predefined shortcuts
 * light();
 * success();
 */
export function useHaptics() {
  const trigger = useCallback((type: HapticFeedback = "selection") => {
    triggerHaptic(type);
  }, []);

  const light = useCallback(() => triggerHaptic("light"), []);
  const medium = useCallback(() => triggerHaptic("medium"), []);
  const heavy = useCallback(() => triggerHaptic("heavy"), []);
  const success = useCallback(() => triggerHaptic("success"), []);
  const warning = useCallback(() => triggerHaptic("warning"), []);
  const error = useCallback(() => triggerHaptic("error"), []);
  const selection = useCallback(() => triggerHaptic("selection"), []);
  const buttonPress = useCallback(() => triggerHaptic("buttonPress"), []);
  const swipeAction = useCallback(() => triggerHaptic("swipeAction"), []);
  const longPress = useCallback(() => triggerHaptic("longPress"), []);
  const toggle = useCallback(() => triggerHaptic("toggle"), []);
  const notification = useCallback(() => triggerHaptic("notification"), []);

  return {
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
    buttonPress,
    swipeAction,
    longPress,
    toggle,
    notification,
  };
}
