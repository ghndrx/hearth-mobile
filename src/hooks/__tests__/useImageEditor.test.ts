import { renderHook, act } from '@testing-library/react-hooks';
import { useImageEditor } from '../useImageEditor';
import ImageEditingService from '../../services/media/ImageEditingService';

// Mock the ImageEditingService
jest.mock('../../services/media/ImageEditingService');

const mockImageEditingService = {
  initializeEditableImage: jest.fn(),
  cropImage: jest.fn(),
  applyFilters: jest.fn(),
  rotateImage: jest.fn(),
  flipImage: jest.fn(),
  addAnnotation: jest.fn(),
  removeAnnotation: jest.fn(),
  resetImage: jest.fn(),
  finalizeImage: jest.fn(),
  getPresetFilters: jest.fn(),
};

(ImageEditingService.getInstance as jest.Mock).mockReturnValue(mockImageEditingService);

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
  });

  it('should handle successful image initialization', async () => {
    const mockEditableImage = {
      uri: 'file://test.jpg',
      width: 1000,
      height: 800,
      originalUri: 'file://original.jpg',
      filters: {},
      annotations: [],
    };

    mockImageEditingService.initializeEditableImage.mockResolvedValue(mockEditableImage);

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://test.jpg');
    });

    expect(result.current.editableImage).toEqual(mockEditableImage);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(mockImageEditingService.initializeEditableImage).toHaveBeenCalledWith('file://test.jpg');
  });

  it('should handle image initialization error', async () => {
    const errorMessage = 'Failed to load image';
    mockImageEditingService.initializeEditableImage.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useImageEditor());

    await act(async () => {
      await result.current.initializeImage('file://invalid.jpg');
    });

    expect(result.current.editableImage).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(`Failed to initialize image: ${errorMessage}`);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should handle successful crop operation', async () => {
    const mockEditableImage = {
      uri: 'file://test.jpg',
      width: 1000,
      height: 800,
      originalUri: 'file://original.jpg',
      filters: {},
      annotations: [],
    };

    const mockCroppedImage = {
      ...mockEditableImage,
      uri: 'file://cropped.jpg',
      width: 500,
      height: 400,
    };

    mockImageEditingService.cropImage.mockResolvedValue(mockCroppedImage);

    const { result } = renderHook(() => useImageEditor());

    // Set initial image
    act(() => {
      result.current.setEditableImage = jest.fn();
      // @ts-ignore - accessing private state for testing
      result.current._setEditableImage(mockEditableImage);
    });

    await act(async () => {
      await result.current.cropImage({
        originX: 100,
        originY: 100,
        width: 500,
        height: 400,
      });
    });

    expect(mockImageEditingService.cropImage).toHaveBeenCalledWith(
      mockEditableImage,
      { originX: 100, originY: 100, width: 500, height: 400 }
    );
  });

  it('should handle annotation addition', () => {
    const mockEditableImage = {
      uri: 'file://test.jpg',
      width: 1000,
      height: 800,
      originalUri: 'file://original.jpg',
      filters: {},
      annotations: [],
    };

    const mockAnnotatedImage = {
      ...mockEditableImage,
      annotations: [{
        type: 'text' as const,
        x: 100,
        y: 200,
        content: 'Test annotation',
        color: '#FFFFFF',
        fontSize: 20,
      }],
    };

    mockImageEditingService.addAnnotation.mockReturnValue(mockAnnotatedImage);

    const { result } = renderHook(() => useImageEditor());

    // Simulate having an editable image
    // @ts-ignore - accessing private state for testing
    result.current._state = { ...result.current._state, editableImage: mockEditableImage };

    act(() => {
      result.current.addAnnotation({
        type: 'text',
        x: 100,
        y: 200,
        content: 'Test annotation',
        color: '#FFFFFF',
        fontSize: 20,
      });
    });

    expect(mockImageEditingService.addAnnotation).toHaveBeenCalled();
  });

  it('should handle successful image rotation', async () => {
    const mockEditableImage = {
      uri: 'file://test.jpg',
      width: 1000,
      height: 800,
      originalUri: 'file://original.jpg',
      filters: {},
      annotations: [],
    };

    const mockRotatedImage = {
      ...mockEditableImage,
      uri: 'file://rotated.jpg',
      width: 800,
      height: 1000,
    };

    mockImageEditingService.rotateImage.mockResolvedValue(mockRotatedImage);

    const { result } = renderHook(() => useImageEditor());

    // Simulate having an editable image
    // @ts-ignore - accessing private state for testing
    result.current._state = { ...result.current._state, editableImage: mockEditableImage };

    await act(async () => {
      await result.current.rotateImage(90);
    });

    expect(mockImageEditingService.rotateImage).toHaveBeenCalledWith(mockEditableImage, 90);
  });

  it('should handle successful image flip', async () => {
    const mockEditableImage = {
      uri: 'file://test.jpg',
      width: 1000,
      height: 800,
      originalUri: 'file://original.jpg',
      filters: {},
      annotations: [],
    };

    const mockFlippedImage = {
      ...mockEditableImage,
      uri: 'file://flipped.jpg',
    };

    mockImageEditingService.flipImage.mockResolvedValue(mockFlippedImage);

    const { result } = renderHook(() => useImageEditor());

    // Simulate having an editable image
    // @ts-ignore - accessing private state for testing
    result.current._state = { ...result.current._state, editableImage: mockEditableImage };

    await act(async () => {
      await result.current.flipImage('horizontal');
    });

    expect(mockImageEditingService.flipImage).toHaveBeenCalledWith(mockEditableImage, 'horizontal');
  });

  it('should handle finalize image', async () => {
    const mockEditableImage = {
      uri: 'file://test.jpg',
      width: 1000,
      height: 800,
      originalUri: 'file://original.jpg',
      filters: {},
      annotations: [],
    };

    mockImageEditingService.finalizeImage.mockResolvedValue('file://final.jpg');

    const { result } = renderHook(() => useImageEditor());

    // Simulate having an editable image
    // @ts-ignore - accessing private state for testing
    result.current._state = { ...result.current._state, editableImage: mockEditableImage };

    let finalUri: string | null = null;
    await act(async () => {
      finalUri = await result.current.finalizeImage();
    });

    expect(finalUri).toBe('file://final.jpg');
    expect(mockImageEditingService.finalizeImage).toHaveBeenCalledWith(mockEditableImage);
  });

  it('should return preset filters', () => {
    const mockFilters = [
      { name: 'original', label: 'Original', adjustments: {} },
      { name: 'bright', label: 'Bright', adjustments: {} },
    ];

    mockImageEditingService.getPresetFilters.mockReturnValue(mockFilters);

    const { result } = renderHook(() => useImageEditor());

    const filters = result.current.getPresetFilters();

    expect(filters).toEqual(mockFilters);
    expect(mockImageEditingService.getPresetFilters).toHaveBeenCalled();
  });
});