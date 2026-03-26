/**
 * Message Reactions Component
 * Displays reactions below messages with add reaction functionality
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated} from 'react-native';
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';

// ============================================================================
// Types
// ============================================================================

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
  /** Users who reacted (for details modal) */
  users?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

export interface MessageReactionsProps {
  reactions: Reaction[];
  messageId: string;
  isCurrentUser?: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onAddReaction?: (messageId: string) => void;
  /** Whether to show the add reaction button */
  showAddButton?: boolean;
  /** Maximum reactions to show before "more" indicator */
  maxVisible?: number;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Smileys': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  ],
  'Gestures': [
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌',
    '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃', '🤌',
  ],
  'Hearts': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
  ],
  'Objects': [
    '🎉', '🎊', '🎈', '🎁', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽',
    '🔥', '💯', '✨', '⭐', '🌟', '💫', '🌈', '☀️', '🌙', '💡',
    '🎵', '🎶', '🎸', '🎹', '🎺', '🎻', '🥁', '📱', '💻', '🖥️',
    '👀', '💀', '☠️', '👻', '👽', '🤖', '💩', '🎃', '🎭', '🎪',
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
    '☕', '🍵', '🧋', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹',
  ],
};

// ============================================================================
// MessageReactions Component
// ============================================================================

export function MessageReactions({
  reactions,
  messageId,
  isCurrentUser = false,
  onReaction,
  onAddReaction,
  showAddButton = true,
  maxVisible = 8,
  compact = false,
}: MessageReactionsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showPicker, setShowPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);

  const visibleReactions = reactions.slice(0, maxVisible);
  const hiddenCount = reactions.length - maxVisible;

  const handleReactionPress = useCallback((reaction: Reaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReaction(messageId, reaction.emoji);
  }, [messageId, onReaction]);

  const handleReactionLongPress = useCallback((reaction: Reaction) => {
    if (reaction.users && reaction.users.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedReaction(reaction);
      setShowDetails(true);
    }
  }, []);

  const handleAddReaction = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onAddReaction) {
      onAddReaction(messageId);
    } else {
      setShowPicker(true);
    }
  }, [messageId, onAddReaction]);

  const handleSelectEmoji = useCallback((emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReaction(messageId, emoji);
    setShowPicker(false);
  }, [messageId, onReaction]);

  if (reactions.length === 0 && !showAddButton) {
    return null;
  }

  const reactionSize = compact ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const emojiSize = compact ? 'text-sm' : 'text-base';
  const countSize = compact ? 'text-[10px]' : 'text-xs';

  return (
    <>
      <View
        className={`flex-row flex-wrap mt-1.5 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
      >
        {visibleReactions.map((reaction) => (
          <TouchableOpacity
            key={reaction.emoji}
            onPress={() => handleReactionPress(reaction)}
            onLongPress={() => handleReactionLongPress(reaction)}
            delayLongPress={300}
            activeOpacity={0.7}
            className={`flex-row items-center ${reactionSize} rounded-full mr-1.5 mb-1 ${
              reaction.userReacted
                ? isDark
                  ? 'bg-brand/30 border border-brand'
                  : 'bg-brand/20 border border-brand'
                : isDark
                  ? 'bg-dark-700 border border-dark-600'
                  : 'bg-gray-100 border border-gray-200'
            }`}
          >
            <Text className={emojiSize}>{reaction.emoji}</Text>
            {reaction.count > 1 && (
              <Text
                className={`${countSize} ml-1 font-medium ${
                  reaction.userReacted
                    ? 'text-brand'
                    : isDark
                      ? 'text-dark-300'
                      : 'text-gray-600'
                }`}
              >
                {reaction.count}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Hidden reactions indicator */}
        {hiddenCount > 0 && (
          <TouchableOpacity
            onPress={() => setShowDetails(true)}
            activeOpacity={0.7}
            className={`flex-row items-center ${reactionSize} rounded-full mr-1.5 mb-1 ${
              isDark
                ? 'bg-dark-700 border border-dark-600'
                : 'bg-gray-100 border border-gray-200'
            }`}
          >
            <Text className={`${countSize} font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
              +{hiddenCount}
            </Text>
          </TouchableOpacity>
        )}

        {/* Add reaction button */}
        {showAddButton && (
          <TouchableOpacity
            onPress={handleAddReaction}
            activeOpacity={0.7}
            className={`flex-row items-center ${reactionSize} rounded-full mb-1 ${
              isDark
                ? 'bg-dark-700/50 border border-dark-600 border-dashed'
                : 'bg-gray-50 border border-gray-200 border-dashed'
            }`}
          >
            <Ionicons
              name="add"
              size={compact ? 14 : 16}
              color={isDark ? '#80848e' : '#9ca3af'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Reaction Picker Modal */}
      <ReactionPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectEmoji={handleSelectEmoji}
        existingReactions={reactions}
      />

      {/* Reaction Details Modal */}
      <ReactionDetailsModal
        visible={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedReaction(null);
        }}
        reactions={reactions}
        selectedReaction={selectedReaction}
        onReaction={(emoji) => {
          onReaction(messageId, emoji);
        }}
      />
    </>
  );
}

// ============================================================================
// ReactionPickerModal Component
// ============================================================================

interface ReactionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  existingReactions?: Reaction[];
}

function ReactionPickerModal({
  visible,
  onClose,
  onSelectEmoji,
  existingReactions = [],
}: ReactionPickerModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeCategory, setActiveCategory] = useState<string>('Smileys');
  const [showFullPicker, setShowFullPicker] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
      setShowFullPicker(false);
    }
  }, [visible, scaleAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [scaleAnim, onClose]);

  const isEmojiSelected = useCallback((emoji: string) => {
    return existingReactions.some(r => r.emoji === emoji && r.userReacted);
  }, [existingReactions]);

  const renderQuickPicker = () => (
    <Animated.View
      style={[
        styles.quickPickerContainer,
        { 
          backgroundColor: isDark ? '#1e1f22' : '#ffffff',
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.quickReactionsRow}>
        {QUICK_REACTIONS.map((emoji) => {
          const selected = isEmojiSelected(emoji);
          return (
            <TouchableOpacity
              key={emoji}
              onPress={() => onSelectEmoji(emoji)}
              style={[
                styles.quickReactionButton,
                { 
                  backgroundColor: selected
                    ? isDark ? '#5865f230' : '#5865f220'
                    : isDark ? '#2b2d31' : '#f2f3f5',
                  borderWidth: selected ? 1 : 0,
                  borderColor: '#5865f2',
                },
              ]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => setShowFullPicker(true)}
          style={[
            styles.quickReactionButton,
            styles.moreButton,
            { backgroundColor: isDark ? '#2b2d31' : '#f2f3f5' },
          ]}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={isDark ? '#b5bac1' : '#4e5058'}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
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
        <TouchableOpacity onPress={handleClose}>
          <Ionicons
            name="close"
            size={24}
            color={isDark ? '#b5bac1' : '#4e5058'}
          />
        </TouchableOpacity>
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
            onPress={() => setActiveCategory(category)}
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
                  fontWeight: '600',
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
          {EMOJI_CATEGORIES[activeCategory].map((emoji) => {
            const selected = isEmojiSelected(emoji);
            return (
              <TouchableOpacity
                key={emoji}
                onPress={() => onSelectEmoji(emoji)}
                style={[
                  styles.emojiButton,
                  selected && {
                    backgroundColor: isDark ? '#5865f230' : '#5865f220',
                    borderRadius: 8,
                  },
                ]}
              >
                <Text style={styles.emojiLarge}>{emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          {showFullPicker ? renderFullPicker() : renderQuickPicker()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// ReactionDetailsModal Component
// ============================================================================

interface ReactionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  reactions: Reaction[];
  selectedReaction: Reaction | null;
  onReaction: (emoji: string) => void;
}

function ReactionDetailsModal({
  visible,
  onClose,
  reactions,
  selectedReaction,
  onReaction,
}: ReactionDetailsModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedReaction) {
      setActiveEmoji(selectedReaction.emoji);
    } else if (reactions.length > 0) {
      setActiveEmoji(reactions[0].emoji);
    }
  }, [selectedReaction, reactions]);

  const activeReaction = reactions.find(r => r.emoji === activeEmoji);
  const users = activeReaction?.users || [];

  const handleToggleReaction = useCallback(() => {
    if (activeEmoji) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReaction(activeEmoji);
    }
  }, [activeEmoji, onReaction]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.detailsOverlay} onPress={onClose}>
        <Pressable 
          style={[
            styles.detailsContainer,
            { backgroundColor: isDark ? '#1e1f22' : '#ffffff' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.detailsHeader}>
            <Text style={[styles.detailsTitle, { color: isDark ? '#ffffff' : '#060607' }]}>
              Reactions
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? '#b5bac1' : '#4e5058'}
              />
            </TouchableOpacity>
          </View>

          {/* Reaction tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.reactionTabs}
            contentContainerStyle={styles.reactionTabsContent}
          >
            {reactions.map((reaction) => (
              <TouchableOpacity
                key={reaction.emoji}
                onPress={() => setActiveEmoji(reaction.emoji)}
                style={[
                  styles.reactionTab,
                  activeEmoji === reaction.emoji && {
                    backgroundColor: isDark ? '#404249' : '#e3e5e8',
                    borderColor: '#5865f2',
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={styles.reactionTabEmoji}>{reaction.emoji}</Text>
                <Text
                  style={[
                    styles.reactionTabCount,
                    { color: isDark ? '#b5bac1' : '#4e5058' },
                  ]}
                >
                  {reaction.count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Users list */}
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            style={styles.usersList}
            renderItem={({ item }) => (
              <View style={styles.userRow}>
                <Avatar
                  uri={item.avatar}
                  name={item.name}
                  size="sm"
                />
                <Text
                  style={[
                    styles.userName,
                    { color: isDark ? '#ffffff' : '#060607' },
                  ]}
                >
                  {item.name}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={{ color: isDark ? '#80848e' : '#9ca3af' }}>
                  No reactions yet
                </Text>
              </View>
            }
          />

          {/* Toggle reaction button */}
          {activeReaction && (
            <TouchableOpacity
              onPress={handleToggleReaction}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: activeReaction.userReacted
                    ? isDark ? '#404249' : '#e3e5e8'
                    : '#5865f2',
                },
              ]}
            >
              <Text style={styles.toggleEmoji}>{activeEmoji}</Text>
              <Text
                style={[
                  styles.toggleText,
                  { color: activeReaction.userReacted ? (isDark ? '#ffffff' : '#060607') : '#ffffff' },
                ]}
              >
                {activeReaction.userReacted ? 'Remove Reaction' : 'Add Reaction'}
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

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
    gap: 6,
  },
  quickReactionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    borderWidth: 1,
    borderColor: 'rgba(128, 132, 142, 0.3)',
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: 22,
  },
  fullPickerContainer: {
    width: SCREEN_WIDTH - 32,
    maxHeight: 450,
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
    paddingVertical: 6,
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
  },
  emojiLarge: {
    fontSize: 28,
  },
  // Details modal styles
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailsContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34, // Safe area padding
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 132, 142, 0.1)',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reactionTabs: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 132, 142, 0.1)',
  },
  reactionTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  reactionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 132, 142, 0.1)',
    gap: 6,
  },
  reactionTabEmoji: {
    fontSize: 18,
  },
  reactionTabCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  toggleEmoji: {
    fontSize: 20,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessageReactions;
