declare module 'expo-video-thumbnails' {
  export interface ThumbnailOptions {
    time?: number;
    quality?: number;
  }

  export interface ThumbnailResult {
    uri: string;
  }

  export function getThumbnailAsync(
    videoUri: string,
    options?: ThumbnailOptions
  ): Promise<ThumbnailResult>;
}