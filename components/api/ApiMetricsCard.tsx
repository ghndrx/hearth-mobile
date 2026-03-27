import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ApiUsageMetrics } from "../../lib/types";

interface ApiMetricsCardProps {
  metrics: ApiUsageMetrics;
  onPress?: () => void;
  showDetails?: boolean;
}

export function ApiMetricsCard({
  metrics,
  onPress,
  showDetails = false
}: ApiMetricsCardProps) {
  // Calculate success rate percentage
  const successRate = metrics.requestCount > 0
    ? (metrics.successCount / metrics.requestCount) * 100
    : 0;

  // Format response time for display
  const formatResponseTime = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get status color based on success rate
  const getStatusColor = (rate: number): string => {
    if (rate >= 95) return "#10B981"; // green-500
    if (rate >= 85) return "#F59E0B"; // amber-500
    return "#EF4444"; // red-500
  };

  // Get method color
  const getMethodColor = (method: string): string => {
    switch (method.toLowerCase()) {
      case 'get': return "#3B82F6"; // blue-500
      case 'post': return "#10B981"; // green-500
      case 'put': return "#F59E0B"; // amber-500
      case 'patch': return "#8B5CF6"; // violet-500
      case 'delete': return "#EF4444"; // red-500
      default: return "#6B7280"; // gray-500
    }
  };

  const statusColor = getStatusColor(successRate);
  const methodColor = getMethodColor(metrics.method);

  const CardComponent = onPress ? Pressable : View;

  return (
    <CardComponent
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-3"
      style={onPress ? { opacity: 1 } : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center space-x-2 flex-1">
          <View
            className="px-2 py-1 rounded text-xs font-mono"
            style={{ backgroundColor: `${methodColor}20` }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: methodColor }}
            >
              {metrics.method}
            </Text>
          </View>
          <Text
            className="text-sm font-medium text-gray-900 dark:text-white flex-1"
            numberOfLines={1}
          >
            {metrics.endpoint}
          </Text>
        </View>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            className="text-gray-400 dark:text-gray-500"
          />
        )}
      </View>

      {/* Metrics Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Requests
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {formatNumber(metrics.requestCount)}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Success Rate
          </Text>
          <Text
            className="text-lg font-bold"
            style={{ color: statusColor }}
          >
            {successRate.toFixed(1)}%
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Avg Time
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {formatResponseTime(metrics.averageResponseTime)}
          </Text>
        </View>

        {metrics.rateLimitHits > 0 && (
          <View className="flex-1">
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Rate Limits
            </Text>
            <Text className="text-lg font-bold text-red-600 dark:text-red-400">
              {metrics.rateLimitHits}
            </Text>
          </View>
        )}
      </View>

      {/* Detailed Metrics (if showDetails is true) */}
      {showDetails && (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Errors
              </Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {formatNumber(metrics.errorCount)}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Min Time
              </Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {formatResponseTime(metrics.minResponseTime)}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Max Time
              </Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {formatResponseTime(metrics.maxResponseTime)}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Last Request
              </Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {metrics.lastRequestAt
                  ? new Date(metrics.lastRequestAt).toLocaleTimeString()
                  : 'Never'
                }
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Performance Indicator */}
      {successRate < 95 && (
        <View className="mt-2 flex-row items-center space-x-1">
          <Ionicons
            name="warning"
            size={14}
            style={{ color: statusColor }}
          />
          <Text
            className="text-xs"
            style={{ color: statusColor }}
          >
            {successRate < 85 ? 'High error rate' : 'Some errors detected'}
          </Text>
        </View>
      )}

      {metrics.averageResponseTime > 2000 && (
        <View className="mt-2 flex-row items-center space-x-1">
          <Ionicons
            name="time"
            size={14}
            className="text-amber-500"
          />
          <Text className="text-xs text-amber-600 dark:text-amber-400">
            Slow response times
          </Text>
        </View>
      )}
    </CardComponent>
  );
}