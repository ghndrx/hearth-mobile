/**
 * Media Upload Store
 * Tracks upload progress, compression state, and pending attachments
 */

import { create } from 'zustand';

export type UploadStatus = 'pending' | 'compressing' | 'uploading' | 'completed' | 'failed';

export interface UploadItem {
  id: string;
  uri: string;
  thumbnailUri?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: 'image' | 'video' | 'file';
  status: UploadStatus;
  progress: number;
  error?: string;
  width?: number;
  height?: number;
  duration?: number;
  compressedUri?: string;
  compressedSize?: number;
}

interface MediaUploadState {
  uploads: Record<string, UploadItem>;
  addUpload: (item: UploadItem) => void;
  updateUpload: (id: string, updates: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  getUploadsByStatus: (status: UploadStatus) => UploadItem[];
  getActiveUploads: () => UploadItem[];
  getAllUploads: () => UploadItem[];
}

export const useMediaUploadStore = create<MediaUploadState>((set, get) => ({
  uploads: {},

  addUpload: (item) =>
    set((state) => ({
      uploads: { ...state.uploads, [item.id]: item },
    })),

  updateUpload: (id, updates) =>
    set((state) => {
      const existing = state.uploads[id];
      if (!existing) return state;
      return {
        uploads: { ...state.uploads, [id]: { ...existing, ...updates } },
      };
    }),

  removeUpload: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.uploads;
      return { uploads: rest };
    }),

  clearCompleted: () =>
    set((state) => {
      const uploads: Record<string, UploadItem> = {};
      for (const [id, item] of Object.entries(state.uploads)) {
        if (item.status !== 'completed') {
          uploads[id] = item;
        }
      }
      return { uploads };
    }),

  clearAll: () => set({ uploads: {} }),

  getUploadsByStatus: (status) => {
    return Object.values(get().uploads).filter((u) => u.status === status);
  },

  getActiveUploads: () => {
    return Object.values(get().uploads).filter(
      (u) => u.status === 'compressing' || u.status === 'uploading'
    );
  },

  getAllUploads: () => Object.values(get().uploads),
}));
