import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useImageEditor } from '../../hooks/useImageEditor';
import { CropRegion, ImageAnnotation } from '../../services/media/ImageEditingService';

export interface ImageEditorProps {
  initialImageUri: string;
  onSave?: (finalUri: string) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

export type EditMode = 'crop' | 'filters' | 'annotations' | 'adjustments';

export const ImageEditor: React.FC<ImageEditorProps> = ({
  initialImageUri,
  onSave,
  onCancel,
  onError,
}) => {
  const [editMode, setEditMode] = useState<EditMode>('crop');
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);

  const {
    editableImage,
    isLoading,
    error,
    hasUnsavedChanges,
    initializeImage,
    cropImage,
    applyFilter,
    rotateImage,
    flipImage,
    addAnnotation,
    removeAnnotation,
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

  const handleCrop = async () => {
    if (cropRegion) {
      await cropImage(cropRegion);
      setCropRegion(null);
    }
  };

  const handleAddTextAnnotation = () => {
    if (annotationText.trim()) {
      const annotation: ImageAnnotation = {
        type: 'text',
        x: 50, // Default position
        y: 50,
        content: annotationText,
        color: '#FFFFFF',
        fontSize: 20,
      };
      addAnnotation(annotation);
      setAnnotationText('');
      setIsAnnotating(false);
    }
  };

  const renderEditModeSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.modeSelector}
    >
      {[
        { mode: 'crop', label: 'Crop' },
        { mode: 'adjustments', label: 'Adjust' },
        { mode: 'filters', label: 'Filters' },
        { mode: 'annotations', label: 'Text' },
      ].map(({ mode, label }) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.modeButton,
            editMode === mode && styles.activeModeButton,
          ]}
          onPress={() => setEditMode(mode as EditMode)}
        >
          <Text
            style={[
              styles.modeButtonText,
              editMode === mode && styles.activeModeButtonText,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderCropControls = () => (
    <View style={styles.controlsContainer}>
      <Text style={styles.controlsTitle}>Crop Image</Text>
      <View style={styles.cropControls}>
        <TouchableOpacity
          style={styles.cropButton}
          onPress={() => setCropRegion({
            originX: editableImage ? editableImage.width * 0.1 : 0,
            originY: editableImage ? editableImage.height * 0.1 : 0,
            width: editableImage ? editableImage.width * 0.8 : 0,
            height: editableImage ? editableImage.height * 0.8 : 0,
          })}
        >
          <Text style={styles.buttonText}>Set Crop Region</Text>
        </TouchableOpacity>
        {cropRegion && (
          <TouchableOpacity style={styles.applyButton} onPress={handleCrop}>
            <Text style={styles.buttonText}>Apply Crop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAdjustmentControls = () => (
    <View style={styles.controlsContainer}>
      <Text style={styles.controlsTitle}>Adjustments</Text>
      <View style={styles.adjustmentControls}>
        <TouchableOpacity
          style={styles.adjustmentButton}
          onPress={() => rotateImage(90)}
        >
          <Text style={styles.buttonText}>Rotate 90°</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.adjustmentButton}
          onPress={() => flipImage('horizontal')}
        >
          <Text style={styles.buttonText}>Flip H</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.adjustmentButton}
          onPress={() => flipImage('vertical')}
        >
          <Text style={styles.buttonText}>Flip V</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={resetImage}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterControls = () => {
    const presetFilters = getPresetFilters();

    return (
      <View style={styles.controlsContainer}>
        <Text style={styles.controlsTitle}>Filters</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersContainer}>
            {presetFilters.map((filter) => (
              <TouchableOpacity
                key={filter.name}
                style={styles.filterButton}
                onPress={() => applyFilter(filter.adjustments)}
              >
                <Text style={styles.filterButtonText}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderAnnotationControls = () => (
    <View style={styles.controlsContainer}>
      <Text style={styles.controlsTitle}>Add Text</Text>
      {isAnnotating ? (
        <View style={styles.annotationInput}>
          <TextInput
            style={styles.textInput}
            value={annotationText}
            onChangeText={setAnnotationText}
            placeholder="Enter text..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddTextAnnotation}
          >
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsAnnotating(false)}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addTextButton}
          onPress={() => setIsAnnotating(true)}
        >
          <Text style={styles.buttonText}>Add Text</Text>
        </TouchableOpacity>
      )}

      {editableImage && editableImage.annotations.length > 0 && (
        <View style={styles.annotationsList}>
          <Text style={styles.annotationsTitle}>Annotations:</Text>
          {editableImage.annotations.map((annotation, index) => (
            <View key={index} style={styles.annotationItem}>
              <Text style={styles.annotationText}>
                {annotation.content || 'Drawing'}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeAnnotation(index)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderControls = () => {
    switch (editMode) {
      case 'crop':
        return renderCropControls();
      case 'adjustments':
        return renderAdjustmentControls();
      case 'filters':
        return renderFilterControls();
      case 'annotations':
        return renderAnnotationControls();
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Processing image...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Image</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
          <Text style={[styles.headerButtonText, styles.saveButtonText]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      <View style={styles.imageContainer}>
        {editableImage && (
          <Image
            source={{ uri: editableImage.uri }}
            style={styles.image}
            contentFit="contain"
          />
        )}
        {cropRegion && (
          <View
            style={[
              styles.cropOverlay,
              {
                left: cropRegion.originX,
                top: cropRegion.originY,
                width: cropRegion.width,
                height: cropRegion.height,
              },
            ]}
          />
        )}
      </View>

      {/* Mode Selector */}
      {renderEditModeSelector()}

      {/* Controls */}
      {renderControls()}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
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
    paddingVertical: 12,
    backgroundColor: '#1C1C1E',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '90%',
    height: '90%',
  },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  modeSelector: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
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
  controlsContainer: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    maxHeight: 200,
  },
  controlsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cropControls: {
    flexDirection: 'row',
    gap: 12,
  },
  cropButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '500',
  },
  adjustmentControls: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustmentButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  annotationInput: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addTextButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  annotationsList: {
    marginTop: 12,
  },
  annotationsTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  annotationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  annotationText: {
    color: '#FFF',
    flex: 1,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
  errorContainer: {
    backgroundColor: '#FF3B30',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#FFF',
    textAlign: 'center',
  },
});

export default ImageEditor;