import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, SwitchItem, ListDivider, Button, SelectItem } from '../ui';
import { SoundPicker, VibrationPicker } from './SoundPicker';
import {
  notificationPermissions,
  ServerNotificationSettings,
  PermissionLevel,
  NotificationSound,
  VibrationPattern,
} from '../../lib/services/notificationPermissions';
import { Server } from '../../lib/types';

interface ServerNotificationSettingsProps {
  server: Server;
  onSettingsChange?: (settings: ServerNotificationSettings) => void;
}

export function ServerNotificationSettingsCard({
  server,
  onSettingsChange
}: ServerNotificationSettingsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [settings, setSettings] = useState<ServerNotificationSettings | null>(null);
  const [sounds, setSounds] = useState<NotificationSound[]>([]);
  const [vibrationPatterns, setVibrationPatterns] = useState<VibrationPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showVibrationPicker, setShowVibrationPicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [server.id]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [serverSettings, customSounds, vibrations] = await Promise.all([
        notificationPermissions.getServerSetting(server.id),
        notificationPermissions.getCustomSounds(),
        Promise.resolve(notificationPermissions.getDefaultVibrationPatterns()),
      ]);

      const defaultSettings: ServerNotificationSettings = {
        serverId: server.id,
        serverName: server.name,
        enabled: true,
        messagePermission: 'mentions_only',
        mentionPermission: 'all',
        voiceChannelNotifications: true,
        serverEventNotifications: false,
        quietHoursOverride: false,
        lastUpdated: Date.now(),
      };

      setSettings(serverSettings || defaultSettings);
      setSounds(customSounds);
      setVibrationPatterns(vibrations);
    } catch (error) {
      console.error('Failed to load server settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (updates: Partial<ServerNotificationSettings>) => {
    if (!settings) return;

    try {
      const updated = await notificationPermissions.updateServerSetting(
        server.id,
        server.name,
        updates
      );
      setSettings(updated);
      onSettingsChange?.(updated);
    } catch (error) {
      console.error('Failed to update server setting:', error);
      Alert.alert('Error', 'Failed to update notification setting');
    }
  };

  const handleToggle = async (key: keyof ServerNotificationSettings, value: boolean) => {
    await updateSetting({ [key]: value });
  };

  const handlePermissionChange = async (
    key: 'messagePermission' | 'mentionPermission',
    value: PermissionLevel
  ) => {
    await updateSetting({ [key]: value });
  };

  const permissionOptions = [
    { value: 'all', label: 'All Messages', description: 'Get notified for all messages' },
    { value: 'mentions_only', label: 'Mentions Only', description: 'Only @mentions and replies' },
    { value: 'dm_only', label: 'DMs Only', description: 'Only direct messages' },
    { value: 'none', label: 'None', description: 'No notifications' },
  ];

  const getSoundName = (soundId?: string) => {
    return sounds.find(s => s.id === soundId)?.name || 'Default';
  };

  const getVibrationName = (patternId?: string) => {
    return vibrationPatterns.find(p => p.id === patternId)?.name || 'Default';
  };

  if (isLoading || !settings) {
    return (
      <Card className="p-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
          <View className="ml-3 flex-1">
            <View className="h-4 bg-gray-300 rounded animate-pulse" />
            <View className="h-3 bg-gray-200 rounded mt-2 w-2/3 animate-pulse" />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className={`flex-row items-center justify-between p-4 ${
          isDark ? 'bg-dark-800' : 'bg-white'
        }`}
      >
        <View className="flex-row items-center flex-1">
          {server.icon ? (
            <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
              <Text className="text-lg font-bold">{server.name[0].toUpperCase()}</Text>
            </View>
          ) : (
            <View className={`w-10 h-10 rounded-full items-center justify-center ${
              isDark ? 'bg-dark-600' : 'bg-gray-200'
            }`}>
              <Ionicons name="server-outline" size={20} color={isDark ? '#80848e' : '#6b7280'} />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {server.name}
            </Text>
            <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
              {settings.enabled
                ? `${settings.messagePermission.replace('_', ' ')} • ${
                    settings.mentionPermission
                  } mentions`
                : 'Notifications disabled'
              }
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          {/* Quick toggle switch */}
          <View className="mr-3">
            <Switch
              value={settings.enabled}
              onValueChange={(value) => handleToggle('enabled', value)}
              trackColor={{
                false: isDark ? "#4e5058" : "#d1d5db",
                true: "#5865f2",
              }}
              thumbColor="#ffffff"
              ios_backgroundColor={isDark ? "#4e5058" : "#d1d5db"}
            />
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={isDark ? '#80848e' : '#6b7280'}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Settings */}
      {isExpanded && (
        <View className={`border-t ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
          <View className="p-4 space-y-4">

            {/* Message Permissions */}
            <View className={`${!settings.enabled ? 'opacity-50' : ''}`}>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Message Notifications
              </Text>
              <View className={`rounded-xl overflow-hidden ${
                isDark ? 'bg-dark-700' : 'bg-gray-50'
              } border ${isDark ? 'border-dark-600' : 'border-gray-200'}`}>
                {permissionOptions.map((option, index) => (
                  <React.Fragment key={option.value}>
                    <TouchableOpacity
                      onPress={() => !settings.enabled ? null : handlePermissionChange('messagePermission', option.value as PermissionLevel)}
                      className={`p-3 flex-row items-center justify-between ${
                        settings.messagePermission === option.value
                          ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
                          : ''
                      }`}
                      disabled={!settings.enabled}
                    >
                      <View className="flex-1">
                        <Text className={`font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {option.label}
                        </Text>
                        <Text className={`text-xs mt-0.5 ${
                          isDark ? 'text-dark-400' : 'text-gray-500'
                        }`}>
                          {option.description}
                        </Text>
                      </View>
                      {settings.messagePermission === option.value && (
                        <Ionicons name="checkmark" size={20} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                    {index < permissionOptions.length - 1 && (
                      <View className={`h-px ${isDark ? 'bg-dark-600' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Mention Permissions */}
            <View className={`${!settings.enabled ? 'opacity-50' : ''}`}>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Mention Notifications
              </Text>
              <View className={`rounded-xl overflow-hidden ${
                isDark ? 'bg-dark-700' : 'bg-gray-50'
              } border ${isDark ? 'border-dark-600' : 'border-gray-200'}`}>
                {permissionOptions.slice(0, 3).map((option, index) => (
                  <React.Fragment key={option.value}>
                    <TouchableOpacity
                      onPress={() => !settings.enabled ? null : handlePermissionChange('mentionPermission', option.value as PermissionLevel)}
                      className={`p-3 flex-row items-center justify-between ${
                        settings.mentionPermission === option.value
                          ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
                          : ''
                      }`}
                      disabled={!settings.enabled}
                    >
                      <View className="flex-1">
                        <Text className={`font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {option.label}
                        </Text>
                        <Text className={`text-xs mt-0.5 ${
                          isDark ? 'text-dark-400' : 'text-gray-500'
                        }`}>
                          {option.description}
                        </Text>
                      </View>
                      {settings.mentionPermission === option.value && (
                        <Ionicons name="checkmark" size={20} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                    {index < 2 && (
                      <View className={`h-px ${isDark ? 'bg-dark-600' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Additional Options */}
            <View className={`${!settings.enabled ? 'opacity-50' : ''}`}>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Additional Options
              </Text>
              <View className={`rounded-xl overflow-hidden ${
                isDark ? 'bg-dark-800' : 'bg-white'
              } border ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
                <SwitchItem
                  title="Voice Channel Notifications"
                  subtitle="Join/leave, speaking status"
                  value={settings.voiceChannelNotifications}
                  onValueChange={(value) => handleToggle('voiceChannelNotifications', value)}
                  disabled={!settings.enabled}
                />
                <ListDivider />
                <SwitchItem
                  title="Server Events"
                  subtitle="Member joins, role changes"
                  value={settings.serverEventNotifications}
                  onValueChange={(value) => handleToggle('serverEventNotifications', value)}
                  disabled={!settings.enabled}
                />
                <ListDivider />
                <SwitchItem
                  title="Override Quiet Hours"
                  subtitle="Allow notifications during quiet hours"
                  value={settings.quietHoursOverride}
                  onValueChange={(value) => handleToggle('quietHoursOverride', value)}
                  disabled={!settings.enabled}
                />
              </View>
            </View>

            {/* Sound & Vibration */}
            <View className={`${!settings.enabled ? 'opacity-50' : ''}`}>
              <Text className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Alerts
              </Text>
              <View className={`rounded-xl overflow-hidden ${
                isDark ? 'bg-dark-800' : 'bg-white'
              } border ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
                <TouchableOpacity
                  className="p-4 flex-row items-center justify-between"
                  disabled={!settings.enabled}
                  onPress={() => setShowSoundPicker(true)}
                >
                  <View>
                    <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Notification Sound
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                      {getSoundName(settings.customSound)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#80848e' : '#6b7280'} />
                </TouchableOpacity>
                <ListDivider />
                <TouchableOpacity
                  className="p-4 flex-row items-center justify-between"
                  disabled={!settings.enabled}
                  onPress={() => setShowVibrationPicker(true)}
                >
                  <View>
                    <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Vibration Pattern
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                      {getVibrationName(settings.customVibration)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#80848e' : '#6b7280'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Reset Button */}
            <View className="pt-2">
              <Button
                title="Reset to Default"
                variant="secondary"
                size="sm"
                onPress={async () => {
                  Alert.alert(
                    'Reset Settings',
                    'This will reset all notification settings for this server to default values.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await notificationPermissions.removeServerSetting(server.id);
                            loadSettings();
                          } catch (error) {
                            Alert.alert('Error', 'Failed to reset settings');
                          }
                        },
                      },
                    ]
                  );
                }}
                leftIcon={<Ionicons name="refresh" size={16} color={isDark ? '#ffffff' : '#374151'} />}
              />
            </View>
          </View>
        </View>
      )}

      {/* Sound Picker Modal */}
      <SoundPicker
        visible={showSoundPicker}
        currentSoundId={settings.customSound}
        onSelect={(soundId) => {
          updateSetting({ customSound: soundId });
          setShowSoundPicker(false);
        }}
        onClose={() => setShowSoundPicker(false)}
        title={`${server.name} - Notification Sound`}
        allowCustom={true}
      />

      {/* Vibration Picker Modal */}
      <VibrationPicker
        visible={showVibrationPicker}
        currentPatternId={settings.customVibration}
        onSelect={(patternId) => {
          updateSetting({ customVibration: patternId });
          setShowVibrationPicker(false);
        }}
        onClose={() => setShowVibrationPicker(false)}
        title={`${server.name} - Vibration Pattern`}
      />
    </Card>
  );
}

export default ServerNotificationSettingsCard;