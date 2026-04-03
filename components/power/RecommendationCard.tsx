/**
 * Recommendation Card Component
 * Displays battery optimization recommendations with actions
 * Part of PN-006: Background processing and delivery optimization
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import type { PowerRecommendation } from '../../lib/services/batteryOptimization';

interface RecommendationCardProps {
  recommendation: PowerRecommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Get priority colors
  const getPriorityColors = (priority: PowerRecommendation['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-600',
          icon: '🚨',
        };
      case 'high':
        return {
          bg: isDark ? 'bg-orange-900/20' : 'bg-orange-50',
          border: 'border-orange-500',
          text: 'text-orange-600',
          icon: '⚠️',
        };
      case 'medium':
        return {
          bg: isDark ? 'bg-yellow-900/20' : 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-600',
          icon: '💡',
        };
      case 'low':
      default:
        return {
          bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
          border: 'border-blue-500',
          text: 'text-blue-600',
          icon: 'ℹ️',
        };
    }
  };

  // Get type colors
  const getTypeInfo = (type: PowerRecommendation['type']) => {
    switch (type) {
      case 'immediate':
        return { label: 'Act Now', style: 'font-bold' };
      case 'scheduled':
        return { label: 'Scheduled', style: 'font-medium' };
      case 'configuration':
        return { label: 'Configuration', style: 'font-normal' };
      default:
        return { label: 'Suggestion', style: 'font-normal' };
    }
  };

  const colors = getPriorityColors(recommendation.priority);
  const typeInfo = getTypeInfo(recommendation.type);

  const handleAction = async () => {
    if (recommendation.execute && recommendation.canToggle) {
      try {
        await recommendation.execute();
      } catch (error) {
        console.error('Failed to execute recommendation:', error);
      }
    }
  };

  return (
    <View
      className={`p-4 rounded-lg border-l-4 ${colors.bg} ${colors.border}`}
    >
      <View className="space-y-3">
        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center space-x-2 flex-1">
            <Text className="text-lg">{colors.icon}</Text>
            <View className="flex-1">
              <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {recommendation.title}
              </Text>
              <View className="flex-row items-center space-x-2 mt-1">
                <Text className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text} ${typeInfo.style}`}>
                  {typeInfo.label}
                </Text>
                <Text className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text} capitalize`}>
                  {recommendation.priority} Priority
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
          {recommendation.description}
        </Text>

        {/* Estimated Savings */}
        {recommendation.estimatedSavings && (
          <View className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white/50'}`}>
            <Text className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              💰 Estimated benefit: {recommendation.estimatedSavings}
            </Text>
          </View>
        )}

        {/* Action Section */}
        {recommendation.canToggle && recommendation.execute && (
          <View className="flex-row justify-between items-center pt-2">
            <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
              Status: {recommendation.isEnabled ? 'Enabled' : 'Disabled'}
            </Text>

            <TouchableOpacity
              onPress={handleAction}
              className={`px-4 py-2 rounded-lg ${
                recommendation.isEnabled
                  ? (isDark ? 'bg-gray-700' : 'bg-gray-200')
                  : `${colors.bg.replace('20', '40')} border ${colors.border}`
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-medium ${
                recommendation.isEnabled
                  ? (isDark ? 'text-white' : 'text-gray-700')
                  : colors.text
              }`}>
                {recommendation.action}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Non-actionable recommendations */}
        {!recommendation.canToggle && (
          <View className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white/50'}`}>
            <Text className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-700'}`}>
              💭 {recommendation.action}
            </Text>
          </View>
        )}

        {/* Additional context for critical/high priority */}
        {(recommendation.priority === 'critical' || recommendation.priority === 'high') && (
          <View className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
            <Text className={`text-sm ${colors.text} font-medium`}>
              {recommendation.priority === 'critical' ? '🚨 Critical Action Required' : '⚠️ High Priority Action'}
            </Text>
            <Text className={`text-xs mt-1 ${colors.text}`}>
              {recommendation.priority === 'critical'
                ? 'This action is needed immediately to prevent potential issues with your device.'
                : 'This action is recommended to maintain optimal battery performance.'
              }
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}