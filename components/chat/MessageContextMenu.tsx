import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  useColorScheme,
  Animated,
  Share,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Message } from "./MessageBubble";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface MessageContextMenuProps {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onPin?: (message: Message) => void;
  position?: { x: number; y: number };
}

interface MenuAction {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  hidden?: boolean;
}

export function MessageContextMenu({
  visible,
  message,
  onClose,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  onPin,
}: MessageContextMenuProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  
  const handleQuickReaction = (emoji: string) => {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReaction(message.id, emoji);
    onClose();
  };
  
  const handleCopy = () => {
    if (!message) return;
    Clipboard.setString(message.content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };
  
  const handleShare = async () => {
    if (!message) return;
    try {
      await Share.share({
        message: message.content,
      });
    } catch {
      // User cancelled or error
    }
    onClose();
  };
  
  const handleReply = () => {
    if (!message || !onReply) return;
    onReply(message);
    onClose();
  };
  
  const handleStartThread = () => {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push({
      pathname: "/chat/thread",
      params: { messageId: message.id },
    });
  };
  
  const handleEdit = () => {
    if (!message || !onEdit) return;
    onEdit(message);
    onClose();
  };
  
  const handleDelete = () => {
    if (!message || !onDelete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(message);
    onClose();
  };
  
  const handlePin = () => {
    if (!message || !onPin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPin(message);
    onClose();
  };
  
  const menuActions: MenuAction[] = [
    {
      icon: "arrow-undo-outline" as const,
      label: "Reply",
      onPress: handleReply,
      hidden: !onReply,
    },
    {
      icon: "chatbubbles-outline" as const,
      label: "Start Thread",
      onPress: handleStartThread,
    },
    {
      icon: "copy-outline" as const,
      label: "Copy",
      onPress: handleCopy,
    },
    {
      icon: "share-outline" as const,
      label: "Share",
      onPress: handleShare,
    },
    {
      icon: "pin-outline" as const,
      label: "Pin",
      onPress: handlePin,
      hidden: !onPin,
    },
    {
      icon: "pencil-outline" as const,
      label: "Edit",
      onPress: handleEdit,
      hidden: !message?.isCurrentUser || !onEdit,
    },
    {
      icon: "trash-outline" as const,
      label: "Delete",
      onPress: handleDelete,
      destructive: true,
      hidden: !message?.isCurrentUser || !onDelete,
    },
  ].filter(action => !action.hidden);
  
  if (!visible || !message) return null;
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center items-center bg-black/40"
        onPress={onClose}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View
              className={`mx-6 rounded-2xl overflow-hidden ${
                isDark ? "bg-neutral-800" : "bg-white"
              } shadow-2xl`}
              style={{ minWidth: 280 }}
            >
              {/* Message Preview */}
              <View className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                <Text
                  numberOfLines={2}
                  className="text-sm text-neutral-600 dark:text-neutral-400"
                >
                  {message.content}
                </Text>
              </View>
              
              {/* Quick Reactions */}
              <View className="flex-row justify-around px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                {QUICK_REACTIONS.map(emoji => {
                  const existingReaction = message.reactions?.find(
                    r => r.emoji === emoji
                  );
                  const userReacted = existingReaction?.userReacted || false;
                  
                  return (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleQuickReaction(emoji)}
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        userReacted
                          ? "bg-violet-100 dark:bg-violet-900/30"
                          : "bg-neutral-100 dark:bg-neutral-700"
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text className="text-xl">{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Actions List */}
              <View className="py-1">
                {menuActions.map((action, index) => (
                  <TouchableOpacity
                    key={action.label}
                    onPress={action.onPress}
                    className="flex-row items-center px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-700"
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                        action.destructive
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-neutral-100 dark:bg-neutral-700"
                      }`}
                    >
                      <Ionicons
                        name={action.icon}
                        size={18}
                        color={
                          action.destructive
                            ? "#ef4444"
                            : isDark
                            ? "#e5e5e5"
                            : "#404040"
                        }
                      />
                    </View>
                    <Text
                      className={`text-base ${
                        action.destructive
                          ? "text-red-500"
                          : "text-neutral-900 dark:text-neutral-100"
                      }`}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Cancel Button */}
              <TouchableOpacity
                onPress={onClose}
                className="border-t border-neutral-200 dark:border-neutral-700 py-3"
                activeOpacity={0.7}
              >
                <Text className="text-center text-base font-medium text-neutral-500 dark:text-neutral-400">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
