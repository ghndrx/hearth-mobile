import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type * as Notifications from 'expo-notifications';

interface PermissionStatusIndicatorProps {
  permissionStatus: Notifications.PermissionStatus | null;
  isEnabled: boolean;
  onPress?: () => void;
  showDetailed?: boolean;
  quietHoursActive?: boolean;
}

interface StatusConfig {
  color: string;
  backgroundColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

function getStatusConfig(
  status: Notifications.PermissionStatus | null,
  isEnabled: boolean,
  isDark: boolean,
  quietHoursActive?: boolean
): StatusConfig {
  if (status === 'denied') {
    return {
      color: '#ef4444',
      backgroundColor: isDark ? '#fca5a5' : '#fee2e2',
      icon: 'close-circle',
      title: 'Blocked',
      subtitle: 'Open Settings to enable notifications',
    };
  }

  if (status === 'undetermined') {
    return {
      color: '#f59e0b',
      backgroundColor: isDark ? '#fed7aa' : '#fef3c7',
      icon: 'help-circle',
      title: 'Not Set',
      subtitle: 'Tap to request notification permission',
    };
  }

  if (status === 'granted' && !isEnabled) {
    return {
      color: '#6b7280',
      backgroundColor: isDark ? '#d1d5db' : '#f3f4f6',
      icon: 'notifications-off',
      title: 'Disabled',
      subtitle: 'Notifications are turned off in app settings',
    };
  }

  if (status === 'granted' && isEnabled && quietHoursActive) {
    return {
      color: '#8b5cf6',
      backgroundColor: isDark ? '#c4b5fd' : '#ede9fe',
      icon: 'moon',
      title: 'Quiet Hours',
      subtitle: 'Notifications are silenced during quiet hours',
    };
  }

  if (status === 'granted' && isEnabled) {
    return {
      color: '#10b981',
      backgroundColor: isDark ? '#a7f3d0' : '#d1fae5',
      icon: 'checkmark-circle',
      title: 'Active',
      subtitle: 'Notifications are working perfectly',
    };
  }

  // Fallback
  return {
    color: '#6b7280',
    backgroundColor: isDark ? '#d1d5db' : '#f3f4f6',
    icon: 'help-circle',
    title: 'Unknown',
    subtitle: 'Unable to determine notification status',
  };
}

export function PermissionStatusIndicator({
  permissionStatus,
  isEnabled,
  onPress,
  showDetailed = false,
  quietHoursActive = false,
}: PermissionStatusIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const config = getStatusConfig(permissionStatus, isEnabled, isDark, quietHoursActive);

  const content = (
    <View
      className={`
        flex-row items-center p-3 rounded-lg border
        ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'}
      `}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: config.backgroundColor }}
      >
        <Ionicons
          name={config.icon}
          size={16}
          color={config.color}
        />
      </View>

      <View className="flex-1">
        <Text
          className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {config.title}
        </Text>
        {showDetailed && (
          <Text
            className={`text-sm mt-0.5 ${isDark ? 'text-dark-400' : 'text-gray-600'}`}
          >
            {config.subtitle}
          </Text>
        )}
      </View>

      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? '#80848e' : '#6b7280'}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/**
 * Compact version for inline display
 */
export function PermissionStatusBadge({
  permissionStatus,
  isEnabled,
  quietHoursActive = false,
}: Pick<PermissionStatusIndicatorProps, 'permissionStatus' | 'isEnabled' | 'quietHoursActive'>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const config = getStatusConfig(permissionStatus, isEnabled, isDark, quietHoursActive);

  return (
    <View className="flex-row items-center">
      <View
        className="w-2 h-2 rounded-full mr-2"
        style={{ backgroundColor: config.color }}
      />
      <Text
        className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
      >
        {config.title}
      </Text>
    </View>
  );
}