/**
 * Feature Toggle List Component
 * Allows users to control individual power saving features
 * Part of PN-006: Background processing and delivery optimization
 */

import React from 'react';
import { View, Text, Switch } from 'react-native';
import { useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import type { PowerSavingFeatures, PowerMode } from '../../lib/services/batteryOptimization';

interface FeatureToggleListProps {
  features: PowerSavingFeatures;
  onFeatureChange: <K extends keyof PowerSavingFeatures>(
    feature: K,
    enabled: PowerSavingFeatures[K]
  ) => Promise<void>;
  powerMode: PowerMode;
}

interface FeatureConfig {
  key: keyof PowerSavingFeatures;
  title: string;
  description: string;
  icon: string;
  impactLevel: 'low' | 'medium' | 'high';
  category: 'communication' | 'sync' | 'media' | 'performance';
}

const FEATURE_CONFIGS: FeatureConfig[] = [
  // Communication Features
  {
    key: 'enablePushNotifications',
    title: 'Push Notifications',
    description: 'Receive notifications from servers and DMs',
    icon: '📱',
    impactLevel: 'medium',
    category: 'communication',
  },
  {
    key: 'enableRichNotifications',
    title: 'Rich Notifications',
    description: 'Show images and detailed content in notifications',
    icon: '🖼️',
    impactLevel: 'medium',
    category: 'communication',
  },
  {
    key: 'enableVoiceProcessing',
    title: 'Voice Processing',
    description: 'Process voice messages and calls in background',
    icon: '🎤',
    impactLevel: 'high',
    category: 'communication',
  },

  // Sync Features
  {
    key: 'enableBackgroundSync',
    title: 'Background Sync',
    description: 'Keep messages synchronized when app is backgrounded',
    icon: '🔄',
    impactLevel: 'medium',
    category: 'sync',
  },
  {
    key: 'reduceSyncFrequency',
    title: 'Reduced Sync Frequency',
    description: 'Sync messages less frequently to save battery',
    icon: '⏱️',
    impactLevel: 'low',
    category: 'sync',
  },
  {
    key: 'aggressiveBatching',
    title: 'Aggressive Batching',
    description: 'Group network requests together for efficiency',
    icon: '📦',
    impactLevel: 'low',
    category: 'sync',
  },

  // Media Features
  {
    key: 'enableVideoAutoplay',
    title: 'Video Autoplay',
    description: 'Automatically play videos in chat',
    icon: '▶️',
    impactLevel: 'high',
    category: 'media',
  },

  // Performance Features
  {
    key: 'enableLocationServices',
    title: 'Location Services',
    description: 'Use location for server discovery and features',
    icon: '📍',
    impactLevel: 'medium',
    category: 'performance',
  },
  {
    key: 'reduceAnimations',
    title: 'Reduced Animations',
    description: 'Use simpler animations to improve performance',
    icon: '✨',
    impactLevel: 'low',
    category: 'performance',
  },
  {
    key: 'limitBackgroundTasks',
    title: 'Limit Background Tasks',
    description: 'Restrict background processing to save resources',
    icon: '⏹️',
    impactLevel: 'medium',
    category: 'performance',
  },
];

const CATEGORIES = {
  communication: { title: 'Communication', icon: '💬' },
  sync: { title: 'Synchronization', icon: '🔄' },
  media: { title: 'Media & Content', icon: '🎬' },
  performance: { title: 'Performance', icon: '⚡' },
};

export function FeatureToggleList({ features, onFeatureChange, powerMode }: FeatureToggleListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Group features by category
  const featuresByCategory = FEATURE_CONFIGS.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, FeatureConfig[]>);

  // Get impact color
  const getImpactColor = (level: FeatureConfig['impactLevel']) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return isDark ? 'text-dark-400' : 'text-gray-600';
    }
  };

  // Get impact text
  const getImpactText = (level: FeatureConfig['impactLevel']) => {
    switch (level) {
      case 'low': return 'Low battery impact';
      case 'medium': return 'Medium battery impact';
      case 'high': return 'High battery impact';
      default: return 'Unknown impact';
    }
  };

  // Check if feature is recommended for current power mode
  const isRecommendedForMode = (featureKey: keyof PowerSavingFeatures, mode: PowerMode): boolean => {
    const recommendedSettings = {
      maximum: { enableAll: true },
      balanced: {
        enablePushNotifications: true,
        enableRichNotifications: true,
        enableBackgroundSync: true,
        enableVoiceProcessing: true,
        enableVideoAutoplay: false,
        enableLocationServices: false,
        reduceAnimations: false,
        limitBackgroundTasks: true,
        aggressiveBatching: true,
        reduceSyncFrequency: false,
      },
      power_saver: {
        enablePushNotifications: true,
        enableRichNotifications: false,
        enableBackgroundSync: true,
        enableVoiceProcessing: false,
        enableVideoAutoplay: false,
        enableLocationServices: false,
        reduceAnimations: true,
        limitBackgroundTasks: true,
        aggressiveBatching: true,
        reduceSyncFrequency: true,
      },
      ultra_saver: {
        enablePushNotifications: true,
        enableRichNotifications: false,
        enableBackgroundSync: false,
        enableVoiceProcessing: false,
        enableVideoAutoplay: false,
        enableLocationServices: false,
        reduceAnimations: true,
        limitBackgroundTasks: true,
        aggressiveBatching: true,
        reduceSyncFrequency: true,
      },
    };

    if (mode === 'maximum') return true;

    const modeSettings = recommendedSettings[mode];
    return modeSettings[featureKey] ?? false;
  };

  return (
    <Card title="Feature Controls" subtitle="Customize power saving features">
      <View className="space-y-6">
        {Object.entries(featuresByCategory).map(([categoryKey, categoryFeatures]) => {
          const category = CATEGORIES[categoryKey as keyof typeof CATEGORIES];

          return (
            <View key={categoryKey} className="space-y-2">
              {/* Category Header */}
              <View className="flex-row items-center space-x-2 mb-2">
                <Text className="text-xl">{category.icon}</Text>
                <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {category.title}
                </Text>
              </View>

              {/* Category Features */}
              <View className={`rounded-lg ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
                {categoryFeatures.map((config, index) => {
                  const isEnabled = features[config.key];
                  const isRecommended = isRecommendedForMode(config.key, powerMode);

                  return (
                    <View key={config.key}>
                      <View className={`flex-row items-center justify-between px-4 py-3`}>
                        <View className="flex-1 pr-4">
                          <View className="flex-row items-center space-x-2 mb-1">
                            <Text>{config.icon}</Text>
                            <Text className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {config.title}
                            </Text>
                            {isRecommended && (
                              <View className="bg-blue-500 rounded-full px-2 py-0.5">
                                <Text className="text-white text-xs font-medium">Recommended</Text>
                              </View>
                            )}
                          </View>
                          <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                            {config.description}
                          </Text>
                          <Text className={`text-xs mt-0.5 ${getImpactColor(config.impactLevel)}`}>
                            {getImpactText(config.impactLevel)}
                          </Text>
                        </View>
                        <Switch
                          value={isEnabled}
                          onValueChange={(value) => onFeatureChange(config.key, value)}
                          trackColor={{
                            false: isDark ? "#4e5058" : "#d1d5db",
                            true: "#5865f2",
                          }}
                          thumbColor="#ffffff"
                          ios_backgroundColor={isDark ? "#4e5058" : "#d1d5db"}
                        />
                      </View>

                      {index < categoryFeatures.length - 1 && (
                        <View className={`h-px mx-4 ${isDark ? 'bg-dark-600' : 'bg-gray-200'}`} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Power Mode Information */}
        <View className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <Text className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
            Current Mode: {powerMode.replace('_', ' ').toUpperCase()}
          </Text>
          <Text className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            Features marked as "Recommended" are optimized for your current power mode.
            You can override these settings, but it may affect battery performance.
          </Text>
        </View>
      </View>
    </Card>
  );
}