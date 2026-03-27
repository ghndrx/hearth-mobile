import { View, ScrollView, Alert, Pressable } from "react-native";
import { Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  useApiDashboardStats,
  useMonitoringActions,
  useMonitoringStatus,
  useRecentEvents
} from "../../lib/stores/apiMonitoring";
import type { ApiMonitoringEvent } from "../../lib/types";

export default function ApiManagementScreen() {
  const dashboardStats = useApiDashboardStats();
  const { refreshData, clearData, resetRateLimits, setAutoRefresh } = useMonitoringActions();
  const { isMonitoring, autoRefresh, lastUpdated } = useMonitoringStatus();
  const recentEvents = useRecentEvents();
  const [showDetails, setShowDetails] = useState(false);

  // Format numbers for display
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

  // Get status color
  const getStatusColor = (rate: number): string => {
    if (rate >= 95) return "#10B981"; // Green
    if (rate >= 85) return "#F59E0B"; // Yellow
    return "#EF4444"; // Red
  };

  // Handle clear data with confirmation
  const handleClearData = () => {
    Alert.alert(
      "Clear API Data",
      "This will clear all API monitoring data including request history, metrics, and events. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearData();
            Alert.alert("Success", "API monitoring data cleared successfully");
          }
        }
      ]
    );
  };

  // Handle reset rate limits
  const handleResetRateLimits = () => {
    Alert.alert(
      "Reset Rate Limits",
      "This will reset all rate limit counters. Use this carefully in development only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "default",
          onPress: () => {
            resetRateLimits();
            Alert.alert("Success", "Rate limits reset successfully");
          }
        }
      ]
    );
  };

  // Format event type for display
  const formatEventType = (type: ApiMonitoringEvent['type']): string => {
    switch (type) {
      case 'request': return '📡';
      case 'error': return '❌';
      case 'rate_limit': return '⚠️';
      case 'slow_response': return '🐌';
      default: return '📊';
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <View className="px-4 py-3 flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">
              API Management
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Real-time API monitoring and rate limiting
            </Text>
          </View>
          <View className="flex-row space-x-2">
            <Pressable
              onPress={refreshData}
              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"
            >
              <Ionicons name="refresh" size={20} className="text-blue-600 dark:text-blue-400" />
            </Pressable>
          </View>
        </View>
      </View>

      <View className="p-4 space-y-6">
        {/* Status Banner */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Monitoring Status
            </Text>
            <View className="flex-row items-center space-x-2">
              <View className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className={`text-sm font-medium ${isMonitoring ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isMonitoring ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Auto-refresh: {autoRefresh ? 'Enabled' : 'Disabled'} • Last updated: {formatTimestamp(lastUpdated)}
          </Text>
        </View>

        {/* Key Metrics */}
        <View className="grid grid-cols-2 gap-3">
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Requests</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(dashboardStats.totalRequests)}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {dashboardStats.requestsToday} today
            </Text>
          </View>

          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Success Rate</Text>
            <Text
              className="text-2xl font-bold"
              style={{ color: getStatusColor(dashboardStats.successRate) }}
            >
              {dashboardStats.successRate.toFixed(1)}%
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Last hour: {dashboardStats.requestsThisHour} requests
            </Text>
          </View>

          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Response</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatResponseTime(dashboardStats.averageResponseTime)}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {dashboardStats.activeEndpoints} endpoints
            </Text>
          </View>

          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rate Limits</Text>
            <Text className={`text-2xl font-bold ${dashboardStats.rateLimitViolations > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {dashboardStats.rateLimitViolations}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              violations
            </Text>
          </View>
        </View>

        {/* Top Endpoints */}
        <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <View className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Top API Endpoints
            </Text>
          </View>
          <View className="p-4 space-y-3">
            {dashboardStats.topEndpoints.length > 0 ? (
              dashboardStats.topEndpoints.map((endpoint, index) => (
                <View key={`${endpoint.method}-${endpoint.endpoint}`} className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-2">
                      <View className={`px-2 py-1 rounded text-xs font-mono ${
                        endpoint.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        endpoint.method === 'POST' ? 'bg-green-100 dark:bg-green-900/20' :
                        endpoint.method === 'PUT' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                        endpoint.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/20' :
                        'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Text className={`text-xs font-semibold ${
                          endpoint.method === 'GET' ? 'text-blue-700 dark:text-blue-300' :
                          endpoint.method === 'POST' ? 'text-green-700 dark:text-green-300' :
                          endpoint.method === 'PUT' ? 'text-yellow-700 dark:text-yellow-300' :
                          endpoint.method === 'DELETE' ? 'text-red-700 dark:text-red-300' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {endpoint.method}
                        </Text>
                      </View>
                      <Text className="text-sm font-medium text-gray-900 dark:text-white flex-1" numberOfLines={1}>
                        {endpoint.endpoint}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatNumber(endpoint.requestCount)} requests • {endpoint.successRate.toFixed(1)}% success
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-center text-gray-500 dark:text-gray-400 py-4">
                No API requests recorded yet
              </Text>
            )}
          </View>
        </View>

        {/* Recent Events */}
        <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </Text>
            <Pressable
              onPress={() => setShowDetails(!showDetails)}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700"
            >
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                {showDetails ? 'Hide' : 'Show'} Details
              </Text>
            </Pressable>
          </View>
          <View className="p-4 space-y-2 max-h-64">
            <ScrollView>
              {recentEvents.length > 0 ? (
                recentEvents.slice(0, 10).map((event, index) => (
                  <View key={index} className="flex-row items-center space-x-3 py-2">
                    <Text className="text-lg">{formatEventType(event.type)}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-900 dark:text-white" numberOfLines={1}>
                        {event.method} {event.endpoint}
                      </Text>
                      {showDetails && event.data && (
                        <Text className="text-xs text-gray-500 dark:text-gray-400" numberOfLines={2}>
                          {event.type === 'error' ? event.data.errorMessage :
                           event.type === 'request' ? `${event.data.statusCode} • ${formatResponseTime(event.data.responseTime)}` :
                           event.type === 'rate_limit' ? `Rate limit: ${event.data.remaining}/${event.data.limit}` :
                           'API activity'}
                        </Text>
                      )}
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(event.timestamp)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No recent activity
                </Text>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Developer Actions */}
        <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <View className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Developer Tools
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Advanced options for development and testing
            </Text>
          </View>
          <View className="p-4 space-y-3">
            <Pressable
              onPress={() => setAutoRefresh(!autoRefresh)}
              className="flex-row items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons
                  name={autoRefresh ? "toggle" : "toggle-outline"}
                  size={24}
                  className={autoRefresh ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}
                />
                <Text className="text-sm font-medium text-gray-900 dark:text-white">
                  Auto Refresh
                </Text>
              </View>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {autoRefresh ? 'ON' : 'OFF'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleResetRateLimits}
              className="flex-row items-center space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
            >
              <Ionicons name="refresh-circle" size={24} className="text-yellow-600 dark:text-yellow-400" />
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                Reset Rate Limits
              </Text>
            </Pressable>

            <Pressable
              onPress={handleClearData}
              className="flex-row items-center space-x-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20"
            >
              <Ionicons name="trash" size={24} className="text-red-600 dark:text-red-400" />
              <Text className="text-sm font-medium text-red-700 dark:text-red-300">
                Clear All Data
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View className="pt-4 pb-8">
          <Text className="text-center text-xs text-gray-500 dark:text-gray-400">
            API Management Dashboard • DEV-002
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}