import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "../ui/Avatar";
import { LinkPreviewList } from "./LinkPreview";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { ReadReceiptsDisplay, SeenIndicator, type ReadReceipt } from "./ReadReceipts";
import { MessageReactions, type Reaction } from "./MessageReactions";
import type { FailureReason } from "../../lib/types/offline";

export interface Message {
  id: string;
  /** Local ID for queued messages */
  localId?: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: "pending" | "sending" | "sent" | "delivered" | "read" | "failed";
  /** Failure reason for failed messages */
  failureReason?: FailureReason;
  /** Error message for display */
  errorMessage?: string;
  /** Retry count for failed messages */
  retryCount?: number;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    userReacted: boolean;
    /** Users who reacted (for details modal) */
    users?: Array<{
      id: string;
      name: string;
      avatar?: string;
    }>;
  }>;
  /** Read receipts for group chats */
  readReceipts?: ReadReceipt[];
  /** Total number of recipients (for "X of Y seen" display) */
  totalRecipients?: number;
  attachments?: Array<{
    type: "image" | "file" | "audio" | "voice";
    uri: string;
    name?: string;
    size?: number;
    /** Upload progress (0-100) for pending uploads */
    uploadProgress?: number;
    /** Duration in seconds for voice/audio messages */
    duration?: number;
    /** Waveform data for voice messages */
    waveform?: number[];
  }>;
  isEdited?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  onReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
  onRetry?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  consecutive?: boolean;
  /** Whether to show link previews in messages */
  showLinkPreviews?: boolean;
  /** Voice playback management */
  onVoicePlayStart?: (messageId: string) => void;
  onVoicePlayEnd?: (messageId: string) => void;
  isOtherVoicePlaying?: boolean;
  /** Whether to show read receipts (for group chats) */
  showReadReceipts?: boolean;
  /** Called when user taps read receipts to see details */
  onReadReceiptsPress?: (message: Message) => void;
  /** Whether to show the add reaction button (default: true) */
  showAddReactionButton?: boolean;
  /** Whether to use compact reaction display */
  compactReactions?: boolean;
}

export function MessageBubble({
  message,
  showAvatar = true,
  onReaction,
  onLongPress,
  onRetry,
  onDelete,
  consecutive = false,
  showLinkPreviews = true,
  onVoicePlayStart,
  onVoicePlayEnd,
  isOtherVoicePlaying = false,
  showReadReceipts = false,
  onReadReceiptsPress,
  showAddReactionButton = true,
  compactReactions = false,
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isCurrentUser = message.isCurrentUser;
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  // Handle long press with haptic feedback
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.(message);
  }, [message, onLongPress]);

  // Handle reaction with haptic feedback
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReaction?.(messageId, emoji);
  }, [onReaction]);

  // Pulse animation for pending messages
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isPending = message.status === "pending" || message.status === "sending";
  const isFailed = message.status === "failed";

  useEffect(() => {
    if (isPending) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
    return undefined;
  }, [isPending, pulseAnim]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case "pending":
        return (
          <Ionicons
            name="time-outline"
            size={14}
            color={isDark ? "#80848e" : "#9ca3af"}
          />
        );
      case "sending":
        return (
          <ActivityIndicator
            size={12}
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

  const getFailureText = () => {
    if (!isFailed) return null;
    switch (message.failureReason) {
      case "network_error":
        return "No connection";
      case "rate_limited":
        return "Too fast, try again";
      case "unauthorized":
        return "Not authorized";
      case "server_error":
        return "Server error";
      default:
        return message.errorMessage || "Failed to send";
    }
  };

  // Determine bubble styling based on status
  const getBubbleStyles = () => {
    if (isFailed) {
      return isDark ? "bg-red-950 border border-red-800" : "bg-red-50 border border-red-200";
    }
    if (isPending) {
      return isCurrentUser
        ? isDark
          ? "bg-brand/70"
          : "bg-brand/70"
        : isDark
          ? "bg-dark-700/70"
          : "bg-gray-200/70";
    }
    return isCurrentUser
      ? isDark
        ? "bg-brand"
        : "bg-brand"
      : isDark
        ? "bg-dark-700"
        : "bg-gray-200";
  };

  const bubbleStyles = getBubbleStyles();

  const textStyles = isCurrentUser
    ? isFailed
      ? isDark
        ? "text-red-300"
        : "text-red-700"
      : "text-white"
    : isDark
      ? "text-dark-100"
      : "text-gray-900";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      delayLongPress={300}
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
          <Animated.View
            className={`${bubbleStyles} rounded-2xl px-4 py-2.5 ${
              isCurrentUser ? "rounded-br-md" : "rounded-bl-md"
            }`}
            style={isPending ? { opacity: pulseAnim } : undefined}
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

            {/* Link Previews */}
            {showLinkPreviews && !isPending && !isFailed && (
              <LinkPreviewList
                content={message.content}
                enabled={showLinkPreviews}
                compact={true}
                maxPreviews={2}
              />
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <View className="mt-2">
                {message.attachments.map((attachment, index) => {
                  // Voice message - use VoiceMessagePlayer
                  if (attachment.type === "voice" && attachment.duration) {
                    return (
                      <View key={index} className="mb-1">
                        <VoiceMessagePlayer
                          voice={{
                            uri: attachment.uri,
                            duration: attachment.duration,
                            waveform: attachment.waveform,
                          }}
                          isCurrentUser={isCurrentUser}
                          onPlayStart={() => onVoicePlayStart?.(message.id)}
                          onPlayEnd={() => onVoicePlayEnd?.(message.id)}
                          isOtherPlaying={isOtherVoicePlaying}
                        />
                      </View>
                    );
                  }

                  // Regular attachment
                  return (
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
                  );
                })}
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
          </Animated.View>

          {/* Reactions - using enhanced MessageReactions component */}
          {(message.reactions && message.reactions.length > 0) || showAddReactionButton ? (
            <MessageReactions
              reactions={message.reactions as Reaction[] || []}
              messageId={message.id}
              isCurrentUser={isCurrentUser}
              onReaction={handleReaction}
              showAddButton={showAddReactionButton && !isPending && !isFailed}
              compact={compactReactions}
            />
          ) : null}

          {/* Read Receipts - only show for current user's messages that are read */}
          {showReadReceipts && isCurrentUser && message.status === "read" && (
            <>
              {/* Group chat: show avatars of readers */}
              {message.readReceipts && message.readReceipts.length > 0 ? (
                <ReadReceiptsDisplay
                  receipts={message.readReceipts}
                  totalRecipients={message.totalRecipients}
                  alignRight={true}
                  onPress={() => onReadReceiptsPress?.(message)}
                  maxAvatars={4}
                />
              ) : (
                /* 1:1 chat: show simple "Seen" indicator */
                <SeenIndicator
                  readAt={message.timestamp}
                  alignRight={true}
                />
              )}
            </>
          )}

          {/* Failed Message Actions */}
          {isFailed && (
            <View
              className={`flex-row items-center mt-2 ${isCurrentUser ? "justify-end" : ""}`}
            >
              <Text
                className={`text-xs mr-2 ${isDark ? "text-red-400" : "text-red-600"}`}
              >
                {getFailureText()}
                {message.retryCount ? ` (${message.retryCount} retries)` : ""}
              </Text>
              <TouchableOpacity
                onPress={() => onRetry?.(message)}
                className={`px-3 py-1 rounded-lg mr-2 ${
                  isDark ? "bg-dark-700" : "bg-gray-200"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="refresh-outline"
                    size={14}
                    color={isDark ? "#e5e7eb" : "#374151"}
                  />
                  <Text
                    className={`ml-1 text-xs font-medium ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Retry
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete?.(message)}
                className={`px-3 py-1 rounded-lg ${
                  isDark ? "bg-red-900/50" : "bg-red-100"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="trash-outline"
                    size={14}
                    color={isDark ? "#fca5a5" : "#dc2626"}
                  />
                  <Text
                    className={`ml-1 text-xs font-medium ${
                      isDark ? "text-red-300" : "text-red-600"
                    }`}
                  >
                    Delete
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Upload Progress for Attachments */}
          {isPending && message.attachments?.some((a) => a.uploadProgress !== undefined && a.uploadProgress < 100) && (
            <View className="mt-2">
              {message.attachments
                .filter((a) => a.uploadProgress !== undefined && a.uploadProgress < 100)
                .map((attachment, index) => (
                  <View key={index} className="mb-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        numberOfLines={1}
                      >
                        Uploading {attachment.name || "file"}...
                      </Text>
                      <Text
                        className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {attachment.uploadProgress}%
                      </Text>
                    </View>
                    <View
                      className={`h-1 rounded-full overflow-hidden ${
                        isDark ? "bg-dark-600" : "bg-gray-300"
                      }`}
                    >
                      <View
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${attachment.uploadProgress ?? 0}%` }}
                      />
                    </View>
                  </View>
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
