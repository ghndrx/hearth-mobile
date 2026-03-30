/**
 * Translation Service for TRL-001
 * Provides translation capabilities for messages using Google Translate API
 */

import type {
  TranslationService,
  TranslationResult,
  TranslationPreferences,
  LanguageDetection,
  TranslationCache,
  TranslationError as TranslationErrorType
} from '../types/translation';
import { languageDetectionService } from './languageDetection';

const DEFAULT_PREFERENCES: TranslationPreferences = {
  primaryLanguage: 'en',
  autoTranslate: false,
  autoDetectLanguage: true,
  preferredTranslationService: 'google',
  offlineMode: false,
  confidenceThreshold: 0.7,
  enabledLanguagePairs: ['en-es', 'en-fr', 'en-de', 'es-en', 'fr-en', 'de-en'],
  privacyMode: 'hybrid',
  gamingTermsEnabled: true,
};

class TranslationServiceImpl implements TranslationService {
  private preferences: TranslationPreferences;
  private cache: Map<string, TranslationCache>;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 5000;
  private readonly MAX_TEXT_LENGTH = 5000;

  // Google Translate API endpoint (free tier, limited requests)
  private readonly GOOGLE_TRANSLATE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
  private readonly GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

  constructor() {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.cache = new Map();
    this.loadPreferences();
  }

  /**
   * Translate message with explicit source and target languages
   */
  async translateMessage(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    if (!text.trim()) {
      throw new TranslationError('UNKNOWN', 'Text cannot be empty', text, sourceLanguage, targetLanguage, false);
    }

    if (text.length > this.MAX_TEXT_LENGTH) {
      throw new TranslationError('UNKNOWN', `Text too long (max ${this.MAX_TEXT_LENGTH} characters)`, text, sourceLanguage, targetLanguage, false);
    }

    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0,
        timestamp: Date.now(),
        originalText: text,
        cached: false
      };
    }

    const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        translatedText: cached.translatedText,
        sourceLanguage: cached.sourceLanguage,
        targetLanguage: cached.targetLanguage,
        confidence: cached.confidence,
        timestamp: Date.now(),
        originalText: text,
        cached: true
      };
    }

    try {
      // Check if language pair is supported
      const langPair = `${sourceLanguage}-${targetLanguage}`;
      if (!this.preferences.enabledLanguagePairs.includes(langPair) &&
          !this.preferences.enabledLanguagePairs.includes('*')) {
        throw new TranslationError(
          'LANGUAGE_NOT_SUPPORTED',
          `Language pair ${langPair} not enabled`,
          text,
          sourceLanguage,
          targetLanguage,
          false
        );
      }

      let translatedText: string;
      let confidence = 0.8; // Default confidence

      if (this.preferences.privacyMode === 'device-only') {
        // Use offline/local translation (basic substitution for now)
        translatedText = await this.translateOffline(text, sourceLanguage, targetLanguage);
        confidence = 0.6; // Lower confidence for offline
      } else {
        // Use Google Translate API
        translatedText = await this.translateWithGoogle(text, sourceLanguage, targetLanguage);
      }

      // Apply gaming terminology improvements if enabled
      if (this.preferences.gamingTermsEnabled) {
        translatedText = this.improveGamingTerms(translatedText, sourceLanguage, targetLanguage);
      }

      const result: TranslationResult = {
        translatedText,
        sourceLanguage,
        targetLanguage,
        confidence,
        timestamp: Date.now(),
        originalText: text,
        cached: false
      };

      // Cache the result
      this.cacheResult(cacheKey, {
        key: cacheKey,
        sourceText: text,
        translatedText,
        sourceLanguage,
        targetLanguage,
        timestamp: Date.now(),
        confidence,
        expiresAt: Date.now() + this.CACHE_TTL
      });

      return result;

    } catch (error) {
      if (error instanceof TranslationError) {
        throw error;
      }

      console.error('Translation failed:', error);
      throw new TranslationError(
        'API_ERROR',
        'Translation service temporarily unavailable',
        text,
        sourceLanguage,
        targetLanguage,
        true
      );
    }
  }

  /**
   * Translate message with automatic language detection
   */
  async translateMessageAuto(text: string, targetLanguage: string): Promise<TranslationResult> {
    const detection = await this.detectLanguage(text);

    if (detection.confidence < this.preferences.confidenceThreshold) {
      throw new TranslationError(
        'UNKNOWN',
        `Language detection confidence too low: ${detection.confidence}`,
        text,
        detection.language,
        targetLanguage,
        false
      );
    }

    return this.translateMessage(text, detection.language, targetLanguage);
  }

  /**
   * Detect language of text using the language detection service
   */
  async detectLanguage(text: string): Promise<LanguageDetection> {
    return languageDetectionService.detectLanguage(text);
  }

  /**
   * Get available languages for translation
   */
  async getAvailableLanguages(): Promise<string[]> {
    return languageDetectionService.getSupportedLanguages().map(lang => lang.code);
  }

  /**
   * Get supported language pairs
   */
  async getSupportedLanguagePairs(): Promise<string[]> {
    return this.preferences.enabledLanguagePairs;
  }

  /**
   * Set user preferences
   */
  setUserPreferences(preferences: Partial<TranslationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.savePreferences();
  }

  /**
   * Get current user preferences
   */
  getUserPreferences(): TranslationPreferences {
    return { ...this.preferences };
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return languageDetectionService.isLanguageSupported(language);
  }

  /**
   * Translate using Google Translate API
   */
  private async translateWithGoogle(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    if (!this.GOOGLE_TRANSLATE_API_KEY) {
      throw new TranslationError(
        'API_ERROR',
        'Google Translate API key not configured',
        text,
        sourceLanguage,
        targetLanguage,
        false
      );
    }

    const params = new URLSearchParams({
      key: this.GOOGLE_TRANSLATE_API_KEY,
      q: text,
      source: sourceLanguage,
      target: targetLanguage,
      format: 'text'
    });

    const response = await fetch(`${this.GOOGLE_TRANSLATE_URL}?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Translate API error:', errorText);

      if (response.status === 429) {
        throw new TranslationError(
          'RATE_LIMIT',
          'Too many translation requests',
          text,
          sourceLanguage,
          targetLanguage,
          true
        );
      }

      throw new TranslationError(
        'API_ERROR',
        `Google Translate API error: ${response.statusText}`,
        text,
        sourceLanguage,
        targetLanguage,
        true
      );
    }

    const data = await response.json();

    if (!data.data || !data.data.translations || data.data.translations.length === 0) {
      throw new TranslationError(
        'API_ERROR',
        'Invalid response from Google Translate API',
        text,
        sourceLanguage,
        targetLanguage,
        true
      );
    }

    return data.data.translations[0].translatedText;
  }

  /**
   * Fallback offline translation (basic implementation)
   */
  private async translateOffline(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    // This is a very basic offline implementation
    // In a real app, this would use local ML models like TensorFlow Lite
    const commonTranslations: { [key: string]: { [key: string]: string } } = {
      'en-es': {
        'hello': 'hola',
        'goodbye': 'adiós',
        'yes': 'sí',
        'no': 'no',
        'please': 'por favor',
        'thank you': 'gracias',
        'good': 'bueno',
        'bad': 'malo',
        'gg': 'buena partida',
        'wp': 'bien jugado'
      },
      'es-en': {
        'hola': 'hello',
        'adiós': 'goodbye',
        'sí': 'yes',
        'no': 'no',
        'por favor': 'please',
        'gracias': 'thank you',
        'bueno': 'good',
        'malo': 'bad'
      }
    };

    const langPair = `${sourceLanguage}-${targetLanguage}`;
    const translations = commonTranslations[langPair] || {};

    let translatedText = text.toLowerCase();

    // Replace known translations
    for (const [original, translation] of Object.entries(translations)) {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      translatedText = translatedText.replace(regex, translation);
    }

    // If no translations were found, return original text with a note
    if (translatedText === text.toLowerCase()) {
      return `[Offline translation unavailable] ${text}`;
    }

    return translatedText;
  }

  /**
   * Improve gaming terminology in translations
   */
  private improveGamingTerms(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): string {
    const gamingTerms: { [key: string]: { [key: string]: string } } = {
      'en': {
        'gg': 'good game',
        'wp': 'well played',
        'glhf': 'good luck have fun',
        'afk': 'away from keyboard',
        'brb': 'be right back',
        'lol': 'laugh out loud',
        'omg': 'oh my god',
        'fps': 'first person shooter',
        'mmorpg': 'massively multiplayer online role-playing game',
        'pvp': 'player versus player',
        'pve': 'player versus environment',
        'noob': 'newbie',
        'pro': 'professional',
        'lag': 'network delay',
        'ping': 'latency'
      },
      'es': {
        'buena partida': 'gg',
        'bien jugado': 'wp',
        'buena suerte diviértanse': 'glhf',
        'no estoy': 'afk'
      }
    };

    let improvedText = text;
    const terms = gamingTerms[sourceLanguage] || {};

    // Replace gaming terms with more accurate translations
    for (const [term, meaning] of Object.entries(terms)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      improvedText = improvedText.replace(regex, meaning);
    }

    return improvedText;
  }

  /**
   * Generate cache key for translation
   */
  private generateCacheKey(text: string, sourceLanguage: string, targetLanguage: string): string {
    const textHash = text.slice(0, 100); // Use first 100 chars as simple hash
    return `translation:${sourceLanguage}:${targetLanguage}:${textHash}`;
  }

  /**
   * Get translation from cache
   */
  private getFromCache(key: string): TranslationCache | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached;
    }
    // Remove expired cache entries
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Cache translation result
   */
  private cacheResult(key: string, result: TranslationCache): void {
    // Implement LRU cache behavior
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, result);
  }

  /**
   * Load preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      // In a real app, this would load from AsyncStorage
      // For now, we'll use the defaults
      const stored = '{}'; // await AsyncStorage.getItem('translation_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load translation preferences:', error);
    }
  }

  /**
   * Save preferences to storage
   */
  private async savePreferences(): Promise<void> {
    try {
      // In a real app, this would save to AsyncStorage
      // await AsyncStorage.setItem('translation_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save translation preferences:', error);
    }
  }
}

// Custom error class for translation errors
class TranslationError extends Error implements TranslationError {
  constructor(
    public code: 'NETWORK_ERROR' | 'API_ERROR' | 'LANGUAGE_NOT_SUPPORTED' | 'RATE_LIMIT' | 'UNKNOWN',
    message: string,
    public originalText?: string,
    public sourceLanguage?: string,
    public targetLanguage?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

// Export singleton instance
export const translationService = new TranslationServiceImpl();
export default translationService;
export { TranslationError };