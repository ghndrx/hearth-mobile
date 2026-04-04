import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useImageEditor } from '../../hooks/useImageEditor';
import { CropRegion, ImageAnnotation, DrawingPath } from '../../services/media/ImageEditingService';
import { CropTool } from './CropTool';
import { FilterPanel } from './FilterPanel';
import { RotationTool } from './RotationTool';
import { DrawingCanvas } from './DrawingCanvas';

export interface ImageEditorProps {
  initialImageUri: string;
  onSave?: (finalUri: string) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

export type EditMode = 'crop' | 'rotate' | 'filters' | 'draw' | 'text';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const ImageEditor: React.FC<ImageEditorProps> = ({
  initialImageUri,
  onSave,
  onCancel,
  onError,
}) => {
  const [editMode, setEditMode] = useState<EditMode>('crop');
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);

  const imageScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);

  const {
    editableImage,
    isLoading,
    error,
    hasUnsavedChanges,
    filterSettings,
    initializeImage,
    cropImage,
    rotateImage,
    flipImage,
    updateFilterSettings,
    addAnnotation,
    removeAnnotation,
    smartCrop,
    resetImage,
    finalizeImage,
    getPresetFilters,
  } = useImageEditor();

  React.useEffect(() => {
    initializeImage(initialImageUri);
  }, [initialImageUri, initializeImage]);

  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Pinch-to-zoom gesture for image preview
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      imageScale.value = Math.min(Math.max(e.scale, 0.5), 3);
    })
    .onEnd(() => {
      if (imageScale.value < 1) {
        imageScale.value = withTiming(1);
        imageTranslateX.value = withTiming(0);
        imageTranslateY.value = withTiming(0);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (imageScale.value > 1) {
        imageTranslateX.value = e.translationX;
        imageTranslateY.value = e.translationY;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTranslateX.value },
      { translateY: imageTranslateY.value },
      { scale: imageScale.value },
    ],
  }));

  const handleSave = async () => {
    const finalUri = await finalizeImage();
    if (finalUri && onSave) {
      onSave(finalUri);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel?.();
    }
  };

  const handleApplyCrop = async () => {
    if (cropRegion) {
      await cropImage(cropRegion);
      setCropRegion(null);
    }
  };

  const handleAddTextAnnotation = () => {
    if (!annotationText.trim()) return;
    const annotation: ImageAnnotation = {
      type: 'text',
      x: 50,
      y: 50,
      content: annotationText,
      color: '#FFFFFF',
      fontSize: 20,
    };
    addAnnotation(annotation);
    setAnnotationText('');
    setIsTextInputVisible(false);
  };

  const handleDrawingPathComplete = useCallback((path: DrawingPath) => {
    setDrawingPaths(prev => [...prev, path]);
  }, []);

  const handleClearDrawing = useCallback(() => {
    setDrawingPaths([]);
  }, []);

  const handleSaveDrawing = () => {
    if (drawingPaths.length === 0) return;
    const annotation: ImageAnnotation = {
      type: 'draw',
      x: 0,
      y: 0,
      paths: drawingPaths,
      color: drawingPaths[0].color,
      strokeWidth: drawingPaths[0].strokeWidth,
    };
    addAnnotation(annotation);
    setDrawingPaths([]);
  };

  const presetFilters = getPresetFilters();
  const imagePreviewWidth = SCREEN_WIDTH - 32;
  const imageAspectRatio = editableImage
    ? editableImage.width / editableImage.height
    : 1;
  const imagePreviewHeight = imagePreviewWidth / imageAspectRatio;

  const MODES: { mode: EditMode; label: string }[] = [
    { mode: 'crop', label: 'Crop' },
    { mode: 'rotate', label: 'Rotate' },
    { mode: 'filters', label: 'Filters' },
    { mode: 'draw', label: 'Draw' },
    { mode: 'text', label: 'Text' },
  ];

  const renderControls = () => {
    if (!editableImage) return null;

    switch (editMode) {
      case 'crop':
        return (
          <View>
            <CropTool
              imageWidth={editableImage.width}
              imageHeight={editableImage.height}
              onCropRegionChange={setCropRegion}
              onSmartCrop={smartCrop}
              currentCropRegion={cropRegion ?? undefined}
              faces={editableImage.faces}
            />
            {cropRegion && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.applyButton} onPress={handleApplyCrop}>
                  <Text style={styles.buttonText}>Apply Crop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelActionButton}
                  onPress={() => setCropRegion(null)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'rotate':
        return (
          <RotationTool
            rotation={editableImage.rotation}
            onRotate90={() => rotateImage(90)}
            onRotate270={() => rotateImage(-90)}
            onFreeRotate={(deg) => rotateImage(deg)}
            onFlipH={() => flipImage('horizontal')}
            onFlipV={() => flipImage('vertical')}
          />
        );

      case 'filters':
        return (
          <FilterPanel
            onFilterChange={updateFilterSettings}
            currentFilters={filterSettings}
            presetFilters={presetFilters}
          />
        );

      case 'draw':
        return (
          <View style={styles.drawSection}>
            <DrawingCanvas
              width={imagePreviewWidth}
              height={Math.min(imagePreviewHeight, 300)}
              paths={drawingPaths}
              onPathComplete={handleDrawingPathComplete}
              onClear={handleClearDrawing}
            />
            {drawingPaths.length > 0 && (
              <TouchableOpacity style={styles.saveDrawingButton} onPress={handleSaveDrawing}>
                <Text style={styles.buttonText}>Save Drawing</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'text':
        return (
          <View style={styles.textSection}>
            {isTextInputVisible ? (
              <View style={styles.textInputRow}>
                <TextInput
                  style={styles.textInput}
                  value={annotationText}
                  onChangeText={setAnnotationText}
                  placeholder="Enter text..."
                  placeholderTextColor="#666"
                  autoFocus
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddTextAnnotation}>
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelActionButton}
                  onPress={() => { setIsTextInputVisible(false); setAnnotationText(''); }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTextButton}
                onPress={() => setIsTextInputVisible(true)}
              >
                <Text style={styles.buttonText}>Add Text Overlay</Text>
              </TouchableOpacity>
            )}

            {editableImage.annotations.length > 0 && (
              <View style={styles.annotationsList}>
                <Text style={styles.annotationsTitle}>
                  Annotations ({editableImage.annotations.length})
                </Text>
                {editableImage.annotations.map((annotation, index) => (
                  <View key={index} style={styles.annotationItem}>
                    <Text style={styles.annotationLabel} numberOfLines={1}>
                      {annotation.type === 'text' ? annotation.content : 'Drawing'}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeAnnotation(index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading && !editableImage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading image...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Image</Text>
        <View style={styles.headerRight}>
          {isLoading && <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />}
          <TouchableOpacity style={styles.headerButton} onPress={resetImage}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSave} disabled={isLoading}>
            <Text style={[styles.headerButtonText, styles.saveText]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Preview */}
      <View style={styles.imageContainer}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={animatedImageStyle}>
            {editableImage && (
              <Image
                source={{ uri: editableImage.uri }}
                style={{
                  width: imagePreviewWidth,
                  height: Math.min(imagePreviewHeight, 400),
                }}
                contentFit="contain"
              />
            )}
          </Animated.View>
        </GestureDetector>

        {/* Crop overlay */}
        {cropRegion && editableImage && (
          <View style={styles.cropOverlayContainer} pointerEvents="none">
            <View
              style={[
                styles.cropOverlay,
                {
                  left: (cropRegion.originX / editableImage.width) * imagePreviewWidth,
                  top: (cropRegion.originY / editableImage.height) * Math.min(imagePreviewHeight, 400),
                  width: (cropRegion.width / editableImage.width) * imagePreviewWidth,
                  height: (cropRegion.height / editableImage.height) * Math.min(imagePreviewHeight, 400),
                },
              ]}
            />
          </View>
        )}

        {/* Face indicators */}
        {editMode === 'crop' && editableImage && editableImage.faces.map((face, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.faceIndicator,
              {
                left: (face.bounds.origin.x / editableImage.width) * imagePreviewWidth,
                top: (face.bounds.origin.y / editableImage.height) * Math.min(imagePreviewHeight, 400),
                width: (face.bounds.size.width / editableImage.width) * imagePreviewWidth,
                height: (face.bounds.size.height / editableImage.height) * Math.min(imagePreviewHeight, 400),
              },
            ]}
          />
        ))}
      </View>

      {/* Mode selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeSelector}
        contentContainerStyle={styles.modeSelectorContent}
      >
        {MODES.map(({ mode, label }) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeButton, editMode === mode && styles.activeModeButton]}
            onPress={() => setEditMode(mode)}
          >
            <Text style={[styles.modeButtonText, editMode === mode && styles.activeModeButtonText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Controls panel */}
      <ScrollView style={styles.controlsPanel} bounces={false}>
        {renderControls()}
      </ScrollView>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1C1C1E',
  },
  headerButton: {
    padding: 6,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinner: {
    marginRight: 4,
  },
  resetText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '500',
  },
  saveText: {
    fontWeight: '700',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    position: 'relative',
  },
  cropOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  faceIndicator: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#34C759',
    borderRadius: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  modeSelector: {
    backgroundColor: '#1C1C1E',
    maxHeight: 52,
  },
  modeSelectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
  },
  activeModeButton: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  activeModeButtonText: {
    color: '#FFF',
  },
  controlsPanel: {
    backgroundColor: '#1C1C1E',
    maxHeight: 280,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  applyButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelActionButton: {
    backgroundColor: '#3A3A3C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  drawSection: {
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  saveDrawingButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textSection: {
    padding: 16,
    gap: 12,
  },
  textInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addTextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  annotationsList: {
    gap: 6,
  },
  annotationsTitle: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  annotationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  annotationLabel: {
    color: '#FFF',
    flex: 1,
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#FF3B30',
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 13,
  },
});

export default ImageEditor;
