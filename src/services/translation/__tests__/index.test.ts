/**
 * Translation Service Index Tests
 * Tests for convenience functions and exports
 */

import {
  initializeTranslationService,
  detectTextLanguage,
  translateText,
  getSupportedLanguages,
  isLanguageSupported,
  getTranslationServiceStatus,
  clearTranslationCache,
  GamingTranslation,
  cleanupTranslationService,
  SUPPORTED_LANGUAGES,
} from '../index';

// Mock the TranslationService
const mockTranslationService = {
  initialize: jest.fn(),
  detectLanguage: jest.fn(),
  translateText: jest.fn(),
  getSupportedLanguages: jest.fn(),
  isLanguageSupported: jest.fn(),
  getServiceStatus: jest.fn(),
  clearCache: jest.fn(),
  cleanup: jest.fn(),
};

jest.mock('../TranslationService', () => ({
  default: mockTranslationService,
  SUPPORTED_LANGUAGES: {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese (Simplified)',
  }
}));

describe('Translation Service Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeTranslationService', () => {
    it('should initialize with default config', async () => {
      mockTranslationService.initialize.mockResolvedValue(true);

      const result = await initializeTranslationService();

      expect(mockTranslationService.initialize).toHaveBeenCalledWith({
        enableCaching: true,
        fallbackToDevice: true,
        confidenceThreshold: 0.8,
      });
      expect(result).toBe(true);
    });

    it('should initialize with custom config', async () => {
      mockTranslationService.initialize.mockResolvedValue(true);

      const config = {
        apiKey: 'test-key',
        enableCaching: false,
        onError: jest.fn(),
      };

      const result = await initializeTranslationService(config);

      expect(mockTranslationService.initialize).toHaveBeenCalledWith({
        enableCaching: false,
        fallbackToDevice: true,
        confidenceThreshold: 0.8,
        ...config,
      });
      expect(result).toBe(true);
    });

    it('should handle initialization failure', async () => {
      mockTranslationService.initialize.mockResolvedValue(false);

      const result = await initializeTranslationService();

      expect(result).toBe(false);
    });
  });

  describe('detectTextLanguage', () => {
    it('should initialize service if not already initialized', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: false,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.initialize.mockResolvedValue(true);
      mockTranslationService.detectLanguage.mockResolvedValue({
        language: 'en',
        confidence: 0.95,
        isReliable: true,
      });

      const result = await detectTextLanguage('Hello world');

      expect(mockTranslationService.initialize).toHaveBeenCalled();
      expect(mockTranslationService.detectLanguage).toHaveBeenCalledWith('Hello world');
      expect(result).toEqual({
        language: 'en',
        confidence: 0.95,
        isReliable: true,
      });
    });

    it('should not reinitialize if already initialized', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: true,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.detectLanguage.mockResolvedValue({
        language: 'es',
        confidence: 0.9,
        isReliable: true,
      });

      const result = await detectTextLanguage('Hola mundo');

      expect(mockTranslationService.initialize).not.toHaveBeenCalled();
      expect(mockTranslationService.detectLanguage).toHaveBeenCalledWith('Hola mundo');
      expect(result).toEqual({
        language: 'es',
        confidence: 0.9,
        isReliable: true,
      });
    });
  });

  describe('translateText', () => {
    it('should initialize service if not already initialized', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: false,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.initialize.mockResolvedValue(true);
      mockTranslationService.isLanguageSupported.mockReturnValue(true);
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: 'hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
        method: 'cloud',
        translationTime: 500,
      });

      const result = await translateText('hello', 'es', 'en');

      expect(mockTranslationService.initialize).toHaveBeenCalled();
      expect(mockTranslationService.isLanguageSupported).toHaveBeenCalledWith('es');
      expect(mockTranslationService.translateText).toHaveBeenCalledWith('hello', 'es', 'en');
      expect(result.translatedText).toBe('hola');
    });

    it('should throw error for unsupported target language', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: true,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.isLanguageSupported.mockReturnValue(false);

      await expect(translateText('hello', 'xyz')).rejects.toThrow(
        'Unsupported target language: xyz'
      );
    });

    it('should work without source language', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: true,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.isLanguageSupported.mockReturnValue(true);
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: 'hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
        method: 'cloud',
        translationTime: 500,
      });

      const result = await translateText('hello', 'es');

      expect(mockTranslationService.translateText).toHaveBeenCalledWith('hello', 'es', undefined);
    });
  });

  describe('utility functions', () => {
    it('should get supported languages', () => {
      mockTranslationService.getSupportedLanguages.mockReturnValue(SUPPORTED_LANGUAGES);

      const languages = getSupportedLanguages();

      expect(mockTranslationService.getSupportedLanguages).toHaveBeenCalled();
      expect(languages).toEqual(SUPPORTED_LANGUAGES);
    });

    it('should check if language is supported', () => {
      mockTranslationService.isLanguageSupported.mockReturnValue(true);

      const result = isLanguageSupported('en');

      expect(mockTranslationService.isLanguageSupported).toHaveBeenCalledWith('en');
      expect(result).toBe(true);
    });

    it('should get translation service status', () => {
      const mockStatus = {
        isInitialized: true,
        cacheSize: 5,
        supportedLanguagesCount: 10,
      };
      mockTranslationService.getServiceStatus.mockReturnValue(mockStatus);

      const status = getTranslationServiceStatus();

      expect(mockTranslationService.getServiceStatus).toHaveBeenCalled();
      expect(status).toEqual(mockStatus);
    });

    it('should clear translation cache', async () => {
      mockTranslationService.clearCache.mockResolvedValue();

      await clearTranslationCache();

      expect(mockTranslationService.clearCache).toHaveBeenCalled();
    });

    it('should cleanup translation service', async () => {
      mockTranslationService.cleanup.mockResolvedValue();

      await cleanupTranslationService();

      expect(mockTranslationService.cleanup).toHaveBeenCalled();
    });
  });

  describe('GamingTranslation', () => {
    it('should have gaming terms defined', () => {
      expect(GamingTranslation.GAMING_TERMS).toBeDefined();
      expect(typeof GamingTranslation.GAMING_TERMS).toBe('object');

      // Check for some common gaming terms
      expect(GamingTranslation.GAMING_TERMS['gg']).toBe('Good Game');
      expect(GamingTranslation.GAMING_TERMS['wp']).toBe('Well Played');
      expect(GamingTranslation.GAMING_TERMS['afk']).toBe('Away From Keyboard');
    });

    it('should detect gaming terms in text', () => {
      expect(GamingTranslation.containsGamingTerms('gg wp')).toBe(true);
      expect(GamingTranslation.containsGamingTerms('Good game everyone!')).toBe(false);
      expect(GamingTranslation.containsGamingTerms('afk for a moment')).toBe(true);
      expect(GamingTranslation.containsGamingTerms('See you later')).toBe(false);
    });

    it('should handle case insensitive gaming term detection', () => {
      expect(GamingTranslation.containsGamingTerms('GG WP')).toBe(true);
      expect(GamingTranslation.containsGamingTerms('Gg everyone')).toBe(true);
      expect(GamingTranslation.containsGamingTerms('AFK BRB')).toBe(true);
    });

    it('should translate gaming text', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: true,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: 'buen juego',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
        method: 'cloud',
        translationTime: 500,
      });

      // Mock console.log to verify gaming term detection
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await GamingTranslation.translateGamingText('gg wp', 'es', 'en');

      expect(consoleSpy).toHaveBeenCalledWith('Gaming terminology detected in text for translation');
      expect(mockTranslationService.translateText).toHaveBeenCalledWith('gg wp', 'es', 'en');
      expect(result.translatedText).toBe('buen juego');

      consoleSpy.mockRestore();
    });

    it('should translate gaming text without source language', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: true,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: 'buen juego',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
        method: 'cloud',
        translationTime: 500,
      });

      await GamingTranslation.translateGamingText('gg wp', 'es');

      expect(mockTranslationService.translateText).toHaveBeenCalledWith('gg wp', 'es', undefined);
    });

    it('should initialize service for gaming translation if needed', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: false,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.initialize.mockResolvedValue(true);
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: 'buen juego',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
        method: 'cloud',
        translationTime: 500,
      });

      await GamingTranslation.translateGamingText('gg', 'es');

      expect(mockTranslationService.initialize).toHaveBeenCalled();
    });

    it('should handle non-gaming text normally', async () => {
      mockTranslationService.getServiceStatus.mockReturnValue({
        isInitialized: true,
        cacheSize: 0,
        supportedLanguagesCount: 10,
      });
      mockTranslationService.translateText.mockResolvedValue({
        translatedText: 'hola mundo',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        confidence: 0.95,
        method: 'cloud',
        translationTime: 500,
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await GamingTranslation.translateGamingText('hello world', 'es', 'en');

      expect(consoleSpy).not.toHaveBeenCalledWith('Gaming terminology detected in text for translation');
      expect(result.translatedText).toBe('hola mundo');

      consoleSpy.mockRestore();
    });
  });

  describe('exports', () => {
    it('should export all required functions and types', () => {
      expect(typeof initializeTranslationService).toBe('function');
      expect(typeof detectTextLanguage).toBe('function');
      expect(typeof translateText).toBe('function');
      expect(typeof getSupportedLanguages).toBe('function');
      expect(typeof isLanguageSupported).toBe('function');
      expect(typeof getTranslationServiceStatus).toBe('function');
      expect(typeof clearTranslationCache).toBe('function');
      expect(typeof cleanupTranslationService).toBe('function');
      expect(typeof GamingTranslation).toBe('object');
      expect(typeof SUPPORTED_LANGUAGES).toBe('object');
    });

    it('should export GamingTranslation with correct structure', () => {
      expect(GamingTranslation).toHaveProperty('GAMING_TERMS');
      expect(GamingTranslation).toHaveProperty('containsGamingTerms');
      expect(GamingTranslation).toHaveProperty('translateGamingText');

      expect(typeof GamingTranslation.GAMING_TERMS).toBe('object');
      expect(typeof GamingTranslation.containsGamingTerms).toBe('function');
      expect(typeof GamingTranslation.translateGamingText).toBe('function');
    });
  });
});