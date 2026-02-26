/**
 * Typing Indicator Component
 * Shows animated dots when users are typing
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, useColorScheme, StyleSheet } from 'react-native';
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

function AnimatedDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    };

    Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ]).start();

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [dot1, dot2, dot3]);

  const translateY = (dot: Animated.Value) =>
    dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -4],
    });

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const dotColor = isDark ? '#80848e' : '#5c5e66';

  return (
    <View style={styles.dotsContainer}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor, transform: [{ translateY: translateY(dot1) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor, transform: [{ translateY: translateY(dot2) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor, transform: [{ translateY: translateY(dot3) }] },
        ]}
      />
    </View>
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
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#2b2d31' : '#f2f3f5' },
      ]}
    >
      {showAvatars && (
        <View style={styles.avatarsContainer}>
          {displayedUsers.map((user, index) => (
            <View
              key={user.id}
              style={[
                styles.avatarWrapper,
                { marginLeft: index > 0 ? -8 : 0, zIndex: maxAvatars - index },
              ]}
            >
              <Avatar
                source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
                name={user.username}
                size={20}
              />
            </View>
          ))}
          {remainingCount > 0 && (
            <View
              style={[
                styles.avatarWrapper,
                styles.overflowBadge,
                { backgroundColor: isDark ? '#5865f2' : '#5865f2' },
              ]}
            >
              <Text style={styles.overflowText}>+{remainingCount}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.textContainer}>
        <Text
          style={[styles.typingText, { color: isDark ? '#80848e' : '#5c5e66' }]}
          numberOfLines={1}
        >
          {getTypingText(users)}
        </Text>
        <AnimatedDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 28,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarWrapper: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  overflowBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  overflowText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typingText: {
    fontSize: 12,
    marginRight: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
});

export default TypingIndicator;
