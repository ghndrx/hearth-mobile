import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Audio from "expo-av";
import { CustomSound, getAvailableSounds, getSoundById } from "../../lib/services/notifications";
import { Card, Button } from "../ui";

interface SoundSelectorProps {
  selectedSoundId: string;
  onSoundSelect: (soundId: string) => void;
  onClose: () => void;
}

export function SoundSelector({ selectedSoundId, onSoundSelect, onClose }: SoundSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<Audio.Sound | null>(null);

  const sounds = getAvailableSounds();
  const categorizedSounds = {
    default: sounds.filter(s => s.category === "default"),
    classic: sounds.filter(s => s.category === "classic"),
    custom: sounds.filter(s => s.category === "custom"),
  };

  const playPreview = async (sound: CustomSound) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        await currentAudio.stopAsync();
        await currentAudio.unloadAsync();
        setCurrentAudio(null);
      }

      setPlayingSound(sound.id);

      // For demo purposes, we'll use a default sound since we don't have actual audio files
      // In a real implementation, you would load the actual sound file
      const { sound: audioSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/default.wav"), // Placeholder
        { shouldPlay: true, volume: 0.5 }
      );

      setCurrentAudio(audioSound);

      // Auto-stop after playing
      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingSound(null);
          setCurrentAudio(null);
        }
      });
    } catch (error) {
      console.error("Error playing sound preview:", error);
      setPlayingSound(null);
    }
  };

  const stopPreview = async () => {
    if (currentAudio) {
      await currentAudio.stopAsync();
      await currentAudio.unloadAsync();
      setCurrentAudio(null);
    }
    setPlayingSound(null);
  };

  const handleSoundSelect = (soundId: string) => {
    onSoundSelect(soundId);
  };

  const renderSoundItem = (sound: CustomSound) => {
    const isSelected = selectedSoundId === sound.id;
    const isPlaying = playingSound === sound.id;

    return (
      <TouchableOpacity
        key={sound.id}
        onPress={() => handleSoundSelect(sound.id)}
        className={`
          flex-row items-center justify-between
          p-4 mb-2 rounded-xl
          ${isDark ? "bg-dark-700" : "bg-gray-50"}
          ${isSelected ? (isDark ? "bg-blue-600/20 border border-blue-500" : "bg-blue-50 border border-blue-200") : ""}
        `}
      >
        <View className="flex-row items-center flex-1">
          <View
            className={`
              w-10 h-10 rounded-full items-center justify-center mr-3
              ${isSelected ? (isDark ? "bg-blue-500" : "bg-blue-500") : (isDark ? "bg-dark-600" : "bg-gray-200")}
            `}
          >
            <Ionicons
              name={isSelected ? "checkmark" : "volume-medium-outline"}
              size={20}
              color={isSelected ? "white" : (isDark ? "#9ca3af" : "#6b7280")}
            />
          </View>
          <View className="flex-1">
            <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
              {sound.name}
            </Text>
            {sound.duration && (
              <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                {sound.duration}s
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (isPlaying) {
              stopPreview();
            } else {
              playPreview(sound);
            }
          }}
          className={`
            w-10 h-10 rounded-full items-center justify-center
            ${isDark ? "bg-dark-600" : "bg-gray-200"}
          `}
        >
          <Ionicons
            name={isPlaying ? "stop" : "play"}
            size={18}
            color={isDark ? "#9ca3af" : "#6b7280"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSoundCategory = (title: string, sounds: CustomSound[]) => {
    if (sounds.length === 0) return null;

    return (
      <View className="mb-6">
        <Text
          className={`
            text-sm font-semibold uppercase mb-3
            ${isDark ? "text-dark-400" : "text-gray-500"}
          `}
        >
          {title}
        </Text>
        {sounds.map(renderSoundItem)}
      </View>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      {/* Header */}
      <View
        className={`
          flex-row items-center justify-between
          px-4 py-3 border-b
          ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
        `}
      >
        <View>
          <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Notification Sound
          </Text>
          <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
            Choose your notification sound
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          className={`
            w-8 h-8 rounded-full items-center justify-center
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons name="close" size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4">
        {renderSoundCategory("Default Sounds", categorizedSounds.default)}
        {renderSoundCategory("Classic Sounds", categorizedSounds.classic)}
        {renderSoundCategory("Custom Sounds", categorizedSounds.custom)}

        {/* Custom Sound Upload (Future Feature) */}
        <Card className="p-4 mb-4">
          <View className="flex-row items-center">
            <View
              className={`
                w-12 h-12 rounded-full items-center justify-center mr-4
                ${isDark ? "bg-blue-500/20" : "bg-blue-100"}
              `}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                Upload Custom Sound
              </Text>
              <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
                Add your own notification sounds (Coming Soon)
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Footer */}
      <View
        className={`
          p-4 border-t
          ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
        `}
      >
        <Button
          title="Done"
          variant="primary"
          onPress={onClose}
          className="w-full"
        />
      </View>
    </View>
  );
}