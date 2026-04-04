import ImageEditingService, {
  EditableImage,
  CropRegion,
  ImageAnnotation,
  DEFAULT_FILTER_SETTINGS,
} from '../ImageEditingService';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
  FlipType: { Horizontal: 'horizontal', Vertical: 'vertical' },
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock('expo-face-detector', () => ({
  detectFacesAsync: jest.fn().mockResolvedValue({ faces: [] }),
  FaceDetectorMode: { fast: 1 },
  FaceDetectorLandmarks: { none: 0 },
  FaceDetectorClassifications: { none: 0 },
}));

const mockEditableImage = (): EditableImage => ({
  uri: 'file://test.jpg',
  width: 1000,
  height: 800,
  originalUri: 'file://original.jpg',
  rotation: 0,
  filters: { ...DEFAULT_FILTER_SETTINGS },
  annotations: [],
  faces: [],
});

describe('ImageEditingService', () => {
  let service: ImageEditingService;

  beforeEach(() => {
    service = ImageEditingService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = ImageEditingService.getInstance();
      const instance2 = ImageEditingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initializeEditableImage', () => {
    it('should initialize an editable image successfully', async () => {
      const mockUri = 'file://test-image.jpg';
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: mockUri,
        width: 1000,
        height: 800,
      });

      const result = await service.initializeEditableImage(mockUri);

      expect(result).toEqual({
        uri: mockUri,
        width: 1000,
        height: 800,
        originalUri: mockUri,
        rotation: 0,
        filters: DEFAULT_FILTER_SETTINGS,
        annotations: [],
        faces: [],
      });
    });

    it('should throw error if file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      await expect(service.initializeEditableImage('file://missing.jpg'))
        .rejects.toThrow('Image file not found');
    });
  });

  describe('cropImage', () => {
    it('should crop an image with rounded coordinates', async () => {
      const image = mockEditableImage();
      const cropRegion: CropRegion = { originX: 100.7, originY: 50.3, width: 500.5, height: 400.9 };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://cropped.jpg',
        width: 501,
        height: 401,
      });

      const result = await service.cropImage(image, cropRegion);

      expect(result.uri).toBe('file://cropped.jpg');
      expect(result.cropRegion).toEqual(cropRegion);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        image.uri,
        [{ crop: { originX: 101, originY: 50, width: 501, height: 401 } }],
        { format: 'jpeg', compress: 0.9 }
      );
    });
  });

  describe('resizeImage', () => {
    it('should resize maintaining aspect ratio by width', async () => {
      const image = mockEditableImage();
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://resized.jpg',
        width: 500,
        height: 400,
      });

      const result = await service.resizeImage(image, { width: 500, maintainAspectRatio: true });

      expect(result.width).toBe(500);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        image.uri,
        [{ resize: { width: 500 } }],
        { format: 'jpeg', compress: 0.9 }
      );
    });

    it('should resize with explicit width and height', async () => {
      const image = mockEditableImage();
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://resized.jpg',
        width: 300,
        height: 300,
      });

      await service.resizeImage(image, { width: 300, height: 300, maintainAspectRatio: false });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        image.uri,
        [{ resize: { width: 300, height: 300 } }],
        { format: 'jpeg', compress: 0.9 }
      );
    });
  });

  describe('rotateImage', () => {
    it('should rotate and track cumulative rotation', async () => {
      const image = mockEditableImage();
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://rotated.jpg',
        width: 800,
        height: 1000,
      });

      const result = await service.rotateImage(image, 90);

      expect(result.rotation).toBe(90);
      expect(result.width).toBe(800);
      expect(result.height).toBe(1000);
    });

    it('should support free rotation with arbitrary degrees', async () => {
      const image = mockEditableImage();
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://rotated.jpg',
        width: 1000,
        height: 800,
      });

      const result = await service.rotateImage(image, 45);

      expect(result.rotation).toBe(45);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        image.uri,
        [{ rotate: 45 }],
        { format: 'jpeg', compress: 0.9 }
      );
    });
  });

  describe('flipImage', () => {
    it('should flip horizontally', async () => {
      const image = mockEditableImage();
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://flipped.jpg',
        width: 1000,
        height: 800,
      });

      const result = await service.flipImage(image, 'horizontal');

      expect(result.uri).toBe('file://flipped.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        image.uri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { format: 'jpeg', compress: 0.9 }
      );
    });

    it('should flip vertically', async () => {
      const image = mockEditableImage();
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://flipped.jpg',
        width: 1000,
        height: 800,
      });

      await service.flipImage(image, 'vertical');

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        image.uri,
        [{ flip: ImageManipulator.FlipType.Vertical }],
        { format: 'jpeg', compress: 0.9 }
      );
    });
  });

  describe('applyFilterSettings', () => {
    it('should merge filter settings', () => {
      const image = mockEditableImage();
      const result = service.applyFilterSettings(image, { brightness: 50, contrast: 20 });

      expect(result.filters.brightness).toBe(50);
      expect(result.filters.contrast).toBe(20);
      expect(result.filters.saturation).toBe(0);
      expect(result.filters.warmth).toBe(0);
    });
  });

  describe('annotations', () => {
    it('should add a text annotation', () => {
      const image = mockEditableImage();
      const annotation: ImageAnnotation = {
        type: 'text',
        x: 100,
        y: 200,
        content: 'Test',
        color: '#FFF',
        fontSize: 20,
      };

      const result = service.addAnnotation(image, annotation);

      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0]).toEqual(annotation);
    });

    it('should add a drawing annotation', () => {
      const image = mockEditableImage();
      const annotation: ImageAnnotation = {
        type: 'draw',
        x: 0,
        y: 0,
        paths: [{ points: [{ x: 0, y: 0 }, { x: 100, y: 100 }], color: '#FF0000', strokeWidth: 4 }],
        color: '#FF0000',
        strokeWidth: 4,
      };

      const result = service.addAnnotation(image, annotation);
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].type).toBe('draw');
    });

    it('should remove an annotation by index', () => {
      const image: EditableImage = {
        ...mockEditableImage(),
        annotations: [
          { type: 'text', x: 0, y: 0, content: 'A', color: '#FFF', fontSize: 20 },
          { type: 'text', x: 0, y: 0, content: 'B', color: '#FFF', fontSize: 20 },
        ],
      };

      const result = service.removeAnnotation(image, 0);
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].content).toBe('B');
    });
  });

  describe('getSmartCropRegion', () => {
    it('should return null when no faces detected', () => {
      const image = mockEditableImage();
      const result = service.getSmartCropRegion(image, 1);
      expect(result).toBeNull();
    });

    it('should return crop region centered on faces', () => {
      const image: EditableImage = {
        ...mockEditableImage(),
        faces: [
          { bounds: { origin: { x: 300, y: 200 }, size: { width: 100, height: 120 } } },
        ],
      };

      const result = service.getSmartCropRegion(image, 1);

      expect(result).not.toBeNull();
      expect(result!.width).toBe(result!.height); // 1:1 ratio
      expect(result!.originX).toBeGreaterThanOrEqual(0);
      expect(result!.originY).toBeGreaterThanOrEqual(0);
    });

    it('should encompass multiple faces', () => {
      const image: EditableImage = {
        ...mockEditableImage(),
        faces: [
          { bounds: { origin: { x: 100, y: 200 }, size: { width: 100, height: 120 } } },
          { bounds: { origin: { x: 600, y: 200 }, size: { width: 100, height: 120 } } },
        ],
      };

      const result = service.getSmartCropRegion(image, 16 / 9);

      expect(result).not.toBeNull();
      // Should be wide enough to include both faces
      expect(result!.width).toBeGreaterThan(400);
    });
  });

  describe('getPresetFilters', () => {
    it('should return preset filters with proper structure', () => {
      const filters = service.getPresetFilters();

      expect(filters.length).toBe(6);
      expect(filters[0]).toEqual({
        name: 'original',
        label: 'Original',
        adjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
      });
      filters.forEach(f => {
        expect(f).toHaveProperty('name');
        expect(f).toHaveProperty('label');
        expect(f.adjustments).toHaveProperty('brightness');
        expect(f.adjustments).toHaveProperty('contrast');
        expect(f.adjustments).toHaveProperty('saturation');
        expect(f.adjustments).toHaveProperty('warmth');
      });
    });
  });

  describe('finalizeImage', () => {
    it('should return optimized URI', async () => {
      const image = mockEditableImage();
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://final.jpg',
        width: 1000,
        height: 800,
      });

      const result = await service.finalizeImage(image);
      expect(result).toBe('file://final.jpg');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        image.uri,
        [],
        { format: 'jpeg', compress: 0.85 }
      );
    });
  });

  describe('resetImage', () => {
    it('should re-initialize from original URI', async () => {
      const image = mockEditableImage();
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: image.originalUri,
        width: 1000,
        height: 800,
      });

      const result = await service.resetImage(image);
      expect(result.uri).toBe(image.originalUri);
      expect(result.rotation).toBe(0);
      expect(result.filters).toEqual(DEFAULT_FILTER_SETTINGS);
      expect(result.annotations).toEqual([]);
    });
  });
});
