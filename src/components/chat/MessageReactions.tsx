import React from 'react';
import { View, Text, Pressable } from 'react-native';

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReactionPress?: (emoji: string) => void;
  onAddReaction?: () => void;
}

export function MessageReactions({
  reactions,
  onReactionPress,
  onAddReaction,
}: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <Pressable
          key={reaction.emoji}
          onPress={() => onReactionPress?.(reaction.emoji)}
          className={`
            flex-row items-center gap-1 px-2 py-1 rounded-full
            ${reaction.userReacted 
              ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
              : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700'
            }
          `}
        >
          <Text className="text-base">{reaction.emoji}</Text>
          {reaction.count > 1 && (
            <Text
              className={`
                text-xs font-medium
                ${reaction.userReacted 
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {reaction.count}
            </Text>
          )}
        </Pressable>
      ))}
      
      {onAddReaction && (
        <Pressable
          onPress={onAddReaction}
          className="
            items-center justify-center w-7 h-7 rounded-full
            bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700
          "
        >
          <Text className="text-gray-500 dark:text-gray-400 text-base">+</Text>
        </Pressable>
      )}
    </View>
  );
}
