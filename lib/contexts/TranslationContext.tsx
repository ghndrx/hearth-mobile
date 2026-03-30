/**
 * Translation Context for TRL-001
 * Provides translation state and functionality throughout the app
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type {
  TranslationResult,
  TranslationPreferences,
  TranslatedMessage,
  LanguageDetection,
  LanguageInfo
} from '../types/translation';
import { translationService } from '../services/translation';
import { languageDetectionService } from '../services/languageDetection';

// Translation state interface
interface TranslationState {
  preferences: TranslationPreferences;
  isLoading: boolean;
  error: string | null;
  recentTranslations: TranslationResult[];
  supportedLanguages: LanguageInfo[];
  translatedMessages: Map<string, TranslationResult>; // message ID -> translation
}

// Translation actions
type TranslationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PREFERENCES'; payload: Partial<TranslationPreferences> }
  | { type: 'ADD_TRANSLATION'; payload: { messageId: string; translation: TranslationResult } }
  | { type: 'REMOVE_TRANSLATION'; payload: string }
  | { type: 'ADD_RECENT_TRANSLATION'; payload: TranslationResult }
  | { type: 'CLEAR_RECENT_TRANSLATIONS' }
  | { type: 'SET_SUPPORTED_LANGUAGES'; payload: LanguageInfo[] }
  | { type: 'INITIALIZE'; payload: { preferences: TranslationPreferences; supportedLanguages: LanguageInfo[] } };

// Translation context interface
interface TranslationContextValue {
  state: TranslationState;

  // Translation actions
  translateMessage: (text: string, sourceLanguage: string, targetLanguage: string) => Promise<TranslationResult>;
  translateMessageAuto: (text: string, targetLanguage?: string) => Promise<TranslationResult>;
  detectLanguage: (text: string) => Promise<LanguageDetection>;

  // Message translation management
  addMessageTranslation: (messageId: string, translation: TranslationResult) => void;
  removeMessageTranslation: (messageId: string) => void;
  getMessageTranslation: (messageId: string) => TranslationResult | undefined;

  // Preferences management
  updatePreferences: (preferences: Partial<TranslationPreferences>) => void;

  // Utility functions
  clearCache: () => void;
  clearRecentTranslations: () => void;
  isLanguageSupported: (language: string) => boolean;
  getLanguageInfo: (languageCode: string) => LanguageInfo | undefined;

  // UI helpers
  shouldAutoTranslate: (detectedLanguage: string, targetLanguage?: string) => boolean;
}

// Initial state
const initialState: TranslationState = {
  preferences: translationService.getUserPreferences(),
  isLoading: false,
  error: null,
  recentTranslations: [],
  supportedLanguages: [],
  translatedMessages: new Map(),
};

// Reducer function
function translationReducer(state: TranslationState, action: TranslationAction): TranslationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_PREFERENCES':
      const newPreferences = { ...state.preferences, ...action.payload };
      return { ...state, preferences: newPreferences };

    case 'ADD_TRANSLATION':
      const newTranslatedMessages = new Map(state.translatedMessages);
      newTranslatedMessages.set(action.payload.messageId, action.payload.translation);
      return { ...state, translatedMessages: newTranslatedMessages };

    case 'REMOVE_TRANSLATION':
      const updatedTranslatedMessages = new Map(state.translatedMessages);
      updatedTranslatedMessages.delete(action.payload);
      return { ...state, translatedMessages: updatedTranslatedMessages };

    case 'ADD_RECENT_TRANSLATION':
      const newRecent = [action.payload, ...state.recentTranslations.slice(0, 9)]; // Keep last 10
      return { ...state, recentTranslations: newRecent };

    case 'CLEAR_RECENT_TRANSLATIONS':
      return { ...state, recentTranslations: [] };

    case 'SET_SUPPORTED_LANGUAGES':
      return { ...state, supportedLanguages: action.payload };

    case 'INITIALIZE':
      return {
        ...state,
        preferences: action.payload.preferences,
        supportedLanguages: action.payload.supportedLanguages,
      };

    default:
      return state;
  }
}

// Create context
const TranslationContext = createContext<TranslationContextValue | null>(null);

// Provider component
interface TranslationProviderProps {
  children: React.ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const [state, dispatch] = useReducer(translationReducer, initialState);

  // Initialize translation context
  useEffect(() => {
    const initialize = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const preferences = translationService.getUserPreferences();
        const supportedLanguages = languageDetectionService.getSupportedLanguages();

        dispatch({
          type: 'INITIALIZE',
          payload: { preferences, supportedLanguages }
        });
      } catch (error) {
        console.error('Failed to initialize translation context:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize translation service' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initialize();
  }, []);

  // Translation functions
  const translateMessage = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const result = await translationService.translateMessage(text, sourceLanguage, targetLanguage);

      // Add to recent translations
      dispatch({ type: 'ADD_RECENT_TRANSLATION', payload: result });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const translateMessageAuto = useCallback(async (
    text: string,
    targetLanguage?: string
  ): Promise<TranslationResult> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const target = targetLanguage || state.preferences.primaryLanguage;
      const result = await translationService.translateMessageAuto(text, target);

      // Add to recent translations
      dispatch({ type: 'ADD_RECENT_TRANSLATION', payload: result });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Auto-translation failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.preferences.primaryLanguage]);

  const detectLanguage = useCallback(async (text: string): Promise<LanguageDetection> => {
    return translationService.detectLanguage(text);
  }, []);

  // Message translation management
  const addMessageTranslation = useCallback((messageId: string, translation: TranslationResult) => {
    dispatch({ type: 'ADD_TRANSLATION', payload: { messageId, translation } });
  }, []);

  const removeMessageTranslation = useCallback((messageId: string) => {
    dispatch({ type: 'REMOVE_TRANSLATION', payload: messageId });
  }, []);

  const getMessageTranslation = useCallback((messageId: string): TranslationResult | undefined => {
    return state.translatedMessages.get(messageId);
  }, [state.translatedMessages]);

  // Preferences management
  const updatePreferences = useCallback((preferences: Partial<TranslationPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: preferences });
    translationService.setUserPreferences(preferences);
  }, []);

  // Utility functions
  const clearCache = useCallback(() => {
    translationService.clearCache();
    languageDetectionService.clearCache();
  }, []);

  const clearRecentTranslations = useCallback(() => {
    dispatch({ type: 'CLEAR_RECENT_TRANSLATIONS' });
  }, []);

  const isLanguageSupported = useCallback((language: string): boolean => {
    return translationService.isLanguageSupported(language);
  }, []);

  const getLanguageInfo = useCallback((languageCode: string): LanguageInfo | undefined => {
    return languageDetectionService.getLanguageInfo(languageCode);
  }, []);

  // UI helper functions
  const shouldAutoTranslate = useCallback((
    detectedLanguage: string,
    targetLanguage?: string
  ): boolean => {
    if (!state.preferences.autoTranslate) return false;

    const target = targetLanguage || state.preferences.primaryLanguage;

    // Don't auto-translate if the detected language is the same as target
    if (detectedLanguage === target) return false;

    // Check if language pair is enabled
    const langPair = `${detectedLanguage}-${target}`;
    return state.preferences.enabledLanguagePairs.includes(langPair) ||
           state.preferences.enabledLanguagePairs.includes('*');
  }, [state.preferences]);

  const contextValue: TranslationContextValue = {
    state,
    translateMessage,
    translateMessageAuto,
    detectLanguage,
    addMessageTranslation,
    removeMessageTranslation,
    getMessageTranslation,
    updatePreferences,
    clearCache,
    clearRecentTranslations,
    isLanguageSupported,
    getLanguageInfo,
    shouldAutoTranslate,
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

// Hook to use translation context
export function useTranslation() {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }

  return context;
}

// Hook for translating individual messages
export function useMessageTranslation(messageId: string) {
  const {
    getMessageTranslation,
    addMessageTranslation,
    removeMessageTranslation,
    translateMessage,
    translateMessageAuto,
    state: { preferences }
  } = useTranslation();

  const translation = getMessageTranslation(messageId);

  const translate = useCallback(async (
    text: string,
    sourceLanguage?: string,
    targetLanguage?: string
  ) => {
    try {
      let result: TranslationResult;

      if (sourceLanguage && targetLanguage) {
        result = await translateMessage(text, sourceLanguage, targetLanguage);
      } else {
        const target = targetLanguage || preferences.primaryLanguage;
        result = await translateMessageAuto(text, target);
      }

      addMessageTranslation(messageId, result);
      return result;
    } catch (error) {
      console.error('Message translation failed:', error);
      throw error;
    }
  }, [messageId, translateMessage, translateMessageAuto, addMessageTranslation, preferences.primaryLanguage]);

  const clearTranslation = useCallback(() => {
    removeMessageTranslation(messageId);
  }, [messageId, removeMessageTranslation]);

  return {
    translation,
    translate,
    clearTranslation,
    isTranslated: !!translation,
  };
}

export default TranslationContext;