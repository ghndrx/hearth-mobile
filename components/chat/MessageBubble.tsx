import React, { useCallback } from 'react';
import { View, Text, Pressable, Image, useColorScheme, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MessageReactions } from './MessageReactions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.65;
const MAX_IMAGE_HEIGHT = 300;

export interface MessageAttachment {
  id?: string;
  type: 'image' | 'file' | 'audio';
  uri: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface Message {
  id: string;
  localId?: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>;
  attachments?: MessageAttachment[];
  replyTo?: { id: string; content: string; senderName: string };
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
  showAvatar?: boolean;
  consecutive?: boolean;
  onPress?: () => void;
  onLongPress?: (message: any) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onRetry?: (message: any) => void;
  onDelete?: (message: any) => void;
  /** Index for staggered entry animation */
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar = true,
  consecutive = false,
  onPress,
  onLongPress,
  onReaction,
  index = 0,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Handle both Message interface and simpler format
  const isOwn = 'isCurrentUser' in message ? message.isCurrentUser : (message.is_own || false);
  const content = message.content || '';
  const authorName = 'senderName' in message
    ? message.senderName
    : (message.author?.username || 'Unknown');
  const timestamp = 'timestamp' in message && message.timestamp instanceof Date
    ? message.timestamp
    : ('created_at' in message && message.created_at ? new Date(message.created_at) : new Date());
  const status = 'status' in message ? message.status : undefined;
  const reactions = 'reactions' in message ? message.reactions : undefined;
  const replyTo = 'replyTo' in message ? message.replyTo : undefined;
  const messageId = message.id;

  // Press animation
  const scale = useSharedValue(1);
  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(message);
  }, [message, onLongPress]);

  // Stagger delay based on index for initial load
  const enterDelay = Math.min(index * 50, 300);

  const statusIcon = status === 'sending' ? 'time-outline' :
    status === 'sent' ? 'checkmark' :
    status === 'delivered' ? 'checkmark-done' :
    status === 'read' ? 'checkmark-done' : null;

  const statusColor = status === 'read' ? '#5865f2' :
    isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';

  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).duration(300).springify().damping(18)}
      className={`mb-1 ${consecutive ? 'mt-0.5' : 'mt-3'}`}
    >
      <AnimatedPressable
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={300}
        style={animatedPressStyle}
        className={`flex-row ${isOwn ? 'justify-end' : 'justify-start'} px-3`}
      >
        {/* Avatar placeholder for alignment */}
        {!isOwn && (
          <View className={`w-8 mr-2 ${showAvatar ? '' : 'opacity-0'}`}>
            {showAvatar && (
              <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-dark-600' : 'bg-gray-300'}`}>
                <Text className={`text-xs font-bold ${isDark ? 'text-dark-200' : 'text-gray-600'}`}>
                  {authorName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}

        <View className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Reply preview */}
          {replyTo && (
            <View className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 border-brand ${isDark ? 'bg-dark-700/60' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-semibold text-brand`}>{replyTo.senderName}</Text>
              <Text className={`text-xs ${isDark ? 'text-dark-300' : 'text-gray-500'}`} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
          )}

          {/* Bubble */}
          <View
            className={`px-3.5 py-2.5 ${
              isOwn
                ? `bg-brand ${consecutive ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tr-sm'}`
                : `${isDark ? 'bg-dark-700' : 'bg-gray-100'} ${consecutive ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tl-sm'}`
            }`}
          >
            {/* Author name for non-consecutive other messages */}
            {!isOwn && !consecutive && showAvatar && (
              <Text className="text-xs font-semibold text-brand mb-1">
                {authorName}
              </Text>
            )}

            {/* Message content */}
            <Text className={`text-[15px] leading-5 ${isOwn ? 'text-white' : isDark ? 'text-dark-100' : 'text-gray-900'}`}>
              {content}
            </Text>

            {/* Image attachments */}
            {'attachments' in message && message.attachments && message.attachments.length > 0 && (
              <View className="mt-2 space-y-2">
                {message.attachments.filter(att => att.type === 'image').map((attachment, imgIndex) => {
                  // Calculate image dimensions maintaining aspect ratio
                  let imgWidth = MAX_IMAGE_WIDTH;
                  let imgHeight = MAX_IMAGE_HEIGHT;
                  
                  if (attachment.width && attachment.height) {
                    const aspectRatio = attachment.width / attachment.height;
                    if (aspectRatio > 1) {
                      // Landscape
                      imgHeight = Math.min(MAX_IMAGE_HEIGHT, imgWidth / aspectRatio);
                    } else {
                      // Portrait or square
                      imgWidth = Math.min(MAX_IMAGE_WIDTH, imgHeight * aspectRatio);
                    }
                  }
                  
                  return (
                    <Animated.View 
                      key={attachment.id || `img-${imgIndex}`}
                      entering={FadeInDown.delay(enterDelay + imgIndex * 50).duration(200)}
                      className="overflow-hidden rounded-lg"
                      style={{ width: imgWidth, height: imgHeight }}
                    >
                      <Image
                        source={{ uri: attachment.uri }}
                        style={{ width: imgWidth, height: imgHeight }}
                        className="object-cover"
                        resizeMode="cover"
                      />
                    </Animated.View>
                  );
                })}
              </View>
            )}

            {/* Timestamp + status row */}
            <View className={`flex-row items-center mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <Text className={`text-[10px] ${isOwn ? 'text-white/40' : isDark ? 'text-dark-400' : 'text-gray-400'}`}>
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isOwn && statusIcon && (
                <Animated.View entering={ZoomIn.duration(200)} className="ml-1">
                  <Ionicons name={statusIcon as any} size={12} color={statusColor} />
                </Animated.View>
              )}
            </View>
          </View>

          {/* Reactions */}
          {reactions && reactions.length > 0 && onReaction && (
            <MessageReactions
              reactions={reactions}
              messageId={messageId}
              isCurrentUser={isOwn}
              onReaction={onReaction}
              compact
            />
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

export default MessageBubble;
