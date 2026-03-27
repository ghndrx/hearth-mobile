import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ApiRateLimit } from "../../lib/types";

interface RateLimitStatusProps {
  rateLimit: ApiRateLimit;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function RateLimitStatus({
  rateLimit,
  showDetails = false,
  size = 'medium'
}: RateLimitStatusProps) {
  // Calculate usage percentage
  const usagePercentage = ((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) * 100;

  // Get status color based on remaining quota
  const getStatusColor = (): string => {
    if (rateLimit.isBlocked) return "#EF4444"; // red-500
    if (usagePercentage >= 80) return "#F59E0B"; // amber-500
    if (usagePercentage >= 60) return "#F97316"; // orange-500
    return "#10B981"; // green-500
  };

  // Get status text
  const getStatusText = (): string => {
    if (rateLimit.isBlocked) return "Blocked";
    if (usagePercentage >= 90) return "Critical";
    if (usagePercentage >= 80) return "High";
    if (usagePercentage >= 60) return "Moderate";
    return "Normal";
  };

  // Get status icon
  const getStatusIcon = (): string => {
    if (rateLimit.isBlocked) return "ban";
    if (usagePercentage >= 90) return "warning";
    if (usagePercentage >= 80) return "alert-circle";
    if (usagePercentage >= 60) return "information-circle";
    return "checkmark-circle";
  };

  // Format time remaining until reset
  const formatTimeUntilReset = (): string => {
    const resetTime = new Date(rateLimit.resetTime);
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();

    if (diff <= 0) return "Resetting...";

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
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

  const statusColor = getStatusColor();
  const methodColor = getMethodColor(rateLimit.method);

  // Size configurations
  const sizes = {
    small: {
      container: "p-2",
      text: "text-xs",
      title: "text-sm",
      icon: 14,
      progress: "h-1"
    },
    medium: {
      container: "p-3",
      text: "text-sm",
      title: "text-base",
      icon: 16,
      progress: "h-2"
    },
    large: {
      container: "p-4",
      text: "text-base",
      title: "text-lg",
      icon: 20,
      progress: "h-3"
    }
  };

  const sizeConfig = sizes[size];

  return (
    <View className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${sizeConfig.container}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2 flex-1">
          {size !== 'small' && (
            <View
              className="px-2 py-1 rounded"
              style={{ backgroundColor: `${methodColor}20` }}
            >
              <Text
                className={`font-semibold ${sizeConfig.text}`}
                style={{ color: methodColor }}
              >
                {rateLimit.method}
              </Text>
            </View>
          )}
          <Text
            className={`font-medium text-gray-900 dark:text-white flex-1 ${sizeConfig.title}`}
            numberOfLines={1}
          >
            {size === 'small' ? rateLimit.endpoint.split('/').pop() : rateLimit.endpoint}
          </Text>
        </View>

        <View className="flex-row items-center space-x-1">
          <Ionicons
            name={getStatusIcon() as any}
            size={sizeConfig.icon}
            style={{ color: statusColor }}
          />
          <Text
            className={`font-medium ${sizeConfig.text}`}
            style={{ color: statusColor }}
          >
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Usage Bar */}
      <View className={`bg-gray-200 dark:bg-gray-700 rounded-full ${sizeConfig.progress} mb-2`}>
        <View
          className={`rounded-full ${sizeConfig.progress}`}
          style={{
            width: `${Math.min(usagePercentage, 100)}%`,
            backgroundColor: statusColor
          }}
        />
      </View>

      {/* Usage Details */}
      <View className="flex-row items-center justify-between">
        <Text className={`text-gray-600 dark:text-gray-400 ${sizeConfig.text}`}>
          {rateLimit.limit - rateLimit.remaining}/{rateLimit.limit} requests used
        </Text>
        <Text className={`text-gray-600 dark:text-gray-400 ${sizeConfig.text}`}>
          {usagePercentage.toFixed(1)}%
        </Text>
      </View>

      {/* Reset Time (if showing details) */}
      {showDetails && (
        <View className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
              Resets in:
            </Text>
            <Text className={`font-medium text-gray-900 dark:text-white ${sizeConfig.text}`}>
              {formatTimeUntilReset()}
            </Text>
          </View>

          {rateLimit.windowMs && (
            <View className="flex-row items-center justify-between mt-1">
              <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
                Window:
              </Text>
              <Text className={`font-medium text-gray-900 dark:text-white ${sizeConfig.text}`}>
                {(rateLimit.windowMs / (1000 * 60)).toFixed(0)}min
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Warning Messages */}
      {rateLimit.isBlocked && (
        <View className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="ban" size={14} className="text-red-600 dark:text-red-400" />
            <Text className="text-red-700 dark:text-red-300 text-xs font-medium">
              Rate limit exceeded. Requests are being blocked.
            </Text>
          </View>
        </View>
      )}

      {usagePercentage >= 90 && !rateLimit.isBlocked && (
        <View className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="warning" size={14} className="text-amber-600 dark:text-amber-400" />
            <Text className="text-amber-700 dark:text-amber-300 text-xs font-medium">
              Approaching rate limit. Consider throttling requests.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}