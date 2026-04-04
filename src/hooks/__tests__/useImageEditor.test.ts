/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useImageEditor } from '../useImageEditor';
import ImageEditingService, { DEFAULT_FILTER_SETTINGS } from '../../services/media/ImageEditingService';

jest.mock('../../services/media/ImageEditingService');

const mockService = {
  initializeEditableImage: jest.fn(),
  cropImage: jest.fn(),
  resizeImage: jest.fn(),
  rotateImage: jest.fn(),
  flipImage: jest.fn(),
  applyFilterSettings: jest.fn(),
  addAnnotation: jest.fn(),
  removeAnnotation: jest.fn(),
  getSmartCropRegion: jest.fn(),
  resetImage: jest.fn(),
  finalizeImage: jest.fn(),
  getPresetFilters: jest.fn(),
};

(ImageEditingService.getInstance as jest.Mock).mockReturnValue(mockService);

const mockEditableImage = {
  uri: 'file://test.jpg',
  width: 1000,
  height: 800,
  originalUri: 'file://original.jpg',
  rotation: 0,
  filters: { ...DEFAULT_FILTER_SETTINGS },
  annotations: [],
  faces: [],
};

describe('useImageEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useImageEditor());

    expect(result.current.editableImage).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.filterSettings).toEqual(DEFAULT_FILTER_SETTINGS);
  });

  it('should handle successful image initialization', async () => {
    mockService.initializeEditableImage.mockResolvedValue(mockEditableImage);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    expect(result.current.editableImage).toEqual(mockEditableImage);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.filterSettings).toEqual(DEFAULT_FILTER_SETTINGS);
  });

  it('should handle image initialization error', async () => {
    mockService.initializeEditableImage.mockRejectedValue(new Error('Load failed'));

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://invalid.jpg');
    });

    expect(result.current.editableImage).toBeNull();
    expect(result.current.error).toBe('Failed to initialize image: Load failed');
  });

  it('should handle rotation', async () => {
    const rotatedImage = { ...mockEditableImage, rotation: 90, uri: 'file://rotated.jpg' };
    mockService.initializeEditableImage.mockResolvedValue(mockEditableImage);
    mockService.rotateImage.mockResolvedValue(rotatedImage);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    await act(async () => {
      await result.current.rotateImage(90);
    });

    expect(mockService.rotateImage).toHaveBeenCalledWith(mockEditableImage, 90);
  });

  it('should handle flip', async () => {
    const flippedImage = { ...mockEditableImage, uri: 'file://flipped.jpg' };
    mockService.initializeEditableImage.mockResolvedValue(mockEditableImage);
    mockService.flipImage.mockResolvedValue(flippedImage);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    await act(async () => {
      await result.current.flipImage('horizontal');
    });

    expect(mockService.flipImage).toHaveBeenCalledWith(mockEditableImage, 'horizontal');
  });

  it('should update filter settings', async () => {
    const updatedImage = {
      ...mockEditableImage,
      filters: { ...DEFAULT_FILTER_SETTINGS, brightness: 50 },
    };
    mockService.initializeEditableImage.mockResolvedValue(mockEditableImage);
    mockService.applyFilterSettings.mockReturnValue(updatedImage);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    act(() => {
      result.current.updateFilterSettings({ brightness: 50 });
    });

    expect(mockService.applyFilterSettings).toHaveBeenCalledWith(
      mockEditableImage,
      { brightness: 50 }
    );
    expect(result.current.filterSettings.brightness).toBe(50);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should handle smart crop with faces', async () => {
    const imageWithFaces = {
      ...mockEditableImage,
      faces: [{ bounds: { origin: { x: 300, y: 200 }, size: { width: 100, height: 120 } } }],
    };
    const croppedImage = { ...imageWithFaces, uri: 'file://smart-cropped.jpg', width: 500, height: 500 };

    mockService.initializeEditableImage.mockResolvedValue(imageWithFaces);
    mockService.getSmartCropRegion.mockReturnValue({ originX: 200, originY: 150, width: 500, height: 500 });
    mockService.cropImage.mockResolvedValue(croppedImage);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    await act(async () => {
      await result.current.smartCrop(1);
    });

    expect(mockService.getSmartCropRegion).toHaveBeenCalledWith(imageWithFaces, 1);
    expect(mockService.cropImage).toHaveBeenCalled();
  });

  it('should set error when smart crop has no faces', async () => {
    mockService.initializeEditableImage.mockResolvedValue(mockEditableImage);
    mockService.getSmartCropRegion.mockReturnValue(null);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    await act(async () => {
      await result.current.smartCrop(1);
    });

    expect(result.current.error).toBe('No faces detected for smart crop');
  });

  it('should handle resize', async () => {
    const resizedImage = { ...mockEditableImage, uri: 'file://resized.jpg', width: 500, height: 400 };
    mockService.initializeEditableImage.mockResolvedValue(mockEditableImage);
    mockService.resizeImage.mockResolvedValue(resizedImage);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    await act(async () => {
      await result.current.resizeImage({ width: 500, maintainAspectRatio: true });
    });

    expect(mockService.resizeImage).toHaveBeenCalledWith(
      mockEditableImage,
      { width: 500, maintainAspectRatio: true }
    );
  });

  it('should handle finalize image', async () => {
    mockService.initializeEditableImage.mockResolvedValue(mockEditableImage);
    mockService.finalizeImage.mockResolvedValue('file://final.jpg');

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    let finalUri: string | null = null;
    await act(async () => {
      finalUri = await result.current.finalizeImage();
    });

    expect(finalUri).toBe('file://final.jpg');
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should reset filter settings on image reset', async () => {
    const resetResult = { ...mockEditableImage };
    mockService.initializeEditableImage.mockResolvedValue({
      ...mockEditableImage,
      filters: { brightness: 50, contrast: 20, saturation: 0, warmth: 0 },
    });
    mockService.resetImage.mockResolvedValue(resetResult);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    await act(async () => {
      await result.current.resetImage();
    });

    expect(result.current.filterSettings).toEqual(DEFAULT_FILTER_SETTINGS);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should return preset filters', () => {
    const presets = [
      { name: 'original', label: 'Original', adjustments: DEFAULT_FILTER_SETTINGS },
    ];
    mockService.getPresetFilters.mockReturnValue(presets);

    const { result } = renderHook(() => useImageEditor());
    expect(result.current.getPresetFilters()).toEqual(presets);
  });
});
