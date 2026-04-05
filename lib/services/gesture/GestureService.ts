import { Gesture, GestureType } from "react-native-gesture-handler";
import { HapticService } from "./HapticService";

// ============================================================================
// Types
// ============================================================================

export type SwipeDirection = "left" | "right" | "up" | "down";

export type GestureState =
  | "undetermined"
  | "began"
  | "active"
  | "end"
  | "cancelled"
  | "failed";

export interface GestureCallbacks {
  onBegin?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onFinalize?: (succeeded: boolean) => void;
}

export interface TapConfig extends GestureCallbacks {
  numberOfTaps?: number;
  maxDuration?: number;
  haptic?: boolean;
}

export interface LongPressConfig extends GestureCallbacks {
  minDuration?: number;
  maxDistance?: number;
  haptic?: boolean;
}

export interface SwipeConfig extends GestureCallbacks {
  direction?: SwipeDirection;
  velocityThreshold?: number;
  haptic?: boolean;
}

export interface PanConfig extends GestureCallbacks {
  activeOffsetX?: number | [number, number];
  activeOffsetY?: number | [number, number];
  failOffsetX?: number | [number, number];
  failOffsetY?: number | [number, number];
  minDistance?: number;
  haptic?: boolean;
  onUpdate?: (translationX: number, translationY: number) => void;
}

export interface GestureHandlerRegistration {
  id: string;
  gesture: GestureType;
  dispose: () => void;
}

// ============================================================================
// GestureService
// ============================================================================

export class GestureService {
  private static instance: GestureService;
  private registeredHandlers = new Map<string, GestureHandlerRegistration>();
  private hapticService: HapticService;

  private constructor() {
    this.hapticService = HapticService.getInstance();
  }

  static getInstance(): GestureService {
    if (!GestureService.instance) {
      GestureService.instance = new GestureService();
    }
    return GestureService.instance;
  }

  /**
   * Create a tap gesture recognizer.
   */
  createTap(config: TapConfig = {}): GestureType {
    const {
      numberOfTaps = 1,
      maxDuration,
      haptic = true,
      onBegin,
      onStart,
      onEnd,
      onFinalize,
    } = config;

    let gesture = Gesture.Tap().numberOfTaps(numberOfTaps);

    if (maxDuration !== undefined) {
      gesture = gesture.maxDuration(maxDuration);
    }

    if (onBegin) gesture = gesture.onBegin(onBegin);

    gesture = gesture.onStart(() => {
      if (haptic) this.hapticService.impact("light");
      onStart?.();
    });

    if (onEnd) gesture = gesture.onEnd(onEnd);

    if (onFinalize) {
      gesture = gesture.onFinalize((_event, success) => {
        onFinalize(success);
      });
    }

    return gesture;
  }

  /**
   * Create a long-press gesture recognizer.
   */
  createLongPress(config: LongPressConfig = {}): GestureType {
    const {
      minDuration = 500,
      maxDistance = 10,
      haptic = true,
      onBegin,
      onStart,
      onEnd,
      onFinalize,
    } = config;

    let gesture = Gesture.LongPress()
      .minDuration(minDuration)
      .maxDistance(maxDistance);

    if (onBegin) gesture = gesture.onBegin(onBegin);

    gesture = gesture.onStart(() => {
      if (haptic) this.hapticService.impact("heavy");
      onStart?.();
    });

    if (onEnd) gesture = gesture.onEnd(onEnd);

    if (onFinalize) {
      gesture = gesture.onFinalize((_event: any, success: boolean) => {
        onFinalize(success);
      });
    }

    return gesture;
  }

  /**
   * Create a swipe gesture recognizer using a pan gesture with velocity detection.
   */
  createSwipe(config: SwipeConfig = {}): GestureType {
    const {
      direction,
      velocityThreshold = 500,
      haptic = true,
      onBegin,
      onStart,
      onEnd,
      onFinalize,
    } = config;

    let gesture = Gesture.Pan();

    // Set activation offsets based on direction
    if (direction === "left" || direction === "right") {
      gesture = gesture.activeOffsetX(
        direction === "left" ? -20 : 20
      );
    } else if (direction === "up" || direction === "down") {
      gesture = gesture.activeOffsetY(
        direction === "up" ? -20 : 20
      );
    }

    if (onBegin) gesture = gesture.onBegin(onBegin);
    if (onStart) gesture = gesture.onStart(onStart);

    gesture = gesture.onEnd((event) => {
      const { velocityX, velocityY } = event;
      let matched = false;

      switch (direction) {
        case "left":
          matched = velocityX < -velocityThreshold;
          break;
        case "right":
          matched = velocityX > velocityThreshold;
          break;
        case "up":
          matched = velocityY < -velocityThreshold;
          break;
        case "down":
          matched = velocityY > velocityThreshold;
          break;
        default:
          // No direction filter — any swipe matches
          matched =
            Math.abs(velocityX) > velocityThreshold ||
            Math.abs(velocityY) > velocityThreshold;
          break;
      }

      if (matched) {
        if (haptic) this.hapticService.impact("medium");
        onEnd?.();
      }
    });

    if (onFinalize) {
      gesture = gesture.onFinalize((_event, success) => {
        onFinalize(success);
      });
    }

    return gesture;
  }

  /**
   * Create a pan gesture recognizer.
   */
  createPan(config: PanConfig = {}): GestureType {
    const {
      activeOffsetX,
      activeOffsetY,
      failOffsetX,
      failOffsetY,
      minDistance,
      haptic = false,
      onBegin,
      onStart,
      onEnd,
      onUpdate,
      onFinalize,
    } = config;

    let gesture = Gesture.Pan();

    if (activeOffsetX !== undefined) gesture = gesture.activeOffsetX(activeOffsetX as number);
    if (activeOffsetY !== undefined) gesture = gesture.activeOffsetY(activeOffsetY as number);
    if (failOffsetX !== undefined) gesture = gesture.failOffsetX(failOffsetX as number);
    if (failOffsetY !== undefined) gesture = gesture.failOffsetY(failOffsetY as number);
    if (minDistance !== undefined) gesture = gesture.minDistance(minDistance);

    if (onBegin) gesture = gesture.onBegin(onBegin);

    gesture = gesture.onStart(() => {
      if (haptic) this.hapticService.selection();
      onStart?.();
    });

    if (onUpdate) {
      gesture = gesture.onUpdate((event) => {
        onUpdate(event.translationX, event.translationY);
      });
    }

    if (onEnd) gesture = gesture.onEnd(onEnd);

    if (onFinalize) {
      gesture = gesture.onFinalize((_event, success) => {
        onFinalize(success);
      });
    }

    return gesture;
  }

  /**
   * Register a gesture handler with a unique id.
   */
  register(id: string, gesture: GestureType): GestureHandlerRegistration {
    // Dispose existing handler with same id
    this.unregister(id);

    const registration: GestureHandlerRegistration = {
      id,
      gesture,
      dispose: () => this.unregister(id),
    };

    this.registeredHandlers.set(id, registration);
    return registration;
  }

  /**
   * Unregister a gesture handler by id.
   */
  unregister(id: string): void {
    this.registeredHandlers.delete(id);
  }

  /**
   * Get a registered gesture handler by id.
   */
  getHandler(id: string): GestureHandlerRegistration | undefined {
    return this.registeredHandlers.get(id);
  }

  /**
   * Get all registered handler ids.
   */
  getRegisteredIds(): string[] {
    return Array.from(this.registeredHandlers.keys());
  }

  /**
   * Unregister all gesture handlers.
   */
  dispose(): void {
    this.registeredHandlers.clear();
  }
}
