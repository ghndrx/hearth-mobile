/**
 * Battery Usage Chart Component
 * Displays battery usage history with smart visualizations
 * Part of PN-006: Background processing and delivery optimization
 */

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import type { BatteryUsageData, PowerMode } from '../../lib/services/batteryOptimization';

interface BatteryUsageChartProps {
  data: BatteryUsageData[];
  powerMode: PowerMode;
}

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 80; // Account for padding
const CHART_HEIGHT = 120;

export function BatteryUsageChart({ data, powerMode }: BatteryUsageChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (data.length === 0) {
    return (
      <Card title="Battery Usage" subtitle="No usage data available yet">
        <View className={`h-20 items-center justify-center ${isDark ? 'bg-dark-800' : 'bg-gray-50'} rounded-lg`}>
          <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
            Chart will appear after collecting battery data
          </Text>
        </View>
      </Card>
    );
  }

  // Calculate chart data points
  const maxLevel = Math.max(...data.map(d => d.batteryLevel));
  const minLevel = Math.min(...data.map(d => d.batteryLevel));
  const levelRange = maxLevel - minLevel || 1;
  const timeRange = data[data.length - 1].timestamp - data[0].timestamp;

  const chartPoints = data.map((item, index) => {
    const x = (index / (data.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((item.batteryLevel - minLevel) / levelRange) * CHART_HEIGHT;
    return { x, y, level: item.batteryLevel, timestamp: item.timestamp };
  });

  // Generate SVG path for the battery usage line
  const pathData = chartPoints.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');

  // Create gradient area under the curve
  const areaPath = `${pathData} L ${chartPoints[chartPoints.length - 1].x} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  // Calculate battery drain rate
  const avgDrainRate = data.length > 1
    ? (data[0].batteryLevel - data[data.length - 1].batteryLevel) / (data.length - 1)
    : 0;

  // Find power mode changes
  const powerModeChanges = data.filter((item, index) => {
    if (index === 0) return true;
    return item.powerMode !== data[index - 1].powerMode;
  });

  // Format time labels
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Get color for power mode
  const getPowerModeColor = (mode: PowerMode) => {
    switch (mode) {
      case 'maximum': return '#10b981'; // green
      case 'balanced': return '#3b82f6'; // blue
      case 'power_saver': return '#f59e0b'; // amber
      case 'ultra_saver': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  return (
    <Card title="Battery Usage" subtitle={`${data.length} readings over ${Math.round(timeRange / (1000 * 60 * 60))} hours`}>
      <View className="space-y-4">
        {/* Chart Container */}
        <View className="relative">
          <View
            style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}
            className={`rounded-lg ${isDark ? 'bg-dark-800' : 'bg-gray-50'} p-2`}
          >
            {/* Grid lines */}
            <View className="absolute inset-2">
              {[25, 50, 75].map((percent) => (
                <View
                  key={percent}
                  style={{
                    position: 'absolute',
                    top: CHART_HEIGHT - (percent / 100) * CHART_HEIGHT,
                    left: 0,
                    right: 0,
                    height: 1,
                  }}
                  className={`${isDark ? 'bg-dark-600' : 'bg-gray-200'}`}
                />
              ))}
            </View>

            {/* Chart points visualization */}
            <View className="absolute inset-2">
              {chartPoints.map((point, index) => (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    left: point.x - 2,
                    top: point.y - 2,
                    width: 4,
                    height: 4,
                  }}
                  className={`rounded-full ${
                    point.level > 50 ? 'bg-green-500' :
                    point.level > 20 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
              ))}
            </View>

            {/* Connecting line */}
            {chartPoints.length > 1 && (
              <View className="absolute inset-2">
                {chartPoints.slice(1).map((point, index) => {
                  const prevPoint = chartPoints[index];
                  const distance = Math.sqrt(
                    Math.pow(point.x - prevPoint.x, 2) +
                    Math.pow(point.y - prevPoint.y, 2)
                  );
                  const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);

                  return (
                    <View
                      key={index}
                      style={{
                        position: 'absolute',
                        left: prevPoint.x,
                        top: prevPoint.y - 0.5,
                        width: distance,
                        height: 1,
                        transform: [{ rotate: `${angle}rad` }],
                        transformOrigin: '0 50%',
                      }}
                      className={`${
                        data[index + 1].batteryLevel >= data[index].batteryLevel
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* Y-axis labels */}
          <View className="absolute left-0 top-0 bottom-0 w-8 justify-between py-2">
            {[100, 75, 50, 25, 0].map((level) => (
              <Text
                key={level}
                className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}
                style={{ textAlign: 'right' }}
              >
                {level}%
              </Text>
            ))}
          </View>
        </View>

        {/* Time labels */}
        <View className="flex-row justify-between px-8">
          <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
            {formatTime(data[0].timestamp)}
          </Text>
          <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
            Now
          </Text>
        </View>

        {/* Stats Summary */}
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Current: {data[data.length - 1].batteryLevel}%
            </Text>
            <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
              Battery Level
            </Text>
          </View>

          <View className="flex-1">
            <Text className={`text-sm font-medium ${
              avgDrainRate > 0 ? 'text-red-500' : avgDrainRate < 0 ? 'text-green-500' : (isDark ? 'text-white' : 'text-gray-900')
            }`}>
              {avgDrainRate > 0 ? '-' : '+'}
              {Math.abs(avgDrainRate).toFixed(1)}%/h
            </Text>
            <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
              Avg Drain Rate
            </Text>
          </View>

          <View className="flex-1">
            <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {powerModeChanges.length}
            </Text>
            <Text className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
              Mode Changes
            </Text>
          </View>
        </View>

        {/* Power Mode Indicator */}
        <View className="flex-row items-center space-x-2">
          <View
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getPowerModeColor(powerMode) }}
          />
          <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-600'}`}>
            Current Mode: <Text className="font-medium capitalize">{powerMode.replace('_', ' ')}</Text>
          </Text>
        </View>
      </View>
    </Card>
  );
}