/**
 * Read Receipts Component
 * Shows who has read a message with avatars and timestamps
 * Similar to WhatsApp/Messenger read receipts for group chats
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable} from 'react-native';
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';

export interface ReadReceipt {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  readAt: Date;
}

interface ReadReceiptsProps {
  /** List of users who have read the message */
  receipts: ReadReceipt[];
  /** Maximum number of avatars to show inline (default: 3) */
  maxAvatars?: number;
  /** Whether to show as compact (just avatars) or with count text */
  compact?: boolean;
  /** Called when user taps to expand receipts */
  onPress?: () => void;
  /** Align to the right (for current user's messages) */
  alignRight?: boolean;
  /** Total number of recipients (for "X of Y seen" display) */
  totalRecipients?: number;
}

interface ReadReceiptsModalProps {
  visible: boolean;
  onClose: () => void;
  receipts: ReadReceipt[];
  /** Optional: show pending recipients who haven't read yet */
  pendingRecipients?: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
}

/**
 * Format relative time for read receipts
 */
function formatReadTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format exact timestamp for modal view
 */
function formatExactTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today at ${timeStr}`;
  if (isYesterday) return `Yesterday at ${timeStr}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Inline read receipts display
 * Shows avatars of readers with optional count
 */
export function ReadReceiptsDisplay({
  receipts,
  maxAvatars = 3,
  compact = false,
  onPress,
  alignRight = false,
  totalRecipients,
}: ReadReceiptsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [modalVisible, setModalVisible] = useState(false);

  const displayedReceipts = useMemo(
    () => receipts.slice(0, maxAvatars),
    [receipts, maxAvatars]
  );
  const remainingCount = receipts.length - maxAvatars;
  const hasMore = remainingCount > 0;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  }, [onPress]);

  if (receipts.length === 0) return null;

  const containerStyle = [
    styles.container,
    alignRight && styles.containerRight,
  ];

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={containerStyle}
        activeOpacity={0.7}
      >
        {/* Avatar stack */}
        <View style={[styles.avatarStack, alignRight && styles.avatarStackRight]}>
          {displayedReceipts.map((receipt, index) => (
            <View
              key={receipt.userId}
              style={[
                styles.avatarWrapper,
                {
                  marginLeft: index > 0 ? -6 : 0,
                  zIndex: maxAvatars - index,
                  borderColor: isDark ? '#1e1f22' : '#ffffff',
                },
              ]}
            >
              <Avatar
                uri={receipt.avatarUrl}
                name={receipt.displayName}
                size="xs"
              />
            </View>
          ))}
          
          {/* Overflow badge */}
          {hasMore && (
            <View
              style={[
                styles.overflowBadge,
                { backgroundColor: isDark ? '#4e5058' : '#9ca3af' },
              ]}
            >
              <Text style={styles.overflowText}>+{remainingCount}</Text>
            </View>
          )}
        </View>

        {/* Text label */}
        {!compact && (
          <Text
            style={[
              styles.seenText,
              { color: isDark ? '#80848e' : '#6b7280' },
            ]}
          >
            {totalRecipients
              ? `Seen by ${receipts.length} of ${totalRecipients}`
              : receipts.length === 1
                ? `Seen by ${receipts[0].displayName}`
                : `Seen by ${receipts.length}`}
          </Text>
        )}

        {/* Expand icon */}
        {receipts.length > 1 && (
          <Ionicons
            name="chevron-forward"
            size={12}
            color={isDark ? '#80848e' : '#9ca3af'}
            style={styles.chevron}
          />
        )}
      </TouchableOpacity>

      {/* Modal for expanded view */}
      <ReadReceiptsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        receipts={receipts}
      />
    </>
  );
}

/**
 * Modal showing full read receipts list
 */
export function ReadReceiptsModal({
  visible,
  onClose,
  receipts,
  pendingRecipients = [],
}: ReadReceiptsModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Sort by read time (most recent first)
  const sortedReceipts = useMemo(
    () => [...receipts].sort((a, b) => b.readAt.getTime() - a.readAt.getTime()),
    [receipts]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? '#2b2d31' : '#ffffff' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? '#ffffff' : '#111827' },
              ]}
            >
              Read by
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? '#1e1f22' : '#f3f4f6' },
              ]}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? '#b5bac1' : '#6b7280'}
              />
            </TouchableOpacity>
          </View>

          {/* Read receipts list */}
          <ScrollView
            style={styles.receiptsList}
            showsVerticalScrollIndicator={false}
          >
            {/* Readers section */}
            {sortedReceipts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="checkmark-done"
                    size={16}
                    color="#5865f2"
                  />
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: isDark ? '#b5bac1' : '#6b7280' },
                    ]}
                  >
                    Read ({sortedReceipts.length})
                  </Text>
                </View>
                
                {sortedReceipts.map((receipt) => (
                  <View key={receipt.userId} style={styles.receiptRow}>
                    <Avatar
                      uri={receipt.avatarUrl}
                      name={receipt.displayName}
                      size="md"
                    />
                    <View style={styles.receiptInfo}>
                      <Text
                        style={[
                          styles.receiptName,
                          { color: isDark ? '#ffffff' : '#111827' },
                        ]}
                      >
                        {receipt.displayName}
                      </Text>
                      <Text
                        style={[
                          styles.receiptUsername,
                          { color: isDark ? '#80848e' : '#9ca3af' },
                        ]}
                      >
                        @{receipt.username}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.receiptTime,
                        { color: isDark ? '#80848e' : '#9ca3af' },
                      ]}
                    >
                      {formatExactTime(receipt.readAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Pending recipients section */}
            {pendingRecipients.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={isDark ? '#80848e' : '#9ca3af'}
                  />
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: isDark ? '#80848e' : '#9ca3af' },
                    ]}
                  >
                    Delivered ({pendingRecipients.length})
                  </Text>
                </View>
                
                {pendingRecipients.map((recipient) => (
                  <View key={recipient.userId} style={styles.receiptRow}>
                    <View style={styles.pendingAvatar}>
                      <Avatar
                        uri={recipient.avatarUrl}
                        name={recipient.displayName}
                        size="md"
                      />
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text
                        style={[
                          styles.receiptName,
                          styles.pendingName,
                          { color: isDark ? '#80848e' : '#9ca3af' },
                        ]}
                      >
                        {recipient.displayName}
                      </Text>
                      <Text
                        style={[
                          styles.receiptUsername,
                          { color: isDark ? '#5c5e66' : '#d1d5db' },
                        ]}
                      >
                        @{recipient.username}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.receiptTime,
                        { color: isDark ? '#5c5e66' : '#d1d5db' },
                      ]}
                    >
                      Not yet
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Compact inline indicator for 1:1 chats
 * Just shows "Seen" with timestamp
 */
export function SeenIndicator({
  readAt,
  alignRight = true,
}: {
  readAt: Date;
  alignRight?: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.seenIndicator,
        alignRight && styles.seenIndicatorRight,
      ]}
    >
      <Ionicons
        name="checkmark-done"
        size={12}
        color="#5865f2"
      />
      <Text
        style={[
          styles.seenIndicatorText,
          { color: isDark ? '#80848e' : '#9ca3af' },
        ]}
      >
        Seen {formatReadTime(readAt)}
      </Text>
    </View>
  );
}

/**
 * Hook for managing read receipts state
 */
export function useReadReceipts(initialReceipts: ReadReceipt[] = []) {
  const [receipts, setReceipts] = useState<ReadReceipt[]>(initialReceipts);

  const addReceipt = useCallback((receipt: ReadReceipt) => {
    setReceipts((prev) => {
      // Avoid duplicates
      if (prev.some((r) => r.userId === receipt.userId)) {
        return prev;
      }
      return [...prev, receipt];
    });
  }, []);

  const removeReceipt = useCallback((userId: string) => {
    setReceipts((prev) => prev.filter((r) => r.userId !== userId));
  }, []);

  const clearReceipts = useCallback(() => {
    setReceipts([]);
  }, []);

  const updateReceipts = useCallback((newReceipts: ReadReceipt[]) => {
    setReceipts(newReceipts);
  }, []);

  return {
    receipts,
    addReceipt,
    removeReceipt,
    clearReceipts,
    updateReceipts,
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  containerRight: {
    justifyContent: 'flex-end',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackRight: {
    flexDirection: 'row-reverse',
  },
  avatarWrapper: {
    borderRadius: 10,
    borderWidth: 2,
  },
  overflowBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  overflowText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  seenText: {
    fontSize: 11,
    marginLeft: 6,
  },
  chevron: {
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34, // Safe area
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 132, 142, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptsList: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  receiptInfo: {
    flex: 1,
    marginLeft: 12,
  },
  receiptName: {
    fontSize: 15,
    fontWeight: '500',
  },
  receiptUsername: {
    fontSize: 13,
    marginTop: 1,
  },
  receiptTime: {
    fontSize: 12,
  },
  pendingAvatar: {
    opacity: 0.6,
  },
  pendingName: {
    fontWeight: '400',
  },
  seenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  seenIndicatorRight: {
    justifyContent: 'flex-end',
  },
  seenIndicatorText: {
    fontSize: 11,
    marginLeft: 4,
  },
});

export default ReadReceiptsDisplay;
