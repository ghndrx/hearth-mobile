import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface ImageFilter {
  name: string;
  label: string;
  adjustments: ImageManipulator.ImageResult;
}

export interface CropRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface ImageAnnotation {
  type: 'text' | 'draw';
  x: number;
  y: number;
  content?: string; // For text annotations
  points?: Array<{x: number, y: number}>; // For drawing annotations
  color: string;
  fontSize?: number; // For text
  strokeWidth?: number; // For drawing
}

export interface EditableImage {
  uri: string;
  width: number;
  height: number;
  originalUri: string;
  cropRegion?: CropRegion;
  filters: Partial<ImageManipulator.ImageResult>;
  annotations: ImageAnnotation[];
}

class ImageEditingService {
  private static instance: ImageEditingService;

  public static getInstance(): ImageEditingService {
    if (!ImageEditingService.instance) {
      ImageEditingService.instance = new ImageEditingService();
    }
    return ImageEditingService.instance;
  }

  /**
   * Initialize an image for editing
   */
  async initializeEditableImage(uri: string): Promise<EditableImage> {
    // Get image dimensions
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error('Image file not found');
    }

    // Get image dimensions using ImageManipulator
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      originalUri: uri,
      filters: {},
      annotations: [],
    };
  }

  /**
   * Crop an image
   */
  async cropImage(
    editableImage: EditableImage,
    cropRegion: CropRegion
  ): Promise<EditableImage> {
    const actions: ImageManipulator.Action[] = [
      {
        crop: {
          originX: cropRegion.originX,
          originY: cropRegion.originY,
          width: cropRegion.width,
          height: cropRegion.height,
        },
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      editableImage.originalUri,
      actions,
      {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.8,
      }
    );

    return {
      ...editableImage,
      uri: result.uri,
      width: result.width,
      height: result.height,
      cropRegion,
    };
  }

  /**
   * Apply filters to an image
   */
  async applyFilters(
    editableImage: EditableImage,
    filters: Partial<ImageManipulator.ImageResult>
  ): Promise<EditableImage> {
    const actions: ImageManipulator.Action[] = [];

    // Convert filter settings to ImageManipulator actions
    if (filters.width || filters.height) {
      actions.push({
        resize: {
          width: filters.width,
          height: filters.height,
        },
      });
    }

    // Apply brightness, contrast, and other adjustments
    // Note: expo-image-manipulator has limited filter support
    // For more advanced filters, we'd need to implement them manually or use a different library

    let result = editableImage;

    if (actions.length > 0) {
      const manipulatorResult = await ImageManipulator.manipulateAsync(
        editableImage.uri,
        actions,
        {
          format: ImageManipulator.SaveFormat.JPEG,
          compress: 0.8,
        }
      );

      result = {
        ...editableImage,
        uri: manipulatorResult.uri,
        width: manipulatorResult.width,
        height: manipulatorResult.height,
        filters: { ...editableImage.filters, ...filters },
      };
    }

    return result;
  }

  /**
   * Add annotation to image
   */
  addAnnotation(
    editableImage: EditableImage,
    annotation: ImageAnnotation
  ): EditableImage {
    return {
      ...editableImage,
      annotations: [...editableImage.annotations, annotation],
    };
  }

  /**
   * Remove annotation from image
   */
  removeAnnotation(
    editableImage: EditableImage,
    annotationIndex: number
  ): EditableImage {
    const annotations = [...editableImage.annotations];
    annotations.splice(annotationIndex, 1);

    return {
      ...editableImage,
      annotations,
    };
  }

  /**
   * Get predefined filters
   */
  getPresetFilters(): ImageFilter[] {
    return [
      {
        name: 'original',
        label: 'Original',
        adjustments: {},
      },
      {
        name: 'bright',
        label: 'Bright',
        adjustments: {
          // Note: These would be implemented with custom image processing
          // expo-image-manipulator has limited built-in filter support
        },
      },
      {
        name: 'contrast',
        label: 'High Contrast',
        adjustments: {},
      },
      {
        name: 'warm',
        label: 'Warm',
        adjustments: {},
      },
      {
        name: 'cool',
        label: 'Cool',
        adjustments: {},
      },
    ];
  }

  /**
   * Apply rotation to image
   */
  async rotateImage(
    editableImage: EditableImage,
    degrees: number
  ): Promise<EditableImage> {
    const actions: ImageManipulator.Action[] = [
      {
        rotate: degrees,
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      editableImage.uri,
      actions,
      {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.8,
      }
    );

    return {
      ...editableImage,
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  }

  /**
   * Flip image horizontally or vertically
   */
  async flipImage(
    editableImage: EditableImage,
    direction: 'horizontal' | 'vertical'
  ): Promise<EditableImage> {
    const actions: ImageManipulator.Action[] = [
      {
        flip: direction === 'horizontal'
          ? ImageManipulator.FlipType.Horizontal
          : ImageManipulator.FlipType.Vertical,
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      editableImage.uri,
      actions,
      {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.8,
      }
    );

    return {
      ...editableImage,
      uri: result.uri,
    };
  }

  /**
   * Finalize editing and save the image
   */
  async finalizeImage(editableImage: EditableImage): Promise<string> {
    // For now, return the current URI
    // In a full implementation, we'd render annotations onto the image
    return editableImage.uri;
  }

  /**
   * Reset image to original state
   */
  async resetImage(editableImage: EditableImage): Promise<EditableImage> {
    return this.initializeEditableImage(editableImage.originalUri);
  }
}

export default ImageEditingService;