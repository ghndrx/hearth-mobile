import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Upload, X, Edit2, Trash2, Check } from 'lucide-react-native';

interface Emoji {
  id: string;
  name: string;
  imageUrl: string;
  creator: string;
  createdAt: string;
}

export default function ServerEmojisScreen() {
  const { serverId } = useLocalSearchParams();
  const router = useRouter();
  
  // Mock data - replace with actual API calls
  const [emojis, setEmojis] = useState<Emoji[]>([
    {
      id: '1',
      name: 'party_parrot',
      imageUrl: 'https://cultofthepartyparrot.com/parrots/hd/parrot.gif',
      creator: 'Admin',
      createdAt: '2024-03-01',
    },
    {
      id: '2',
      name: 'thinking',
      imageUrl: 'https://em-content.zobj.net/thumbs/240/apple/354/thinking-face_1f914.png',
      creator: 'Moderator',
      createdAt: '2024-03-05',
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleUploadEmoji = () => {
    Alert.alert('Upload Emoji', 'Image picker would open here');
    // In production: use expo-image-picker to select and upload emoji
  };

  const handleDeleteEmoji = (emojiId: string, emojiName: string) => {
    Alert.alert(
      'Delete Emoji',
      `Are you sure you want to delete :${emojiName}:?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setEmojis(emojis.filter(e => e.id !== emojiId));
            // In production: call API to delete emoji
          },
        },
      ]
    );
  };

  const handleStartEdit = (emoji: Emoji) => {
    setEditingId(emoji.id);
    setEditingName(emoji.name);
  };

  const handleSaveEdit = (emojiId: string) => {
    if (!editingName.trim()) {
      Alert.alert('Error', 'Emoji name cannot be empty');
      return;
    }

    setEmojis(
      emojis.map(e =>
        e.id === emojiId ? { ...e, name: editingName.trim() } : e
      )
    );
    setEditingId(null);
    setEditingName('');
    // In production: call API to rename emoji
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <View className="flex-1 bg-gray-950">
      <Stack.Screen
        options={{
          title: 'Server Emojis',
          headerStyle: { backgroundColor: '#030712' },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView className="flex-1 p-4">
        {/* Upload Button */}
        <TouchableOpacity
          onPress={handleUploadEmoji}
          className="bg-indigo-600 p-4 rounded-lg mb-6 flex-row items-center justify-center"
        >
          <Upload size={20} color="#fff" />
          <Text className="text-white font-semibold ml-2">Upload Emoji</Text>
        </TouchableOpacity>

        {/* Emoji Count */}
        <Text className="text-gray-400 text-sm mb-4">
          {emojis.length} / 50 custom emojis
        </Text>

        {/* Emojis Grid */}
        <View className="space-y-4">
          {emojis.map(emoji => (
            <View
              key={emoji.id}
              className="bg-gray-900 p-4 rounded-lg border border-gray-800"
            >
              <View className="flex-row items-center">
                {/* Emoji Image */}
                <Image
                  source={{ uri: emoji.imageUrl }}
                  className="w-12 h-12 rounded-lg"
                  resizeMode="contain"
                />

                {/* Emoji Info */}
                <View className="flex-1 ml-4">
                  {editingId === emoji.id ? (
                    <View className="flex-row items-center">
                      <Text className="text-white mr-1">:</Text>
                      <TextInput
                        value={editingName}
                        onChangeText={setEditingName}
                        className="flex-1 bg-gray-800 text-white px-2 py-1 rounded"
                        placeholder="emoji_name"
                        placeholderTextColor="#6B7280"
                        autoFocus
                      />
                      <Text className="text-white ml-1">:</Text>
                    </View>
                  ) : (
                    <Text className="text-white font-semibold">
                      :{emoji.name}:
                    </Text>
                  )}
                  <Text className="text-gray-400 text-sm mt-1">
                    Added by {emoji.creator}
                  </Text>
                </View>

                {/* Action Buttons */}
                {editingId === emoji.id ? (
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => handleSaveEdit(emoji.id)}
                      className="p-2"
                    >
                      <Check size={20} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCancelEdit}
                      className="p-2"
                    >
                      <X size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => handleStartEdit(emoji)}
                      className="p-2"
                    >
                      <Edit2 size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteEmoji(emoji.id, emoji.name)}
                      className="p-2"
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {emojis.length === 0 && (
          <View className="items-center justify-center py-12">
            <Text className="text-gray-400 text-center">
              No custom emojis yet.{'\n'}Upload your first emoji to get started!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
