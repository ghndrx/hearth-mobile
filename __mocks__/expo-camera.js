/**
 * Mock for expo-camera
 */

import React from 'react';
import { View } from 'react-native';

export const CameraType = {
  front: 'front',
  back: 'back',
};

export const FlashMode = {
  on: 'on',
  off: 'off',
  auto: 'auto',
};

export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

// Mock Camera class
export const Camera = {
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({
      status: PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: 'never',
      granted: true,
    })
  ),

  requestMicrophonePermissionsAsync: jest.fn(() =>
    Promise.resolve({
      status: PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: 'never',
      granted: true,
    })
  ),

  getCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({
      status: PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: 'never',
      granted: true,
    })
  ),

  getMicrophonePermissionsAsync: jest.fn(() =>
    Promise.resolve({
      status: PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: 'never',
      granted: true,
    })
  ),
};

// Mock CameraView component
export const CameraView = React.forwardRef((props, ref) => {
  // Mock camera ref methods
  React.useImperativeHandle(ref, () => ({
    takePictureAsync: jest.fn((options) =>
      Promise.resolve({
        uri: 'file:///mock/camera/photo.jpg',
        width: 1920,
        height: 1080,
        base64: options?.base64 ? 'mock-base64-data' : undefined,
        exif: options?.exif ? { Orientation: 1 } : undefined,
      })
    ),

    recordAsync: jest.fn((options) =>
      Promise.resolve({
        uri: 'file:///mock/camera/video.mp4',
      })
    ),

    stopRecording: jest.fn(() =>
      Promise.resolve({
        uri: 'file:///mock/camera/video.mp4',
      })
    ),

    pausePreview: jest.fn(() => Promise.resolve()),
    resumePreview: jest.fn(() => Promise.resolve()),
  }));

  return React.createElement(View, {
    ...props,
    style: [{ flex: 1, backgroundColor: '#000' }, props.style],
    testID: 'camera-view',
  });
});

// Export mock functions for testing
export const mockCameraPermissions = {
  setGranted: (granted) => {
    const status = granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED;
    Camera.requestCameraPermissionsAsync.mockResolvedValue({
      status,
      canAskAgain: !granted,
      expires: 'never',
      granted,
    });
    Camera.getCameraPermissionsAsync.mockResolvedValue({
      status,
      canAskAgain: !granted,
      expires: 'never',
      granted,
    });
  },

  setMicrophoneGranted: (granted) => {
    const status = granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED;
    Camera.requestMicrophonePermissionsAsync.mockResolvedValue({
      status,
      canAskAgain: !granted,
      expires: 'never',
      granted,
    });
    Camera.getMicrophonePermissionsAsync.mockResolvedValue({
      status,
      canAskAgain: !granted,
      expires: 'never',
      granted,
    });
  },

  reset: () => {
    Camera.requestCameraPermissionsAsync.mockClear();
    Camera.requestMicrophonePermissionsAsync.mockClear();
    Camera.getCameraPermissionsAsync.mockClear();
    Camera.getMicrophonePermissionsAsync.mockClear();
  },
};

export const mockCameraRef = {
  takePictureAsync: jest.fn((options) =>
    Promise.resolve({
      uri: 'file:///mock/camera/photo.jpg',
      width: 1920,
      height: 1080,
      base64: options?.base64 ? 'mock-base64-data' : undefined,
      exif: options?.exif ? { Orientation: 1 } : undefined,
    })
  ),

  recordAsync: jest.fn(() => Promise.resolve()),

  stopRecording: jest.fn(() =>
    Promise.resolve({
      uri: 'file:///mock/camera/video.mp4',
    })
  ),

  pausePreview: jest.fn(() => Promise.resolve()),
  resumePreview: jest.fn(() => Promise.resolve()),
};