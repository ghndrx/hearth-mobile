import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  useColorScheme,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui';
import type { PermissionRequestResult } from '../../lib/services/notifications';

interface PermissionRequestDialogProps {
  visible: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<PermissionRequestResult>;
  onOpenSettings: () => void;
  permissionStatus?: string;
  title?: string;
  subtitle?: string;
}

interface PermissionFeature {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const notificationFeatures: PermissionFeature[] = [
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Stay Connected',
    description: 'Get instant notifications for direct messages and mentions so you never miss important conversations',
  },
  {
    icon: 'call-outline',
    title: 'Never Miss Calls',
    description: 'Receive notifications for incoming voice and video calls even when the app is closed',
  },
  {
    icon: 'people-outline',
    title: 'Server Activity',
    description: 'Stay updated with friend requests, server invites, and community events',
  },
  {
    icon: 'moon-outline',
    title: 'Smart Controls',
    description: 'Customize notification types, quiet hours, and priority settings to fit your schedule',
  },
];

export function PermissionRequestDialog({
  visible,
  onClose,
  onRequestPermission,
  onOpenSettings,
  permissionStatus,
  title = 'Enable Notifications',
  subtitle = 'Stay connected with your friends and communities',
}: PermissionRequestDialogProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isRequesting, setIsRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState<PermissionRequestResult | null>(null);

  const isPermissionDenied = permissionStatus === 'denied';

  const handleRequestPermission = async () => {
    if (isPermissionDenied) {
      // Permission was denied, need to open system settings
      Linking.openSettings();
      return;
    }

    setIsRequesting(true);
    try {
      const result = await onRequestPermission();
      setRequestResult(result);

      if (result.granted) {
        // Success - close dialog after a brief moment
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const renderContent = () => {
    // Show result if we just completed a request
    if (requestResult) {
      return (
        <View className="items-center">
          <View
            className={`
              w-16 h-16 rounded-full items-center justify-center mb-4
              ${requestResult.granted
                ? isDark ? 'bg-green-500/20' : 'bg-green-100'
                : isDark ? 'bg-red-500/20' : 'bg-red-100'
              }
            `}
          >
            <Ionicons
              name={requestResult.granted ? 'checkmark-circle' : 'close-circle'}
              size={32}
              color={requestResult.granted ? '#10b981' : '#ef4444'}
            />
          </View>

          <Text
            className={`text-xl font-bold text-center mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {requestResult.granted ? 'Perfect!' : 'Permission Required'}
          </Text>

          <Text
            className={`text-center mb-6 ${
              isDark ? 'text-dark-300' : 'text-gray-600'
            }`}
          >
            {requestResult.granted
              ? 'Notifications are now enabled. You\'ll stay connected with your friends and communities.'
              : 'To receive notifications, please enable them in your device settings.'
            }
          </Text>

          {!requestResult.granted && (
            <Button
              title="Open Settings"
              variant="primary"
              onPress={() => Linking.openSettings()}
              leftIcon={<Ionicons name="settings-outline" size={16} color="white" />}
            />
          )}
        </View>
      );
    }

    // Show permission request rationale
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <View
            className={`
              w-16 h-16 rounded-full items-center justify-center mb-4
              ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}
            `}
          >
            <Ionicons
              name="notifications"
              size={32}
              color="#3b82f6"
            />
          </View>

          <Text
            className={`text-xl font-bold text-center mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {title}
          </Text>

          <Text
            className={`text-center mb-6 ${
              isDark ? 'text-dark-300' : 'text-gray-600'
            }`}
          >
            {subtitle}
          </Text>
        </View>

        <View className="mb-6">
          {notificationFeatures.map((feature, index) => (
            <View key={index} className="flex-row items-start mb-4">
              <View
                className={`
                  w-10 h-10 rounded-full items-center justify-center mr-3 mt-1
                  ${isDark ? 'bg-dark-700' : 'bg-gray-100'}
                `}
              >
                <Ionicons
                  name={feature.icon}
                  size={20}
                  color={isDark ? '#80848e' : '#6b7280'}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-medium mb-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {feature.title}
                </Text>
                <Text
                  className={`text-sm leading-5 ${
                    isDark ? 'text-dark-400' : 'text-gray-600'
                  }`}
                >
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {Platform.OS === 'ios' && (
          <View
            className={`
              p-3 rounded-lg mb-6 border
              ${isDark
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-blue-50 border-blue-200'
              }
            `}
          >
            <Text
              className={`text-sm ${
                isDark ? 'text-blue-300' : 'text-blue-700'
              }`}
            >
              <Text className="font-medium">Privacy First: </Text>
              Your notification preferences are stored locally and you can customize exactly which types of notifications you receive.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={`flex-1 ${isDark ? 'bg-dark-900' : 'bg-white'}`}>
        {/* Header */}
        <View
          className={`
            flex-row items-center justify-between p-4 border-b
            ${isDark ? 'border-dark-700' : 'border-gray-200'}
          `}
        >
          <View /> {/* Spacer */}
          <Text
            className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Notifications
          </Text>
          <Button
            title="Close"
            variant="ghost"
            size="sm"
            onPress={onClose}
          />
        </View>

        {/* Content */}
        <View className="flex-1 p-6">
          {renderContent()}
        </View>

        {/* Footer */}
        {!requestResult && (
          <View
            className={`
              p-6 border-t
              ${isDark ? 'border-dark-700' : 'border-gray-200'}
            `}
          >
            <View className="flex-row space-x-3">
              <Button
                title="Not Now"
                variant="secondary"
                className="flex-1"
                onPress={onClose}
              />
              <Button
                title={isPermissionDenied ? 'Open Settings' : 'Enable Notifications'}
                variant="primary"
                className="flex-1"
                isLoading={isRequesting}
                onPress={handleRequestPermission}
                leftIcon={
                  <Ionicons
                    name={isPermissionDenied ? 'settings-outline' : 'notifications'}
                    size={16}
                    color="white"
                  />
                }
              />
            </View>

            {isPermissionDenied && (
              <Text
                className={`text-xs text-center mt-2 ${
                  isDark ? 'text-dark-400' : 'text-gray-500'
                }`}
              >
                Notifications were previously denied. Please enable them in Settings → Hearth → Notifications
              </Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}