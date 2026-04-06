/**
 * Mock for expo-camera v16+
 */
import React from 'react';

export const CameraType = {
  front: 'front',
  back: 'back',
};

export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

export const FlashMode = {
  on: 'on',
  off: 'off',
  auto: 'auto',
};

// Mock camera permissions hook
export const useCameraPermissions = jest.fn(() => [
  {
    granted: true,
    canAskAgain: true,
    expires: 'never',
    status: PermissionStatus.GRANTED,
  },
  jest.fn(() =>
    Promise.resolve({
      granted: true,
      canAskAgain: true,
      expires: 'never',
      status: PermissionStatus.GRANTED,
    })
  ),
]);

// Mock Camera component (legacy, for backward compatibility)
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

  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
};

// Mock CameraView component for React (new API)
export const CameraView = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    takePictureAsync: jest.fn(() =>
      Promise.resolve({
        uri: 'file:///mock/path/to/photo.jpg',
        width: 1920,
        height: 1080,
        base64: 'mock-base64-data',
      })
    ),

    recordAsync: jest.fn(() =>
      Promise.resolve({
        uri: 'file:///mock/path/to/video.mp4',
        width: 1920,
        height: 1080,
        duration: 30000, // 30 seconds
      })
    ),

    stopRecording: jest.fn(() =>
      Promise.resolve({
        uri: 'file:///mock/path/to/video.mp4',
        width: 1920,
        height: 1080,
        duration: 5000, // 5 seconds
      })
    ),
  }));

  // Return a simple View mock
  return React.createElement('View', {
    testID: 'camera-view',
    style: props.style,
    children: props.children,
  });
});

// Default export (legacy)
export default CameraView;