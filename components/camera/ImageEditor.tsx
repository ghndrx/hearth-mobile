/**
 * Image Editor Component - MS-002
 * Basic image editing functionality for crop and rotate
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  useColorScheme,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageProcessingService } from '../../lib/services/imageProcessing';
import { LoadingSpinner } from '../ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface EditingResult {
  uri: string;
  width: number;
  height: number;
  operations: string[];
}

interface ImageEditorProps {
  imageUri: string;
  onSave?: (result: EditingResult) => void;
  onCancel?: () => void;
  allowCrop?: boolean;
  allowRotate?: boolean;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

type EditingMode = 'none' | 'crop' | 'rotate';

export function ImageEditor({
  imageUri,
  onSave,
  onCancel,
  allowCrop = true,
  allowRotate = true,
}: ImageEditorProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // State
  const [editingMode, setEditingMode] = useState<EditingMode>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 1, height: 1 });
  const [operations, setOperations] = useState<string[]>([]);

  // Animation values
  const cropOverlayAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pan responder for crop area
  const cropPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editingMode === 'crop',
      onMoveShouldSetPanResponder: () => editingMode === 'crop',
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (editingMode !== 'crop') return;

        // Update crop area based on gesture
        // This is a simplified implementation
        const newX = Math.max(0, Math.min(1, cropArea.x + gestureState.dx / SCREEN_WIDTH));
        const newY = Math.max(0, Math.min(1, cropArea.y + gestureState.dy / SCREEN_HEIGHT));

        setCropArea(prev => ({
          ...prev,
          x: newX,
          y: newY,
        }));
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  // Load image dimensions
  useEffect(() => {
    const loadImageDimensions = async () => {
      try {
        const dimensions = await imageProcessingService.getImageDimensions(imageUri);
        setImageDimensions(dimensions);
      } catch (error) {
        console.error('Failed to load image dimensions:', error);
      }
    };

    loadImageDimensions();
  }, [imageUri]);

  // Animation for crop overlay
  useEffect(() => {
    Animated.timing(cropOverlayAnim, {
      toValue: editingMode === 'crop' ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [editingMode, cropOverlayAnim]);

  // Animation for rotation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: rotation,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [rotation, rotateAnim]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }, [onCancel, router]);

  const handleRotate = useCallback(() => {
    if (!allowRotate) return;

    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    setOperations(prev => [...prev, `rotate_${newRotation}`]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [allowRotate, rotation]);

  const handleCropToggle = useCallback(() => {
    if (!allowCrop) return;

    if (editingMode === 'crop') {
      setEditingMode('none');
    } else {
      setEditingMode('crop');
      // Reset crop area to center
      setCropArea({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [allowCrop, editingMode]);

  const handleResetCrop = useCallback(() => {
    setCropArea({ x: 0, y: 0, width: 1, height: 1 });
    setOperations(prev => prev.filter(op => !op.startsWith('crop_')));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSave = useCallback(async () => {
    setIsProcessing(true);

    try {
      let processedUri = imageUri;
      let currentDimensions = imageDimensions;
      const appliedOperations: string[] = [];

      // Apply rotation if needed
      if (rotation !== 0) {
        const rotateResult = await ImageManipulator.manipulateAsync(
          processedUri,
          [{ rotate: rotation }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        processedUri = rotateResult.uri;
        currentDimensions = { width: rotateResult.width, height: rotateResult.height };
        appliedOperations.push(`rotated_${rotation}deg`);
      }

      // Apply crop if needed
      if (editingMode === 'crop' && (cropArea.x !== 0 || cropArea.y !== 0 || cropArea.width !== 1 || cropArea.height !== 1)) {
        const cropX = Math.round(cropArea.x * currentDimensions.width);
        const cropY = Math.round(cropArea.y * currentDimensions.height);
        const cropWidth = Math.round(cropArea.width * currentDimensions.width);
        const cropHeight = Math.round(cropArea.height * currentDimensions.height);

        const cropResult = await ImageManipulator.manipulateAsync(
          processedUri,
          [
            {
              crop: {
                originX: cropX,
                originY: cropY,
                width: cropWidth,
                height: cropHeight,
              },
            },
          ],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        processedUri = cropResult.uri;
        currentDimensions = { width: cropResult.width, height: cropResult.height };
        appliedOperations.push('cropped');
      }

      const result: EditingResult = {
        uri: processedUri,
        width: currentDimensions.width,
        height: currentDimensions.height,
        operations: appliedOperations,
      };

      if (onSave) {
        onSave(result);
      } else {
        // Navigate back with result
        router.back();
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Image editing failed:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [imageUri, imageDimensions, rotation, editingMode, cropArea, onSave, router]);

  const calculateImageLayout = useCallback(() => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
    }

    const screenRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
    const imageRatio = imageDimensions.width / imageDimensions.height;

    let displayWidth, displayHeight;

    if (imageRatio > screenRatio) {
      // Image is wider than screen ratio
      displayWidth = SCREEN_WIDTH;
      displayHeight = SCREEN_WIDTH / imageRatio;
    } else {
      // Image is taller than screen ratio
      displayHeight = SCREEN_HEIGHT;
      displayWidth = SCREEN_HEIGHT * imageRatio;
    }

    return {
      width: displayWidth,
      height: displayHeight,
    };
  }, [imageDimensions]);

  const imageLayout = calculateImageLayout();

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center justify-between px-4 py-4 bg-black/50 absolute top-0 left-0 right-0 z-10"
      >
        <Pressable onPress={handleCancel} className="w-10 h-10 items-center justify-center">
          <Ionicons name="close" size={24} color="white" />
        </Pressable>

        <Text className="text-white text-lg font-semibold">Edit Image</Text>

        <Pressable
          onPress={handleSave}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-full ${
            isProcessing ? 'bg-gray-600' : 'bg-amber-500'
          }`}
        >
          {isProcessing ? (
            <LoadingSpinner size="small" />
          ) : (
            <Text className="text-white font-semibold">Save</Text>
          )}
        </Pressable>
      </View>

      {/* Image Container */}
      <View className="flex-1 items-center justify-center" {...cropPanResponder.panHandlers}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{
              width: imageLayout.width,
              height: imageLayout.height,
            }}
            resizeMode="contain"
          />

          {/* Crop Overlay */}
          {editingMode === 'crop' && (
            <Animated.View
              style={{
                opacity: cropOverlayAnim,
              }}
              className="absolute inset-0"
            >
              {/* Dark overlay */}
              <View className="absolute inset-0 bg-black/50" />

              {/* Crop area */}
              <View
                style={{
                  position: 'absolute',
                  left: `${cropArea.x * 100}%`,
                  top: `${cropArea.y * 100}%`,
                  width: `${cropArea.width * 100}%`,
                  height: `${cropArea.height * 100}%`,
                  borderWidth: 2,
                  borderColor: '#f59e0b',
                }}
                className="bg-transparent"
              >
                {/* Crop handles */}
                <View className="absolute -top-1 -left-1 w-4 h-4 bg-amber-500 rounded-full" />
                <View className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full" />
                <View className="absolute -bottom-1 -left-1 w-4 h-4 bg-amber-500 rounded-full" />
                <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full" />
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      {/* Bottom Controls */}
      <View
        style={{ paddingBottom: insets.bottom }}
        className="absolute bottom-0 left-0 right-0 bg-black/50 px-4 py-6"
      >
        <View className="flex-row justify-center items-center gap-8">
          {/* Rotate Button */}
          {allowRotate && (
            <Pressable
              onPress={handleRotate}
              className={`w-14 h-14 rounded-full items-center justify-center border-2 ${
                rotation > 0 ? 'border-amber-500 bg-amber-500/20' : 'border-white/30'
              }`}
            >
              <Ionicons
                name="sync-outline"
                size={24}
                color={rotation > 0 ? '#f59e0b' : 'white'}
              />
            </Pressable>
          )}

          {/* Crop Button */}
          {allowCrop && (
            <Pressable
              onPress={handleCropToggle}
              className={`w-14 h-14 rounded-full items-center justify-center border-2 ${
                editingMode === 'crop' ? 'border-amber-500 bg-amber-500/20' : 'border-white/30'
              }`}
            >
              <Ionicons
                name="crop-outline"
                size={24}
                color={editingMode === 'crop' ? '#f59e0b' : 'white'}
              />
            </Pressable>
          )}

          {/* Reset Crop Button */}
          {editingMode === 'crop' && (
            <Pressable
              onPress={handleResetCrop}
              className="w-14 h-14 rounded-full items-center justify-center border-2 border-white/30"
            >
              <Ionicons name="refresh-outline" size={24} color="white" />
            </Pressable>
          )}
        </View>

        {/* Instructions */}
        {editingMode === 'crop' && (
          <Text className="text-white/70 text-center mt-4 text-sm">
            Drag to adjust crop area
          </Text>
        )}
      </View>
    </View>
  );
}

export default ImageEditor;