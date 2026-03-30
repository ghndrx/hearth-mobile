/**
 * Language Detection Service for TRL-001
 * Provides language detection capabilities for messages
 */

import type { LanguageDetection, LanguageInfo } from '../types/translation';

// Common language codes with their information
const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

class LanguageDetectionService {
  private supportedLanguages: Map<string, LanguageInfo>;
  private detectionCache: Map<string, LanguageDetection>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_TEXT_LENGTH = 3;
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.supportedLanguages = new Map(
      SUPPORTED_LANGUAGES.map(lang => [lang.code, lang])
    );
    this.detectionCache = new Map();
  }

  /**
   * Detect the language of a given text
   */
  async detectLanguage(text: string): Promise<LanguageDetection> {
    if (!text || text.length < this.MIN_TEXT_LENGTH) {
      return {
        language: 'en',
        confidence: 0.1,
        alternatives: []
      };
    }

    // Clean the text for better detection
    const cleanText = this.cleanText(text);
    const cacheKey = this.generateCacheKey(cleanText);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Perform basic language detection using character patterns and common words
      const detection = await this.performDetection(cleanText);

      // Cache the result
      this.cacheResult(cacheKey, detection);

      return detection;
    } catch (error) {
      console.error('Language detection failed:', error);

      // Return English as fallback
      return {
        language: 'en',
        confidence: 0.1,
        alternatives: []
      };
    }
  }

  /**
   * Get information about a language by its code
   */
  getLanguageInfo(languageCode: string): LanguageInfo | undefined {
    return this.supportedLanguages.get(languageCode);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): LanguageInfo[] {
    return Array.from(this.supportedLanguages.values());
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(languageCode: string): boolean {
    return this.supportedLanguages.has(languageCode);
  }

  /**
   * Clear the detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
  }

  /**
   * Clean text for better language detection
   */
  private cleanText(text: string): string {
    // Remove URLs, mentions, hashtags, emojis, and extra whitespace
    return text
      .replace(/https?:\/\/\S+/g, '') // URLs
      .replace(/@\w+/g, '') // Mentions
      .replace(/#\w+/g, '') // Hashtags
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Emojis
      .replace(/\s+/g, ' ') // Extra whitespace
      .trim();
  }

  /**
   * Perform basic language detection using character patterns and common words
   */
  private async performDetection(text: string): Promise<LanguageDetection> {
    const scores: { [language: string]: number } = {};

    // Initialize all languages with a base score
    for (const lang of this.supportedLanguages.keys()) {
      scores[lang] = 0;
    }

    // Character-based detection
    this.analyzeCharacterPatterns(text, scores);

    // Word-based detection (common words)
    this.analyzeCommonWords(text, scores);

    // Convert scores to probabilities
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

    if (totalScore === 0) {
      return {
        language: 'en',
        confidence: 0.1,
        alternatives: []
      };
    }

    // Sort languages by score
    const sortedLanguages = Object.entries(scores)
      .map(([lang, score]) => ({
        language: lang,
        confidence: score / totalScore
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 alternatives

    const topLanguage = sortedLanguages[0];
    const alternatives = sortedLanguages.slice(1);

    return {
      language: topLanguage.language,
      confidence: Math.min(topLanguage.confidence, 0.95), // Cap confidence at 95%
      alternatives
    };
  }

  /**
   * Analyze character patterns to help detect language
   */
  private analyzeCharacterPatterns(text: string, scores: { [language: string]: number }): void {
    const lowerText = text.toLowerCase();

    // Check for specific character sets
    if (/[а-яё]/i.test(text)) scores.ru += 10;
    if (/[αβγδεζηθικλμνξοπρστυφχψω]/i.test(text)) scores.el += 10;
    if (/[ñáéíóúü]/i.test(text)) scores.es += 8;
    if (/[àâäéèêëîïôöùûüÿç]/i.test(text)) scores.fr += 8;
    if (/[äöüß]/i.test(text)) scores.de += 8;
    if (/[àèìòù]/i.test(text)) scores.it += 8;
    if (/[ãõ]/i.test(text)) scores.pt += 8;
    if (/[åæø]/i.test(text)) scores.no += 8;
    if (/[åäö]/i.test(text)) scores.sv += 8;
    if (/[æø]/i.test(text)) scores.da += 8;
    if (/[äö]/i.test(text)) scores.fi += 6;
    if (/[ąćęłńóśźż]/i.test(text)) scores.pl += 8;
    if (/[çğıöşü]/i.test(text)) scores.tr += 8;
    if (/[ก-๙]/i.test(text)) scores.th += 10;
    if (/[あ-ん]/i.test(text)) scores.ja += 10;
    if (/[가-힣]/i.test(text)) scores.ko += 10;
    if (/[一-龯]/i.test(text)) scores.zh += 10;
    if (/[ا-ي]/i.test(text)) scores.ar += 10;
    if (/[अ-ह]/i.test(text)) scores.hi += 10;
    if (/[à-ỹ]/i.test(text)) scores.vi += 8;

    // English gets points for Latin characters without special accents
    if (/^[a-z\s.,!?'"0-9-]*$/i.test(text)) {
      scores.en += 5;
    }
  }

  /**
   * Analyze common words to help detect language
   */
  private analyzeCommonWords(text: string, scores: { [language: string]: number }): void {
    const words = text.toLowerCase().split(/\s+/);

    // Common words by language
    const commonWords = {
      en: ['the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they', 'this', 'have', 'from', 'one', 'had', 'word', 'but', 'not', 'what', 'all'],
      es: ['que', 'de', 'no', 'a', 'la', 'el', 'es', 'y', 'en', 'lo', 'un', 'por', 'que', 'con', 'se', 'una', 'para', 'como', 'te', 'le'],
      fr: ['de', 'le', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se'],
      de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'],
      it: ['che', 'di', 'e', 'la', 'il', 'un', 'a', 'è', 'per', 'una', 'in', 'con', 'non', 'ho', 'mi', 'si', 'da', 'ti', 'le', 'lo'],
      pt: ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as'],
      ru: ['в', 'и', 'не', 'на', 'я', 'быть', 'тот', 'он', 'с', 'а', 'как', 'что', 'по', 'это', 'она', 'этот', 'к', 'но', 'они', 'мы'],
      nl: ['de', 'en', 'van', 'het', 'een', 'dat', 'die', 'in', 'is', 'niet', 'te', 'op', 'met', 'als', 'voor', 'aan', 'zijn', 'hebben', 'of', 'bij'],
      ar: ['في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'التي', 'التي', 'كان', 'كانت', 'ذلك', 'تلك', 'لقد', 'قد', 'ما', 'لا', 'أن', 'إن', 'كل', 'بين'],
      ja: ['の', 'は', 'を', 'に', 'が', 'で', 'と', 'た', 'て', 'し', 'か', 'も', 'な', 'だ', 'ば', 'ん', 'ま', 'や', 'ら', 'わ'],
      ko: ['이', '그', '저', '것', '는', '은', '을', '를', '에', '의', '와', '과', '도', '만', '까지', '부터', '로', '으로', '서', '에서'],
      zh: ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去'],
      hi: ['है', 'में', 'की', 'को', 'का', 'के', 'से', 'एक', 'पर', 'यह', 'वह', 'कि', 'और', 'हैं', 'या', 'थे', 'हो', 'था', 'कर', 'लिए'],
    };

    for (const [language, commonWordsList] of Object.entries(commonWords)) {
      for (const word of words) {
        if (commonWordsList.includes(word)) {
          scores[language] += 3;
        }
      }
    }
  }

  /**
   * Generate cache key for detection result
   */
  private generateCacheKey(text: string): string {
    return `detection:${text.length}:${text.slice(0, 50)}`;
  }

  /**
   * Get detection result from cache
   */
  private getFromCache(key: string): LanguageDetection | null {
    const cached = this.detectionCache.get(key);
    if (cached && cached.timestamp && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        language: cached.language,
        confidence: cached.confidence,
        alternatives: cached.alternatives
      };
    }
    return null;
  }

  /**
   * Cache a detection result
   */
  private cacheResult(key: string, detection: LanguageDetection): void {
    // Implement LRU cache behavior
    if (this.detectionCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.detectionCache.keys().next().value;
      if (firstKey) {
        this.detectionCache.delete(firstKey);
      }
    }

    this.detectionCache.set(key, {
      ...detection,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const languageDetectionService = new LanguageDetectionService();
export default languageDetectionService;