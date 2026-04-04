import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { nanoid } from 'nanoid';
import { Alert } from 'react-native';

export interface FileAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'archive' | 'unknown';
  category: 'media' | 'document' | 'archive' | 'audio' | 'code' | 'other';
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  thumbnail?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed';
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    author?: string;
    createdAt?: Date;
  };
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileUploadOptions {
  compress?: boolean;
  quality?: number;
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
}

const SUPPORTED_FILE_TYPES = {
  // Documents
  'application/pdf': { type: 'document', category: 'document', icon: 'document-text' },
  'application/msword': { type: 'document', category: 'document', icon: 'document-text' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    type: 'document', category: 'document', icon: 'document-text'
  },
  'application/vnd.ms-excel': { type: 'document', category: 'document', icon: 'grid' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    type: 'document', category: 'document', icon: 'grid'
  },
  'application/vnd.ms-powerpoint': { type: 'document', category: 'document', icon: 'easel' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    type: 'document', category: 'document', icon: 'easel'
  },
  'text/plain': { type: 'document', category: 'document', icon: 'document' },
  'text/csv': { type: 'document', category: 'document', icon: 'grid' },

  // Images
  'image/jpeg': { type: 'image', category: 'media', icon: 'image' },
  'image/png': { type: 'image', category: 'media', icon: 'image' },
  'image/gif': { type: 'image', category: 'media', icon: 'image' },
  'image/webp': { type: 'image', category: 'media', icon: 'image' },
  'image/svg+xml': { type: 'image', category: 'media', icon: 'color-palette' },

  // Video
  'video/mp4': { type: 'video', category: 'media', icon: 'videocam' },
  'video/quicktime': { type: 'video', category: 'media', icon: 'videocam' },
  'video/webm': { type: 'video', category: 'media', icon: 'videocam' },

  // Audio
  'audio/mpeg': { type: 'audio', category: 'audio', icon: 'musical-notes' },
  'audio/wav': { type: 'audio', category: 'audio', icon: 'musical-notes' },
  'audio/mp3': { type: 'audio', category: 'audio', icon: 'musical-notes' },
  'audio/aac': { type: 'audio', category: 'audio', icon: 'musical-notes' },

  // Archives
  'application/zip': { type: 'archive', category: 'archive', icon: 'archive' },
  'application/x-rar-compressed': { type: 'archive', category: 'archive', icon: 'archive' },
  'application/x-7z-compressed': { type: 'archive', category: 'archive', icon: 'archive' },

  // Code
  'application/json': { type: 'document', category: 'code', icon: 'code-slash' },
  'text/javascript': { type: 'document', category: 'code', icon: 'logo-javascript' },
  'text/typescript': { type: 'document', category: 'code', icon: 'code-slash' },
  'text/html': { type: 'document', category: 'code', icon: 'code-slash' },
  'text/css': { type: 'document', category: 'code', icon: 'code-slash' },
} as const;

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 25 * 1024 * 1024, // 25MB
  video: 100 * 1024 * 1024, // 100MB
  document: 50 * 1024 * 1024, // 50MB
  audio: 50 * 1024 * 1024, // 50MB
  archive: 100 * 1024 * 1024, // 100MB
  unknown: 25 * 1024 * 1024, // 25MB
};

class FileAttachmentService {
  private static instance: FileAttachmentService;

  public static getInstance(): FileAttachmentService {
    if (!FileAttachmentService.instance) {
      FileAttachmentService.instance = new FileAttachmentService();
    }
    return FileAttachmentService.instance;
  }

  /**
   * Pick files using the document picker with enhanced filtering
   */
  async pickFiles(options: Partial<FileUploadOptions> = {}): Promise<FileAttachment[]> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: options.allowedTypes || '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return [];
      }

      const attachments: FileAttachment[] = [];

      for (const asset of result.assets) {
        const attachment = await this.createFileAttachment(asset);

        if (attachment) {
          const validation = this.validateFile(attachment, options);
          if (validation.isValid) {
            attachments.push(attachment);
          } else {
            console.warn(`File validation failed for ${attachment.name}: ${validation.error}`);
            if (validation.error) {
              Alert.alert('File Error', `${attachment.name}: ${validation.error}`);
            }
          }
        }
      }

      return attachments;
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files. Please try again.');
      return [];
    }
  }

  /**
   * Pick images with enhanced options
   */
  async pickImages(allowMultiple: boolean = true): Promise<FileAttachment[]> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: allowMultiple,
        quality: 0.9,
        exif: false, // Remove EXIF data for privacy
      });

      if (result.canceled) {
        return [];
      }

      const attachments: FileAttachment[] = [];

      for (const asset of result.assets) {
        const attachment = await this.createFileAttachment({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          mimeType: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        });

        if (attachment) {
          attachments.push({
            ...attachment,
            metadata: {
              ...attachment.metadata,
              width: asset.width,
              height: asset.height,
            },
          });
        }
      }

      return attachments;
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
      return [];
    }
  }

  /**
   * Take a photo with the camera
   */
  async captureImage(): Promise<FileAttachment | null> {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      const attachment = await this.createFileAttachment({
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: asset.fileSize || 0,
      });

      if (attachment) {
        return {
          ...attachment,
          metadata: {
            ...attachment.metadata,
            width: asset.width,
            height: asset.height,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
      return null;
    }
  }

  /**
   * Create a FileAttachment from a picked asset
   */
  private async createFileAttachment(asset: {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number | null;
  }): Promise<FileAttachment | null> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(asset.uri, { size: true });
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const extension = this.getFileExtension(asset.name);
      const mimeType = asset.mimeType || this.getMimeTypeFromExtension(extension);
      const fileTypeInfo = SUPPORTED_FILE_TYPES[mimeType as keyof typeof SUPPORTED_FILE_TYPES] || {
        type: 'unknown' as const,
        category: 'other' as const,
        icon: 'document' as const,
      };

      return {
        id: nanoid(),
        type: fileTypeInfo.type,
        category: fileTypeInfo.category,
        uri: asset.uri,
        name: asset.name,
        size: fileInfo.size || asset.size || 0,
        mimeType,
        extension,
        uploadStatus: 'pending',
      };
    } catch (error) {
      console.error('Error creating file attachment:', error);
      return null;
    }
  }

  /**
   * Validate a file attachment
   */
  validateFile(file: FileAttachment, options: Partial<FileUploadOptions> = {}): FileValidationResult {
    const warnings: string[] = [];

    // Check file size
    const maxSize = options.maxSize || FILE_SIZE_LIMITS[file.type] || FILE_SIZE_LIMITS.unknown;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds the limit of ${this.formatFileSize(maxSize)}`,
      };
    }

    // Check allowed types
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const isAllowed = options.allowedTypes.some(allowedType => {
        if (allowedType === '*/*') return true;
        if (allowedType.endsWith('/*')) {
          return file.mimeType.startsWith(allowedType.replace('/*', ''));
        }
        return file.mimeType === allowedType;
      });

      if (!isAllowed) {
        return {
          isValid: false,
          error: `File type ${file.mimeType} is not allowed`,
        };
      }
    }

    // Add warnings for large files
    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Large file size may affect upload speed');
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Compress a file if possible
   */
  async compressFile(file: FileAttachment, options: { quality?: number } = {}): Promise<FileAttachment> {
    // For now, return the file as-is. In a full implementation, you would:
    // - Compress images using ImageManipulator
    // - Compress videos using expo-av or similar
    // - Compress documents using PDF compression libraries

    // This is a placeholder for the compression logic
    console.log(`Compressing file: ${file.name} (${this.formatFileSize(file.size)})`);

    return {
      ...file,
      // In real implementation, update uri, size, etc. after compression
    };
  }

  /**
   * Generate a thumbnail for supported file types
   */
  async generateThumbnail(file: FileAttachment): Promise<string | null> {
    try {
      switch (file.type) {
        case 'image':
          // For images, we can use the image itself as thumbnail or resize it
          return file.uri;

        case 'video':
          // Would use video thumbnail generation library
          // For now, return null - placeholder for implementation
          console.log(`Generating video thumbnail for: ${file.name}`);
          return null;

        case 'document':
          // Would use PDF or document thumbnail generation
          // For now, return null - placeholder for implementation
          console.log(`Generating document thumbnail for: ${file.name}`);
          return null;

        default:
          return null;
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Get MIME type from file extension
   */
  getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',

      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',

      // Video
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      aac: 'audio/aac',

      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',

      // Code
      json: 'application/json',
      js: 'text/javascript',
      ts: 'text/typescript',
      html: 'text/html',
      css: 'text/css',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get icon name for file type
   */
  getFileIcon(file: FileAttachment): string {
    const typeInfo = SUPPORTED_FILE_TYPES[file.mimeType as keyof typeof SUPPORTED_FILE_TYPES];
    return typeInfo?.icon || 'document';
  }

  /**
   * Get color for file type
   */
  getFileColor(file: FileAttachment): string {
    const colorMap: Record<string, string> = {
      pdf: '#ef4444', // red
      doc: '#3b82f6', // blue
      docx: '#3b82f6', // blue
      xls: '#22c55e', // green
      xlsx: '#22c55e', // green
      ppt: '#f97316', // orange
      pptx: '#f97316', // orange
      image: '#8b5cf6', // purple
      video: '#06b6d4', // cyan
      audio: '#f59e0b', // amber
      archive: '#6b7280', // gray
      code: '#10b981', // emerald
    };

    // First try by extension, then by type, then by category
    return colorMap[file.extension] ||
           colorMap[file.type] ||
           colorMap[file.category] ||
           '#6b7280';
  }

  /**
   * Check if file type supports preview
   */
  supportsPreview(file: FileAttachment): boolean {
    const previewableTypes = ['image', 'video', 'audio'];
    const previewableMimeTypes = [
      'text/plain',
      'application/json',
      'text/html',
      'text/css',
      'text/javascript',
      'text/typescript',
    ];

    return previewableTypes.includes(file.type) ||
           previewableMimeTypes.includes(file.mimeType);
  }

  /**
   * Get file category display name
   */
  getCategoryDisplayName(category: FileAttachment['category']): string {
    const displayNames: Record<FileAttachment['category'], string> = {
      media: 'Media',
      document: 'Document',
      archive: 'Archive',
      audio: 'Audio',
      code: 'Code',
      other: 'Other',
    };

    return displayNames[category] || 'File';
  }
}

export default FileAttachmentService;