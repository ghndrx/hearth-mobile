import React from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../ui/Avatar";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    userReacted: boolean;
  }>;
  attachments?: Array<{
    type: "image" | "file" | "audio";
    uri: string;
    name?: string;
    size?: number;
  }>;
  isEdited?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  onReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
  consecutive?: boolean;
}

export function MessageBubble({
  message,
  showAvatar = true,
  onReaction,
  onLongPress,
  consecutive = false,
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isCurrentUser = message.isCurrentUser;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case "sending":
        return (
          <Ionicons
            name="time-outline"
            size={14}
            color={isDark ? "#80848e" : "#9ca3af"}
          />
        );
      case "sent":
        return (
          <Ionicons
            name="checkmark"
            size={14}
            color={isDark ? "#80848e" : "#9ca3af"}
          />
        );
      case "delivered":
        return (
          <Ionicons
            name="checkmark-done"
            size={14}
            color={isDark ? "#80848e" : "#9ca3af"}
          />
        );
      case "read":
        return <Ionicons name="checkmark-done" size={14} color="#5865f2" />;
      case "failed":
        return <Ionicons name="alert-circle" size={14} color="#ef4444" />;
      default:
        return null;
    }
  };

  const bubbleStyles = isCurrentUser
    ? isDark
      ? "bg-brand"
      : "bg-brand"
    : isDark
      ? "bg-dark-700"
      : "bg-gray-200";

  const textStyles = isCurrentUser
    ? "text-white"
    : isDark
      ? "text-dark-100"
      : "text-gray-900";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={() => onLongPress?.(message)}
      className={`flex-row ${isCurrentUser ? "justify-end" : "justify-start"} ${consecutive ? "mt-1" : "mt-4"}`}
    >
      <View
        className={`flex-row max-w-[85%] ${isCurrentUser ? "flex-row-reverse" : ""}`}
      >
        {/* Avatar */}
        {showAvatar && !isCurrentUser ? (
          <View className="mr-2 mt-1">
            <Avatar
              uri={message.senderAvatar}
              name={message.senderName}
              size="sm"
            />
          </View>
        ) : (
          !isCurrentUser && <View className="w-10 mr-2" />
        )}

        {/* Message Content */}
        <View className="flex-1">
          {/* Reply Preview */}
          {message.replyTo && (
            <View
              className={`mb-1 p-2 rounded-lg ${
                isCurrentUser
                  ? isDark
                    ? "bg-brand-hover"
                    : "bg-brand-hover"
                  : isDark
                    ? "bg-dark-600"
                    : "bg-gray-300"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isCurrentUser
                    ? "text-white/80"
                    : isDark
                      ? "text-dark-300"
                      : "text-gray-600"
                }`}
              >
                {message.replyTo.senderName}
              </Text>
              <Text
                className={`text-xs mt-0.5 ${
                  isCurrentUser
                    ? "text-white/70"
                    : isDark
                      ? "text-dark-400"
                      : "text-gray-500"
                }`}
                numberOfLines={2}
              >
                {message.replyTo.content}
              </Text>
            </View>
          )}

          {/* Message Bubble */}
          <View
            className={`${bubbleStyles} rounded-2xl px-4 py-2.5 ${
              isCurrentUser ? "rounded-br-md" : "rounded-bl-md"
            }`}
          >
            {/* Sender Name (for group chats) */}
            {!isCurrentUser && !consecutive && (
              <Text className="text-brand text-xs font-semibold mb-1">
                {message.senderName}
              </Text>
            )}

            {/* Message Text */}
            <Text className={`${textStyles} text-base leading-5`}>
              {message.content}
            </Text>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <View className="mt-2">
                {message.attachments.map((attachment, index) => (
                  <View
                    key={index}
                    className={`flex-row items-center p-2 rounded-lg mb-1 ${
                      isCurrentUser
                        ? isDark
                          ? "bg-brand-hover"
                          : "bg-brand-hover"
                        : isDark
                          ? "bg-dark-600"
                          : "bg-gray-300"
                    }`}
                  >
                    <Ionicons
                      name={
                        attachment.type === "image"
                          ? "image-outline"
                          : attachment.type === "audio"
                            ? "musical-note-outline"
                            : "document-outline"
                      }
                      size={20}
                      color={
                        isCurrentUser
                          ? "#ffffff"
                          : isDark
                            ? "#b5bac1"
                            : "#6b7280"
                      }
                    />
                    <Text
                      className={`ml-2 text-sm flex-1 ${
                        isCurrentUser
                          ? "text-white"
                          : isDark
                            ? "text-dark-200"
                            : "text-gray-700"
                      }`}
                      numberOfLines={1}
                    >
                      {attachment.name || "Attachment"}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Timestamp and Status */}
            <View
              className={`flex-row items-center mt-1 ${isCurrentUser ? "justify-end" : ""}`}
            >
              <Text
                className={`text-xs ${
                  isCurrentUser
                    ? "text-white/70"
                    : isDark
                      ? "text-dark-400"
                      : "text-gray-500"
                }`}
              >
                {formatTime(message.timestamp)}
              </Text>
              {message.isEdited && (
                <Text
                  className={`text-xs ml-1 ${
                    isCurrentUser
                      ? "text-white/50"
                      : isDark
                        ? "text-dark-500"
                        : "text-gray-400"
                  }`}
                >
                  (edited)
                </Text>
              )}
              {isCurrentUser && (
                <View className="ml-1.5">{getStatusIcon()}</View>
              )}
            </View>
          </View>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <View
              className={`flex-row flex-wrap mt-1 ${isCurrentUser ? "justify-end" : ""}`}
            >
              {message.reactions.map((reaction, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => onReaction?.(message.id, reaction.emoji)}
                  className={`flex-row items-center px-2 py-0.5 rounded-full mr-1 mb-1 ${
                    reaction.userReacted
                      ? isDark
                        ? "bg-brand/30 border border-brand"
                        : "bg-brand/20 border border-brand"
                      : isDark
                        ? "bg-dark-700 border border-dark-600"
                        : "bg-gray-100 border border-gray-200"
                  }`}
                >
                  <Text className="text-sm">{reaction.emoji}</Text>
                  <Text
                    className={`text-xs ml-1 ${
                      reaction.userReacted
                        ? "text-brand"
                        : isDark
                          ? "text-dark-300"
                          : "text-gray-600"
                    }`}
                  >
                    {reaction.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface MessageGroupProps {
  messages: Message[];
  onReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
}

export function MessageGroup({
  messages,
  onReaction,
  onLongPress,
}: MessageGroupProps) {
  return (
    <View>
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isConsecutive =
          prevMessage !== null &&
          prevMessage.senderId === message.senderId &&
          message.timestamp.getTime() - prevMessage.timestamp.getTime() <
            5 * 60 * 1000;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            showAvatar={!isConsecutive}
            onReaction={onReaction}
            onLongPress={onLongPress}
            consecutive={isConsecutive}
          />
        );
      })}
    </View>
  );
}
