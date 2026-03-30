/**
 * Translation Hooks for TRL-001
 * Custom hooks for translation functionality
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  TranslationResult,
  LanguageDetection,
  TranslationPreferences,
  LanguageInfo
} from '../types/translation';
import { useTranslation as useTranslationContext } from '../contexts/TranslationContext';

/**
 * Hook for language detection with debouncing
 */
export function useLanguageDetection(text: string, debounceMs: number = 500) {
  const { detectLanguage } = useTranslationContext();
  const [detection, setDetection] = useState<LanguageDetection | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performDetection = useCallback(async (inputText: string) => {
    if (!inputText.trim()) {
      setDetection(null);
      return;
    }

    try {
      setIsDetecting(true);
      setError(null);
      const result = await detectLanguage(inputText);
      setDetection(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
      setDetection(null);
    } finally {
      setIsDetecting(false);
    }
  }, [detectLanguage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performDetection(text);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [text, debounceMs, performDetection]);

  return {
    detection,
    isDetecting,
    error,
    retry: () => performDetection(text),
  };
}

/**
 * Hook for auto-translation with confidence threshold
 */
export function useAutoTranslation(
  messageId: string,
  text: string,
  detectedLanguage?: string
) {
  const {
    translateMessageAuto,
    addMessageTranslation,
    getMessageTranslation,
    shouldAutoTranslate,
    state: { preferences }
  } = useTranslationContext();

  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingTranslation = getMessageTranslation(messageId);

  const performAutoTranslation = useCallback(async () => {
    if (!text.trim() || !detectedLanguage) return;

    // Check if we should auto-translate
    if (!shouldAutoTranslate(detectedLanguage)) return;

    // Don't translate if already translated
    if (existingTranslation) return;

    try {
      setIsTranslating(true);
      setError(null);

      const result = await translateMessageAuto(text, preferences.primaryLanguage);
      addMessageTranslation(messageId, result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-translation failed');
      console.warn('Auto-translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [
    text,
    detectedLanguage,
    messageId,
    shouldAutoTranslate,
    existingTranslation,
    translateMessageAuto,
    addMessageTranslation,
    preferences.primaryLanguage
  ]);

  useEffect(() => {
    performAutoTranslation();
  }, [performAutoTranslation]);

  return {
    translation: existingTranslation,
    isTranslating,
    error,
    retry: performAutoTranslation,
  };
}

/**
 * Hook for managing translation preferences with persistence
 */
export function useTranslationPreferences() {
  const { state: { preferences }, updatePreferences } = useTranslationContext();
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePreference = useCallback(async <K extends keyof TranslationPreferences>(
    key: K,
    value: TranslationPreferences[K]
  ) => {
    try {
      setIsUpdating(true);
      updatePreferences({ [key]: value });
    } catch (error) {
      console.error('Failed to update preference:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [updatePreferences]);

  const toggleAutoTranslate = useCallback(() => {
    updatePreference('autoTranslate', !preferences.autoTranslate);
  }, [updatePreference, preferences.autoTranslate]);

  const setPrimaryLanguage = useCallback((language: string) => {
    updatePreference('primaryLanguage', language);
  }, [updatePreference]);

  const setPrivacyMode = useCallback((mode: TranslationPreferences['privacyMode']) => {
    updatePreference('privacyMode', mode);
  }, [updatePreference]);

  const setConfidenceThreshold = useCallback((threshold: number) => {
    updatePreference('confidenceThreshold', Math.max(0, Math.min(1, threshold)));
  }, [updatePreference]);

  const enableLanguagePair = useCallback((sourceLanguage: string, targetLanguage: string) => {
    const langPair = `${sourceLanguage}-${targetLanguage}`;
    const newPairs = [...preferences.enabledLanguagePairs];

    if (!newPairs.includes(langPair)) {
      newPairs.push(langPair);
      updatePreference('enabledLanguagePairs', newPairs);
    }
  }, [updatePreference, preferences.enabledLanguagePairs]);

  const disableLanguagePair = useCallback((sourceLanguage: string, targetLanguage: string) => {
    const langPair = `${sourceLanguage}-${targetLanguage}`;
    const newPairs = preferences.enabledLanguagePairs.filter(pair => pair !== langPair);
    updatePreference('enabledLanguagePairs', newPairs);
  }, [updatePreference, preferences.enabledLanguagePairs]);

  return {
    preferences,
    isUpdating,
    updatePreference,
    toggleAutoTranslate,
    setPrimaryLanguage,
    setPrivacyMode,
    setConfidenceThreshold,
    enableLanguagePair,
    disableLanguagePair,
  };
}

/**
 * Hook for real-time translation as user types
 */
export function useRealTimeTranslation(
  sourceLanguage: string,
  targetLanguage: string,
  debounceMs: number = 1000
) {
  const { translateMessage } = useTranslationContext();
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performTranslation = useCallback(async (text: string) => {
    if (!text.trim() || sourceLanguage === targetLanguage) {
      setTranslation(null);
      return;
    }

    try {
      setIsTranslating(true);
      setError(null);

      const result = await translateMessage(text, sourceLanguage, targetLanguage);
      setTranslation(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      setTranslation(null);
    } finally {
      setIsTranslating(false);
    }
  }, [translateMessage, sourceLanguage, targetLanguage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performTranslation(inputText);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [inputText, debounceMs, performTranslation]);

  return {
    inputText,
    setInputText,
    translation,
    isTranslating,
    error,
    retry: () => performTranslation(inputText),
    clear: () => {
      setInputText('');
      setTranslation(null);
      setError(null);
    },
  };
}

/**
 * Hook for managing supported languages with search
 */
export function useSupportedLanguages() {
  const { state: { supportedLanguages }, isLanguageSupported, getLanguageInfo } = useTranslationContext();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = searchQuery
    ? supportedLanguages.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : supportedLanguages;

  const getLanguageByCode = useCallback((code: string): LanguageInfo | undefined => {
    return getLanguageInfo(code);
  }, [getLanguageInfo]);

  const findLanguage = useCallback((query: string): LanguageInfo | undefined => {
    const lowerQuery = query.toLowerCase();
    return supportedLanguages.find(lang =>
      lang.code.toLowerCase() === lowerQuery ||
      lang.name.toLowerCase() === lowerQuery ||
      lang.nativeName.toLowerCase() === lowerQuery
    );
  }, [supportedLanguages]);

  return {
    languages: supportedLanguages,
    filteredLanguages,
    searchQuery,
    setSearchQuery,
    isSupported: isLanguageSupported,
    getLanguageByCode,
    findLanguage,
  };
}

/**
 * Hook for translation statistics and analytics
 */
export function useTranslationStats() {
  const { state: { recentTranslations, translatedMessages } } = useTranslationContext();

  const stats = {
    totalTranslations: recentTranslations.length,
    totalMessages: translatedMessages.size,
    languagePairs: recentTranslations.reduce((pairs, translation) => {
      const pair = `${translation.sourceLanguage}-${translation.targetLanguage}`;
      pairs[pair] = (pairs[pair] || 0) + 1;
      return pairs;
    }, {} as Record<string, number>),
    averageConfidence: recentTranslations.length > 0
      ? recentTranslations.reduce((sum, t) => sum + t.confidence, 0) / recentTranslations.length
      : 0,
    cachedTranslations: recentTranslations.filter(t => t.cached).length,
  };

  return {
    stats,
    recentTranslations,
    translatedMessages,
  };
}

// Re-export the main translation hooks from context
export {
  useTranslation,
  useMessageTranslation,
} from '../contexts/TranslationContext';