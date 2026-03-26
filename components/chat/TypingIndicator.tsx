/**
 * Typing Indicator Component
 * Shows animated bouncing dots when users are typing
 */

import React, { useEffect } from 'react';
import { View, Text} from 'react-native';
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Avatar } from '../ui';

export interface TypingUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
  showAvatars?: boolean;
  maxAvatars?: number;
}

function AnimatedDot({ delay, isDark }: { delay: number; isDark: boolean }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animStyle}
      className={`w-[5px] h-[5px] rounded-full mx-[2px] ${isDark ? 'bg-dark-300' : 'bg-gray-500'}`}
    />
  );
}

function getTypingText(users: TypingUser[]): string {
  if (users.length === 0) return '';
  if (users.length === 1) return `${users[0].username} is typing`;
  if (users.length === 2) return `${users[0].username} and ${users[1].username} are typing`;
  if (users.length === 3) {
    return `${users[0].username}, ${users[1].username}, and ${users[2].username} are typing`;
  }
  return `${users[0].username}, ${users[1].username}, and ${users.length - 2} others are typing`;
}

export function TypingIndicator({
  users,
  showAvatars = true,
  maxAvatars = 3,
}: TypingIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (users.length === 0) return null;

  const displayedUsers = users.slice(0, maxAvatars);
  const remainingCount = users.length - maxAvatars;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      className={`flex-row items-center px-4 py-2 ${isDark ? 'bg-dark-800' : 'bg-gray-50'}`}
    >
      {showAvatars && (
        <View className="flex-row items-center mr-2">
          {displayedUsers.map((user, index) => (
            <View
              key={user.id}
              style={{ marginLeft: index > 0 ? -8 : 0, zIndex: maxAvatars - index }}
              className="rounded-full border-2 border-transparent"
            >
              <Avatar
                uri={user.avatarUrl}
                name={user.username}
                size={20}
              />
            </View>
          ))}
          {remainingCount > 0 && (
            <View
              style={{ marginLeft: -8 }}
              className="w-5 h-5 rounded-full bg-brand items-center justify-center"
            >
              <Text className="text-white text-[10px] font-semibold">+{remainingCount}</Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row items-center flex-1">
        <Text
          className={`text-xs mr-1.5 ${isDark ? 'text-dark-400' : 'text-gray-500'}`}
          numberOfLines={1}
        >
          {getTypingText(users)}
        </Text>
        <View className="flex-row items-center h-4 justify-center">
          <AnimatedDot delay={0} isDark={isDark} />
          <AnimatedDot delay={150} isDark={isDark} />
          <AnimatedDot delay={300} isDark={isDark} />
        </View>
      </View>
    </Animated.View>
  );
}

export default TypingIndicator;
