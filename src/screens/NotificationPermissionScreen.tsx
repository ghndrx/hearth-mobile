/**
 * Notification Permission Screen
 * Allows users to manage notification permissions and settings
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Import UI components
import {
  Button,
  Card,
  LoadingSpinner,
  Alert as UIAlert,
  ListItem,
  ListSection,
  ListDivider,
  SwitchItem,
  EmptyState,
} from '../../components/ui';

// Import hooks and services
import { useNotificationPermissions } from '../hooks/useNotificationPermissions';
import { NotificationPermissionStatus } from '../services/pushNotifications/permissionService';
import notificationSettingsService from '../services/pushNotifications/NotificationSettingsService';

interface NotificationPermissionScreenProps {
  onPermissionGranted?: () => void;
  onGoBack?: () => void;
  showHeader?: boolean;
}

export function NotificationPermissionScreen({
  onPermissionGranted,
  onGoBack,
  showHeader = true,
}: NotificationPermissionScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { state, actions } = useNotificationPermissions();

  // Initialize notification settings service
  useEffect(() => {
    notificationSettingsService.initialize().catch(error => {
      console.error('Failed to initialize notification settings:', error);
    });
  }, []);

  // Handle permission granted callback
  useEffect(() => {
    if (state.isEnabled && onPermissionGranted) {
      onPermissionGranted();
    }
  }, [state.isEnabled, onPermissionGranted]);

  const handleRequestPermission = async () => {
    try {
      const status = await actions.requestPermissions();

      if (status === NotificationPermissionStatus.GRANTED) {
        // Show success message
        Alert.alert(
          'Notifications Enabled',
          'You will now receive notifications for messages, mentions, and important updates.',
          [{ text: 'OK' }]
        );
      } else if (status === NotificationPermissionStatus.BLOCKED) {
        // Permission is permanently denied, direct to settings
        Alert.alert(
          'Notifications Blocked',
          'Notification permissions have been permanently denied. You can enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: actions.openDeviceSettings }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      Alert.alert(
        'Error',
        'Failed to request notification permissions. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleOpenSettings = () => {
    actions.openDeviceSettings().catch(error => {
      console.error('Failed to open settings:', error);
    });
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case NotificationPermissionStatus.GRANTED:
        return 'checkmark-circle' as keyof typeof Ionicons.glyphMap;
      case NotificationPermissionStatus.DENIED:
      case NotificationPermissionStatus.BLOCKED:
        return 'close-circle' as keyof typeof Ionicons.glyphMap;
      case NotificationPermissionStatus.UNDETERMINED:
        return 'help-circle' as keyof typeof Ionicons.glyphMap;
      default:
        return 'notifications' as keyof typeof Ionicons.glyphMap;
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case NotificationPermissionStatus.GRANTED:
        return '#28A745'; // Green
      case NotificationPermissionStatus.DENIED:
      case NotificationPermissionStatus.BLOCKED:
        return '#DC3545'; // Red
      case NotificationPermissionStatus.UNDETERMINED:
        return '#FFC107'; // Yellow
      default:
        return isDark ? '#6C757D' : '#495057'; // Gray
    }
  };

  const renderPermissionStatus = () => (
    <Card className={`mb-6 ${isDark ? 'bg-dark-800' : 'bg-white'}`}>
      <View className="items-center p-6">
        <View className="mb-4">
          <Ionicons
            name={getStatusIcon()}
            size={64}
            color={getStatusColor()}
          />
        </View>

        <Text className={`text-lg font-semibold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {state.status === NotificationPermissionStatus.GRANTED ? 'Notifications Enabled' :
           state.status === NotificationPermissionStatus.DENIED ? 'Notifications Disabled' :
           state.status === NotificationPermissionStatus.BLOCKED ? 'Notifications Blocked' :
           state.status === NotificationPermissionStatus.UNDETERMINED ? 'Permission Required' :
           'Checking Permissions...'}
        </Text>

        <Text className={`text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {state.description}
        </Text>

        {state.error && (
          <View className="mt-4 w-full">
            <View className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <Text className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                Error
              </Text>
              <Text className={`mt-1 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                {state.error}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Card>
  );

  const renderActionButtons = () => {
    if (state.status === NotificationPermissionStatus.GRANTED) {
      return (
        <View className="gap-3">
          <Button
            title="Manage Notification Settings"
            variant="secondary"
            onPress={handleOpenSettings}
            leftIcon={<Ionicons name="settings-outline" size={20} color={isDark ? '#fff' : '#000'} />}
          />

          <Button
            title="Refresh Status"
            variant="ghost"
            onPress={actions.checkStatus}
            isLoading={state.isLoading}
          />
        </View>
      );
    }

    if (state.status === NotificationPermissionStatus.BLOCKED) {
      return (
        <View className="gap-3">
          <Button
            title="Open Device Settings"
            variant="primary"
            onPress={handleOpenSettings}
            leftIcon={<Ionicons name="settings-outline" size={20} color="#fff" />}
          />

          <Button
            title="Check Again"
            variant="secondary"
            onPress={actions.checkStatus}
            isLoading={state.isLoading}
          />
        </View>
      );
    }

    return (
      <View className="gap-3">
        <Button
          title="Enable Notifications"
          variant="primary"
          onPress={handleRequestPermission}
          isLoading={state.isLoading}
          leftIcon={<Ionicons name="notifications-outline" size={20} color="#fff" />}
          fullWidth
        />

        {state.status === NotificationPermissionStatus.DENIED && (
          <Button
            title="Open Settings"
            variant="secondary"
            onPress={handleOpenSettings}
            leftIcon={<Ionicons name="settings-outline" size={20} color={isDark ? '#fff' : '#000'} />}
          />
        )}
      </View>
    );
  };

  const renderNotificationTypes = () => {
    if (!state.isEnabled) return null;

    const notificationTypes = [
      {
        id: 'messages',
        icon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap,
        title: 'Direct Messages',
        description: 'Get notified when someone sends you a message',
        enabled: true,
      },
      {
        id: 'mentions',
        icon: 'at' as keyof typeof Ionicons.glyphMap,
        title: 'Mentions & Replies',
        description: 'When someone mentions you or replies to your message',
        enabled: true,
      },
      {
        id: 'friend_requests',
        icon: 'person-add-outline' as keyof typeof Ionicons.glyphMap,
        title: 'Friend Requests',
        description: 'New friend requests and acceptances',
        enabled: true,
      },
      {
        id: 'voice_chat',
        icon: 'call-outline' as keyof typeof Ionicons.glyphMap,
        title: 'Voice & Video',
        description: 'Voice chat invitations and calls',
        enabled: true,
      },
      {
        id: 'system',
        icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
        title: 'System Updates',
        description: 'App updates and announcements',
        enabled: false,
      },
    ];

    return (
      <View className="mt-6">
        <Text className={`text-lg font-semibold mb-4 px-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Notification Types
        </Text>

        <ListSection>
          {notificationTypes.map((type, index) => (
            <React.Fragment key={type.id}>
              <SwitchItem
                title={type.title}
                subtitle={type.description}
                value={type.enabled}
                onValueChange={() => {
                  // TODO: Implement notification type toggle
                  console.log(`Toggle ${type.id}:`, !type.enabled);
                }}
              />
              {index < notificationTypes.length - 1 && <ListDivider />}
            </React.Fragment>
          ))}
        </ListSection>
      </View>
    );
  };

  if (state.isLoading && state.status === NotificationPermissionStatus.UNKNOWN) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-900' : 'bg-gray-50'}`}>
        {showHeader && (
          <Stack.Screen
            options={{
              title: 'Notification Settings',
              headerShown: true,
            }}
          />
        )}

        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <Text className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Checking notification permissions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-900' : 'bg-gray-50'}`}>
      {showHeader && (
        <Stack.Screen
          options={{
            title: 'Notification Settings',
            headerShown: true,
            headerLeft: onGoBack ? () => (
              <TouchableOpacity onPress={onGoBack} className="p-2">
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={isDark ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            ) : undefined,
          }}
        />
      )}

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {renderPermissionStatus()}
        {renderActionButtons()}
        {renderNotificationTypes()}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

export default NotificationPermissionScreen;