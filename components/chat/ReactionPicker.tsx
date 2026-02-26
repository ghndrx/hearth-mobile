/**
 * Reaction Picker Component
 * Quick emoji picker for message reactions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  useColorScheme,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
  position?: { x: number; y: number };
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

const EMOJI_CATEGORIES = {
  'Smileys': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  ],
  'Gestures': [
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
    '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃',
  ],
  'Hearts': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
  ],
  'Objects': [
    '🎉', '🎊', '🎈', '🎁', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽',
    '🔥', '💯', '✨', '⭐', '🌟', '💫', '🌈', '☀️', '🌙', '💡',
    '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🥁', '📱', '💻', '🖥️',
  ],
  'Animals': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
    '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  ],
  'Food': [
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
    '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🌶️',
    '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🍜', '🍝',
  ],
};

export function ReactionPicker({
  visible,
  onClose,
  onSelectReaction,
}: ReactionPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');
  const [showFullPicker, setShowFullPicker] = useState(false);

  const handleQuickReaction = (emoji: string) => {
    onSelectReaction(emoji);
    onClose();
  };

  const handleEmojiSelect = (emoji: string) => {
    onSelectReaction(emoji);
    setShowFullPicker(false);
    onClose();
  };

  const renderQuickPicker = () => (
    <View
      style={[
        styles.quickPickerContainer,
        { backgroundColor: isDark ? '#1e1f22' : '#ffffff' },
      ]}
    >
      <View style={styles.quickReactionsRow}>
        {QUICK_REACTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => handleQuickReaction(emoji)}
            style={[
              styles.quickReactionButton,
              { backgroundColor: isDark ? '#2b2d31' : '#f2f3f5' },
            ]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setShowFullPicker(true)}
          style={[
            styles.quickReactionButton,
            styles.moreButton,
            { backgroundColor: isDark ? '#2b2d31' : '#f2f3f5' },
          ]}
        >
          <Ionicons
            name="add"
            size={20}
            color={isDark ? '#b5bac1' : '#4e5058'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFullPicker = () => (
    <View
      style={[
        styles.fullPickerContainer,
        { backgroundColor: isDark ? '#1e1f22' : '#ffffff' },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowFullPicker(false)}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? '#b5bac1' : '#4e5058'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#060607' }]}>
          Add Reaction
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      >
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
            style={[
              styles.categoryTab,
              activeCategory === category && {
                backgroundColor: isDark ? '#404249' : '#e3e5e8',
              },
            ]}
          >
            <Text
              style={[
                styles.categoryTabText,
                { color: isDark ? '#b5bac1' : '#4e5058' },
                activeCategory === category && {
                  color: isDark ? '#ffffff' : '#060607',
                },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.emojiGrid} showsVerticalScrollIndicator={false}>
        <View style={styles.emojiGridContent}>
          {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleEmojiSelect(emoji)}
              style={styles.emojiButton}
            >
              <Text style={styles.emojiLarge}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          {showFullPicker ? renderFullPicker() : renderQuickPicker()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPickerContainer: {
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  quickReactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickReactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    borderWidth: 1,
    borderColor: 'rgba(128, 132, 142, 0.2)',
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: 24,
  },
  fullPickerContainer: {
    width: SCREEN_WIDTH - 32,
    maxHeight: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 132, 142, 0.1)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryTabs: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 132, 142, 0.1)',
  },
  categoryTabsContent: {
    paddingHorizontal: 8,
    gap: 4,
    alignItems: 'center',
    paddingVertical: 4,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emojiGrid: {
    flex: 1,
    padding: 12,
  },
  emojiGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emojiLarge: {
    fontSize: 28,
  },
});

export default ReactionPicker;
