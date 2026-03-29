/**
 * Network Quality Indicator for Voice Calls - NET-001
 * Displays real-time network conditions and voice optimization status
 * Part of Mobile Network-Intelligent Voice Optimization system
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Wifi, Signal, AlertTriangle, Info } from 'lucide-react-native';
import { getNetworkIntelligenceEngine } from '../../lib/services/networkIntelligence';
import type {
  NetworkConditions,
  NetworkQualityScore,
  VoiceOptimizationProfile,
  NetworkAnalytics
} from '../../lib/types/networkIntelligence';

interface NetworkQualityIndicatorProps {
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Callback when quality indicator is pressed */
  onPress?: () => void;
}

export function NetworkQualityIndicator({
  showDetails = false,
  onPress
}: NetworkQualityIndicatorProps) {
  const [conditions, setConditions] = useState<NetworkConditions | null>(null);
  const [qualityScore, setQualityScore] = useState<NetworkQualityScore | null>(null);
  const [profile, setProfile] = useState<VoiceOptimizationProfile | null>(null);
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);

  useEffect(() => {
    const engine = getNetworkIntelligenceEngine();

    // Get initial state
    setConditions(engine.getCurrentConditions());
    setQualityScore(engine.getCurrentQualityScore());
    setProfile(engine.getCurrentProfile());
    setAnalytics(engine.getAnalytics());

    // Listen for updates
    const handleUpdate = (eventType: string, data: any) => {
      switch (eventType) {
        case 'conditions_changed':
          setConditions(data);
          break;
        case 'quality_updated':
          setQualityScore(data);
          break;
        case 'profile_changed':
          setProfile(data.to);
          break;
        case 'analytics_updated':
          setAnalytics(data);
          break;
      }
    };

    engine.addEventListener(handleUpdate);

    return () => {
      engine.removeEventListener(handleUpdate);
    };
  }, []);

  // Determine color scheme based on quality
  const getColorScheme = () => {
    if (!qualityScore) return { bg: 'bg-gray-100', text: 'text-gray-600', icon: '#6b7280' };

    switch (qualityScore.level) {
      case 'excellent':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: '#16a34a' };
      case 'good':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: '#2563eb' };
      case 'fair':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '#ca8a04' };
      case 'poor':
      case 'very_poor':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: '#dc2626' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: '#6b7280' };
    }
  };

  // Get appropriate icon based on network type
  const getNetworkIcon = () => {
    const colors = getColorScheme();
    const size = 16;

    if (!conditions) return <Info size={size} color={colors.icon} />;

    switch (conditions.type) {
      case 'wifi':
        return <Wifi size={size} color={colors.icon} />;
      case 'cellular':
        return <Signal size={size} color={colors.icon} />;
      default:
        return <AlertTriangle size={size} color={colors.icon} />;
    }
  };

  const colors = getColorScheme();

  const content = (
    <View className={`px-3 py-2 rounded-lg ${colors.bg} flex-row items-center space-x-2`}>
      {getNetworkIcon()}

      <View className="flex-1">
        <Text className={`text-sm font-medium ${colors.text}`}>
          {qualityScore ? `${qualityScore.level.toUpperCase()} (${qualityScore.overall}%)` : 'Checking...'}
        </Text>

        {showDetails && conditions && (
          <Text className={`text-xs ${colors.text} opacity-75`}>
            {conditions.type.toUpperCase()} • {conditions.latency}ms • {profile?.profileName || 'Auto'}
          </Text>
        )}
      </View>

      {showDetails && analytics && (
        <View className="items-end">
          <Text className={`text-xs ${colors.text} opacity-75`}>
            Data: {Math.round((analytics.dataUsage.cellular + analytics.dataUsage.wifi) / 1024)} KB
          </Text>
          {analytics.session.transitionCount > 0 && (
            <Text className={`text-xs ${colors.text} opacity-75`}>
              Transitions: {analytics.session.transitionCount}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="opacity-90 active:opacity-100">
        {content}
      </Pressable>
    );
  }

  return content;
}

/**
 * Detailed Network Quality Panel
 * Shows comprehensive network intelligence data
 */
export function NetworkQualityPanel() {
  const [conditions, setConditions] = useState<NetworkConditions | null>(null);
  const [qualityScore, setQualityScore] = useState<NetworkQualityScore | null>(null);
  const [profile, setProfile] = useState<VoiceOptimizationProfile | null>(null);
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);

  useEffect(() => {
    const engine = getNetworkIntelligenceEngine();

    // Get initial state
    setConditions(engine.getCurrentConditions());
    setQualityScore(engine.getCurrentQualityScore());
    setProfile(engine.getCurrentProfile());
    setAnalytics(engine.getAnalytics());

    // Listen for updates
    const handleUpdate = (eventType: string, data: any) => {
      switch (eventType) {
        case 'conditions_changed':
          setConditions(data);
          break;
        case 'quality_updated':
          setQualityScore(data);
          break;
        case 'profile_changed':
          setProfile(data.to);
          break;
        case 'analytics_updated':
          setAnalytics(data);
          break;
      }
    };

    engine.addEventListener(handleUpdate);

    return () => {
      engine.removeEventListener(handleUpdate);
    };
  }, []);

  if (!conditions || !qualityScore || !profile || !analytics) {
    return (
      <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <Text className="text-gray-600 dark:text-gray-400 text-center">
          Loading network intelligence...
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center mb-4">
        {conditions.type === 'wifi' ? <Wifi size={20} /> : <Signal size={20} />}
        <Text className="text-lg font-semibold ml-2 text-gray-900 dark:text-gray-100">
          Network Intelligence
        </Text>
      </View>

      {/* Network Conditions */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Connection Quality
        </Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {qualityScore.level.toUpperCase()}
          </Text>
          <Text className="text-xl text-gray-600 dark:text-gray-400">
            {qualityScore.overall}%
          </Text>
        </View>
        <View className="flex-row justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
          <Text>Signal: {conditions.strength}%</Text>
          <Text>Latency: {conditions.latency}ms</Text>
          <Text>Stability: {conditions.stability}%</Text>
        </View>
      </View>

      {/* Voice Profile */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Voice Profile: {profile.profileName}
        </Text>
        <View className="flex-row justify-between text-xs text-gray-500 dark:text-gray-500">
          <Text>Codec: {profile.codec.toUpperCase()}</Text>
          <Text>Bitrate: {profile.bitrate} kbps</Text>
          <Text>Quality: {profile.complexity}/10</Text>
        </View>
        <View className="flex-row justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
          <Text>FEC: {profile.fec ? 'ON' : 'OFF'}</Text>
          <Text>DTX: {profile.dtx ? 'ON' : 'OFF'}</Text>
          <Text>Sample Rate: {profile.sampleRate / 1000}kHz</Text>
        </View>
      </View>

      {/* Data Usage */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Data Usage
        </Text>
        <View className="flex-row justify-between text-xs text-gray-500 dark:text-gray-500">
          <Text>Cellular: {Math.round(analytics.dataUsage.cellular / 1024)} KB</Text>
          <Text>Wi-Fi: {Math.round(analytics.dataUsage.wifi / 1024)} KB</Text>
          <Text>Transitions: {analytics.session.transitionCount}</Text>
        </View>
      </View>

      {/* Voice Metrics */}
      {analytics.voiceMetrics.qualityScore && (
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Voice Quality
          </Text>
          <View className="flex-row justify-between text-xs text-gray-500 dark:text-gray-500">
            <Text>Score: {analytics.voiceMetrics.qualityScore.toFixed(1)}/5</Text>
            <Text>Packet Loss: {analytics.voiceMetrics.packetLoss.toFixed(1)}%</Text>
            <Text>Jitter: {analytics.voiceMetrics.jitter}ms</Text>
          </View>
        </View>
      )}
    </View>
  );
}