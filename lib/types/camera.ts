import { CameraType } from 'expo-camera';

export interface CameraPermissions {
  camera: boolean;
  audio: boolean;
}

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

export interface CapturedVideo {
  uri: string;
  width: number;
  height: number;
  duration: number;
}

export interface CameraConfig {
  type: CameraType;
  flashMode: 'on' | 'off' | 'auto';
  quality: number;
  base64: boolean;
  exif: boolean;
}

export interface CameraState {
  isReady: boolean;
  hasPermission: boolean;
  isRecording: boolean;
  flashMode: 'on' | 'off' | 'auto';
  cameraType: CameraType;
}