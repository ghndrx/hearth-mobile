import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// Types
// ============================================================================

export interface GifAttachment {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string;
}

export interface GifMessageBubbleProps {
  /** The GIF attachment to display */
  gif: GifAttachment;
  /** Whether the message was sent by the current user */
  isCurrentUser: boolean;
  /** Sender display name */
  senderName: string;
  /** Message timestamp */
  timestamp: Date;
  /** Message delivery status */
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  /** Whether to show the sender name (false for consecutive messages) */
  showSender?: boolean;
  /** Called when the GIF is tapped (e.g. open full-screen) */
  onPress?: () => void;
  /** Called on long press (e.g. context menu) */
  onLongPress?: () => void;
  /** Index for staggered entry animation */
  index?: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_GIF_WIDTH = Dimensions.get('window').width * 0.65;
const MIN_GIF_WIDTH = 150;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// Component
// ============================================================================

export function GifMessageBubble({
  gif,
  isCurrentUser,
  senderName,
  timestamp,
  status,
  showSender = true,
  onPress,
  onLongPress,
  index = 0,
}: GifMessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Calculate display dimensions preserving aspect ratio
  const aspectRatio = gif.width / gif.height;
  const displayWidth = Math.min(Math.max(MIN_GIF_WIDTH, gif.width), MAX_GIF_WIDTH);
  const displayHeight = displayWidth / aspectRatio;

  // Press animation
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handleLoad = useCallback(() => setIsLoading(false), []);
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const statusIcon =
    status === 'sending' ? 'time-outline' :
    status === 'sent' ? 'checkmark' :
    status === 'delivered' ? 'checkmark-done' :
    status === 'read' ? 'checkmark-done' : null;

  const statusColor = status === 'read' ? '#5865f2' :
    isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';

  const enterDelay = Math.min(index * 50, 300);

  return (
    <Animated.View
      entering={FadeIn.delay(enterDelay).duration(250)}
      className={`mb-1 mt-1`}
    >
      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={300}
        style={animatedStyle}
        className={`flex-row ${isCurrentUser ? 'justify-end' : 'justify-start'} px-3`}
      >
        <View className={`max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          {/* Sender name */}
          {!isCurrentUser && showSender && (
            <Text className="text-xs font-semibold text-brand mb-1 ml-1">
              {senderName}
            </Text>
          )}

          {/* GIF container */}
          <View
            className={`rounded-2xl overflow-hidden ${
              isDark ? 'bg-neutral-800' : 'bg-neutral-200'
            }`}
            style={{ width: displayWidth, height: displayHeight }}
          >
            {/* Loading indicator */}
            {isLoading && !hasError && (
              <View className="absolute inset-0 items-center justify-center z-10">
                <ActivityIndicator
                  size="small"
                  color={isDark ? '#737373' : '#a3a3a3'}
                />
              </View>
            )}

            {/* Error state */}
            {hasError ? (
              <View className="flex-1 items-center justify-center">
                <Ionicons
                  name="image-outline"
                  size={32}
                  color={isDark ? '#525252' : '#a3a3a3'}
                />
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  GIF failed to load
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: gif.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onLoad={handleLoad}
                onError={handleError}
              />
            )}

            {/* GIF badge */}
            <View className="absolute top-2 left-2 bg-black/50 rounded px-1.5 py-0.5">
              <Text className="text-white text-[10px] font-bold">GIF</Text>
            </View>
          </View>

          {/* Timestamp + status */}
          <View
            className={`flex-row items-center mt-0.5 ${
              isCurrentUser ? 'justify-end' : 'justify-start'
            } px-1`}
          >
            <Text
              className={`text-[10px] ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              {timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isCurrentUser && statusIcon && (
              <View className="ml-1">
                <Ionicons name={statusIcon as any} size={12} color={statusColor} />
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default GifMessageBubble;
