import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';
import BatteryOptimizationService, { BatteryMetrics } from '../../services/battery/BatteryOptimizationService';
import DeviceAdaptiveService from '../../services/device/DeviceAdaptiveService';
import BackgroundProcessingManager from '../../services/background/BackgroundProcessingManager';

interface PowerStats {
  currentLevel: number;
  isCharging: boolean;
  estimatedHoursLeft: number;
  todayUsage: number;
  weekAverage: number;
  batteryHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

interface PerformanceMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  batteryImpact: 'high' | 'medium' | 'low';
  active: boolean;
}

export const PowerManagementDashboard: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [refreshing, setRefreshing] = useState(false);
  const [batteryMetrics, setBatteryMetrics] = useState<BatteryMetrics | null>(null);
  const [powerStats, setPowerStats] = useState<PowerStats>({
    currentLevel: 0.85,
    isCharging: false,
    estimatedHoursLeft: 8.5,
    todayUsage: 65,
    weekAverage: 72,
    batteryHealth: 'good',
  });
  const [queueStatus, setQueueStatus] = useState<{ total: number; active: number; byPriority: Record<string, number>; byType: Record<string, number> }>({ total: 0, active: 0, byPriority: { high: 0, medium: 0, low: 0 }, byType: {} });
  const [performanceModes, setPerformanceModes] = useState<PerformanceMode[]>([
    { id: 'high', name: 'High Performance', description: 'Maximum features, fastest sync', icon: 'flash', batteryImpact: 'high', active: false },
    { id: 'balanced', name: 'Balanced', description: 'Good performance with battery care', icon: 'speedometer', batteryImpact: 'medium', active: true },
    { id: 'battery_saver', name: 'Battery Saver', description: 'Extended battery life', icon: 'leaf', batteryImpact: 'low', active: false },
  ]);

  useEffect(() => {
    initializeServices();
    return () => {
      // Cleanup subscriptions
    };
  }, []);

  const initializeServices = async (): Promise<(() => void) | undefined> => {
    try {
      const batteryService = BatteryOptimizationService;
      const deviceService = DeviceAdaptiveService;
      const backgroundManager = BackgroundProcessingManager;

      // Subscribe to battery updates
      const unsubscribe = batteryService.subscribe((metrics) => {
        setBatteryMetrics(metrics);
        updatePowerStats(metrics);
      });

      // Get initial queue status
      updateQueueStatus();

      return unsubscribe;
    } catch (error) {
      console.error('Failed to initialize power management services:', error);
      return undefined;
    }
  };

  const updatePowerStats = (metrics: BatteryMetrics) => {
    const estimatedHours = metrics.isCharging
      ? (1 - metrics.level) * 2 // 2 hours to charge from current level
      : metrics.level * 12; // Estimated 12 hours on full battery

    const health: PowerStats['batteryHealth'] =
      metrics.level > 0.8 ? 'excellent' :
      metrics.level > 0.6 ? 'good' :
      metrics.level > 0.3 ? 'fair' : 'poor';

    setPowerStats(prev => ({
      ...prev,
      currentLevel: metrics.level,
      isCharging: metrics.isCharging,
      estimatedHoursLeft: estimatedHours,
      batteryHealth: health,
    }));
  };

  const updateQueueStatus = () => {
    const status = BackgroundProcessingManager.getQueueStatus();
    setQueueStatus(status);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await BatteryOptimizationService.getBatteryMetrics();
    updateQueueStatus();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handlePerformanceModeChange = async (modeId: string) => {
    const updatedModes = performanceModes.map(mode => ({
      ...mode,
      active: mode.id === modeId,
    }));
    setPerformanceModes(updatedModes);

    // Apply performance settings
    const batteryService = BatteryOptimizationService;
    const deviceService = DeviceAdaptiveService;

    try {
      switch (modeId) {
        case 'high':
          await batteryService.updateSettings({
            adaptiveCPU: false,
            intelligentSync: false,
            batteryAwareNotifications: false,
          });
          break;
        case 'balanced':
          await batteryService.updateSettings({
            adaptiveCPU: true,
            intelligentSync: true,
            batteryAwareNotifications: true,
          });
          break;
        case 'battery_saver':
          await batteryService.updateSettings({
            adaptiveCPU: true,
            intelligentSync: true,
            batteryAwareNotifications: true,
            thermalThrottling: true,
            networkBatching: true,
          });
          break;
      }
    } catch (error) {
      console.error('Failed to update performance mode:', error);
    }
  };

  const getBatteryStatusColor = (level: number, isCharging: boolean): string => {
    if (isCharging) return '#22c55e';
    if (level > 0.5) return '#22c55e';
    if (level > 0.2) return '#f59e0b';
    return '#ef4444';
  };

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getOptimizationRecommendations = (): string[] => {
    if (!batteryMetrics) return [];

    const recommendations = [];

    if (batteryMetrics.level < 0.3 && !batteryMetrics.isCharging) {
      recommendations.push('Enable Battery Saver mode');
      recommendations.push('Reduce background app refresh');
    }

    if (batteryMetrics.lowPowerMode) {
      recommendations.push('Low Power Mode is active');
    }

    if (queueStatus.total > 10) {
      recommendations.push(`${queueStatus.total} background tasks queued`);
    }

    return recommendations;
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-900' : 'bg-gray-50'}`}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Battery Status Card */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} className="px-5 mt-4">
          <View className={`p-5 rounded-2xl ${isDark ? 'bg-dark-800 border border-dark-700' : 'bg-white border border-gray-200'}`}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons
                  name={batteryMetrics?.isCharging ? 'battery-charging' : 'battery-half'}
                  size={24}
                  color={getBatteryStatusColor(powerStats.currentLevel, powerStats.isCharging)}
                />
                <Text className={`ml-2 text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Battery Status
                </Text>
              </View>
              <View className="items-end">
                <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {Math.round(powerStats.currentLevel * 100)}%
                </Text>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                  {powerStats.isCharging ? 'Charging' : formatTime(powerStats.estimatedHoursLeft) + ' left'}
                </Text>
              </View>
            </View>

            {/* Battery Level Bar */}
            <View className={`h-3 rounded-full ${isDark ? 'bg-dark-700' : 'bg-gray-100'}`}>
              <View
                className="h-3 rounded-full"
                style={{
                  width: `${powerStats.currentLevel * 100}%`,
                  backgroundColor: getBatteryStatusColor(powerStats.currentLevel, powerStats.isCharging),
                }}
              />
            </View>

            {/* Battery Health Indicator */}
            <View className="flex-row items-center justify-between mt-3">
              <Text className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
                Health: {powerStats.batteryHealth}
              </Text>
              {batteryMetrics?.lowPowerMode && (
                <View className="flex-row items-center">
                  <Ionicons name="leaf" size={16} color="#f59e0b" />
                  <Text className={`ml-1 text-sm text-amber-500 font-medium`}>
                    Low Power Mode
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Performance Mode Selection */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="px-5 mt-4">
          <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Performance Mode
          </Text>
          {performanceModes.map((mode, index) => (
            <Animated.View key={mode.id} entering={FadeInLeft.delay(150 + index * 50).duration(300)}>
              <TouchableOpacity
                onPress={() => handlePerformanceModeChange(mode.id)}
                className={`p-4 rounded-xl mb-3 border ${
                  mode.active
                    ? isDark
                      ? 'bg-hearth-amber/10 border-hearth-amber'
                      : 'bg-amber-50 border-amber-300'
                    : isDark
                      ? 'bg-dark-800 border-dark-700'
                      : 'bg-white border-gray-200'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Ionicons
                      name={mode.icon as any}
                      size={20}
                      color={mode.active ? '#f59e0b' : isDark ? '#9ca3af' : '#6b7280'}
                    />
                    <View className="ml-3 flex-1">
                      <Text className={`font-medium ${mode.active ? 'text-hearth-amber' : isDark ? 'text-white' : 'text-gray-900'}`}>
                        {mode.name}
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                        {mode.description}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <View className={`px-2 py-1 rounded-full ${
                      mode.batteryImpact === 'high' ? 'bg-red-100' :
                      mode.batteryImpact === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <Text className={`text-xs font-medium ${
                        mode.batteryImpact === 'high' ? 'text-red-700' :
                        mode.batteryImpact === 'medium' ? 'text-yellow-700' : 'text-green-700'
                      }`}>
                        {mode.batteryImpact} impact
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Background Activity */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} className="px-5 mt-4">
          <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Background Activity
          </Text>
          <View className={`p-4 rounded-xl ${isDark ? 'bg-dark-800 border border-dark-700' : 'bg-white border border-gray-200'}`}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Active Tasks
              </Text>
              <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                {queueStatus.active} running, {queueStatus.total} queued
              </Text>
            </View>

            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className={`text-2xl font-bold text-red-500`}>
                  {queueStatus.byPriority.high}
                </Text>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>High</Text>
              </View>
              <View className="items-center">
                <Text className={`text-2xl font-bold text-yellow-500`}>
                  {queueStatus.byPriority.medium}
                </Text>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>Medium</Text>
              </View>
              <View className="items-center">
                <Text className={`text-2xl font-bold text-green-500`}>
                  {queueStatus.byPriority.low}
                </Text>
                <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>Low</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Optimization Recommendations */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} className="px-5 mt-4">
          <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Recommendations
          </Text>
          {getOptimizationRecommendations().map((recommendation, index) => (
            <Animated.View
              key={index}
              entering={FadeInLeft.delay(300 + index * 50).duration(300)}
              className={`p-3 rounded-xl mb-2 ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}
            >
              <View className="flex-row items-center">
                <Ionicons name="bulb" size={16} color="#3b82f6" />
                <Text className={`ml-2 text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  {recommendation}
                </Text>
              </View>
            </Animated.View>
          ))}
          {getOptimizationRecommendations().length === 0 && (
            <View className={`p-4 rounded-xl ${isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text className={`ml-2 text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  Your battery optimization is working well!
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Usage Analytics */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} className="px-5 mt-4">
          <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Usage Analytics
          </Text>
          <View className="flex-row space-x-3">
            <View className={`flex-1 p-4 rounded-xl ${isDark ? 'bg-dark-800 border border-dark-700' : 'bg-white border border-gray-200'}`}>
              <Ionicons name="today-outline" size={18} color="#3b82f6" />
              <Text className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {powerStats.todayUsage}%
              </Text>
              <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                Used today
              </Text>
            </View>
            <View className={`flex-1 p-4 rounded-xl ${isDark ? 'bg-dark-800 border border-dark-700' : 'bg-white border border-gray-200'}`}>
              <Ionicons name="bar-chart-outline" size={18} color="#8b5cf6" />
              <Text className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {powerStats.weekAverage}%
              </Text>
              <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                Week average
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PowerManagementDashboard;