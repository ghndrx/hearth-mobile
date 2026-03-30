/**
 * Translated Message Component for TRL-001
 * Displays messages with translation overlay
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useMessageTranslation, useSupportedLanguages } from '../../lib/hooks/useTranslation';
import type { Message, TranslationResult } from '../../lib/types';

interface TranslatedMessageProps {
  message: Message;
  showTranslation?: boolean;
  showLanguageIndicator?: boolean;
  style?: any;
  onToggleTranslation?: (visible: boolean) => void;
}

export default function TranslatedMessage({
  message,
  showTranslation = false,
  showLanguageIndicator = true,
  style,
  onToggleTranslation,
}: TranslatedMessageProps) {
  const { translation } = useMessageTranslation(message.id);
  const { getLanguageByCode } = useSupportedLanguages();
  const [isShowingTranslation, setIsShowingTranslation] = useState(showTranslation);
  const [fadeAnim] = useState(new Animated.Value(1));

  const sourceLanguage = translation ? getLanguageByCode(translation.sourceLanguage) : null;
  const targetLanguage = translation ? getLanguageByCode(translation.targetLanguage) : null;

  const toggleTranslation = () => {
    const newValue = !isShowingTranslation;
    setIsShowingTranslation(newValue);
    onToggleTranslation?.(newValue);

    // Animate the transition
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return '#4CAF50'; // High confidence - green
    if (confidence >= 0.7) return '#FF9800'; // Medium confidence - orange
    return '#F44336'; // Low confidence - red
  };

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  if (!translation) {
    // No translation available, show original message
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
        <Text style={styles.messageText}>
          {isShowingTranslation ? translation.translatedText : message.content}
        </Text>

        {showLanguageIndicator && (
          <View style={styles.languageIndicator}>
            {isShowingTranslation ? (
              <View style={styles.languageInfo}>
                <Text style={styles.languageText}>
                  {sourceLanguage?.flag} {sourceLanguage?.name} → {targetLanguage?.flag} {targetLanguage?.name}
                </Text>
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: getConfidenceColor(translation.confidence) }
                ]}>
                  <Text style={styles.confidenceText}>
                    {formatConfidence(translation.confidence)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.originalLanguageText}>
                {sourceLanguage?.flag} {sourceLanguage?.name}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleTranslation}
          accessibilityLabel={isShowingTranslation ? 'Show original message' : 'Show translation'}
          accessibilityRole="button"
        >
          <Text style={styles.toggleButtonText}>
            {isShowingTranslation ? '👁️ Original' : '🌐 Translate'}
          </Text>
        </TouchableOpacity>

        {translation.cached && (
          <Text style={styles.cachedIndicator}>⚡ Cached</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },

  messageContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },

  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#333',
    marginBottom: 8,
  },

  languageIndicator: {
    marginBottom: 8,
  },

  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  languageText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  originalLanguageText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },

  confidenceText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },

  toggleButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#007AFF',
  },

  toggleButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },

  cachedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 10,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
});