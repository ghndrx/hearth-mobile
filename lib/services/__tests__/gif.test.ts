/**
 * GIF Service Tests
 */

import { GifService, resetGifService, getGifService } from '../gif';
import type { GifImage } from '../gif';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ============================================================================
// Helpers
// ============================================================================

function makeGiphyGif(id: string, title = 'Test GIF') {
  return {
    id,
    title,
    images: {
      original: { url: `https://giphy.com/media/${id}/giphy.gif`, width: '480', height: '360' },
      fixed_width: { url: `https://giphy.com/media/${id}/200w.gif`, width: '200', height: '150' },
    },
  };
}

function makeGiphyResponse(gifs: ReturnType<typeof makeGiphyGif>[], total = 100) {
  return {
    ok: true,
    json: () => Promise.resolve({
      data: gifs,
      pagination: { total_count: total, count: gifs.length, offset: 0 },
    }),
  };
}

function makeParsedGif(id: string, title = 'Test GIF'): GifImage {
  return {
    id,
    url: `https://giphy.com/media/${id}/giphy.gif`,
    previewUrl: `https://giphy.com/media/${id}/200w.gif`,
    width: 200,
    height: 150,
    title,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('GifService', () => {
  let service: GifService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetGifService();
    service = new GifService({ apiKey: 'test-api-key' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  // --------------------------------------------------------------------------
  // Trending
  // --------------------------------------------------------------------------

  describe('getTrending', () => {
    it('fetches trending GIFs from Giphy API', async () => {
      mockFetch.mockResolvedValueOnce(
        makeGiphyResponse([makeGiphyGif('abc'), makeGiphyGif('def')])
      );

      const result = await service.getTrending();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('/trending');
      expect(mockFetch.mock.calls[0][0]).toContain('api_key=test-api-key');
      expect(result.gifs).toHaveLength(2);
      expect(result.gifs[0]).toEqual(makeParsedGif('abc'));
      expect(result.totalCount).toBe(100);
    });

    it('returns cached results on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce(
        makeGiphyResponse([makeGiphyGif('abc')])
      );

      await service.getTrending(25, 0);
      const result = await service.getTrending(25, 0);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.gifs).toHaveLength(1);
    });

    it('returns empty on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getTrending();

      expect(result.gifs).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  describe('search', () => {
    it('searches for GIFs with query', async () => {
      mockFetch.mockResolvedValueOnce(
        makeGiphyResponse([makeGiphyGif('s1', 'funny cat')])
      );

      const result = await service.search('funny cat');

      expect(mockFetch.mock.calls[0][0]).toContain('/search');
      expect(mockFetch.mock.calls[0][0]).toContain('q=funny+cat');
      expect(result.gifs).toHaveLength(1);
      expect(result.gifs[0].title).toBe('funny cat');
    });

    it('returns empty for blank query', async () => {
      const result = await service.search('   ');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.gifs).toHaveLength(0);
    });

    it('caches search results', async () => {
      mockFetch.mockResolvedValueOnce(
        makeGiphyResponse([makeGiphyGif('s1')])
      );

      await service.search('cats');
      await service.search('cats');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('passes rating and language params', async () => {
      const customService = new GifService({
        apiKey: 'key',
        rating: 'g',
        language: 'es',
      });

      mockFetch.mockResolvedValueOnce(
        makeGiphyResponse([makeGiphyGif('s1')])
      );

      await customService.search('hola');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('rating=g');
      expect(url).toContain('lang=es');
    });
  });

  // --------------------------------------------------------------------------
  // getById
  // --------------------------------------------------------------------------

  describe('getById', () => {
    it('fetches a single GIF by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: makeGiphyGif('xyz') }),
      });

      const gif = await service.getById('xyz');

      expect(gif).toEqual(makeParsedGif('xyz'));
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Not found'));

      const gif = await service.getById('bad');

      expect(gif).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Favorites
  // --------------------------------------------------------------------------

  describe('favorites', () => {
    it('adds and retrieves favorites', async () => {
      const gif = makeParsedGif('fav1');

      await service.addFavorite(gif);
      const favorites = await service.getFavorites();

      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe('fav1');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth/gif_favorites',
        expect.any(String)
      );
    });

    it('prevents duplicate favorites', async () => {
      const gif = makeParsedGif('fav1');

      await service.addFavorite(gif);
      await service.addFavorite(gif);
      const favorites = await service.getFavorites();

      expect(favorites).toHaveLength(1);
    });

    it('removes favorites', async () => {
      await service.addFavorite(makeParsedGif('fav1'));
      await service.addFavorite(makeParsedGif('fav2'));

      await service.removeFavorite('fav1');
      const favorites = await service.getFavorites();

      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe('fav2');
    });

    it('checks if a GIF is favorited', async () => {
      await service.addFavorite(makeParsedGif('fav1'));

      expect(service.isFavorite('fav1')).toBe(true);
      expect(service.isFavorite('fav2')).toBe(false);
    });

    it('enforces max favorites limit', async () => {
      const svc = new GifService({ apiKey: 'key', maxFavorites: 3 });

      await svc.addFavorite(makeParsedGif('a'));
      await svc.addFavorite(makeParsedGif('b'));
      await svc.addFavorite(makeParsedGif('c'));
      await svc.addFavorite(makeParsedGif('d'));

      const favs = await svc.getFavorites();
      expect(favs).toHaveLength(3);
      expect(favs[0].id).toBe('d'); // newest first
    });

    it('loads favorites from storage on initialize', async () => {
      const stored = [makeParsedGif('stored1')];
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@hearth/gif_favorites') return Promise.resolve(JSON.stringify(stored));
        return Promise.resolve(null);
      });

      const svc = new GifService({ apiKey: 'key' });
      await svc.initialize();
      const favs = await svc.getFavorites();

      expect(favs).toHaveLength(1);
      expect(favs[0].id).toBe('stored1');
    });
  });

  // --------------------------------------------------------------------------
  // Recents
  // --------------------------------------------------------------------------

  describe('recents', () => {
    it('adds and retrieves recent GIFs', async () => {
      await service.addRecent(makeParsedGif('r1'));
      await service.addRecent(makeParsedGif('r2'));

      const recents = await service.getRecents();

      expect(recents).toHaveLength(2);
      expect(recents[0].id).toBe('r2'); // most recent first
    });

    it('moves duplicate to front instead of adding again', async () => {
      await service.addRecent(makeParsedGif('r1'));
      await service.addRecent(makeParsedGif('r2'));
      await service.addRecent(makeParsedGif('r1'));

      const recents = await service.getRecents();

      expect(recents).toHaveLength(2);
      expect(recents[0].id).toBe('r1');
      expect(recents[1].id).toBe('r2');
    });

    it('clears recents', async () => {
      await service.addRecent(makeParsedGif('r1'));
      await service.clearRecents();

      const recents = await service.getRecents();
      expect(recents).toHaveLength(0);
    });

    it('enforces max recents limit', async () => {
      const svc = new GifService({ apiKey: 'key', maxRecents: 2 });

      await svc.addRecent(makeParsedGif('a'));
      await svc.addRecent(makeParsedGif('b'));
      await svc.addRecent(makeParsedGif('c'));

      const recents = await svc.getRecents();
      expect(recents).toHaveLength(2);
      expect(recents[0].id).toBe('c');
    });
  });

  // --------------------------------------------------------------------------
  // Cache
  // --------------------------------------------------------------------------

  describe('cache', () => {
    it('clearCache forces fresh fetches', async () => {
      mockFetch.mockResolvedValue(
        makeGiphyResponse([makeGiphyGif('abc')])
      );

      await service.getTrending();
      service.clearCache();
      await service.getTrending();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('expired cache entries are not returned', async () => {
      // Use -1 to guarantee expiry (timestamp will always be in the past)
      const svc = new GifService({ apiKey: 'key', maxCacheAge: -1 });

      mockFetch.mockResolvedValue(
        makeGiphyResponse([makeGiphyGif('abc')])
      );

      await svc.getTrending();
      await svc.getTrending();

      // With maxCacheAge=-1, each call should refetch
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe('getGifService', () => {
    it('returns the same instance', () => {
      const a = getGifService('key1');
      const b = getGifService('key2');

      expect(a).toBe(b);
    });

    it('resets after resetGifService', () => {
      const a = getGifService('key1');
      resetGifService();
      const b = getGifService('key2');

      expect(a).not.toBe(b);
    });
  });

  // --------------------------------------------------------------------------
  // HTTP error handling
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('handles non-ok HTTP response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Rate limited' }),
      });

      const result = await service.getTrending();
      expect(result.gifs).toHaveLength(0);
    });

    it('handles malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await service.search('test');
      expect(result.gifs).toHaveLength(0);
    });
  });
});
