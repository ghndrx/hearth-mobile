/**
 * Translation Button Component for TRL-001
 * Provides a button to translate messages
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useMessageTranslation, useTranslationPreferences } from '../../lib/hooks/useTranslation';
import type { Message } from '../../lib/types';

interface TranslateButtonProps {
  message: Message;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'icon' | 'pill';
  onTranslationStart?: () => void;
  onTranslationComplete?: () => void;
  onTranslationError?: (error: string) => void;
}

export default function TranslateButton({
  message,
  style,
  size = 'medium',
  variant = 'text',
  onTranslationStart,
  onTranslationComplete,
  onTranslationError,
}: TranslateButtonProps) {
  const { translation, translate, clearTranslation, isTranslated } = useMessageTranslation(message.id);
  const { preferences } = useTranslationPreferences();
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (isTranslated) {
      // If already translated, show original
      clearTranslation();
      return;
    }

    try {
      setIsTranslating(true);
      onTranslationStart?.();

      await translate(message.content, undefined, preferences.primaryLanguage);

      onTranslationComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      onTranslationError?.(errorMessage);
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const getButtonText = () => {
    if (isTranslating) return 'Translating...';
    if (isTranslated) return 'Show Original';
    return 'Translate';
  };

  const getButtonIcon = () => {
    if (isTranslating) return '⏳';
    if (isTranslated) return '👁️';
    return '🌐';
  };

  const buttonStyles = [
    styles.button,
    styles[size],
    styles[variant],
    isTranslated && styles.translated,
    style,
  ];

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        style={buttonStyles}
        onPress={handleTranslate}
        disabled={isTranslating}
        accessibilityLabel={getButtonText()}
        accessibilityRole="button"
      >
        {isTranslating ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={styles.iconText}>{getButtonIcon()}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handleTranslate}
      disabled={isTranslating}
      accessibilityLabel={getButtonText()}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        {variant === 'pill' && (
          <Text style={styles.iconText}>{getButtonIcon()}</Text>
        )}

        {isTranslating ? (
          <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
        ) : null}

        <Text style={[styles.buttonText, styles[`${size}Text`]]}>
          {getButtonText()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Size variants
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Variant styles
  text: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  icon: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pill: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    borderRadius: 20,
  },

  // State styles
  translated: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Text styles
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },

  // Icon styles
  iconText: {
    fontSize: 16,
  },

  spinner: {
    marginRight: 4,
  },
});