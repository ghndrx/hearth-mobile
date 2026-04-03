/**
 * Advanced Camera View Component - MS-002
 * Full-screen camera interface with photo/video capture, editing, and controls
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  useColorScheme,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaService, type MediaAsset } from '../../lib/services/media';
import { imageProcessingService } from '../../lib/services/imageProcessing';
import { LoadingSpinner } from '../ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface CameraResult {
  type: 'photo' | 'video';
  uri: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface AdvancedCameraViewProps {
  onCapture?: (result: CameraResult) => void;
  onDismiss?: () => void;
  initialMode?: 'photo' | 'video';
  maxVideoDuration?: number;
  allowModeSwitch?: boolean;
  showEditingOptions?: boolean;
}

interface CameraControls {
  flash: 'off' | 'on' | 'auto';
  timer: 0 | 3 | 10;
  gridVisible: boolean;
  cameraType: 'front' | 'back';
}

interface FocusPoint {
  x: number;
  y: number;
  visible: boolean;
}

export function AdvancedCameraView({
  onCapture,
  onDismiss,
  initialMode = 'photo',
  maxVideoDuration = 60,
  allowModeSwitch = true,
  showEditingOptions = true,
}: AdvancedCameraViewProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Camera state
  const cameraRef = useRef<CameraView>(null);
  const [mode, setMode] = useState<'photo' | 'video'>(initialMode);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Camera controls
  const [controls, setControls] = useState<CameraControls>({
    flash: 'auto',
    timer: 0,
    gridVisible: false,
    cameraType: 'back',
  });

  // Focus and exposure
  const [focusPoint, setFocusPoint] = useState<FocusPoint>({ x: 0, y: 0, visible: false });
  const [exposure, setExposure] = useState(0);
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Animation for camera view
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Pan responder for tap-to-focus and exposure adjustment
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (!isCapturing && !isRecording) {
          handleTapToFocus(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isCapturing && !isRecording && focusPoint.visible) {
          // Adjust exposure based on vertical drag
          const newExposure = Math.max(-1, Math.min(1, gestureState.dy / 200));
          setExposure(newExposure);
        }
      },
      onPanResponderRelease: () => {
        // Hide focus point after delay
        setTimeout(() => {
          setFocusPoint(prev => ({ ...prev, visible: false }));
        }, 2000);
      },
    })
  ).current;

  // Animate camera view in
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxVideoDuration) {
            handleStopRecording();
            return prev;
          }
          return newDuration;
        });
      }, 1000);
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [isRecording, maxVideoDuration]);

  const handleTapToFocus = useCallback(async (x: number, y: number) => {
    // Convert screen coordinates to camera coordinates (0-1)
    const focusX = x / SCREEN_WIDTH;
    const focusY = y / SCREEN_HEIGHT;

    setFocusPoint({ x, y, visible: true });

    // Animate focus indicator
    focusAnim.setValue(0);
    Animated.sequence([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(focusAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Focus camera (if camera supports it)
    try {
      if (cameraRef.current) {
        // Note: Focus point setting would be implemented here
        // This is a placeholder as expo-camera API may vary
        console.log(`Focusing at ${focusX}, ${focusY}`);
      }
    } catch (error) {
      console.warn('Focus adjustment not supported:', error);
    }
  }, [focusAnim]);

  const handleDismiss = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    }

    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) {
        onDismiss();
      } else {
        router.back();
      }
    });
  }, [isRecording, slideAnim, onDismiss, router]);

  const handleFlipCamera = useCallback(() => {
    setControls(prev => ({
      ...prev,
      cameraType: prev.cameraType === 'back' ? 'front' : 'back',
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleFlashToggle = useCallback(() => {
    const flashModes: Array<'off' | 'on' | 'auto'> = ['off', 'auto', 'on'];
    const currentIndex = flashModes.indexOf(controls.flash);
    const nextIndex = (currentIndex + 1) % flashModes.length;

    setControls(prev => ({ ...prev, flash: flashModes[nextIndex] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [controls.flash]);

  const handleTimerToggle = useCallback(() => {
    const timerOptions: Array<0 | 3 | 10> = [0, 3, 10];
    const currentIndex = timerOptions.indexOf(controls.timer);
    const nextIndex = (currentIndex + 1) % timerOptions.length;

    setControls(prev => ({ ...prev, timer: timerOptions[nextIndex] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [controls.timer]);

  const handleGridToggle = useCallback(() => {
    setControls(prev => ({ ...prev, gridVisible: !prev.gridVisible }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing || isRecording) return;

    setIsCapturing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      if (mode === 'photo') {
        // Timer countdown
        if (controls.timer > 0) {
          for (let i = controls.timer; i > 0; i--) {
            // Show countdown UI (could be implemented as overlay)
            await new Promise(resolve => setTimeout(resolve, 1000));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
        });

        if (photo?.uri) {
          const result: CameraResult = {
            type: 'photo',
            uri: photo.uri,
            width: photo.width,
            height: photo.height,
          };

          if (onCapture) {
            onCapture(result);
          } else {
            // Navigate to editing screen if enabled
            if (showEditingOptions) {
              router.push({
                pathname: '/camera/edit',
                params: { uri: photo.uri, type: 'photo' },
              });
            }
          }
        }
      } else {
        // Start video recording
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: maxVideoDuration,
        });

        if (video?.uri) {
          const result: CameraResult = {
            type: 'video',
            uri: video.uri,
            duration: recordingDuration,
          };

          if (onCapture) {
            onCapture(result);
          }
        }
      }
    } catch (error) {
      console.error('Capture failed:', error);
      Alert.alert('Capture Failed', 'Failed to capture media. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [mode, controls.timer, isCapturing, isRecording, maxVideoDuration, recordingDuration, onCapture, showEditingOptions, router]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording || !cameraRef.current) return;

    try {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Stop recording failed:', error);
    }
  }, [isRecording]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getFlashIcon = useCallback(() => {
    switch (controls.flash) {
      case 'on': return 'flash';
      case 'off': return 'flash-off';
      default: return 'flash-outline';
    }
  }, [controls.flash]);

  // Request permissions if not granted
  if (!permission) {
    return <LoadingSpinner />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <StatusBar style="light" />
        <Text className="text-white text-lg mb-4">Camera permission required</Text>
        <Pressable
          onPress={requestPermission}
          className="bg-amber-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
      }}
      className="absolute inset-0 bg-black"
    >
      <StatusBar style="light" hidden={Platform.OS === 'android'} />

      {/* Camera View */}
      <View className="flex-1" {...panResponder.panHandlers}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={controls.cameraType}
          flash={controls.flash}
          mode={mode === 'photo' ? 'picture' : 'video'}
        >
          {/* Grid Overlay */}
          {controls.gridVisible && (
            <View className="absolute inset-0 pointer-events-none">
              {/* Grid lines */}
              <View className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
              <View className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
              <View className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
              <View className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
            </View>
          )}

          {/* Focus Point Indicator */}
          {focusPoint.visible && (
            <Animated.View
              style={{
                position: 'absolute',
                left: focusPoint.x - 25,
                top: focusPoint.y - 25,
                width: 50,
                height: 50,
                opacity: focusAnim,
                transform: [
                  {
                    scale: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.5, 1],
                    }),
                  },
                ],
              }}
              className="border-2 border-amber-500 rounded-full pointer-events-none"
            >
              <View className="absolute top-1/2 left-0 w-2 h-px bg-amber-500" />
              <View className="absolute top-1/2 right-0 w-2 h-px bg-amber-500" />
              <View className="absolute left-1/2 top-0 w-px h-2 bg-amber-500" />
              <View className="absolute left-1/2 bottom-0 w-px h-2 bg-amber-500" />
            </Animated.View>
          )}

          {/* Top Controls */}
          <View
            style={{ paddingTop: insets.top }}
            className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-4 py-4 bg-black/30"
          >
            <Pressable onPress={handleDismiss} className="w-10 h-10 items-center justify-center">
              <Ionicons name="close" size={24} color="white" />
            </Pressable>

            <View className="flex-row gap-4">
              {/* Flash Control */}
              <Pressable onPress={handleFlashToggle} className="w-10 h-10 items-center justify-center">
                <Ionicons name={getFlashIcon()} size={20} color="white" />
              </Pressable>

              {/* Timer Control */}
              <Pressable onPress={handleTimerToggle} className="w-10 h-10 items-center justify-center">
                <Ionicons name="timer-outline" size={20} color="white" />
                {controls.timer > 0 && (
                  <Text className="absolute -top-1 -right-1 text-xs text-amber-500 font-bold">
                    {controls.timer}
                  </Text>
                )}
              </Pressable>

              {/* Grid Control */}
              <Pressable onPress={handleGridToggle} className="w-10 h-10 items-center justify-center">
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color={controls.gridVisible ? "#f59e0b" : "white"}
                />
              </Pressable>
            </View>
          </View>

          {/* Recording Indicator */}
          {isRecording && (
            <View className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-500 px-4 py-2 rounded-full">
              <Text className="text-white font-semibold">
                REC {formatDuration(recordingDuration)}
              </Text>
            </View>
          )}

          {/* Bottom Controls */}
          <View
            style={{ paddingBottom: insets.bottom }}
            className="absolute bottom-0 left-0 right-0 px-4 py-6 bg-black/30"
          >
            {/* Mode Selector */}
            {allowModeSwitch && (
              <View className="flex-row justify-center mb-6">
                <View className="bg-black/50 rounded-full p-1">
                  <Pressable
                    onPress={() => setMode('photo')}
                    className={`px-4 py-2 rounded-full ${
                      mode === 'photo' ? 'bg-white' : ''
                    }`}
                  >
                    <Text className={mode === 'photo' ? 'text-black' : 'text-white'}>
                      Photo
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setMode('video')}
                    className={`px-4 py-2 rounded-full ${
                      mode === 'video' ? 'bg-white' : ''
                    }`}
                  >
                    <Text className={mode === 'video' ? 'text-black' : 'text-white'}>
                      Video
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Capture Controls */}
            <View className="flex-row items-center justify-between">
              {/* Gallery Button - placeholder */}
              <View className="w-12 h-12" />

              {/* Capture Button */}
              <View className="items-center">
                <Pressable
                  onPress={mode === 'video' && isRecording ? handleStopRecording : handleCapture}
                  disabled={isCapturing}
                  className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
                  style={{
                    backgroundColor: isRecording ? '#ef4444' : 'transparent',
                  }}
                >
                  {isCapturing ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <View
                      className="w-16 h-16 bg-white rounded-full"
                      style={{
                        backgroundColor: isRecording ? 'transparent' : 'white',
                        borderRadius: isRecording ? 8 : 32,
                      }}
                    />
                  )}
                </Pressable>

                {mode === 'video' && !isRecording && (
                  <Text className="text-white text-xs mt-2">Hold for video</Text>
                )}
              </View>

              {/* Camera Flip Button */}
              <Pressable onPress={handleFlipCamera} className="w-12 h-12 items-center justify-center">
                <Ionicons name="camera-reverse-outline" size={24} color="white" />
              </Pressable>
            </View>
          </View>
        </CameraView>
      </View>
    </Animated.View>
  );
}

export default AdvancedCameraView;