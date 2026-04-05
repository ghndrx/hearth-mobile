import { Gesture } from "react-native-gesture-handler";
import { GestureService } from "../GestureService";
import { HapticService } from "../HapticService";

// Mock HapticService
jest.mock("../HapticService", () => {
  const mockInstance = {
    impact: jest.fn().mockResolvedValue(undefined),
    notification: jest.fn().mockResolvedValue(undefined),
    selection: jest.fn().mockResolvedValue(undefined),
    setIntensity: jest.fn(),
    getIntensity: jest.fn().mockReturnValue("medium"),
    isAvailable: jest.fn().mockReturnValue(true),
  };
  return {
    HapticService: {
      getInstance: jest.fn(() => mockInstance),
      __mockInstance: mockInstance,
    },
  };
});

// Mock react-native-gesture-handler
const createMockGesture = () => {
  const chainable: any = {};
  const callbacks: Record<string, Function> = {};

  const methods = [
    "numberOfTaps",
    "maxDuration",
    "minDuration",
    "maxDist",
    "activeOffsetX",
    "activeOffsetY",
    "failOffsetX",
    "failOffsetY",
    "minDistance",
  ];

  methods.forEach((method) => {
    chainable[method] = jest.fn().mockReturnValue(chainable);
  });

  ["onBegin", "onStart", "onEnd", "onUpdate", "onFinalize"].forEach(
    (method) => {
      chainable[method] = jest.fn((cb: Function) => {
        callbacks[method] = cb;
        return chainable;
      });
    }
  );

  chainable.__callbacks = callbacks;
  return chainable;
};

jest.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Tap: jest.fn(() => createMockGesture()),
    LongPress: jest.fn(() => createMockGesture()),
    Pan: jest.fn(() => createMockGesture()),
  },
}));

describe("GestureService", () => {
  let service: GestureService;
  let hapticMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (GestureService as any).instance = null;
    service = GestureService.getInstance();
    hapticMock = (HapticService as any).__mockInstance;
  });

  describe("singleton", () => {
    it("returns the same instance", () => {
      const a = GestureService.getInstance();
      const b = GestureService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("createTap()", () => {
    it("creates a basic tap gesture", () => {
      const gesture = service.createTap();
      expect(Gesture.Tap).toHaveBeenCalled();
      expect(gesture).toBeDefined();
    });

    it("configures numberOfTaps", () => {
      const gesture = service.createTap({ numberOfTaps: 2 });
      expect((gesture as any).numberOfTaps).toHaveBeenCalledWith(2);
    });

    it("configures maxDuration", () => {
      const gesture = service.createTap({ maxDuration: 300 });
      expect((gesture as any).maxDuration).toHaveBeenCalledWith(300);
    });

    it("triggers haptic on start by default", () => {
      const gesture = service.createTap();
      const startCb = (gesture as any).__callbacks.onStart;
      startCb();
      expect(hapticMock.impact).toHaveBeenCalledWith("light");
    });

    it("skips haptic when haptic=false", () => {
      const gesture = service.createTap({ haptic: false });
      const startCb = (gesture as any).__callbacks.onStart;
      startCb();
      expect(hapticMock.impact).not.toHaveBeenCalled();
    });

    it("calls user callbacks", () => {
      const onStart = jest.fn();
      const onBegin = jest.fn();
      const gesture = service.createTap({ onStart, onBegin, haptic: false });

      (gesture as any).__callbacks.onBegin();
      expect(onBegin).toHaveBeenCalled();

      (gesture as any).__callbacks.onStart();
      expect(onStart).toHaveBeenCalled();
    });
  });

  describe("createLongPress()", () => {
    it("creates a long-press gesture with defaults", () => {
      const gesture = service.createLongPress();
      expect(Gesture.LongPress).toHaveBeenCalled();
      expect((gesture as any).minDuration).toHaveBeenCalledWith(500);
      expect((gesture as any).maxDist).toHaveBeenCalledWith(10);
    });

    it("triggers heavy haptic on start", () => {
      const gesture = service.createLongPress();
      (gesture as any).__callbacks.onStart();
      expect(hapticMock.impact).toHaveBeenCalledWith("heavy");
    });

    it("configures custom minDuration", () => {
      const gesture = service.createLongPress({ minDuration: 1000 });
      expect((gesture as any).minDuration).toHaveBeenCalledWith(1000);
    });
  });

  describe("createSwipe()", () => {
    it("creates a swipe gesture", () => {
      const gesture = service.createSwipe({ direction: "left" });
      expect(Gesture.Pan).toHaveBeenCalled();
      expect((gesture as any).activeOffsetX).toHaveBeenCalledWith(-20);
    });

    it("sets correct offsets for each direction", () => {
      service.createSwipe({ direction: "right" });
      const rightGesture = (Gesture.Pan as jest.Mock).mock.results.slice(-1)[0].value;
      expect(rightGesture.activeOffsetX).toHaveBeenCalledWith(20);

      service.createSwipe({ direction: "up" });
      const upGesture = (Gesture.Pan as jest.Mock).mock.results.slice(-1)[0].value;
      expect(upGesture.activeOffsetY).toHaveBeenCalledWith(-20);

      service.createSwipe({ direction: "down" });
      const downGesture = (Gesture.Pan as jest.Mock).mock.results.slice(-1)[0].value;
      expect(downGesture.activeOffsetY).toHaveBeenCalledWith(20);
    });
  });

  describe("createPan()", () => {
    it("creates a pan gesture", () => {
      const gesture = service.createPan();
      expect(Gesture.Pan).toHaveBeenCalled();
      expect(gesture).toBeDefined();
    });

    it("does not trigger haptic by default", () => {
      const gesture = service.createPan();
      (gesture as any).__callbacks.onStart();
      expect(hapticMock.selection).not.toHaveBeenCalled();
    });

    it("triggers selection haptic when enabled", () => {
      const gesture = service.createPan({ haptic: true });
      (gesture as any).__callbacks.onStart();
      expect(hapticMock.selection).toHaveBeenCalled();
    });

    it("passes through onUpdate events", () => {
      const onUpdate = jest.fn();
      const gesture = service.createPan({ onUpdate });
      (gesture as any).__callbacks.onUpdate({ translationX: 10, translationY: 20 });
      expect(onUpdate).toHaveBeenCalledWith(10, 20);
    });
  });

  describe("handler registration", () => {
    it("registers and retrieves handlers", () => {
      const gesture = service.createTap();
      const reg = service.register("test-tap", gesture);

      expect(reg.id).toBe("test-tap");
      expect(reg.gesture).toBe(gesture);
      expect(service.getHandler("test-tap")).toBe(reg);
    });

    it("unregisters handlers", () => {
      const gesture = service.createTap();
      service.register("test-tap", gesture);
      service.unregister("test-tap");
      expect(service.getHandler("test-tap")).toBeUndefined();
    });

    it("replaces existing handler with same id", () => {
      const g1 = service.createTap();
      const g2 = service.createTap();
      service.register("test", g1);
      service.register("test", g2);
      expect(service.getHandler("test")?.gesture).toBe(g2);
    });

    it("lists registered ids", () => {
      service.register("a", service.createTap());
      service.register("b", service.createTap());
      expect(service.getRegisteredIds()).toEqual(["a", "b"]);
    });

    it("disposes all handlers", () => {
      service.register("a", service.createTap());
      service.register("b", service.createTap());
      service.dispose();
      expect(service.getRegisteredIds()).toEqual([]);
    });

    it("dispose() on registration removes it", () => {
      const gesture = service.createTap();
      const reg = service.register("test", gesture);
      reg.dispose();
      expect(service.getHandler("test")).toBeUndefined();
    });
  });
});
