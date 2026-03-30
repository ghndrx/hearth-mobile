// Translation and Language Detection Types for TRL-001

export interface LanguageDetection {
  language: string;
  confidence: number; // 0-1 scale
  alternatives?: Array<{
    language: string;
    confidence: number;
  }>;
  timestamp?: number;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number; // 0-1 scale
  alternativeTranslations?: string[];
  timestamp: number;
  originalText: string;
  cached?: boolean;
}

export interface TranslationPreferences {
  primaryLanguage: string;
  autoTranslate: boolean;
  autoDetectLanguage: boolean;
  preferredTranslationService: 'google' | 'azure' | 'local';
  offlineMode: boolean;
  confidenceThreshold: number; // Minimum confidence to auto-translate
  enabledLanguagePairs: string[]; // e.g., ['en-es', 'en-fr']
  privacyMode: 'cloud' | 'hybrid' | 'device-only';
  gamingTermsEnabled: boolean;
}

export interface TranslatedMessage extends Message {
  translation?: {
    result: TranslationResult;
    isVisible: boolean;
    userRequested: boolean;
  };
  detectedLanguage?: LanguageDetection;
}

export interface TranslationService {
  translateMessage(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult>;

  translateMessageAuto(
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult>;

  detectLanguage(text: string): Promise<LanguageDetection>;

  getAvailableLanguages(): Promise<string[]>;

  getSupportedLanguagePairs(): Promise<string[]>;

  setUserPreferences(preferences: Partial<TranslationPreferences>): void;

  getUserPreferences(): TranslationPreferences;

  clearCache(): void;

  isLanguageSupported(language: string): boolean;
}

export interface LanguageInfo {
  code: string; // ISO 639-1 code (e.g., 'en', 'es')
  name: string; // Human-readable name (e.g., 'English', 'Spanish')
  nativeName: string; // Native name (e.g., 'English', 'Español')
  flag?: string; // Flag emoji or URL
}

export interface TranslationCache {
  key: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  confidence: number;
  expiresAt: number;
}

export interface TranslationError {
  code: 'NETWORK_ERROR' | 'API_ERROR' | 'LANGUAGE_NOT_SUPPORTED' | 'RATE_LIMIT' | 'UNKNOWN';
  message: string;
  originalText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  retryable: boolean;
}

// Import Message type from main types
import type { Message } from './index';