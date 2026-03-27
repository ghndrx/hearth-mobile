import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ApiDashboardStats } from "../../lib/types";

interface ApiHealthIndicatorProps {
  stats: ApiDashboardStats;
  onPress?: () => void;
  showDetails?: boolean;
  size?: 'compact' | 'normal' | 'expanded';
}

export function ApiHealthIndicator({
  stats,
  onPress,
  showDetails = false,
  size = 'normal'
}: ApiHealthIndicatorProps) {
  // Calculate overall health score (0-100)
  const calculateHealthScore = (): number => {
    let score = 0;

    // Success rate contribution (40% weight)
    score += (stats.successRate / 100) * 40;

    // Response time contribution (30% weight)
    const responseTimeScore = Math.max(0, 100 - (stats.averageResponseTime / 50)); // Penalty after 50ms
    score += (responseTimeScore / 100) * 30;

    // Rate limit violations contribution (20% weight)
    const rateLimitScore = stats.rateLimitViolations > 0 ? 0 : 100;
    score += (rateLimitScore / 100) * 20;

    // Activity level contribution (10% weight)
    const activityScore = Math.min(100, (stats.requestsThisHour / 10) * 100); // Scale based on expected activity
    score += (activityScore / 100) * 10;

    return Math.round(Math.max(0, Math.min(100, score)));
  };

  // Get health status based on score
  const getHealthStatus = (score: number): {
    status: string;
    color: string;
    icon: string;
    description: string;
  } => {
    if (score >= 90) {
      return {
        status: 'Excellent',
        color: '#10B981',
        icon: 'checkmark-circle',
        description: 'All systems operational'
      };
    } else if (score >= 75) {
      return {
        status: 'Good',
        color: '#22C55E',
        icon: 'checkmark-circle-outline',
        description: 'Minor performance issues'
      };
    } else if (score >= 60) {
      return {
        status: 'Fair',
        color: '#F59E0B',
        icon: 'warning-outline',
        description: 'Some performance concerns'
      };
    } else if (score >= 40) {
      return {
        status: 'Poor',
        color: '#F97316',
        icon: 'alert-circle-outline',
        description: 'Significant issues detected'
      };
    } else {
      return {
        status: 'Critical',
        color: '#EF4444',
        icon: 'close-circle',
        description: 'Severe performance problems'
      };
    }
  };

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format response time
  const formatResponseTime = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  };

  const healthScore = calculateHealthScore();
  const health = getHealthStatus(healthScore);

  // Size configurations
  const sizes = {
    compact: {
      container: "p-2",
      text: "text-xs",
      title: "text-sm",
      subtitle: "text-xs",
      icon: 16,
      score: "text-lg"
    },
    normal: {
      container: "p-3",
      text: "text-sm",
      title: "text-base",
      subtitle: "text-sm",
      icon: 20,
      score: "text-xl"
    },
    expanded: {
      container: "p-4",
      text: "text-base",
      title: "text-lg",
      subtitle: "text-base",
      icon: 24,
      score: "text-2xl"
    }
  };

  const sizeConfig = sizes[size];
  const CardComponent = onPress ? Pressable : View;

  return (
    <CardComponent
      onPress={onPress}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${sizeConfig.container}`}
      style={onPress ? { opacity: 1 } : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center space-x-3">
          <Ionicons
            name={health.icon as any}
            size={sizeConfig.icon}
            style={{ color: health.color }}
          />
          <View>
            <Text className={`font-semibold text-gray-900 dark:text-white ${sizeConfig.title}`}>
              API Health
            </Text>
            <Text
              className={`font-medium ${sizeConfig.subtitle}`}
              style={{ color: health.color }}
            >
              {health.status}
            </Text>
          </View>
        </View>

        <View className="items-center">
          <Text
            className={`font-bold ${sizeConfig.score}`}
            style={{ color: health.color }}
          >
            {healthScore}
          </Text>
          <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
            Score
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

      {/* Health Description */}
      <Text className={`text-gray-600 dark:text-gray-400 mb-3 ${sizeConfig.text}`}>
        {health.description}
      </Text>

      {/* Key Metrics */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
            Success Rate
          </Text>
          <Text className={`font-semibold text-gray-900 dark:text-white ${sizeConfig.text}`}>
            {stats.successRate.toFixed(1)}%
          </Text>
        </View>

        <View className="flex-1">
          <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
            Avg Response
          </Text>
          <Text className={`font-semibold text-gray-900 dark:text-white ${sizeConfig.text}`}>
            {formatResponseTime(stats.averageResponseTime)}
          </Text>
        </View>

        <View className="flex-1">
          <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
            Requests/Hour
          </Text>
          <Text className={`font-semibold text-gray-900 dark:text-white ${sizeConfig.text}`}>
            {formatNumber(stats.requestsThisHour)}
          </Text>
        </View>
      </View>

      {/* Detailed Metrics (if showDetails is true) */}
      {showDetails && (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <View className="flex-row items-center justify-between">
            <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
              Total Requests
            </Text>
            <Text className={`font-medium text-gray-900 dark:text-white ${sizeConfig.text}`}>
              {formatNumber(stats.totalRequests)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
              Requests Today
            </Text>
            <Text className={`font-medium text-gray-900 dark:text-white ${sizeConfig.text}`}>
              {formatNumber(stats.requestsToday)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
              Active Endpoints
            </Text>
            <Text className={`font-medium text-gray-900 dark:text-white ${sizeConfig.text}`}>
              {stats.activeEndpoints}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className={`text-gray-500 dark:text-gray-400 ${sizeConfig.text}`}>
              Rate Limit Violations
            </Text>
            <Text
              className={`font-medium ${sizeConfig.text}`}
              style={{
                color: stats.rateLimitViolations > 0 ? '#EF4444' : '#10B981'
              }}
            >
              {stats.rateLimitViolations}
            </Text>
          </View>
        </View>
      )}

      {/* Health Issues Alert */}
      {healthScore < 60 && (
        <View className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="warning" size={14} className="text-red-600 dark:text-red-400" />
            <Text className="text-red-700 dark:text-red-300 text-xs font-medium flex-1">
              {stats.successRate < 85 && "High error rate detected. "}
              {stats.averageResponseTime > 2000 && "Slow response times. "}
              {stats.rateLimitViolations > 0 && "Rate limit violations occurring. "}
              Check API performance and consider optimization.
            </Text>
          </View>
        </View>
      )}

      {/* Recent Errors (if any) */}
      {stats.recentErrors.length > 0 && showDetails && (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Text className={`font-medium text-gray-900 dark:text-white mb-2 ${sizeConfig.subtitle}`}>
            Recent Errors ({stats.recentErrors.length})
          </Text>
          <View className="space-y-1">
            {stats.recentErrors.slice(0, 3).map((error, index) => (
              <View key={index} className="flex-row items-center space-x-2">
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#EF444420' }}
                >
                  <Text className="text-xs font-medium text-red-700 dark:text-red-300">
                    {error.method}
                  </Text>
                </View>
                <Text className={`text-gray-600 dark:text-gray-400 flex-1 ${sizeConfig.text}`} numberOfLines={1}>
                  {error.endpoint}
                </Text>
                <Text className={`text-red-600 dark:text-red-400 text-xs`}>
                  {error.error}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </CardComponent>
  );
}