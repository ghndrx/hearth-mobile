import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
// import * as FaceDetector from 'expo-face-detector';

export interface ImageFilter {
  name: string;
  label: string;
  adjustments: FilterSettings;
}

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
};

export interface CropRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
}

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingPath {
  points: DrawingPoint[];
  color: string;
  strokeWidth: number;
}

export interface ImageAnnotation {
  type: 'text' | 'draw';
  x: number;
  y: number;
  content?: string;
  paths?: DrawingPath[];
  color: string;
  fontSize?: number;
  strokeWidth?: number;
}

export interface FaceRegion {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
  faceID?: number;
  rollAngle?: number;
  yawAngle?: number;
}

export interface EditableImage {
  uri: string;
  width: number;
  height: number;
  originalUri: string;
  cropRegion?: CropRegion;
  rotation: number;
  filters: FilterSettings;
  annotations: ImageAnnotation[];
  faces: FaceRegion[];
}

class ImageEditingService {
  private static instance: ImageEditingService;

  public static getInstance(): ImageEditingService {
    if (!ImageEditingService.instance) {
      ImageEditingService.instance = new ImageEditingService();
    }
    return ImageEditingService.instance;
  }

  async initializeEditableImage(uri: string): Promise<EditableImage> {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error('Image file not found');
    }

    const result = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });

    // Attempt face detection
    let faces: FaceRegion[] = [];
    try {
      faces = await this.detectFaces(result.uri);
    } catch {
      // Face detection not available or failed — continue without it
    }

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      originalUri: uri,
      rotation: 0,
      filters: { ...DEFAULT_FILTER_SETTINGS },
      annotations: [],
      faces,
    };
  }

  async cropImage(
    editableImage: EditableImage,
    cropRegion: CropRegion
  ): Promise<EditableImage> {
    const actions: ImageManipulator.Action[] = [
      {
        crop: {
          originX: Math.round(cropRegion.originX),
          originY: Math.round(cropRegion.originY),
          width: Math.round(cropRegion.width),
          height: Math.round(cropRegion.height),
        },
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      editableImage.uri,
      actions,
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
    );

    return {
      ...editableImage,
      uri: result.uri,
      width: result.width,
      height: result.height,
      cropRegion,
    };
  }

  async resizeImage(
    editableImage: EditableImage,
    options: ResizeOptions
  ): Promise<EditableImage> {
    const resize: { width?: number; height?: number } = {};

    if (options.maintainAspectRatio) {
      if (options.width) {
        resize.width = Math.round(options.width);
      } else if (options.height) {
        resize.height = Math.round(options.height);
      }
    } else {
      if (options.width) resize.width = Math.round(options.width);
      if (options.height) resize.height = Math.round(options.height);
    }

    const result = await ImageManipulator.manipulateAsync(
      editableImage.uri,
      [{ resize }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
    );

    return {
      ...editableImage,
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  }

  async rotateImage(
    editableImage: EditableImage,
    degrees: number
  ): Promise<EditableImage> {
    const result = await ImageManipulator.manipulateAsync(
      editableImage.uri,
      [{ rotate: degrees }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
    );

    const newRotation = (editableImage.rotation + degrees) % 360;

    return {
      ...editableImage,
      uri: result.uri,
      width: result.width,
      height: result.height,
      rotation: newRotation,
    };
  }

  async flipImage(
    editableImage: EditableImage,
    direction: 'horizontal' | 'vertical'
  ): Promise<EditableImage> {
    const result = await ImageManipulator.manipulateAsync(
      editableImage.uri,
      [{
        flip: direction === 'horizontal'
          ? ImageManipulator.FlipType.Horizontal
          : ImageManipulator.FlipType.Vertical,
      }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
    );

    return {
      ...editableImage,
      uri: result.uri,
    };
  }

  applyFilterSettings(
    editableImage: EditableImage,
    filters: Partial<FilterSettings>
  ): EditableImage {
    return {
      ...editableImage,
      filters: { ...editableImage.filters, ...filters },
    };
  }

  addAnnotation(
    editableImage: EditableImage,
    annotation: ImageAnnotation
  ): EditableImage {
    return {
      ...editableImage,
      annotations: [...editableImage.annotations, annotation],
    };
  }

  removeAnnotation(
    editableImage: EditableImage,
    annotationIndex: number
  ): EditableImage {
    const annotations = [...editableImage.annotations];
    annotations.splice(annotationIndex, 1);
    return { ...editableImage, annotations };
  }

  async detectFaces(uri: string): Promise<FaceRegion[]> {
    // TODO: Install expo-face-detector and uncomment this code
    // const result = await FaceDetector.detectFacesAsync(uri, {
    //   mode: FaceDetector.FaceDetectorMode.fast,
    //   detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
    //   runClassifications: FaceDetector.FaceDetectorClassifications.none,
    // });
    //
    // return result.faces.map((face: any) => ({
    //   bounds: face.bounds,
    //   faceID: face.faceID,
    //   rollAngle: face.rollAngle,
    //   yawAngle: face.yawAngle,
    // }));

    // For now, return empty array
    console.warn('Face detection not available. Install expo-face-detector to enable.');
    return [];
  }

  getSmartCropRegion(
    editableImage: EditableImage,
    targetAspectRatio: number
  ): CropRegion | null {
    if (editableImage.faces.length === 0) return null;

    // Calculate bounding box around all detected faces
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const face of editableImage.faces) {
      const fx = face.bounds.origin.x;
      const fy = face.bounds.origin.y;
      const fw = face.bounds.size.width;
      const fh = face.bounds.size.height;
      minX = Math.min(minX, fx);
      minY = Math.min(minY, fy);
      maxX = Math.max(maxX, fx + fw);
      maxY = Math.max(maxY, fy + fh);
    }

    // Add padding around faces (30% of face area)
    const facesWidth = maxX - minX;
    const facesHeight = maxY - minY;
    const padX = facesWidth * 0.3;
    const padY = facesHeight * 0.3;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate crop dimensions to fit target aspect ratio while including all faces
    const requiredWidth = facesWidth + padX * 2;
    const requiredHeight = facesHeight + padY * 2;

    let cropWidth: number;
    let cropHeight: number;

    if (requiredWidth / requiredHeight > targetAspectRatio) {
      cropWidth = requiredWidth;
      cropHeight = cropWidth / targetAspectRatio;
    } else {
      cropHeight = requiredHeight;
      cropWidth = cropHeight * targetAspectRatio;
    }

    // Ensure crop doesn't exceed image bounds
    cropWidth = Math.min(cropWidth, editableImage.width);
    cropHeight = Math.min(cropHeight, editableImage.height);

    // Ensure aspect ratio with clamped dimensions
    if (cropWidth / cropHeight > targetAspectRatio) {
      cropWidth = cropHeight * targetAspectRatio;
    } else {
      cropHeight = cropWidth / targetAspectRatio;
    }

    // Center crop on faces, clamping to image bounds
    let originX = centerX - cropWidth / 2;
    let originY = centerY - cropHeight / 2;
    originX = Math.max(0, Math.min(originX, editableImage.width - cropWidth));
    originY = Math.max(0, Math.min(originY, editableImage.height - cropHeight));

    return {
      originX: Math.round(originX),
      originY: Math.round(originY),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    };
  }

  getPresetFilters(): ImageFilter[] {
    return [
      { name: 'original', label: 'Original', adjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 } },
      { name: 'vivid', label: 'Vivid', adjustments: { brightness: 10, contrast: 15, saturation: 25, warmth: 5 } },
      { name: 'dramatic', label: 'Dramatic', adjustments: { brightness: -5, contrast: 30, saturation: 15, warmth: -10 } },
      { name: 'warm', label: 'Warm', adjustments: { brightness: 5, contrast: 10, saturation: 10, warmth: 25 } },
      { name: 'cool', label: 'Cool', adjustments: { brightness: 5, contrast: 10, saturation: 10, warmth: -25 } },
      { name: 'bw', label: 'B&W', adjustments: { brightness: 0, contrast: 20, saturation: -100, warmth: 0 } },
    ];
  }

  async finalizeImage(editableImage: EditableImage): Promise<string> {
    // Apply final compression pass for optimized output
    const result = await ImageManipulator.manipulateAsync(
      editableImage.uri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.85 }
    );
    return result.uri;
  }

  async resetImage(editableImage: EditableImage): Promise<EditableImage> {
    return this.initializeEditableImage(editableImage.originalUri);
  }
}

export default ImageEditingService;
