/**
 * Translation Service Exports
 * Language detection and translation infrastructure
 *
 * Implements TRL-001: Language detection and basic translation infrastructure
 * - Auto-detect message languages with high accuracy
 * - Translate messages using cloud and device-based methods
 * - Comprehensive caching for performance optimization
 * - Support for 22+ languages with gaming terminology awareness
 */

export { default as TranslationService } from './TranslationService';
import TranslationService from './TranslationService';

// Re-export types
export type {
  LanguageDetectionResult,
  TranslationResult,
  TranslationConfig,
  CachedTranslation,
} from './TranslationService';

export { SUPPORTED_LANGUAGES } from './types';
export type { SupportedLanguageCode } from './types';

// Language detection utilities
export {
  LanguageDetectionEngine,
  LANGUAGE_PATTERNS,
} from './languageDetection';

export type {
  LanguagePattern,
} from './languageDetection';

/**
 * Initialize translation service with default configuration
 *
 * @param config - Optional configuration for translation service
 * @returns Promise<boolean> - True if initialization successful
 */
export const initializeTranslationService = async (
  config: {
    apiKey?: string;
    enableCaching?: boolean;
    onLanguageDetected?: (result: any) => void;
    onTranslationComplete?: (result: any) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<boolean> => {
  const success = await TranslationService.initialize({
    enableCaching: true,
    fallbackToDevice: true,
    confidenceThreshold: 0.8,
    ...config,
  });

  if (success) {
    console.log('Translation service initialized successfully');
  } else {
    console.error('Failed to initialize translation service');
  }

  return success;
};

/**
 * Quick language detection for text input
 *
 * @param text - Text to analyze
 * @returns Language detection result
 */
export const detectTextLanguage = async (text: string) => {
  if (!TranslationService.getServiceStatus().isInitialized) {
    await initializeTranslationService();
  }

  return await TranslationService.detectLanguage(text);
};

/**
 * Quick translation helper
 *
 * @param text - Text to translate
 * @param targetLanguage - Target language code
 * @param sourceLanguage - Optional source language (auto-detected if not provided)
 * @returns Translation result
 */
export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
) => {
  if (!TranslationService.getServiceStatus().isInitialized) {
    await initializeTranslationService();
  }

  if (!TranslationService.isLanguageSupported(targetLanguage)) {
    throw new Error(`Unsupported target language: ${targetLanguage}`);
  }

  return await TranslationService.translateText(
    text,
    targetLanguage as any,
    sourceLanguage as any
  );
};

/**
 * Get list of supported languages
 *
 * @returns Record of language codes and names
 */
export const getSupportedLanguages = () => {
  return TranslationService.getSupportedLanguages();
};

/**
 * Check if a language is supported for translation
 *
 * @param languageCode - Language code to check
 * @returns True if language is supported
 */
export const isLanguageSupported = (languageCode: string): boolean => {
  return TranslationService.isLanguageSupported(languageCode);
};

/**
 * Get translation service status and statistics
 *
 * @returns Service status information
 */
export const getTranslationServiceStatus = () => {
  return TranslationService.getServiceStatus();
};

/**
 * Clear translation cache
 *
 * @returns Promise that resolves when cache is cleared
 */
export const clearTranslationCache = async (): Promise<void> => {
  return await TranslationService.clearCache();
};

/**
 * Gaming-specific translation helpers
 */
export const GamingTranslation = {
  /**
   * Common gaming terms that need special handling
   */
  GAMING_TERMS: {
    // Action terms
    'gg': 'Good Game',
    'wp': 'Well Played',
    'gl': 'Good Luck',
    'hf': 'Have Fun',
    'glhf': 'Good Luck Have Fun',
    'nt': 'Nice Try',
    'ns': 'Nice Shot',
    'rekt': 'Wrecked/Destroyed',
    'pwned': 'Owned/Defeated',

    // Team coordination
    'ff': 'Forfeit',
    'afk': 'Away From Keyboard',
    'brb': 'Be Right Back',
    'omw': 'On My Way',
    'inc': 'Incoming',
    'def': 'Defend',
    'push': 'Attack/Advance',
    'fall back': 'Retreat',

    // Status terms
    'hp': 'Health Points',
    'mp': 'Mana Points',
    'cd': 'Cooldown',
    'ult': 'Ultimate Ability',
    'proc': 'Programmed Random Occurrence',
    'dps': 'Damage Per Second',
    'tank': 'Defensive Player/Character',
    'healer': 'Support Player/Character',

    // Quality/Performance
    'op': 'Overpowered',
    'meta': 'Most Effective Tactics Available',
    'nerf': 'Weaken/Reduce Power',
    'buff': 'Strengthen/Increase Power',
    'cheese': 'Cheap/Easy Strategy',
    'tryhard': 'Playing Very Seriously',
  },

  /**
   * Detect if text contains gaming terminology
   */
  containsGamingTerms(text: string): boolean {
    const lowerText = text.toLowerCase();
    const terms = Object.keys(this.GAMING_TERMS);
    return terms.some(term => lowerText.includes(term.toLowerCase()));
  },

  /**
   * Translate gaming text with context awareness
   */
  async translateGamingText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ) {
    // First check if translation service is initialized
    if (!TranslationService.getServiceStatus().isInitialized) {
      await initializeTranslationService();
    }

    // Detect gaming terms in the text
    const hasGamingTerms = this.containsGamingTerms(text);

    if (hasGamingTerms) {
      console.log('Gaming terminology detected in text for translation');
      // In a full implementation, you might:
      // 1. Pre-process gaming terms
      // 2. Use gaming-specific translation models
      // 3. Post-process to ensure gaming context is preserved
    }

    return await TranslationService.translateText(
      text,
      targetLanguage as any,
      sourceLanguage as any
    );
  },
};

/**
 * Cleanup translation service
 */
export const cleanupTranslationService = async (): Promise<void> => {
  return await TranslationService.cleanup();
};