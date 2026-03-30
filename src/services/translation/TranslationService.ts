/**
 * Language Detection and Translation Service
 * Implements TRL-001: Language detection and basic translation infrastructure
 *
 * Features:
 * - Auto-detect message languages
 * - Translate messages with high accuracy
 * - Support for both cloud (Google Translate API) and on-device translation
 * - Fallback mechanisms for offline scenarios
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguageCode, SUPPORTED_LANGUAGES } from './types';

export { SupportedLanguageCode, SUPPORTED_LANGUAGES };

export interface LanguageDetectionResult {
  language: SupportedLanguageCode;
  confidence: number;
  isReliable: boolean;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: SupportedLanguageCode;
  targetLanguage: SupportedLanguageCode;
  confidence: number;
  method: 'cloud' | 'device' | 'cached';
  translationTime: number;
}

export interface TranslationConfig {
  apiKey?: string;
  enableCaching?: boolean;
  maxCacheSize?: number;
  fallbackToDevice?: boolean;
  confidenceThreshold?: number;
  onError?: (error: Error) => void;
  onLanguageDetected?: (result: LanguageDetectionResult) => void;
  onTranslationComplete?: (result: TranslationResult) => void;
}

export interface CachedTranslation {
  sourceText: string;
  translatedText: string;
  sourceLanguage: SupportedLanguageCode;
  targetLanguage: SupportedLanguageCode;
  timestamp: number;
  method: 'cloud' | 'device';
}

class TranslationService {
  private config: TranslationConfig = {};
  private isInitialized = false;
  private cache = new Map<string, CachedTranslation>();
  private readonly CACHE_KEY = '@hearth_translation_cache';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Initialize translation service
   */
  async initialize(config: TranslationConfig = {}): Promise<boolean> {
    this.config = {
      enableCaching: true,
      maxCacheSize: this.MAX_CACHE_SIZE,
      fallbackToDevice: true,
      confidenceThreshold: 0.8,
      ...config,
    };

    try {
      // Load cached translations
      if (this.config.enableCaching) {
        await this.loadCachedTranslations();
      }

      this.isInitialized = true;
      console.log('Translation service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize translation service:', error);
      this.config.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Detect the language of the given text
   */
  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    if (!this.isInitialized) {
      throw new Error('Translation service not initialized');
    }

    if (!text?.trim()) {
      return {
        language: 'en',
        confidence: 0.0,
        isReliable: false,
      };
    }

    try {
      // First, try cloud-based detection for better accuracy
      const cloudResult = await this.detectLanguageCloud(text);
      if (cloudResult) {
        this.config.onLanguageDetected?.(cloudResult);
        return cloudResult;
      }

      // Fallback to device-based detection
      const deviceResult = await this.detectLanguageDevice(text);
      this.config.onLanguageDetected?.(deviceResult);
      return deviceResult;
    } catch (error) {
      console.error('Language detection failed:', error);
      this.config.onError?.(error as Error);

      // Return default with low confidence
      return {
        language: 'en',
        confidence: 0.0,
        isReliable: false,
      };
    }
  }

  /**
   * Translate text from source language to target language
   */
  async translateText(
    text: string,
    targetLanguage: SupportedLanguageCode,
    sourceLanguage?: SupportedLanguageCode
  ): Promise<TranslationResult> {
    if (!this.isInitialized) {
      throw new Error('Translation service not initialized');
    }

    if (!text?.trim()) {
      throw new Error('Text cannot be empty');
    }

    const startTime = Date.now();

    try {
      // Auto-detect source language if not provided
      let detectedSource = sourceLanguage;
      if (!detectedSource) {
        const detection = await this.detectLanguage(text);
        detectedSource = detection.language;
      }

      // If source and target are the same, return original text
      if (detectedSource === targetLanguage) {
        return {
          translatedText: text,
          sourceLanguage: detectedSource,
          targetLanguage,
          confidence: 1.0,
          method: 'cached',
          translationTime: Date.now() - startTime,
        };
      }

      // Check cache first
      if (this.config.enableCaching) {
        const cached = await this.getCachedTranslation(text, detectedSource, targetLanguage);
        if (cached) {
          return {
            translatedText: cached.translatedText,
            sourceLanguage: cached.sourceLanguage,
            targetLanguage: cached.targetLanguage,
            confidence: 0.95, // High confidence for cached results
            method: 'cached',
            translationTime: Date.now() - startTime,
          };
        }
      }

      // Try cloud translation first
      let result = await this.translateCloud(text, detectedSource, targetLanguage);

      // Fallback to device translation if cloud fails
      if (!result && this.config.fallbackToDevice) {
        result = await this.translateDevice(text, detectedSource, targetLanguage);
      }

      if (!result) {
        throw new Error('Translation failed for all available methods');
      }

      // Cache successful translation
      if (this.config.enableCaching && result.confidence >= (this.config.confidenceThreshold || 0.8)) {
        await this.cacheTranslation(text, result.translatedText, detectedSource, targetLanguage, result.method as 'cloud' | 'device');
      }

      const finalResult = {
        ...result,
        translationTime: Date.now() - startTime,
      };

      this.config.onTranslationComplete?.(finalResult);
      return finalResult;
    } catch (error) {
      console.error('Translation failed:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get available languages for translation
   */
  getSupportedLanguages(): Record<SupportedLanguageCode, string> {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(languageCode: string): languageCode is SupportedLanguageCode {
    return languageCode in SUPPORTED_LANGUAGES;
  }

  /**
   * Get translation service status
   */
  getServiceStatus(): {
    isInitialized: boolean;
    cacheSize: number;
    supportedLanguagesCount: number;
  } {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
      supportedLanguagesCount: Object.keys(SUPPORTED_LANGUAGES).length,
    };
  }

  /**
   * Clear translation cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    if (this.config.enableCaching) {
      await AsyncStorage.removeItem(this.CACHE_KEY);
    }
    console.log('Translation cache cleared');
  }

  /**
   * Cloud-based language detection using Google Translate API
   */
  private async detectLanguageCloud(text: string): Promise<LanguageDetectionResult | null> {
    if (!this.config.apiKey) {
      return null;
    }

    try {
      // Google Translate API detection
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2/detect?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Detection API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.data?.detections?.[0]?.[0]) {
        const detection = data.data.detections[0][0];
        const language = detection.language as SupportedLanguageCode;
        const confidence = detection.confidence || 0.8;

        if (this.isLanguageSupported(language)) {
          return {
            language,
            confidence,
            isReliable: confidence >= (this.config.confidenceThreshold || 0.8),
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('Cloud language detection failed:', error);
      return null;
    }
  }

  /**
   * Device-based language detection (simple heuristics)
   */
  private async detectLanguageDevice(text: string): Promise<LanguageDetectionResult> {
    // Simple heuristic-based detection
    // This is a basic implementation - in production, you'd use a proper ML library

    const cleanText = text.toLowerCase().trim();

    // Basic character set detection
    if (/[\u4e00-\u9fff]/.test(cleanText)) {
      return { language: 'zh', confidence: 0.85, isReliable: true };
    }

    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(cleanText)) {
      return { language: 'ja', confidence: 0.85, isReliable: true };
    }

    if (/[\uac00-\ud7af]/.test(cleanText)) {
      return { language: 'ko', confidence: 0.85, isReliable: true };
    }

    if (/[\u0600-\u06ff]/.test(cleanText)) {
      return { language: 'ar', confidence: 0.85, isReliable: true };
    }

    if (/[\u0900-\u097f]/.test(cleanText)) {
      return { language: 'hi', confidence: 0.85, isReliable: true };
    }

    // Basic word-based detection for Latin scripts
    const commonWords = {
      en: ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with', 'for', 'as', 'was', 'on', 'are'],
      es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su'],
      fr: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son'],
      de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im'],
      it: ['il', 'di', 'che', 'e', 'la', 'un', 'a', 'per', 'non', 'in', 'una', 'si', 'da', 'come', 'ma'],
    };

    const words = cleanText.split(/\s+/).filter(word => word.length > 1);
    const scores: Record<string, number> = {};

    for (const [lang, commonWordList] of Object.entries(commonWords)) {
      scores[lang] = 0;
      for (const word of words) {
        if (commonWordList.includes(word)) {
          scores[lang] += 1;
        }
      }
      scores[lang] = scores[lang] / words.length; // Normalize by word count
    }

    // Find the language with the highest score
    const maxScore = Math.max(...Object.values(scores));
    const detectedLang = Object.keys(scores).find(lang => scores[lang] === maxScore) || 'en';

    return {
      language: detectedLang as SupportedLanguageCode,
      confidence: Math.max(0.4, maxScore), // Minimum confidence of 0.4
      isReliable: maxScore > 0.2,
    };
  }

  /**
   * Cloud-based translation using Google Translate API
   */
  private async translateCloud(
    text: string,
    sourceLanguage: SupportedLanguageCode,
    targetLanguage: SupportedLanguageCode
  ): Promise<Omit<TranslationResult, 'translationTime'> | null> {
    if (!this.config.apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            source: sourceLanguage,
            target: targetLanguage,
            format: 'text',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Translation API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.data?.translations?.[0]) {
        const translation = data.data.translations[0];
        return {
          translatedText: translation.translatedText,
          sourceLanguage,
          targetLanguage,
          confidence: 0.9, // High confidence for cloud translations
          method: 'cloud',
        };
      }

      return null;
    } catch (error) {
      console.warn('Cloud translation failed:', error);
      return null;
    }
  }

  /**
   * Device-based translation (basic implementation)
   */
  private async translateDevice(
    text: string,
    sourceLanguage: SupportedLanguageCode,
    targetLanguage: SupportedLanguageCode
  ): Promise<Omit<TranslationResult, 'translationTime'> | null> {
    // This is a placeholder for device-based translation
    // In a production app, you would integrate with libraries like:
    // - react-native-mlkit-translate
    // - expo-ml-kit
    // - or other on-device ML translation solutions

    console.log('Device-based translation not implemented yet');
    return null;
  }

  /**
   * Get cached translation
   */
  private async getCachedTranslation(
    text: string,
    sourceLanguage: SupportedLanguageCode,
    targetLanguage: SupportedLanguageCode
  ): Promise<CachedTranslation | null> {
    const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Cache translation result
   */
  private async cacheTranslation(
    sourceText: string,
    translatedText: string,
    sourceLanguage: SupportedLanguageCode,
    targetLanguage: SupportedLanguageCode,
    method: 'cloud' | 'device'
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(sourceText, sourceLanguage, targetLanguage);
    const cacheEntry: CachedTranslation = {
      sourceText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      timestamp: Date.now(),
      method,
    };

    this.cache.set(cacheKey, cacheEntry);

    // Enforce cache size limit
    if (this.cache.size > (this.config.maxCacheSize || this.MAX_CACHE_SIZE)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    // Persist to storage
    if (this.config.enableCaching) {
      await this.saveCachedTranslations();
    }
  }

  /**
   * Generate cache key for translation
   */
  private generateCacheKey(
    text: string,
    sourceLanguage: SupportedLanguageCode,
    targetLanguage: SupportedLanguageCode
  ): string {
    return `${sourceLanguage}-${targetLanguage}-${text.substring(0, 100)}`;
  }

  /**
   * Load cached translations from storage
   */
  private async loadCachedTranslations(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cachedData) {
        const translations: Array<[string, CachedTranslation]> = JSON.parse(cachedData);

        // Filter out expired entries
        const validTranslations = translations.filter(
          ([, translation]) => Date.now() - translation.timestamp <= this.CACHE_EXPIRY
        );

        this.cache = new Map(validTranslations);
        console.log(`Loaded ${this.cache.size} cached translations`);
      }
    } catch (error) {
      console.warn('Failed to load cached translations:', error);
    }
  }

  /**
   * Save cached translations to storage
   */
  private async saveCachedTranslations(): Promise<void> {
    try {
      const translations = Array.from(this.cache.entries());
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(translations));
    } catch (error) {
      console.warn('Failed to save cached translations:', error);
    }
  }

  /**
   * Clean up service
   */
  async cleanup(): Promise<void> {
    try {
      if (this.config.enableCaching) {
        await this.saveCachedTranslations();
      }

      this.cache.clear();
      this.isInitialized = false;
      this.config = {};
      console.log('Translation service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup translation service:', error);
    }
  }

  /**
   * Reset service state (for testing purposes)
   */
  resetForTesting(): void {
    this.cache.clear();
    this.isInitialized = false;
    this.config = {};
  }
}

export default new TranslationService();