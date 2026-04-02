import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Card, Button } from '../ui';
import {
  notificationPermissions,
  NotificationSound,
  VibrationPattern,
  DEFAULT_SOUNDS,
  DEFAULT_VIBRATION_PATTERNS,
} from '../../lib/services/notificationPermissions';

interface SoundPickerProps {
  visible: boolean;
  currentSoundId?: string;
  onSelect: (soundId: string) => void;
  onClose: () => void;
  title?: string;
  allowCustom?: boolean;
}

interface VibrationPickerProps {
  visible: boolean;
  currentPatternId?: string;
  onSelect: (patternId: string) => void;
  onClose: () => void;
  title?: string;
}

export function SoundPicker({
  visible,
  currentSoundId,
  onSelect,
  onClose,
  title = "Select Notification Sound",
  allowCustom = false,
}: SoundPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [sounds, setSounds] = useState<NotificationSound[]>(DEFAULT_SOUNDS);
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [audioInstance, setAudioInstance] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible) {
      loadSounds();
    }

    return () => {
      if (audioInstance) {
        audioInstance.unloadAsync();
      }
    };
  }, [visible]);

  const loadSounds = async () => {
    try {
      const customSounds = await notificationPermissions.getCustomSounds();
      setSounds(customSounds);
    } catch (error) {
      console.error('Failed to load custom sounds:', error);
      setSounds(DEFAULT_SOUNDS);
    }
  };

  const playSound = async (sound: NotificationSound) => {
    try {
      // Stop any currently playing sound
      if (audioInstance) {
        await audioInstance.unloadAsync();
        setAudioInstance(null);
      }

      setPlayingSound(sound.id);

      // For default sounds, use system notification sound
      if (sound.isDefault) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setPlayingSound(null), 1000);
        return;
      }

      // For custom sounds, load and play the audio file
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.filename }, // In a real app, this would be a proper file URI
        { shouldPlay: true }
      );

      setAudioInstance(audioSound);

      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingSound(null);
          audioSound.unloadAsync();
          setAudioInstance(null);
        }
      });

    } catch (error) {
      console.error('Failed to play sound:', error);
      setPlayingSound(null);
      Alert.alert('Error', 'Failed to play sound preview');
    }
  };

  const addCustomSound = async () => {
    // TODO: Implement file picker for custom sounds
    Alert.alert(
      'Custom Sounds',
      'Custom sound import will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
      >
        <Pressable
          className={`rounded-t-2xl max-h-[80%] ${
            isDark ? 'bg-dark-800' : 'bg-white'
          }`}
          onPress={() => {}} // Prevent modal dismiss when touching content
        >
          {/* Header */}
          <View className={`p-4 border-b ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
            <View className="flex-row items-center justify-between">
              <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 -m-2"
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? '#80848e' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sound List */}
          <ScrollView className="flex-1 p-4">
            {/* Default Sounds */}
            <Text className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Default Sounds
            </Text>
            {sounds.filter(s => s.isDefault).map((sound) => (
              <TouchableOpacity
                key={sound.id}
                onPress={() => onSelect(sound.id)}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                  sound.id === currentSoundId
                    ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
                    : (isDark ? 'bg-dark-700' : 'bg-gray-50')
                }`}
              >
                <View className="flex-1">
                  <Text className={`font-medium ${
                    sound.id === currentSoundId
                      ? 'text-blue-500'
                      : (isDark ? 'text-white' : 'text-gray-900')
                  }`}>
                    {sound.name}
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                    Duration: {(sound.duration / 1000).toFixed(1)}s
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => playSound(sound)}
                    className="p-2 mr-2"
                  >
                    <Ionicons
                      name={playingSound === sound.id ? "pause" : "play"}
                      size={20}
                      color={isDark ? '#80848e' : '#6b7280'}
                    />
                  </TouchableOpacity>
                  {sound.id === currentSoundId && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#3b82f6"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Custom Sounds */}
            {sounds.some(s => !s.isDefault) && (
              <>
                <Text className={`font-semibold mt-6 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Custom Sounds
                </Text>
                {sounds.filter(s => !s.isDefault).map((sound) => (
                  <TouchableOpacity
                    key={sound.id}
                    onPress={() => onSelect(sound.id)}
                    className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                      sound.id === currentSoundId
                        ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
                        : (isDark ? 'bg-dark-700' : 'bg-gray-50')
                    }`}
                  >
                    <View className="flex-1">
                      <Text className={`font-medium ${
                        sound.id === currentSoundId
                          ? 'text-blue-500'
                          : (isDark ? 'text-white' : 'text-gray-900')
                      }`}>
                        {sound.name}
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                        Duration: {(sound.duration / 1000).toFixed(1)}s
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => playSound(sound)}
                        className="p-2 mr-2"
                      >
                        <Ionicons
                          name={playingSound === sound.id ? "pause" : "play"}
                          size={20}
                          color={isDark ? '#80848e' : '#6b7280'}
                        />
                      </TouchableOpacity>
                      {sound.id === currentSoundId && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color="#3b82f6"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Add Custom Sound Button */}
            {allowCustom && (
              <View className="mt-6">
                <Button
                  title="Add Custom Sound"
                  variant="secondary"
                  onPress={addCustomSound}
                  leftIcon={<Ionicons name="add" size={16} color={isDark ? '#ffffff' : '#374151'} />}
                />
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function VibrationPicker({
  visible,
  currentPatternId,
  onSelect,
  onClose,
  title = "Select Vibration Pattern",
}: VibrationPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [patterns] = useState<VibrationPattern[]>(DEFAULT_VIBRATION_PATTERNS);

  const testVibration = async (pattern: VibrationPattern) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Use platform vibration API for custom patterns
      if (pattern.pattern.length > 0) {
        Vibration.vibrate(pattern.pattern);
      }
    } catch (error) {
      console.error('Failed to test vibration:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
      >
        <Pressable
          className={`rounded-t-2xl max-h-[80%] ${
            isDark ? 'bg-dark-800' : 'bg-white'
          }`}
          onPress={() => {}} // Prevent modal dismiss when touching content
        >
          {/* Header */}
          <View className={`p-4 border-b ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
            <View className="flex-row items-center justify-between">
              <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 -m-2"
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? '#80848e' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pattern List */}
          <ScrollView className="flex-1 p-4">
            {patterns.map((pattern) => (
              <TouchableOpacity
                key={pattern.id}
                onPress={() => onSelect(pattern.id)}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                  pattern.id === currentPatternId
                    ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
                    : (isDark ? 'bg-dark-700' : 'bg-gray-50')
                }`}
              >
                <View className="flex-1">
                  <Text className={`font-medium ${
                    pattern.id === currentPatternId
                      ? 'text-blue-500'
                      : (isDark ? 'text-white' : 'text-gray-900')
                  }`}>
                    {pattern.name}
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                    Pattern: {pattern.pattern.join('-')}ms
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => testVibration(pattern)}
                    className="p-2 mr-2"
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color={isDark ? '#80848e' : '#6b7280'}
                    />
                  </TouchableOpacity>
                  {pattern.id === currentPatternId && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#3b82f6"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}