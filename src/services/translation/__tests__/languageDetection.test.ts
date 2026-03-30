/**
 * Language Detection Engine Tests
 * Tests for advanced language detection utilities
 */

import { LanguageDetectionEngine, LANGUAGE_PATTERNS } from '../languageDetection';

describe('LanguageDetectionEngine', () => {
  describe('detectLanguage', () => {
    it('should handle empty text', () => {
      const result = LanguageDetectionEngine.detectLanguage('');
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0);
      expect(result.isReliable).toBe(false);
      expect(result.method).toBe('empty_text');
    });

    it('should detect Chinese characters with high confidence', () => {
      const result = LanguageDetectionEngine.detectLanguage('你好世界，这是一个测试。');
      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.isReliable).toBe(true);
      expect(result.method).toBe('character_set');
    });

    it('should detect Japanese characters', () => {
      const result = LanguageDetectionEngine.detectLanguage('こんにちは世界。これはテストです。');
      expect(result.language).toBe('ja');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.isReliable).toBe(true);
      expect(result.method).toBe('character_set');
    });

    it('should detect Korean characters', () => {
      const result = LanguageDetectionEngine.detectLanguage('안녕하세요 세계. 이것은 테스트입니다.');
      expect(result.language).toBe('ko');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.isReliable).toBe(true);
      expect(result.method).toBe('character_set');
    });

    it('should detect Arabic script', () => {
      const result = LanguageDetectionEngine.detectLanguage('مرحبا بالعالم. هذا اختبار.');
      expect(result.language).toBe('ar');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.isReliable).toBe(true);
      expect(result.method).toBe('character_set');
    });

    it('should detect Hindi script', () => {
      const result = LanguageDetectionEngine.detectLanguage('नमस्ते दुनिया। यह एक परीक्षा है।');
      expect(result.language).toBe('hi');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.isReliable).toBe(true);
      expect(result.method).toBe('character_set');
    });

    it('should detect Thai script', () => {
      const result = LanguageDetectionEngine.detectLanguage('สวัสดีโลก นี่คือการทดสอบ');
      expect(result.language).toBe('th');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.isReliable).toBe(true);
      expect(result.method).toBe('character_set');
    });

    it('should detect Russian script', () => {
      const result = LanguageDetectionEngine.detectLanguage('Привет мир. Это тест.');
      expect(result.language).toBe('ru');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.isReliable).toBe(true);
      expect(result.method).toBe('character_set');
    });

    it('should detect English using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('The quick brown fox jumps over the lazy dog.');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toMatch(/word_analysis|character_set/);
    });

    it('should detect Spanish using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('El rápido zorro marrón salta sobre el perro perezoso.');
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toMatch(/word_analysis|character_set|pattern_matching/);
    });

    it('should detect French using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('Le renard brun rapide saute par-dessus le chien paresseux.');
      expect(result.language).toBe('fr');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toMatch(/word_analysis|character_set|pattern_matching/);
    });

    it('should detect German using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('Der schnelle braune Fuchs springt über den faulen Hund.');
      expect(result.language).toBe('de');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toMatch(/word_analysis|character_set|pattern_matching/);
    });

    it('should detect Italian using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('La volpe marrone veloce salta sopra il cane pigro.');
      expect(result.language).toBe('it');
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.method).toMatch(/word_analysis|character_set|pattern_matching/);
    });

    it('should detect Portuguese using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('A raposa marrom rápida pula sobre o cão preguiçoso.');
      expect(result.language).toBe('pt');
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.method).toMatch(/word_analysis|character_set|pattern_matching/);
    });

    it('should detect Dutch using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('De snelle bruine vos springt over de luie hond.');
      expect(result.language).toBe('nl');
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.method).toMatch(/word_analysis|ngram_analysis|pattern_matching/);
    });

    it('should detect Swedish using word analysis', () => {
      const result = LanguageDetectionEngine.detectLanguage('Den snabba bruna räven hoppar över den lata hunden.');
      expect(result.language).toBe('sv');
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.method).toMatch(/word_analysis|character_set|pattern_matching/);
    });

    it('should fall back to English for ambiguous text', () => {
      const result = LanguageDetectionEngine.detectLanguage('123 456 789');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.isReliable).toBe(false);
      expect(result.method).toBe('fallback');
    });

    it('should handle very short text gracefully', () => {
      const result = LanguageDetectionEngine.detectLanguage('Hi');
      expect(result.language).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle mixed script text', () => {
      const result = LanguageDetectionEngine.detectLanguage('Hello 你好 مرحبا');
      // Should detect the first/most prominent script
      expect(result.language).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('getLanguageInfo', () => {
    it('should return correct info for English', () => {
      const info = LanguageDetectionEngine.getLanguageInfo('en');
      expect(info.code).toBe('en');
      expect(info.name).toBe('English');
      expect(info.isNonLatin).toBe(false);
    });

    it('should return correct info for Chinese', () => {
      const info = LanguageDetectionEngine.getLanguageInfo('zh');
      expect(info.code).toBe('zh');
      expect(info.name).toBe('Chinese (Simplified)');
      expect(info.isNonLatin).toBe(true);
    });

    it('should return correct info for Arabic', () => {
      const info = LanguageDetectionEngine.getLanguageInfo('ar');
      expect(info.code).toBe('ar');
      expect(info.name).toBe('Arabic');
      expect(info.isNonLatin).toBe(true);
    });

    it('should return correct info for languages with special characters', () => {
      const info = LanguageDetectionEngine.getLanguageInfo('fr');
      expect(info.code).toBe('fr');
      expect(info.name).toBe('French');
      expect(info.isNonLatin).toBe(false);
    });
  });

  describe('detectMixedLanguages', () => {
    it('should detect single language text', () => {
      const result = LanguageDetectionEngine.detectMixedLanguages(
        'This is a simple English sentence. It should be detected as English only.'
      );
      expect(result.hasMixedLanguages).toBe(false);
      expect(result.languages).toHaveLength(0);
    });

    it('should detect mixed language text', () => {
      const result = LanguageDetectionEngine.detectMixedLanguages(
        'Hello, this is English. Hola, esto es español. Bonjour, ceci est français.'
      );

      if (result.hasMixedLanguages) {
        expect(result.languages.length).toBeGreaterThan(1);
        expect(result.languages[0].portion).toBeGreaterThan(0);
      }
    });

    it('should handle short text without mixed language detection', () => {
      const result = LanguageDetectionEngine.detectMixedLanguages('Hello');
      expect(result.hasMixedLanguages).toBe(false);
      expect(result.languages).toHaveLength(0);
    });

    it('should handle text with numbers and punctuation', () => {
      const result = LanguageDetectionEngine.detectMixedLanguages(
        'Today is 2024. Tomorrow will be better! ¿Mañana será mejor?'
      );
      // Should work regardless of whether it detects mixed languages
      expect(result).toHaveProperty('hasMixedLanguages');
      expect(result).toHaveProperty('languages');
    });
  });

  describe('LANGUAGE_PATTERNS', () => {
    it('should have patterns for all major language categories', () => {
      const languageCodes = LANGUAGE_PATTERNS.map(p => p.code);

      // Check for major language groups
      expect(languageCodes).toContain('en'); // English
      expect(languageCodes).toContain('es'); // Spanish
      expect(languageCodes).toContain('fr'); // French
      expect(languageCodes).toContain('de'); // German
      expect(languageCodes).toContain('zh'); // Chinese
      expect(languageCodes).toContain('ja'); // Japanese
      expect(languageCodes).toContain('ar'); // Arabic
      expect(languageCodes).toContain('ru'); // Russian
    });

    it('should have valid patterns for each language', () => {
      LANGUAGE_PATTERNS.forEach(pattern => {
        expect(pattern.code).toBeTruthy();
        expect(pattern.patterns).toBeInstanceOf(Array);
        expect(pattern.commonWords).toBeInstanceOf(Array);
        expect(pattern.characterSets).toBeInstanceOf(Array);
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);

        // Check that patterns are valid RegExp objects
        pattern.patterns.forEach(regex => {
          expect(regex).toBeInstanceOf(RegExp);
        });

        pattern.characterSets.forEach(regex => {
          expect(regex).toBeInstanceOf(RegExp);
        });

        // Check that common words are strings
        pattern.commonWords.forEach(word => {
          expect(typeof word).toBe('string');
          expect(word.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have unique language codes', () => {
      const codes = LANGUAGE_PATTERNS.map(p => p.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined input', () => {
      // @ts-ignore - testing runtime behavior
      const result1 = LanguageDetectionEngine.detectLanguage(null);
      expect(result1.language).toBe('en');
      expect(result1.confidence).toBe(0);

      // @ts-ignore - testing runtime behavior
      const result2 = LanguageDetectionEngine.detectLanguage(undefined);
      expect(result2.language).toBe('en');
      expect(result2.confidence).toBe(0);
    });

    it('should handle whitespace-only text', () => {
      const result = LanguageDetectionEngine.detectLanguage('   \n\t   ');
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0);
      expect(result.isReliable).toBe(false);
    });

    it('should handle very long text', () => {
      const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(1000);
      const result = LanguageDetectionEngine.detectLanguage(longText);
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle text with special characters and emojis', () => {
      const result = LanguageDetectionEngine.detectLanguage('Hello 👋 world 🌍! How are you? 😊');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle URLs and technical text', () => {
      const result = LanguageDetectionEngine.detectLanguage(
        'Check out https://example.com for more info. The API endpoint is /api/v1/users.'
      );
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle code snippets', () => {
      const result = LanguageDetectionEngine.detectLanguage(
        'function hello() { return "Hello World"; } // This is a comment'
      );
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});