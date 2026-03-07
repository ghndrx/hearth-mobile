import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
}

const DEFAULT_REACTIONS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '🔥', '👏', '✅', '❌', '👀',
  '🙏', '💯', '🚀', '⭐', '💪', '🤔',
];

const REACTION_CATEGORIES = [
  {
    name: 'Frequently Used',
    emojis: ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'],
  },
  {
    name: 'Emotions',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✊', '👊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌'],
  },
  {
    name: 'Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  },
  {
    name: 'Objects',
    emojis: ['🔥', '⭐', '✨', '💫', '💥', '💯', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🚀', '⚡', '💡', '🔔'],
  },
];

export function ReactionPicker({
  visible,
  onClose,
  onSelectReaction,
}: ReactionPickerProps) {
  const handleSelect = (emoji: string) => {
    onSelectReaction(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
      >
        <Pressable
          className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[70%]"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Add Reaction
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <Text className="text-gray-500 dark:text-gray-400 text-lg">✕</Text>
            </Pressable>
          </View>

          {/* Emoji Grid */}
          <ScrollView className="px-4 py-2">
            {REACTION_CATEGORIES.map((category) => (
              <View key={category.name} className="mb-4">
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {category.name}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {category.emojis.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => handleSelect(emoji)}
                      className="
                        items-center justify-center w-12 h-12 rounded-xl
                        bg-gray-100 dark:bg-gray-800
                        active:bg-gray-200 dark:active:bg-gray-700
                      "
                    >
                      <Text className="text-2xl">{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
