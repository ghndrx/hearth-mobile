/**
 * GIF Service — Giphy API integration with caching, favorites, and recents
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types
// ============================================================================

export interface GifImage {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string;
}

export interface GifSearchResult {
  gifs: GifImage[];
  totalCount: number;
  offset: number;
}

export interface GifServiceConfig {
  apiKey: string;
  rating?: 'g' | 'pg' | 'pg-13' | 'r';
  language?: string;
  maxCacheAge?: number; // ms
  maxFavorites?: number;
  maxRecents?: number;
}

// ============================================================================
// Constants
// ============================================================================

const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';
const DEFAULT_RATING = 'pg-13';
const DEFAULT_LIMIT = 25;
const DEFAULT_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_FAVORITES = 50;
const MAX_RECENTS = 30;

const STORAGE_KEYS = {
  FAVORITES: '@hearth/gif_favorites',
  RECENTS: '@hearth/gif_recents',
} as const;

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  data: GifImage[];
  totalCount: number;
  timestamp: number;
}

// ============================================================================
// GifService
// ============================================================================

export class GifService {
  private config: Required<GifServiceConfig>;
  private cache = new Map<string, CacheEntry>();
  private favorites: GifImage[] = [];
  private recents: GifImage[] = [];
  private initialized = false;

  constructor(config: GifServiceConfig) {
    this.config = {
      rating: DEFAULT_RATING,
      language: 'en',
      maxCacheAge: DEFAULT_CACHE_AGE,
      maxFavorites: MAX_FAVORITES,
      maxRecents: MAX_RECENTS,
      ...config,
    };
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const [favData, recData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.RECENTS),
      ]);

      if (favData) this.favorites = JSON.parse(favData);
      if (recData) this.recents = JSON.parse(recData);
    } catch (error) {
      console.error('[GifService] Failed to load stored data:', error);
    }

    this.initialized = true;
  }

  // --------------------------------------------------------------------------
  // API Methods
  // --------------------------------------------------------------------------

  async getTrending(limit = DEFAULT_LIMIT, offset = 0): Promise<GifSearchResult> {
    const cacheKey = `trending:${limit}:${offset}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      limit: String(limit),
      offset: String(offset),
      rating: this.config.rating,
    });

    const result = await this.fetchGifs(`${GIPHY_BASE_URL}/trending?${params}`);
    this.setCache(cacheKey, result);
    return result;
  }

  async search(query: string, limit = DEFAULT_LIMIT, offset = 0): Promise<GifSearchResult> {
    const trimmed = query.trim();
    if (!trimmed) return { gifs: [], totalCount: 0, offset: 0 };

    const cacheKey = `search:${trimmed.toLowerCase()}:${limit}:${offset}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      q: trimmed,
      limit: String(limit),
      offset: String(offset),
      rating: this.config.rating,
      lang: this.config.language,
    });

    const result = await this.fetchGifs(`${GIPHY_BASE_URL}/search?${params}`);
    this.setCache(cacheKey, result);
    return result;
  }

  async getById(id: string): Promise<GifImage | null> {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    try {
      const response = await fetch(`${GIPHY_BASE_URL}/${id}?${params}`);
      const data = await response.json();
      if (!data.data) return null;

      return this.parseGifItem(data.data);
    } catch (error) {
      console.error('[GifService] Failed to fetch GIF by ID:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Favorites
  // --------------------------------------------------------------------------

  async addFavorite(gif: GifImage): Promise<void> {
    await this.initialize();
    // Avoid duplicates
    if (this.favorites.some((f) => f.id === gif.id)) return;

    this.favorites.unshift(gif);
    if (this.favorites.length > this.config.maxFavorites) {
      this.favorites = this.favorites.slice(0, this.config.maxFavorites);
    }

    await this.persistFavorites();
  }

  async removeFavorite(gifId: string): Promise<void> {
    await this.initialize();
    this.favorites = this.favorites.filter((f) => f.id !== gifId);
    await this.persistFavorites();
  }

  async getFavorites(): Promise<GifImage[]> {
    await this.initialize();
    return [...this.favorites];
  }

  isFavorite(gifId: string): boolean {
    return this.favorites.some((f) => f.id === gifId);
  }

  // --------------------------------------------------------------------------
  // Recents
  // --------------------------------------------------------------------------

  async addRecent(gif: GifImage): Promise<void> {
    await this.initialize();
    // Remove if already in recents, then add to front
    this.recents = this.recents.filter((r) => r.id !== gif.id);
    this.recents.unshift(gif);
    if (this.recents.length > this.config.maxRecents) {
      this.recents = this.recents.slice(0, this.config.maxRecents);
    }

    await this.persistRecents();
  }

  async getRecents(): Promise<GifImage[]> {
    await this.initialize();
    return [...this.recents];
  }

  async clearRecents(): Promise<void> {
    this.recents = [];
    await this.persistRecents();
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  clearCache(): void {
    this.cache.clear();
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private async fetchGifs(url: string): Promise<GifSearchResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Giphy API error: ${response.status}`);
      }
      const data = await response.json();
      const gifs = this.parseGiphyResponse(data);
      const totalCount = data.pagination?.total_count ?? gifs.length;
      const offset = data.pagination?.offset ?? 0;

      return { gifs, totalCount, offset };
    } catch (error) {
      console.error('[GifService] Fetch failed:', error);
      return { gifs: [], totalCount: 0, offset: 0 };
    }
  }

  private parseGiphyResponse(data: {
    data?: Array<Record<string, any>>;
  }): GifImage[] {
    if (!data.data) return [];
    return data.data.map((gif) => this.parseGifItem(gif));
  }

  private parseGifItem(gif: Record<string, any>): GifImage {
    return {
      id: gif.id,
      url: gif.images.original.url,
      previewUrl: gif.images.fixed_width.url,
      width: parseInt(gif.images.fixed_width.width, 10) || 200,
      height: parseInt(gif.images.fixed_width.height, 10) || 200,
      title: gif.title || '',
    };
  }

  private getCached(key: string): GifSearchResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.config.maxCacheAge) {
      this.cache.delete(key);
      return null;
    }
    return { gifs: entry.data, totalCount: entry.totalCount, offset: 0 };
  }

  private setCache(key: string, result: GifSearchResult): void {
    this.cache.set(key, {
      data: result.gifs,
      totalCount: result.totalCount,
      timestamp: Date.now(),
    });
  }

  private async persistFavorites(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(this.favorites));
    } catch (error) {
      console.error('[GifService] Failed to persist favorites:', error);
    }
  }

  private async persistRecents(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(this.recents));
    } catch (error) {
      console.error('[GifService] Failed to persist recents:', error);
    }
  }
}

// ============================================================================
// Singleton helper
// ============================================================================

let _instance: GifService | null = null;

export function getGifService(apiKey?: string): GifService {
  if (!_instance) {
    _instance = new GifService({ apiKey: apiKey ?? '' });
  }
  return _instance;
}

export function resetGifService(): void {
  _instance = null;
}
