/**
 * MentionAutocomplete - @mention suggestions for the message composer
 * Shows filtered user list when typing @username
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  type ListRenderItem,
} from "react-native";
import Animated, {
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { Avatar } from "../ui/Avatar";
import type { User, ServerMember } from "../../lib/types";

// ============================================================================
// Types
// ============================================================================

export interface MentionSuggestion {
  /** User info */
  user: User;
  /** Server-specific nickname (if different from displayName) */
  nickname?: string;
  /** Role color for display */
  roleColor?: string;
  /** Whether this is a special mention (@everyone, @here) */
  isSpecial?: boolean;
}

interface MentionAutocompleteProps {
  /** Whether to show the autocomplete panel */
  visible: boolean;
  /** Current search query (text after @) */
  query: string;
  /** Available users to suggest */
  suggestions: MentionSuggestion[];
  /** Called when a suggestion is selected */
  onSelect: (suggestion: MentionSuggestion) => void;
  /** Called when autocomplete should close */
  onClose: () => void;
  /** Max height of the suggestion list */
  maxHeight?: number;
  /** Whether to show special mentions (@everyone, @here) */
  showSpecialMentions?: boolean;
  /** Current user's permissions (to filter @everyone/@here) */
  canMentionEveryone?: boolean;
}

// ============================================================================
// Special Mentions
// ============================================================================

const SPECIAL_MENTIONS: MentionSuggestion[] = [
  {
    user: {
      id: "everyone",
      username: "everyone",
      displayName: "@everyone",
      email: "",
    },
    isSpecial: true,
  },
  {
    user: {
      id: "here",
      username: "here",
      displayName: "@here",
      email: "",
    },
    isSpecial: true,
  },
];

// ============================================================================
// Component
// ============================================================================

export function MentionAutocomplete({
  visible,
  query,
  suggestions,
  onSelect,
  onClose: _onClose,
  maxHeight = 200,
  showSpecialMentions = true,
  canMentionEveryone = false,
}: MentionAutocompleteProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Start with special mentions if enabled and user has permission
    let results: MentionSuggestion[] = [];
    
    if (showSpecialMentions && canMentionEveryone && normalizedQuery.length > 0) {
      const matchingSpecial = SPECIAL_MENTIONS.filter(
        (s) =>
          s.user.username.toLowerCase().includes(normalizedQuery) ||
          s.user.displayName.toLowerCase().includes(normalizedQuery)
      );
      results = [...matchingSpecial];
    }
    
    // Filter user suggestions
    const matchingUsers = suggestions.filter((s) => {
      if (normalizedQuery.length === 0) return true;
      
      const username = s.user.username.toLowerCase();
      const displayName = s.user.displayName.toLowerCase();
      const nickname = s.nickname?.toLowerCase() || "";
      
      return (
        username.includes(normalizedQuery) ||
        displayName.includes(normalizedQuery) ||
        nickname.includes(normalizedQuery)
      );
    });
    
    // Sort: exact matches first, then by username
    matchingUsers.sort((a, b) => {
      const aExact =
        a.user.username.toLowerCase() === normalizedQuery ||
        a.user.displayName.toLowerCase() === normalizedQuery;
      const bExact =
        b.user.username.toLowerCase() === normalizedQuery ||
        b.user.displayName.toLowerCase() === normalizedQuery;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.user.displayName.localeCompare(b.user.displayName);
    });
    
    return [...results, ...matchingUsers].slice(0, 10);
  }, [query, suggestions, showSpecialMentions, canMentionEveryone]);

  // Render suggestion item
  const renderSuggestion: ListRenderItem<MentionSuggestion> = useCallback(
    ({ item }) => {
      const displayName = item.nickname || item.user.displayName;
      
      return (
        <TouchableOpacity
          onPress={() => onSelect(item)}
          className={`flex-row items-center px-4 py-2.5 ${
            isDark ? "active:bg-dark-600" : "active:bg-gray-100"
          }`}
          activeOpacity={0.7}
        >
          {item.isSpecial ? (
            // Special mention icon
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                isDark ? "bg-brand/20" : "bg-brand/10"
              }`}
            >
              <Text className="text-brand text-lg font-bold">@</Text>
            </View>
          ) : (
            // User avatar
            <View className="mr-3">
              <Avatar
                uri={item.user.avatar}
                name={displayName}
                size="sm"
              />
            </View>
          )}
          
          <View className="flex-1">
            {/* Display name with optional role color */}
            <Text
              className={`text-base font-medium ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              style={item.roleColor ? { color: item.roleColor } : undefined}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            
            {/* Username (if different from display name) */}
            {!item.isSpecial && displayName !== item.user.username && (
              <Text
                className={`text-sm ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
                numberOfLines={1}
              >
                @{item.user.username}
              </Text>
            )}
          </View>
          
          {/* Status indicator for users */}
          {!item.isSpecial && item.user.status && (
            <View
              className={`w-2.5 h-2.5 rounded-full ml-2 ${
                item.user.status === "online"
                  ? "bg-green-500"
                  : item.user.status === "idle"
                    ? "bg-yellow-500"
                    : item.user.status === "dnd"
                      ? "bg-red-500"
                      : "bg-gray-400"
              }`}
            />
          )}
        </TouchableOpacity>
      );
    },
    [isDark, onSelect]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: MentionSuggestion) => item.user.id,
    []
  );

  if (!visible || filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={SlideInDown.duration(150).springify()}
      exiting={SlideOutDown.duration(100)}
      className={`absolute bottom-full left-0 right-0 rounded-t-xl overflow-hidden shadow-lg ${
        isDark ? "bg-dark-800" : "bg-white"
      }`}
      style={{ maxHeight }}
    >
      {/* Header */}
      <View
        className={`px-4 py-2 border-b ${
          isDark ? "border-dark-700" : "border-gray-200"
        }`}
      >
        <Text
          className={`text-xs font-semibold uppercase tracking-wide ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          Members{query ? ` matching "${query}"` : ""}
        </Text>
      </View>
      
      {/* Suggestions list */}
      <FlatList
        data={filteredSuggestions}
        renderItem={renderSuggestion}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4 }}
      />
    </Animated.View>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to detect and extract mention queries from text input
 */
export function useMentionDetection(text: string, cursorPosition: number) {
  return useMemo(() => {
    // Find the @ symbol before cursor
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex === -1) {
      return { isActive: false, query: "", startIndex: -1 };
    }
    
    // Check if @ is at start or preceded by whitespace
    const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : " ";
    if (!/[\s\n]/.test(charBefore) && lastAtIndex !== 0) {
      return { isActive: false, query: "", startIndex: -1 };
    }
    
    // Extract query (text between @ and cursor)
    const query = textBeforeCursor.slice(lastAtIndex + 1);
    
    // Query must not contain spaces (indicates mention is complete)
    if (/\s/.test(query)) {
      return { isActive: false, query: "", startIndex: -1 };
    }
    
    return {
      isActive: true,
      query,
      startIndex: lastAtIndex,
    };
  }, [text, cursorPosition]);
}

/**
 * Helper to insert a mention into text
 */
export function insertMention(
  text: string,
  mention: MentionSuggestion,
  startIndex: number,
  cursorPosition: number
): { newText: string; newCursor: number } {
  const beforeMention = text.slice(0, startIndex);
  const afterMention = text.slice(cursorPosition);
  
  // Format mention as @username (or @everyone/@here for special)
  const mentionText = `@${mention.user.username} `;
  
  const newText = beforeMention + mentionText + afterMention;
  const newCursor = startIndex + mentionText.length;
  
  return { newText, newCursor };
}

/**
 * Convert server members to mention suggestions
 */
export function membersToSuggestions(
  members: ServerMember[]
): MentionSuggestion[] {
  return members.map((member) => ({
    user: member.user,
    nickname: member.nickname,
    roleColor: member.roles?.[0]?.color,
  }));
}

export default MentionAutocomplete;
