import React from 'react';

// Mock react-native components
export const View = React.forwardRef((props, ref) =>
  React.createElement('div', { ...props, ref, testID: props.testID || 'view' })
);

export const Text = React.forwardRef((props, ref) =>
  React.createElement('div', { ...props, ref, testID: 'text' })
);

export const TouchableOpacity = React.forwardRef((props, ref) =>
  React.createElement('div', { ...props, ref, testID: 'touchable-opacity', onClick: props.onPress })
);

export const ScrollView = React.forwardRef((props, ref) =>
  React.createElement('div', { ...props, ref, testID: 'scroll-view' })
);

export const StyleSheet = {
  create: (styles) => styles,
  hairlineWidth: 1,
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Platform = {
  OS: 'ios',
  Version: '14.0',
  select: (obj) => obj.ios || obj.default,
};

export const Alert = {
  alert: jest.fn(),
};

export const ActivityIndicator = React.forwardRef((props, ref) =>
  React.createElement('div', { ...props, ref, testID: 'activity-indicator' })
);

export const StatusBar = React.forwardRef((props, ref) =>
  React.createElement('div', { ...props, ref, testID: 'status-bar' })
);

// Mock react-native modules
export default {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
};