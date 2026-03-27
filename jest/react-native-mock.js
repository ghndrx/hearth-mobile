// React Native mock for tests
const RN = {
  // Platform
  Platform: {
    OS: 'ios',
    Version: 17,
    isPad: false,
    isPhone: true,
    isTV: false,
    select: jest.fn((platform) => platform.ios),
  },

  // Dimensions
  Dimensions: {
    get: jest.fn(() => ({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1,
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },

  // AppState
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },

  // Alert
  Alert: {
    alert: jest.fn(),
  },

  // Components
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  TextInput: 'TextInput',
  Image: 'Image',
  Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator',

  // Styles
  StyleSheet: {
    create: jest.fn(styles => styles),
    flatten: jest.fn(style => style),
  },

  // Animated
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Value: jest.fn(() => ({
      addListener: jest.fn(),
      removeListener: jest.fn(),
      setValue: jest.fn(),
    })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
    interpolate: jest.fn(),
  },

  // Keyboard
  Keyboard: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dismiss: jest.fn(),
  },

  // DeviceInfo
  DeviceInfo: {
    getSystemVersion: jest.fn(() => '17.0'),
    getModel: jest.fn(() => 'iPhone'),
  },

  // StatusBar
  StatusBar: {
    setBarStyle: jest.fn(),
    setHidden: jest.fn(),
    setBackgroundColor: jest.fn(),
  },

  // Native modules
  NativeModules: {
    RNCNetInfo: {
      getCurrentState: jest.fn(() => Promise.resolve({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
      })),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
  },
};

module.exports = RN;