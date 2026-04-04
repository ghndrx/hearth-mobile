import { useState, useCallback } from 'react';
import ImageEditingService, {
  EditableImage,
  CropRegion,
  ImageAnnotation,
  ImageFilter,
} from '../services/media/ImageEditingService';

export interface UseImageEditorState {
  editableImage: EditableImage | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

export interface UseImageEditorActions {
  initializeImage: (uri: string) => Promise<void>;
  cropImage: (cropRegion: CropRegion) => Promise<void>;
  applyFilter: (filter: Partial<any>) => Promise<void>;
  rotateImage: (degrees: number) => Promise<void>;
  flipImage: (direction: 'horizontal' | 'vertical') => Promise<void>;
  addAnnotation: (annotation: ImageAnnotation) => void;
  removeAnnotation: (index: number) => void;
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
  });

  const imageEditingService = ImageEditingService.getInstance();

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
      const editableImage = await imageEditingService.initializeEditableImage(uri);
      setEditableImage(editableImage);
    } catch (error) {
      setError(`Failed to initialize image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [imageEditingService, setLoading, setError, setEditableImage]);

  const cropImage = useCallback(async (cropRegion: CropRegion) => {
    if (!state.editableImage) return;

    setLoading(true);
    setError(null);

    try {
      const croppedImage = await imageEditingService.cropImage(
        state.editableImage,
        cropRegion
      );
      setEditableImage(croppedImage);
    } catch (error) {
      setError(`Failed to crop image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, imageEditingService, setLoading, setError, setEditableImage]);

  const applyFilter = useCallback(async (filter: Partial<any>) => {
    if (!state.editableImage) return;

    setLoading(true);
    setError(null);

    try {
      const filteredImage = await imageEditingService.applyFilters(
        state.editableImage,
        filter
      );
      setEditableImage(filteredImage);
    } catch (error) {
      setError(`Failed to apply filter: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, imageEditingService, setLoading, setError, setEditableImage]);

  const rotateImage = useCallback(async (degrees: number) => {
    if (!state.editableImage) return;

    setLoading(true);
    setError(null);

    try {
      const rotatedImage = await imageEditingService.rotateImage(
        state.editableImage,
        degrees
      );
      setEditableImage(rotatedImage);
    } catch (error) {
      setError(`Failed to rotate image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, imageEditingService, setLoading, setError, setEditableImage]);

  const flipImage = useCallback(async (direction: 'horizontal' | 'vertical') => {
    if (!state.editableImage) return;

    setLoading(true);
    setError(null);

    try {
      const flippedImage = await imageEditingService.flipImage(
        state.editableImage,
        direction
      );
      setEditableImage(flippedImage);
    } catch (error) {
      setError(`Failed to flip image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, imageEditingService, setLoading, setError, setEditableImage]);

  const addAnnotation = useCallback((annotation: ImageAnnotation) => {
    if (!state.editableImage) return;

    const annotatedImage = imageEditingService.addAnnotation(
      state.editableImage,
      annotation
    );
    setEditableImage(annotatedImage);
  }, [state.editableImage, imageEditingService, setEditableImage]);

  const removeAnnotation = useCallback((index: number) => {
    if (!state.editableImage) return;

    const updatedImage = imageEditingService.removeAnnotation(
      state.editableImage,
      index
    );
    setEditableImage(updatedImage);
  }, [state.editableImage, imageEditingService, setEditableImage]);

  const resetImage = useCallback(async () => {
    if (!state.editableImage) return;

    setLoading(true);
    setError(null);

    try {
      const resetImage = await imageEditingService.resetImage(state.editableImage);
      setEditableImage(resetImage);
    } catch (error) {
      setError(`Failed to reset image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, imageEditingService, setLoading, setError, setEditableImage]);

  const finalizeImage = useCallback(async (): Promise<string | null> => {
    if (!state.editableImage) return null;

    setLoading(true);
    setError(null);

    try {
      const finalUri = await imageEditingService.finalizeImage(state.editableImage);
      setState(prev => ({ ...prev, hasUnsavedChanges: false }));
      return finalUri;
    } catch (error) {
      setError(`Failed to finalize image: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [state.editableImage, imageEditingService, setLoading, setError]);

  const getPresetFilters = useCallback(() => {
    return imageEditingService.getPresetFilters();
  }, [imageEditingService]);

  return {
    // State
    editableImage: state.editableImage,
    isLoading: state.isLoading,
    error: state.error,
    hasUnsavedChanges: state.hasUnsavedChanges,

    // Actions
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
  };
};