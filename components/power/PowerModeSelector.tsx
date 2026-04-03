/**
 * Power Mode Selector Component
 * Allows users to select between different power optimization modes
 * Part of PN-006: Background processing and delivery optimization
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import type { PowerMode } from '../../lib/services/batteryOptimization';

interface PowerModeSelectorProps {
  currentMode: PowerMode;
  onModeChange: (mode: PowerMode) => Promise<void>;
}

interface ModeConfig {
  mode: PowerMode;
  title: string;
  description: string;
  icon: string;
  estimatedSavings: string;
  features: string[];
}

const POWER_MODES: ModeConfig[] = [
  {
    mode: 'maximum',
    title: 'Maximum Performance',
    description: 'All features enabled, fastest performance',
    icon: '⚡',
    estimatedSavings: 'No savings',
    features: ['All notifications', 'Background sync', 'Rich media', 'Location services'],
  },
  {
    mode: 'balanced',
    title: 'Balanced',
    description: 'Good balance between performance and battery life',
    icon: '⚖️',
    estimatedSavings: '15-25% longer',
    features: ['Smart notifications', 'Optimized sync', 'Essential features', 'Background limits'],
  },
  {
    mode: 'power_saver',
    title: 'Power Saver',
    description: 'Reduced features to extend battery life',
    icon: '🔋',
    estimatedSavings: '30-50% longer',
    features: ['Basic notifications', 'Reduced sync', 'No autoplay', 'Limited background'],
  },
  {
    mode: 'ultra_saver',
    title: 'Ultra Saver',
    description: 'Minimal features for maximum battery life',
    icon: '🟢',
    estimatedSavings: '60-80% longer',
    features: ['Critical only', 'Manual sync', 'Text only', 'Minimal processing'],
  },
];

export function PowerModeSelector({ currentMode, onModeChange }: PowerModeSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleModeSelect = async (mode: PowerMode) => {
    if (mode !== currentMode) {
      try {
        await onModeChange(mode);
      } catch (error) {
        console.error('Failed to change power mode:', error);
      }
    }
  };

  return (
    <Card title="Power Mode" subtitle="Choose how to optimize your device">
      <View className="space-y-3">
        {POWER_MODES.map((modeConfig) => {
          const isSelected = currentMode === modeConfig.mode;

          return (
            <TouchableOpacity
              key={modeConfig.mode}
              onPress={() => handleModeSelect(modeConfig.mode)}
              className={`p-4 rounded-lg border-2 ${
                isSelected
                  ? (isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
                  : (isDark ? 'border-dark-600 bg-dark-800' : 'border-gray-200 bg-gray-50')
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-start space-x-3">
                {/* Icon */}
                <View className="mt-1">
                  <Text className="text-2xl">{modeConfig.icon}</Text>
                </View>

                {/* Content */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className={`text-lg font-semibold ${
                      isSelected
                        ? 'text-blue-600'
                        : (isDark ? 'text-white' : 'text-gray-900')
                    }`}>
                      {modeConfig.title}
                    </Text>
                    {isSelected && (
                      <View className="bg-blue-500 rounded-full p-1">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                    )}
                  </View>

                  <Text className={`text-sm mb-2 ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                    {modeConfig.description}
                  </Text>

                  <View className="flex-row items-center mb-2">
                    <Text className={`text-sm font-medium ${
                      isSelected
                        ? 'text-blue-600'
                        : (isDark ? 'text-white' : 'text-gray-900')
                    }`}>
                      Battery: {modeConfig.estimatedSavings}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap">
                    {modeConfig.features.map((feature, index) => (
                      <View
                        key={index}
                        className={`px-2 py-1 rounded-full mr-1 mb-1 ${
                          isSelected
                            ? (isDark ? 'bg-blue-800' : 'bg-blue-100')
                            : (isDark ? 'bg-dark-700' : 'bg-gray-100')
                        }`}
                      >
                        <Text className={`text-xs ${
                          isSelected
                            ? 'text-blue-300'
                            : (isDark ? 'text-dark-300' : 'text-gray-600')
                        }`}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Additional Information */}
        <View className={`p-3 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
          <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
            💡 Tip: Power mode automatically adjusts based on battery level. You can override this setting at any time.
          </Text>
        </View>
      </View>
    </Card>
  );
}