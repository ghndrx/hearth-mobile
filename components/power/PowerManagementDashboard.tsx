/**
 * Power Management Dashboard
 * Main dashboard component for battery optimization and performance controls
 * Part of PN-006: Background processing and delivery optimization
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'react-native';
import { useBatteryOptimization } from '../../lib/services/batteryOptimization';
import { usePerformanceMonitor } from '../../lib/services/performanceMonitor';
import { BatteryUsageChart } from './BatteryUsageChart';
import { PerformanceMetrics } from './PerformanceMetrics';
import { PowerModeSelector } from './PowerModeSelector';
import { FeatureToggleList } from './FeatureToggleList';
import { RecommendationCard } from './RecommendationCard';
import { Card } from '../ui/Card';

export function PowerManagementDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    getCurrentBatteryData,
    getBatteryHistory,
    getRecommendations,
    getBatteryHealth,
    setPowerMode,
    getPowerMode,
    getFeatures,
    updateFeature,
  } = useBatteryOptimization();

  const {
    getCapabilities,
    getCurrentPerformance,
    getRecommendations: getPerformanceRecommendations,
  } = usePerformanceMonitor();

  const currentBatteryData = getCurrentBatteryData();
  const batteryHistory = getBatteryHistory(24); // Last 24 hours
  const recommendations = getRecommendations();
  const batteryHealth = getBatteryHealth();
  const currentPowerMode = getPowerMode();
  const features = getFeatures();
  const deviceCapabilities = getCapabilities();
  const performanceData = getCurrentPerformance();
  const performanceRecommendations = getPerformanceRecommendations();

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-dark-900' : 'bg-gray-50'}`}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-2">
          <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Power Management
          </Text>
          <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
            Optimize your device's battery life and performance
          </Text>
        </View>

        {/* Current Status Overview */}
        <Card title="Current Status" padding="md">
          <View className="space-y-3">
            {currentBatteryData && (
              <View className="flex-row justify-between items-center">
                <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Battery Level
                </Text>
                <View className="flex-row items-center space-x-2">
                  <View
                    className={`w-16 h-2 rounded-full ${isDark ? 'bg-dark-700' : 'bg-gray-200'}`}
                  >
                    <View
                      className={`h-2 rounded-full ${
                        currentBatteryData.batteryLevel > 50 ? 'bg-green-500' :
                        currentBatteryData.batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${currentBatteryData.batteryLevel}%` }}
                    />
                  </View>
                  <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {currentBatteryData.batteryLevel}%
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                Power Mode
              </Text>
              <Text className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {currentPowerMode.replace('_', ' ')}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                Battery Health
              </Text>
              <Text className={`text-sm font-medium capitalize ${
                batteryHealth === 'excellent' ? 'text-green-600' :
                batteryHealth === 'good' ? 'text-blue-600' :
                batteryHealth === 'fair' ? 'text-yellow-600' :
                batteryHealth === 'poor' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {batteryHealth}
              </Text>
            </View>

            {currentBatteryData?.estimatedTimeRemaining && currentBatteryData.estimatedTimeRemaining < 999 && (
              <View className="flex-row justify-between items-center">
                <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Time Remaining
                </Text>
                <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {Math.floor(currentBatteryData.estimatedTimeRemaining / 60)}h {currentBatteryData.estimatedTimeRemaining % 60}m
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Power Mode Selector */}
        <PowerModeSelector
          currentMode={currentPowerMode}
          onModeChange={setPowerMode}
        />

        {/* Battery Usage Chart */}
        {batteryHistory.length > 0 && (
          <BatteryUsageChart
            data={batteryHistory}
            powerMode={currentPowerMode}
          />
        )}

        {/* Performance Metrics */}
        {(deviceCapabilities || performanceData) && (
          <PerformanceMetrics
            capabilities={deviceCapabilities}
            currentPerformance={performanceData}
          />
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View className="space-y-2">
            <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Recommendations
            </Text>
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
              />
            ))}
          </View>
        )}

        {/* Performance Recommendations */}
        {performanceRecommendations.immediate.length > 0 && (
          <Card title="Performance Alerts" padding="md">
            <View className="space-y-2">
              {performanceRecommendations.immediate.map((rec, index) => (
                <View
                  key={index}
                  className={`p-3 rounded-lg ${
                    performanceRecommendations.priority === 'high'
                      ? (isDark ? 'bg-red-900/20' : 'bg-red-50')
                      : (isDark ? 'bg-yellow-900/20' : 'bg-yellow-50')
                  }`}
                >
                  <Text className={`text-sm ${
                    performanceRecommendations.priority === 'high'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}>
                    {rec}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Feature Toggles */}
        <FeatureToggleList
          features={features}
          onFeatureChange={updateFeature}
          powerMode={currentPowerMode}
        />

        {/* Bottom padding for safe scrolling */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}