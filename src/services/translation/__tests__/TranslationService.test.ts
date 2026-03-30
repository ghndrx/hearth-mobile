/**
 * Translation Service Tests
 * Tests for TRL-001: Language detection and basic translation infrastructure
 */

import TranslationService, {
  SupportedLanguageCode,
  SUPPORTED_LANGUAGES,
} from '../TranslationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('TranslationService', () => {
  beforeEach(() => {
    // Reset service state
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Reset service for each test
    (TranslationService as any).resetForTesting();
  });

  afterEach(async () => {
    await TranslationService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      const result = await TranslationService.initialize();
      expect(result).toBe(true);
      expect(TranslationService.getServiceStatus().isInitialized).toBe(true);
    });

    it('should initialize with custom config', async () => {
      const mockOnError = jest.fn();
      const mockOnLanguageDetected = jest.fn();

      const result = await TranslationService.initialize({
        apiKey: 'test-api-key',
        enableCaching: false,
        confidenceThreshold: 0.9,
        onError: mockOnError,
        onLanguageDetected: mockOnLanguageDetected,
      });

      expect(result).toBe(true);
      expect(TranslationService.getServiceStatus().isInitialized).toBe(true);
    });

    it('should load cached translations on initialization', async () => {
      const mockCachedData = JSON.stringify([
        ['en-es-hello', {
          sourceText: 'hello',
          translatedText: 'hola',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          timestamp: Date.now() - 1000,
          method: 'cloud'
        }]
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockCachedData);

      const result = await TranslationService.initialize();
      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@hearth_translation_cache');
    });

    it('should handle initialization errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await TranslationService.initialize();
      expect(result).toBe(true); // Should still succeed despite cache loading error
    });
  });

  describe('Language Detection', () => {
    beforeEach(async () => {
      await TranslationService.initialize();
    });

    it('should throw error when not initialized', async () => {
      await TranslationService.cleanup();
      await expect(TranslationService.detectLanguage('hello')).rejects.toThrow(
        'Translation service not initialized'
      );
    });

    it('should handle empty text', async () => {
      const result = await TranslationService.detectLanguage('');
      expect(result).toEqual({
        language: 'en',
        confidence: 0.0,
        isReliable: false,
      });
    });

    it('should detect English text', async () => {
      const result = await TranslationService.detectLanguage('Hello, how are you today?');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect Chinese characters', async () => {
      const result = await TranslationService.detectLanguage('你好世界');
      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.isReliable).toBe(true);
    });

    it('should detect Japanese characters', async () => {
      const result = await TranslationService.detectLanguage('こんにちは世界');
      expect(result.language).toBe('ja');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.isReliable).toBe(true);
    });

    it('should detect Arabic text', async () => {
      const result = await TranslationService.detectLanguage('مرحبا بالعالم');
      expect(result.language).toBe('ar');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.isReliable).toBe(true);
    });

    it('should use cloud detection when API key is provided', async () => {
      await TranslationService.initialize({ apiKey: 'test-key' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            detections: [[{
              language: 'es',
              confidence: 0.95
            }]]
          }
        })
      } as Response);

      const result = await TranslationService.detectLanguage('Hola mundo');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('detect'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: 'Hola mundo' })
        })
      );

      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.95);
    });

    it('should fallback to device detection when cloud fails', async () => {
      await TranslationService.initialize({ apiKey: 'test-key' });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await TranslationService.detectLanguage('Hola mundo');
      expect(result.language).toBe('es'); // Should still detect Spanish
    });
  });

  describe('Translation', () => {
    beforeEach(async () => {
      await TranslationService.initialize();
    });

    it('should throw error when not initialized', async () => {
      await TranslationService.cleanup();
      await expect(TranslationService.translateText('hello', 'es')).rejects.toThrow(
        'Translation service not initialized'
      );
    });

    it('should throw error for empty text', async () => {
      await expect(TranslationService.translateText('', 'es')).rejects.toThrow(
        'Text cannot be empty'
      );
    });

    it('should return original text when source and target are the same', async () => {
      const result = await TranslationService.translateText('hello', 'en', 'en');

      expect(result.translatedText).toBe('hello');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('en');
      expect(result.confidence).toBe(1.0);
      expect(result.method).toBe('cached');
    });

    it('should auto-detect source language when not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'hola'
            }]
          }
        })
      } as Response);

      await TranslationService.initialize({ apiKey: 'test-key' });
      const result = await TranslationService.translateText('hello', 'es');

      expect(result.sourceLanguage).toBe('en'); // Auto-detected
      expect(result.targetLanguage).toBe('es');
    });

    it('should use cloud translation when API key is provided', async () => {
      await TranslationService.initialize({ apiKey: 'test-key' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'hola'
            }]
          }
        })
      } as Response);

      const result = await TranslationService.translateText('hello', 'es', 'en');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('translate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            q: 'hello',
            source: 'en',
            target: 'es',
            format: 'text'
          })
        })
      );

      expect(result.translatedText).toBe('hola');
      expect(result.method).toBe('cloud');
    });

    it('should cache successful translations', async () => {
      await TranslationService.initialize({ apiKey: 'test-key', enableCaching: true });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'hola'
            }]
          }
        })
      } as Response);

      await TranslationService.translateText('hello', 'es', 'en');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth_translation_cache',
        expect.any(String)
      );
    });

    it('should return cached translation when available', async () => {
      // Setup cache with a translation
      const mockCachedData = JSON.stringify([
        ['en-es-hello', {
          sourceText: 'hello',
          translatedText: 'hola',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          timestamp: Date.now() - 1000,
          method: 'cloud'
        }]
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockCachedData);

      await TranslationService.initialize({ enableCaching: true });

      const result = await TranslationService.translateText('hello', 'es', 'en');

      expect(result.translatedText).toBe('hola');
      expect(result.method).toBe('cached');
      expect(mockFetch).not.toHaveBeenCalled(); // Should not make API call
    });

    it('should handle translation API errors gracefully', async () => {
      await TranslationService.initialize({ apiKey: 'test-key', fallbackToDevice: false });

      mockFetch.mockRejectedValue(new Error('API error'));

      await expect(TranslationService.translateText('hello', 'es', 'en')).rejects.toThrow();
    });

    it('should measure translation time', async () => {
      await TranslationService.initialize({ apiKey: 'test-key' });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'hola'
            }]
          }
        })
      } as Response);

      const result = await TranslationService.translateText('hello', 'es', 'en');

      expect(result.translationTime).toBeGreaterThan(0);
    });
  });

  describe('Utility Methods', () => {
    it('should return supported languages', () => {
      const languages = TranslationService.getSupportedLanguages();
      expect(languages).toEqual(SUPPORTED_LANGUAGES);
      expect(Object.keys(languages).length).toBeGreaterThan(20);
    });

    it('should check if language is supported', () => {
      expect(TranslationService.isLanguageSupported('en')).toBe(true);
      expect(TranslationService.isLanguageSupported('es')).toBe(true);
      expect(TranslationService.isLanguageSupported('xyz')).toBe(false);
    });

    it('should return service status', async () => {
      const statusBefore = TranslationService.getServiceStatus();
      expect(statusBefore.isInitialized).toBe(false);

      await TranslationService.initialize();

      const statusAfter = TranslationService.getServiceStatus();
      expect(statusAfter.isInitialized).toBe(true);
      expect(statusAfter.supportedLanguagesCount).toBeGreaterThan(20);
      expect(statusAfter.cacheSize).toBe(0);
    });

    it('should clear cache', async () => {
      await TranslationService.initialize({ enableCaching: true });

      await TranslationService.clearCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@hearth_translation_cache');

      const status = TranslationService.getServiceStatus();
      expect(status.cacheSize).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup service properly', async () => {
      await TranslationService.initialize({ enableCaching: true });

      await TranslationService.cleanup();

      const status = TranslationService.getServiceStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.cacheSize).toBe(0);
    });

    it('should save cache before cleanup', async () => {
      await TranslationService.initialize({ enableCaching: true });

      await TranslationService.cleanup();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@hearth_translation_cache',
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should call error callback on detection failure', async () => {
      const mockOnError = jest.fn();
      await TranslationService.initialize({
        apiKey: 'test-key',
        onError: mockOnError
      });

      // Mock fetch to fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      await TranslationService.detectLanguage('test');

      // Error callback should not be called for detection as it falls back gracefully
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should call error callback on translation failure', async () => {
      const mockOnError = jest.fn();
      await TranslationService.initialize({
        apiKey: 'test-key',
        onError: mockOnError,
        fallbackToDevice: false
      });

      // Mock fetch to fail
      mockFetch.mockRejectedValue(new Error('Translation error'));

      await expect(TranslationService.translateText('hello', 'es', 'en')).rejects.toThrow();

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Callbacks', () => {
    it('should call onLanguageDetected callback', async () => {
      const mockOnLanguageDetected = jest.fn();
      await TranslationService.initialize({
        apiKey: 'test-key',
        onLanguageDetected: mockOnLanguageDetected
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            detections: [[{
              language: 'es',
              confidence: 0.95
            }]]
          }
        })
      } as Response);

      await TranslationService.detectLanguage('Hola');

      expect(mockOnLanguageDetected).toHaveBeenCalledWith({
        language: 'es',
        confidence: 0.95,
        isReliable: true
      });
    });

    it('should call onTranslationComplete callback', async () => {
      const mockOnTranslationComplete = jest.fn();
      await TranslationService.initialize({
        apiKey: 'test-key',
        onTranslationComplete: mockOnTranslationComplete
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            translations: [{
              translatedText: 'hola'
            }]
          }
        })
      } as Response);

      await TranslationService.translateText('hello', 'es', 'en');

      expect(mockOnTranslationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          translatedText: 'hola',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          method: 'cloud'
        })
      );
    });
  });
});