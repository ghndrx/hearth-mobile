import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>;
  attachments?: Array<{ type: 'image' | 'file' | 'audio'; uri: string; name: string; size?: number }>;
}

export interface MessageGroup {
  date: string;
  messages: Message[];
}

interface MessageBubbleProps {
  message: Message | {
    id: string;
    content: string;
    author?: {
      id: string;
      username: string;
      avatar?: string;
    };
    created_at?: string;
    is_own?: boolean;
  };
  onPress?: () => void;
  onLongPress?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onPress,
  onLongPress,
}) => {
  // Handle both Message interface and simpler format
  const isOwn = 'isCurrentUser' in message ? message.isCurrentUser : (message.is_own || false);
  const content = message.content || '';
  const authorName = 'senderName' in message 
    ? message.senderName 
    : (message.author?.username || 'Unknown');
  const timestamp = 'timestamp' in message && message.timestamp instanceof Date
    ? message.timestamp
    : (message.created_at ? new Date(message.created_at) : new Date());

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}
    >
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {!isOwn && (
          <Text style={styles.author}>{authorName}</Text>
        )}
        <Text style={[styles.content, isOwn ? styles.ownContent : styles.otherContent]}>
          {content}
        </Text>
        <Text style={styles.timestamp}>
          {timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#5865F2',
  },
  otherBubble: {
    backgroundColor: '#2F3136',
  },
  author: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B9BBBE',
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownContent: {
    color: '#FFFFFF',
  },
  otherContent: {
    color: '#DCDDDE',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
});
