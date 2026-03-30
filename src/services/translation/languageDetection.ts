/**
 * Language Detection Utilities
 * Advanced language detection using various heuristics and patterns
 */

import { SupportedLanguageCode, SUPPORTED_LANGUAGES } from './types';

export interface LanguagePattern {
  code: SupportedLanguageCode;
  patterns: RegExp[];
  commonWords: string[];
  characterSets: RegExp[];
  confidence: number;
}

// Language patterns for improved detection
export const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    code: 'zh',
    patterns: [/[\u4e00-\u9fff]/],
    commonWords: ['的', '一', '是', '在', '不', '了', '有', '和', '人', '这'],
    characterSets: [/[\u4e00-\u9fff]/],
    confidence: 0.95,
  },
  {
    code: 'ja',
    patterns: [/[\u3040-\u309f\u30a0-\u30ff]/],
    commonWords: ['は', 'の', 'に', 'を', 'と', 'が', 'で', 'た', 'し', 'て'],
    characterSets: [/[\u3040-\u309f]/, /[\u30a0-\u30ff]/],
    confidence: 0.95,
  },
  {
    code: 'ko',
    patterns: [/[\uac00-\ud7af]/],
    commonWords: ['이', '그', '저', '것', '수', '있', '하', '되', '같', '않'],
    characterSets: [/[\uac00-\ud7af]/],
    confidence: 0.95,
  },
  {
    code: 'ar',
    patterns: [/[\u0600-\u06ff]/],
    commonWords: ['في', 'من', 'أن', 'على', 'هذا', 'هذه', 'كان', 'التي', 'إلى', 'أو'],
    characterSets: [/[\u0600-\u06ff]/],
    confidence: 0.95,
  },
  {
    code: 'hi',
    patterns: [/[\u0900-\u097f]/],
    commonWords: ['है', 'के', 'में', 'और', 'का', 'एक', 'से', 'को', 'पर', 'यह'],
    characterSets: [/[\u0900-\u097f]/],
    confidence: 0.95,
  },
  {
    code: 'th',
    patterns: [/[\u0e00-\u0e7f]/],
    commonWords: ['ของ', 'ใน', 'และ', 'ที่', 'มี', 'เป็น', 'จาก', 'นี้', 'ได้', 'จะ'],
    characterSets: [/[\u0e00-\u0e7f]/],
    confidence: 0.95,
  },
  {
    code: 'ru',
    patterns: [/[\u0400-\u04ff]/],
    commonWords: ['и', 'в', 'не', 'на', 'я', 'быть', 'то', 'он', 'оно', 'как'],
    characterSets: [/[\u0400-\u04ff]/],
    confidence: 0.90,
  },
  {
    code: 'en',
    patterns: [/^[a-zA-Z\s\d.,!?'"()-]+$/],
    commonWords: ['the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for', 'on', 'are'],
    characterSets: [/[a-zA-Z]/],
    confidence: 0.80,
  },
  {
    code: 'es',
    patterns: [/[ñáéíóúü]/i],
    commonWords: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su'],
    characterSets: [/[a-zA-Zñáéíóúü]/],
    confidence: 0.85,
  },
  {
    code: 'fr',
    patterns: [/[àâäçéèêëïîôöùûüÿ]/i],
    commonWords: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son'],
    characterSets: [/[a-zA-Zàâäçéèêëïîôöùûüÿ]/],
    confidence: 0.85,
  },
  {
    code: 'de',
    patterns: [/[äöüß]/i],
    commonWords: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im'],
    characterSets: [/[a-zA-Zäöüß]/],
    confidence: 0.85,
  },
  {
    code: 'it',
    patterns: [/[àèéìîíòóù]/i],
    commonWords: ['il', 'di', 'che', 'e', 'la', 'un', 'a', 'per', 'non', 'in', 'una', 'si', 'da', 'come', 'ma'],
    characterSets: [/[a-zA-Zàèéìîíòóù]/],
    confidence: 0.85,
  },
  {
    code: 'pt',
    patterns: [/[ãâáàçéêíóôõú]/i],
    commonWords: ['o', 'de', 'a', 'e', 'que', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os'],
    characterSets: [/[a-zA-Zãâáàçéêíóôõú]/],
    confidence: 0.85,
  },
  {
    code: 'nl',
    patterns: [/[áàäéèëíìïóòöúùü]/i],
    commonWords: ['de', 'het', 'een', 'van', 'in', 'te', 'en', 'is', 'dat', 'op', 'met', 'voor', 'als', 'zijn', 'er'],
    characterSets: [/[a-zA-Záàäéèëíìïóòöúùü]/],
    confidence: 0.80,
  },
  {
    code: 'sv',
    patterns: [/[åäöÅÄÖ]/],
    commonWords: ['och', 'att', 'det', 'i', 'på', 'är', 'jag', 'en', 'som', 'med', 'för', 'inte', 'av', 'till', 'så'],
    characterSets: [/[a-zA-ZåäöÅÄÖ]/],
    confidence: 0.80,
  },
  {
    code: 'da',
    patterns: [/[æøåÆØÅ]/],
    commonWords: ['og', 'i', 'at', 'det', 'er', 'en', 'til', 'på', 'med', 'for', 'af', 'den', 'der', 'ikke', 'som'],
    characterSets: [/[a-zA-ZæøåÆØÅ]/],
    confidence: 0.80,
  },
  {
    code: 'no',
    patterns: [/[æøåÆØÅ]/],
    commonWords: ['og', 'i', 'det', 'at', 'en', 'er', 'for', 'på', 'med', 'han', 'av', 'ikke', 'ikkje', 'der', 'som'],
    characterSets: [/[a-zA-ZæøåÆØÅ]/],
    confidence: 0.80,
  },
  {
    code: 'fi',
    patterns: [/[äöÄÖ]/],
    commonWords: ['ja', 'on', 'se', 'että', 'ei', 'ole', 'hän', 'olla', 'tämä', 'kaikki', 'nyt', 'kun', 'vain', 'niin', 'jos'],
    characterSets: [/[a-zA-ZäöÄÖ]/],
    confidence: 0.80,
  },
  {
    code: 'pl',
    patterns: [/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/],
    commonWords: ['i', 'w', 'na', 'z', 'o', 'to', 'się', 'że', 'a', 'do', 'nie', 'być', 'po', 'za', 'jako'],
    characterSets: [/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/],
    confidence: 0.80,
  },
  {
    code: 'tr',
    patterns: [/[çğıöşüÇĞIİÖŞÜ]/],
    commonWords: ['ve', 'bir', 'bu', 'da', 'ile', 'o', 'için', 'gibi', 've', 'daha', 'çok', 'kadar', 'var', 'yok', 'olan'],
    characterSets: [/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/],
    confidence: 0.80,
  },
  {
    code: 'vi',
    patterns: [/[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i],
    commonWords: ['và', 'của', 'có', 'là', 'trong', 'một', 'được', 'với', 'không', 'này', 'từ', 'cho', 'đã', 'sẽ', 'về'],
    characterSets: [/[a-zA-Záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/],
    confidence: 0.85,
  },
  {
    code: 'id',
    patterns: [/^[a-zA-Z\s\d.,!?'"()-]+$/],
    commonWords: ['dan', 'yang', 'di', 'dengan', 'untuk', 'adalah', 'dari', 'pada', 'ini', 'itu', 'dalam', 'tidak', 'akan', 'atau', 'juga'],
    characterSets: [/[a-zA-Z]/],
    confidence: 0.75,
  },
];

/**
 * Advanced language detection using multiple methods
 */
export class LanguageDetectionEngine {
  /**
   * Detect language using multiple approaches
   */
  static detectLanguage(text: string): {
    language: SupportedLanguageCode;
    confidence: number;
    isReliable: boolean;
    method: string;
  } {
    if (!text?.trim()) {
      return {
        language: 'en',
        confidence: 0,
        isReliable: false,
        method: 'empty_text',
      };
    }

    const cleanText = text.toLowerCase().trim();

    // Method 1: Character set detection (most reliable for non-Latin scripts)
    const characterSetResult = this.detectByCharacterSet(cleanText);
    
    // Only use character_set result if it's genuinely distinctive
    // (i.e., the language has special characters present in the text)
    // For Latin-script languages with ASCII-only text, fall through to word analysis
    if (characterSetResult.confidence > 0.90) {
      const hasDistinctiveChars = this.hasDistinctiveCharacterSet(characterSetResult.language, cleanText);
      if (hasDistinctiveChars) {
        return {
          ...characterSetResult,
          method: 'character_set',
        };
      }
    }

    // Method 2: Common words analysis
    const wordAnalysisResult = this.detectByWordAnalysis(cleanText);
    if (wordAnalysisResult.confidence > 0.70) {
      return {
        ...wordAnalysisResult,
        method: 'word_analysis',
      };
    }

    // Method 3: N-gram analysis for short texts
    const ngramResult = this.detectByNgrams(cleanText);
    if (ngramResult.confidence > 0.60) {
      return {
        ...ngramResult,
        method: 'ngram_analysis',
      };
    }

    // Method 4: Pattern matching
    const patternResult = this.detectByPatterns(cleanText);
    if (patternResult.confidence > 0.50) {
      return {
        ...patternResult,
        method: 'pattern_matching',
      };
    }

    // Fallback to English with low confidence
    return {
      language: 'en',
      confidence: 0.30,
      isReliable: false,
      method: 'fallback',
    };
  }

  /**
   * Check if text contains distinctive characters for a language's character set
   * This helps avoid false positives for Latin-script languages when text is ASCII-only
   */
  private static hasDistinctiveCharacterSet(language: SupportedLanguageCode, text: string): boolean {
    // These languages have distinctive character sets that should be present in the text
    const distinctiveLanguages: Record<string, RegExp[]> = {
      'zh': [/[\u4e00-\u9fff]/],
      'ja': [/[\u3040-\u309f\u30a0-\u30ff]/],
      'ko': [/[\uac00-\ud7af]/],
      'ar': [/[\u0600-\u06ff]/],
      'hi': [/[\u0900-\u097f]/],
      'th': [/[\u0e00-\u0e7f]/],
      'ru': [/[\u0400-\u04ff]/],
      'es': [/[ñáéíóúü]/i],
      'fr': [/[àâäçéèêëïîôöùûüÿ]/i],
      'de': [/[äöüß]/i],
      'vi': [/[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i],
      'pl': [/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/],
      'tr': [/[çğıöşüÇĞIİÖŞÜ]/],
      'nl': [/[áàäéèëíìïóòöúùü]/i],
      'sv': [/[åäöÅÄÖ]/],
      'da': [/[æøåÆØÅ]/],
      'no': [/[æøåÆØÅ]/],
      'fi': [/[äöÄÖ]/],
    };

    const distinctivePatterns = distinctiveLanguages[language];
    if (!distinctivePatterns) {
      // For languages like 'en' and 'id' which use standard Latin alphabet,
      // we require other methods to differentiate
      return false;
    }

    for (const pattern of distinctivePatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect language by character set analysis
   * Finds the BEST match across all languages rather than returning the first match
   */
  private static detectByCharacterSet(text: string): {
    language: SupportedLanguageCode;
    confidence: number;
    isReliable: boolean;
  } {
    let bestMatch: { language: SupportedLanguageCode; confidence: number; isReliable: boolean; matchRatio: number; baseConfidence: number } = {
      language: 'en',
      confidence: 0.0,
      isReliable: false,
      matchRatio: 0,
      baseConfidence: 0,
    };

    for (const pattern of LANGUAGE_PATTERNS) {
      for (const charSet of pattern.characterSets) {
        // Use global flag to get all matches
        const regex = charSet.global ? charSet : new RegExp(charSet.source, charSet.flags + 'g');
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          const matchRatio = matches.length / text.length;
          if (matchRatio > 0.1) { // At least 10% of characters match
            const confidence = Math.min(0.95, pattern.confidence * matchRatio * 2);
            const isReliable = matchRatio > 0.3;
            
            // Only update if this is a better match
            // Prefer higher confidence, then higher matchRatio, then lower base confidence (simpler character set)
            if (confidence > bestMatch.confidence || 
                (confidence === bestMatch.confidence && matchRatio > bestMatch.matchRatio) ||
                (confidence === bestMatch.confidence && matchRatio === bestMatch.matchRatio && pattern.confidence < bestMatch.baseConfidence)) {
              bestMatch = {
                language: pattern.code,
                confidence,
                isReliable,
                matchRatio,
                baseConfidence: pattern.confidence,
              };
            }
          }
        }
      }
    }

    return { language: bestMatch.language, confidence: bestMatch.confidence, isReliable: bestMatch.isReliable };
  }

  /**
   * Detect language by common words analysis
   */
  private static detectByWordAnalysis(text: string): {
    language: SupportedLanguageCode;
    confidence: number;
    isReliable: boolean;
  } {
    const words = text.split(/\s+/).filter(word => word.length > 1);
    if (words.length === 0) {
      return { language: 'en', confidence: 0.0, isReliable: false };
    }

    const scores: Record<string, number> = {};

    for (const pattern of LANGUAGE_PATTERNS) {
      scores[pattern.code] = 0;
      for (const word of words) {
        if (pattern.commonWords.includes(word)) {
          scores[pattern.code] += 1;
        }
      }
      scores[pattern.code] = scores[pattern.code] / words.length;
    }

    const maxScore = Math.max(...Object.values(scores));
    const detectedLang = Object.keys(scores).find(
      lang => scores[lang] === maxScore
    ) as SupportedLanguageCode || 'en';

    return {
      language: detectedLang,
      confidence: Math.min(0.90, maxScore * 3), // Amplify score but cap at 0.90
      isReliable: maxScore > 0.15,
    };
  }

  /**
   * Detect language by n-gram analysis (trigrams)
   */
  private static detectByNgrams(text: string): {
    language: SupportedLanguageCode;
    confidence: number;
    isReliable: boolean;
  } {
    if (text.length < 6) {
      return { language: 'en', confidence: 0.0, isReliable: false };
    }

    // Common trigrams for different languages
    const trigrams: Record<SupportedLanguageCode, string[]> = {
      en: ['the', 'ing', 'and', 'ion', 'tio', 'ent', 'ati', 'for', 'her', 'ter'],
      es: ['que', 'ent', 'ion', 'aci', 'ade', 'con', 'ero', 'est', 'par', 'per'],
      fr: ['ent', 'que', 'ion', 'men', 'les', 'ait', 'ons', 'eur', 'ant', 'ati'],
      de: ['ent', 'ich', 'che', 'ein', 'gen', 'sch', 'den', 'ung', 'ber', 'end'],
      it: ['che', 'ent', 'ion', 'per', 'con', 'are', 'ere', 'ato', 'nte', 'men'],
      pt: ['que', 'ent', 'ado', 'men', 'con', 'ção', 'nte', 'est', 'par', 'com'],
      nl: ['het', 'een', 'van', 'den', 'ent', 'ing', 'ter', 'oor', 'aar', 'ijk'],
      sv: ['ing', 'att', 'och', 'som', 'för', 'med', 'det', 'var', 'han', 'den'],
      da: ['ing', 'det', 'som', 'for', 'med', 'var', 'den', 'til', 'han', 'hun'],
      no: ['ing', 'som', 'det', 'for', 'med', 'var', 'den', 'til', 'han', 'hun'],
      fi: ['nen', 'ssa', 'sta', 'lla', 'tta', 'ksi', 'aan', 'nsa', 'lle', 'mme'],
      pl: ['nie', 'ent', 'ści', 'owa', 'ych', 'ich', 'kie', 'nej', 'owe', 'ami'],
      ru: ['что', 'это', 'как', 'для', 'его', 'она', 'они', 'или', 'все', 'уже'],
      tr: ['lar', 'ler', 'dan', 'bir', 'ile', 'nin', 'nın', 'nda', 'nde', 'yor'],
      vi: ['ông', 'ước', 'ững', 'ính', 'ười', 'ành', 'ệnh', 'ợng', 'ương', 'ường'],
      id: ['ang', 'kan', 'eng', 'ing', 'ung', 'ama', 'ara', 'yan', 'nan', 'tan'],
      // Add more languages as needed
      zh: ['', '', ''], // Chinese uses characters, not suitable for trigram analysis
      ja: ['', '', ''], // Japanese uses characters, not suitable for trigram analysis
      ko: ['', '', ''], // Korean uses characters, not suitable for trigram analysis
      ar: ['', '', ''], // Arabic script, not suitable for trigram analysis
      hi: ['', '', ''], // Hindi script, not suitable for trigram analysis
      th: ['', '', ''], // Thai script, not suitable for trigram analysis
    };

    const textTrigrams = this.extractTrigrams(text);
    const scores: Record<string, number> = {};

    for (const [lang, langTrigrams] of Object.entries(trigrams)) {
      if (langTrigrams.length === 0) continue; // Skip non-latin scripts

      scores[lang] = 0;
      for (const trigram of textTrigrams) {
        if (langTrigrams.includes(trigram)) {
          scores[lang] += 1;
        }
      }
      scores[lang] = scores[lang] / Math.max(textTrigrams.length, 1);
    }

    const maxScore = Math.max(...Object.values(scores));
    const detectedLang = Object.keys(scores).find(
      lang => scores[lang] === maxScore
    ) as SupportedLanguageCode || 'en';

    return {
      language: detectedLang,
      confidence: Math.min(0.80, maxScore * 2),
      isReliable: maxScore > 0.10,
    };
  }

  /**
   * Extract trigrams from text
   */
  private static extractTrigrams(text: string): string[] {
    const trigrams: string[] = [];
    const cleanText = text.replace(/[^a-z]/g, '');

    for (let i = 0; i <= cleanText.length - 3; i++) {
      trigrams.push(cleanText.substring(i, i + 3));
    }

    return trigrams;
  }

  /**
   * Detect language by pattern matching
   */
  private static detectByPatterns(text: string): {
    language: SupportedLanguageCode;
    confidence: number;
    isReliable: boolean;
  } {
    for (const pattern of LANGUAGE_PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          return {
            language: pattern.code,
            confidence: pattern.confidence * 0.7, // Lower confidence for pattern matching
            isReliable: pattern.confidence > 0.8,
          };
        }
      }
    }

    return { language: 'en', confidence: 0.0, isReliable: false };
  }

  /**
   * Get language info by code
   */
  static getLanguageInfo(code: SupportedLanguageCode): {
    code: SupportedLanguageCode;
    name: string;
    hasSpecialCharacters: boolean;
    isNonLatin: boolean;
  } {
    const pattern = LANGUAGE_PATTERNS.find(p => p.code === code);
    const isNonLatin = ['zh', 'ja', 'ko', 'ar', 'hi', 'th'].includes(code);

    return {
      code,
      name: SUPPORTED_LANGUAGES[code],
      hasSpecialCharacters: pattern ? pattern.patterns.length > 1 : false,
      isNonLatin,
    };
  }

  /**
   * Check if text contains mixed languages
   */
  static detectMixedLanguages(text: string): {
    hasMixedLanguages: boolean;
    languages: Array<{
      language: SupportedLanguageCode;
      confidence: number;
      portion: number;
    }>;
  } {
    // Split text into sentences/segments
    const segments = text.split(/[.!?]\s+/).filter(seg => seg.trim().length > 10);

    if (segments.length <= 1) {
      return {
        hasMixedLanguages: false,
        languages: [],
      };
    }

    const detectedLanguages = new Map<SupportedLanguageCode, { count: number; totalConfidence: number }>();

    for (const segment of segments) {
      const result = this.detectLanguage(segment);
      if (result.confidence > 0.5) {
        const current = detectedLanguages.get(result.language) || { count: 0, totalConfidence: 0 };
        current.count++;
        current.totalConfidence += result.confidence;
        detectedLanguages.set(result.language, current);
      }
    }

    const languages = Array.from(detectedLanguages.entries()).map(([language, data]) => ({
      language,
      confidence: data.totalConfidence / data.count,
      portion: data.count / segments.length,
    }));

    return {
      hasMixedLanguages: languages.length > 1,
      languages: languages.sort((a, b) => b.portion - a.portion),
    };
  }
}