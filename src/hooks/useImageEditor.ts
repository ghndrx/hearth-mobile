import { useState, useCallback } from 'react';
import ImageEditingService, {
  EditableImage,
  CropRegion,
  ResizeOptions,
  ImageAnnotation,
  ImageFilter,
  FilterSettings,
  DEFAULT_FILTER_SETTINGS,
} from '../services/media/ImageEditingService';

export interface UseImageEditorState {
  editableImage: EditableImage | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  filterSettings: FilterSettings;
}

export interface UseImageEditorActions {
  initializeImage: (uri: string) => Promise<void>;
  cropImage: (cropRegion: CropRegion) => Promise<void>;
  resizeImage: (options: ResizeOptions) => Promise<void>;
  rotateImage: (degrees: number) => Promise<void>;
  flipImage: (direction: 'horizontal' | 'vertical') => Promise<void>;
  updateFilterSettings: (filters: Partial<FilterSettings>) => void;
  addAnnotation: (annotation: ImageAnnotation) => void;
  removeAnnotation: (index: number) => void;
  smartCrop: (aspectRatio: number) => Promise<void>;
  resetImage: () => Promise<void>;
  finalizeImage: () => Promise<string | null>;
  getPresetFilters: () => ImageFilter[];
}

export interface UseImageEditorReturn extends UseImageEditorState, UseImageEditorActions {}

export const useImageEditor = (): UseImageEditorReturn => {
  const [state, setState] = useState<UseImageEditorState>({
    editableImage: null,
    isLoading: false,
    error: null,
    hasUnsavedChanges: false,
    filterSettings: { ...DEFAULT_FILTER_SETTINGS },
  });

  const service = ImageEditingService.getInstance();

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setEditableImage = useCallback((editableImage: EditableImage | null) => {
    setState(prev => ({
      ...prev,
      editableImage,
      hasUnsavedChanges: editableImage !== null,
    }));
  }, []);

  const initializeImage = useCallback(async (uri: string) => {
    setLoading(true);
    setError(null);
    try {
      const editableImage = await service.initializeEditableImage(uri);
      setState(prev => ({
        ...prev,
        editableImage,
        isLoading: false,
        error: null,
        hasUnsavedChanges: false,
        filterSettings: { ...DEFAULT_FILTER_SETTINGS },
      }));
    } catch (err: any) {
      setError(`Failed to initialize image: ${err.message}`);
      setLoading(false);
    }
  }, [service, setLoading, setError]);

  const cropImage = useCallback(async (cropRegion: CropRegion) => {
    if (!state.editableImage) return;
    setLoading(true);
    setError(null);
    try {
      const result = await service.cropImage(state.editableImage, cropRegion);
      setEditableImage(result);
    } catch (err: any) {
      setError(`Failed to crop image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, service, setLoading, setError, setEditableImage]);

  const resizeImage = useCallback(async (options: ResizeOptions) => {
    if (!state.editableImage) return;
    setLoading(true);
    setError(null);
    try {
      const result = await service.resizeImage(state.editableImage, options);
      setEditableImage(result);
    } catch (err: any) {
      setError(`Failed to resize image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, service, setLoading, setError, setEditableImage]);

  const rotateImage = useCallback(async (degrees: number) => {
    if (!state.editableImage) return;
    setLoading(true);
    setError(null);
    try {
      const result = await service.rotateImage(state.editableImage, degrees);
      setEditableImage(result);
    } catch (err: any) {
      setError(`Failed to rotate image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, service, setLoading, setError, setEditableImage]);

  const flipImage = useCallback(async (direction: 'horizontal' | 'vertical') => {
    if (!state.editableImage) return;
    setLoading(true);
    setError(null);
    try {
      const result = await service.flipImage(state.editableImage, direction);
      setEditableImage(result);
    } catch (err: any) {
      setError(`Failed to flip image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, service, setLoading, setError, setEditableImage]);

  const updateFilterSettings = useCallback((filters: Partial<FilterSettings>) => {
    if (!state.editableImage) return;
    const updated = service.applyFilterSettings(state.editableImage, filters);
    setState(prev => ({
      ...prev,
      editableImage: updated,
      hasUnsavedChanges: true,
      filterSettings: updated.filters,
    }));
  }, [state.editableImage, service]);

  const addAnnotation = useCallback((annotation: ImageAnnotation) => {
    if (!state.editableImage) return;
    const result = service.addAnnotation(state.editableImage, annotation);
    setEditableImage(result);
  }, [state.editableImage, service, setEditableImage]);

  const removeAnnotation = useCallback((index: number) => {
    if (!state.editableImage) return;
    const result = service.removeAnnotation(state.editableImage, index);
    setEditableImage(result);
  }, [state.editableImage, service, setEditableImage]);

  const smartCrop = useCallback(async (aspectRatio: number) => {
    if (!state.editableImage) return;
    const region = service.getSmartCropRegion(state.editableImage, aspectRatio);
    if (!region) {
      setError('No faces detected for smart crop');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await service.cropImage(state.editableImage, region);
      setEditableImage(result);
    } catch (err: any) {
      setError(`Failed to smart crop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, service, setLoading, setError, setEditableImage]);

  const resetImage = useCallback(async () => {
    if (!state.editableImage) return;
    setLoading(true);
    setError(null);
    try {
      const result = await service.resetImage(state.editableImage);
      setState(prev => ({
        ...prev,
        editableImage: result,
        isLoading: false,
        hasUnsavedChanges: false,
        filterSettings: { ...DEFAULT_FILTER_SETTINGS },
      }));
    } catch (err: any) {
      setError(`Failed to reset image: ${err.message}`);
      setLoading(false);
    }
  }, [state.editableImage, service, setLoading, setError]);

  const finalizeImage = useCallback(async (): Promise<string | null> => {
    if (!state.editableImage) return null;
    setLoading(true);
    setError(null);
    try {
      const finalUri = await service.finalizeImage(state.editableImage);
      setState(prev => ({ ...prev, hasUnsavedChanges: false, isLoading: false }));
      return finalUri;
    } catch (err: any) {
      setError(`Failed to finalize image: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [state.editableImage, service, setLoading, setError]);

  const getPresetFilters = useCallback(() => {
    return service.getPresetFilters();
  }, [service]);

  return {
    editableImage: state.editableImage,
    isLoading: state.isLoading,
    error: state.error,
    hasUnsavedChanges: state.hasUnsavedChanges,
    filterSettings: state.filterSettings,
    initializeImage,
    cropImage,
    resizeImage,
    rotateImage,
    flipImage,
    updateFilterSettings,
    addAnnotation,
    removeAnnotation,
    smartCrop,
    resetImage,
    finalizeImage,
    getPresetFilters,
  };
};
