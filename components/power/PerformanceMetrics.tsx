/**
 * Performance Metrics Component
 * Displays real-time device performance and optimization status
 * Part of PN-006: Background processing and delivery optimization
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import type { DeviceCapabilities, PerformanceData } from '../../lib/services/performanceMonitor';

interface PerformanceMetricsProps {
  capabilities: DeviceCapabilities | null;
  currentPerformance: PerformanceData | null;
}

export function PerformanceMetrics({ capabilities, currentPerformance }: PerformanceMetricsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!capabilities && !currentPerformance) {
    return (
      <Card title="Performance" subtitle="Loading performance data...">
        <View className={`h-16 items-center justify-center ${isDark ? 'bg-dark-800' : 'bg-gray-50'} rounded-lg`}>
          <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
            Analyzing device performance...
          </Text>
        </View>
      </Card>
    );
  }

  // Get performance tier color
  const getPerformanceTierColor = (tier: string) => {
    switch (tier) {
      case 'flagship': return 'text-green-600';
      case 'high': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return isDark ? 'text-dark-400' : 'text-gray-600';
    }
  };

  // Get thermal state color
  const getThermalStateColor = (state: string) => {
    switch (state) {
      case 'nominal': return 'text-green-600';
      case 'fair': return 'text-yellow-600';
      case 'serious': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return isDark ? 'text-dark-400' : 'text-gray-600';
    }
  };

  // Get memory pressure color
  const getMemoryPressureColor = (pressure: string) => {
    switch (pressure) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return isDark ? 'text-dark-400' : 'text-gray-600';
    }
  };

  // Progress bar component
  const ProgressBar = ({ value, max = 100, color = 'blue' }: { value: number; max?: number; color?: string }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
    };

    return (
      <View className={`w-full h-2 rounded-full ${isDark ? 'bg-dark-700' : 'bg-gray-200'}`}>
        <View
          className={`h-2 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    );
  };

  return (
    <Card title="Device Performance" padding="md">
      <View className="space-y-4">
        {/* Device Capabilities */}
        {capabilities && (
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                Performance Tier
              </Text>
              <Text className={`text-sm font-medium capitalize ${getPerformanceTierColor(capabilities.performanceTier)}`}>
                {capabilities.performanceTier}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                Memory (Available/Total)
              </Text>
              <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {(capabilities.availableMemoryMB / 1024).toFixed(1)}GB / {(capabilities.totalMemoryMB / 1024).toFixed(1)}GB
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                CPU Cores
              </Text>
              <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {capabilities.cpuCores}
              </Text>
            </View>
          </View>
        )}

        {/* Current Performance Metrics */}
        {currentPerformance && (
          <View className="space-y-3">
            <View className={`h-px ${isDark ? 'bg-dark-700' : 'bg-gray-200'}`} />

            <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Real-time Metrics
            </Text>

            {/* CPU Usage */}
            <View className="space-y-1">
              <View className="flex-row justify-between items-center">
                <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  CPU Usage
                </Text>
                <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {currentPerformance.cpuUsage.toFixed(1)}%
                </Text>
              </View>
              <ProgressBar
                value={currentPerformance.cpuUsage}
                color={
                  currentPerformance.cpuUsage > 80 ? 'red' :
                  currentPerformance.cpuUsage > 60 ? 'orange' :
                  currentPerformance.cpuUsage > 40 ? 'yellow' : 'green'
                }
              />
            </View>

            {/* Memory Usage */}
            <View className="space-y-1">
              <View className="flex-row justify-between items-center">
                <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Memory Usage
                </Text>
                <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {currentPerformance.memoryUsage.toFixed(1)}%
                </Text>
              </View>
              <ProgressBar
                value={currentPerformance.memoryUsage}
                color={
                  currentPerformance.memoryUsage > 80 ? 'red' :
                  currentPerformance.memoryUsage > 60 ? 'orange' :
                  currentPerformance.memoryUsage > 40 ? 'yellow' : 'green'
                }
              />
            </View>

            {/* Additional Metrics */}
            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                Memory Pressure
              </Text>
              <Text className={`text-sm font-medium capitalize ${getMemoryPressureColor(currentPerformance.memoryPressure)}`}>
                {currentPerformance.memoryPressure}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                Thermal State
              </Text>
              <Text className={`text-sm font-medium capitalize ${getThermalStateColor(currentPerformance.thermalState)}`}>
                {currentPerformance.thermalState}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                Battery Impact
              </Text>
              <Text className={`text-sm font-medium capitalize ${
                currentPerformance.batteryImpact === 'minimal' ? 'text-green-600' :
                currentPerformance.batteryImpact === 'low' ? 'text-blue-600' :
                currentPerformance.batteryImpact === 'moderate' ? 'text-yellow-600' :
                currentPerformance.batteryImpact === 'high' ? 'text-red-600' :
                (isDark ? 'text-dark-400' : 'text-gray-600')
              }`}>
                {currentPerformance.batteryImpact}
              </Text>
            </View>

            {currentPerformance.networkLatency > 0 && (
              <View className="flex-row justify-between items-center">
                <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Network Latency
                </Text>
                <Text className={`text-sm font-medium ${
                  currentPerformance.networkLatency < 100 ? 'text-green-600' :
                  currentPerformance.networkLatency < 300 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {currentPerformance.networkLatency}ms
                </Text>
              </View>
            )}

            {/* Throttling Status */}
            {currentPerformance.isThrottling && (
              <View className={`p-2 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <Text className="text-sm text-red-600 font-medium">
                  ⚠️ Performance Throttling Active
                </Text>
                <Text className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                  Device is reducing performance to prevent overheating
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Optimization Features */}
        {capabilities && (
          <View className="space-y-2">
            <View className={`h-px ${isDark ? 'bg-dark-700' : 'bg-gray-200'}`} />

            <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Optimizations Enabled
            </Text>

            <View className="grid grid-cols-2 gap-2">
              <View className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Aggressive Batching
                </Text>
                <Text className={`text-sm font-medium ${
                  capabilities.optimizations.enableAggressiveBatching ? 'text-green-600' : 'text-red-600'
                }`}>
                  {capabilities.optimizations.enableAggressiveBatching ? 'Enabled' : 'Disabled'}
                </Text>
              </View>

              <View className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Thermal Throttling
                </Text>
                <Text className={`text-sm font-medium ${
                  capabilities.optimizations.enableThermalThrottling ? 'text-green-600' : 'text-red-600'
                }`}>
                  {capabilities.optimizations.enableThermalThrottling ? 'Enabled' : 'Disabled'}
                </Text>
              </View>

              <View className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Sync Interval
                </Text>
                <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(capabilities.optimizations.recommendedSyncInterval / 1000).toFixed(0)}s
                </Text>
              </View>

              <View className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
                  Max Connections
                </Text>
                <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {capabilities.optimizations.maxConcurrentConnections}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}