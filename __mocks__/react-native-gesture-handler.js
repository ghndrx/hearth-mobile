// Mock for react-native-gesture-handler

const createMockGesture = (type) => {
  const mockGesture = {};

  // All methods return the same object for chaining
  const methods = [
    // Common methods
    'onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize', 'enabled',
    'shouldCancelWhenOutside', 'hitSlop',

    // Tap-specific methods
    'numberOfTaps', 'maxDuration',

    // LongPress-specific methods
    'minDuration', 'maxDistance', 'maxDistanceX', 'maxDistanceY', 'numberOfPointers',

    // Pan-specific methods
    'activeOffsetX', 'activeOffsetY', 'failOffsetX', 'failOffsetY',
    'minDistance', 'minVelocity',

    // Pinch-specific methods
    'onScaleChange',

    // Rotation-specific methods
    'onRotationChange'
  ];

  methods.forEach(method => {
    mockGesture[method] = jest.fn().mockImplementation(() => mockGesture);
  });

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