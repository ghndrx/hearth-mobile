// Mock for react-native-gesture-handler

const createMockGesture = (type) => {
  const mockGesture = {
    // Common methods - all return the same object for chaining
    onBegin: jest.fn().mockImplementation(() => mockGesture),
    onStart: jest.fn().mockImplementation(() => mockGesture),
    onUpdate: jest.fn().mockImplementation(() => mockGesture),
    onEnd: jest.fn().mockImplementation(() => mockGesture),
    onFinalize: jest.fn().mockImplementation(() => mockGesture),
    enabled: jest.fn().mockImplementation(() => mockGesture),
    shouldCancelWhenOutside: jest.fn().mockImplementation(() => mockGesture),
    hitSlop: jest.fn().mockImplementation(() => mockGesture),

    // Tap-specific methods
    numberOfTaps: jest.fn().mockImplementation(() => mockGesture),
    maxDuration: jest.fn().mockImplementation(() => mockGesture),

    // LongPress-specific methods
    minDuration: jest.fn().mockImplementation(() => mockGesture),
    maxDistance: jest.fn().mockImplementation(() => mockGesture),
    numberOfPointers: jest.fn().mockImplementation(() => mockGesture),

    // Pan-specific methods
    activeOffsetX: jest.fn().mockImplementation(() => mockGesture),
    activeOffsetY: jest.fn().mockImplementation(() => mockGesture),
    failOffsetX: jest.fn().mockImplementation(() => mockGesture),
    failOffsetY: jest.fn().mockImplementation(() => mockGesture),
    minDistance: jest.fn().mockImplementation(() => mockGesture),
    minVelocity: jest.fn().mockImplementation(() => mockGesture),

    // Pinch-specific methods
    onScaleChange: jest.fn().mockImplementation(() => mockGesture),

    // Rotation-specific methods
    onRotationChange: jest.fn().mockImplementation(() => mockGesture),
  };

  return mockGesture;
};

const Gesture = {
  Tap: () => createMockGesture('Tap'),
  LongPress: () => createMockGesture('LongPress'),
  Pan: () => createMockGesture('Pan'),
  Pinch: () => createMockGesture('Pinch'),
  Rotation: () => createMockGesture('Rotation'),
  Fling: () => createMockGesture('Fling'),
  ForceTouch: () => createMockGesture('ForceTouch'),
  Manual: () => createMockGesture('Manual'),
  Native: () => createMockGesture('Native'),
  Race: (...gestures) => createMockGesture('Race'),
  Simultaneous: (...gestures) => createMockGesture('Simultaneous'),
  Exclusive: (...gestures) => createMockGesture('Exclusive'),
};

const GestureDetector = ({ gesture, children }) => children;

const GestureHandlerRootView = ({ children }) => children;

const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
};

module.exports = {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  State,
  Directions,
  // Legacy handlers (for backwards compatibility)
  TapGestureHandler: GestureDetector,
  LongPressGestureHandler: GestureDetector,
  PanGestureHandler: GestureDetector,
  PinchGestureHandler: GestureDetector,
  RotationGestureHandler: GestureDetector,
  FlingGestureHandler: GestureDetector,
  ForceTouchGestureHandler: GestureDetector,
  NativeViewGestureHandler: GestureDetector,
  // Events
  gestureHandlerRootHOC: (Component) => Component,
};