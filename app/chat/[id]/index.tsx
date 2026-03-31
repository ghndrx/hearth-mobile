import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "../../../components/ui/Avatar";
import { MessageBubble, Message } from "../../../components/chat/MessageBubble";
import { SwipeableMessage } from "../../../components/chat/SwipeableMessage";
import { TypingIndicator, TypingUser } from "../../../components/chat/TypingIndicator";
import { MessageReactions } from "../../../components/chat/MessageReactions";
import { MessageContextMenu } from "../../../components/chat/MessageContextMenu";
import {
  AttachmentPicker,
  AttachmentPreviewStrip,
  Attachment,
} from "../../../components/chat/AttachmentPicker";
import {
  SkeletonMessage,
  SkeletonLoader,
} from "../../../components/ui/Skeleton";
import { useMessageQueue } from "../../../lib/contexts/MessageQueueContext";
import { useMessageCacheStore } from "../../../lib/stores/messageCache";
import { useAuthStore } from "../../../lib/stores/auth";
import type { Message as CachedMessage } from "../../../lib/types";

// ---------------------------------------------------------------------------
// Mock data (fallback when no cached data)
// ---------------------------------------------------------------------------

interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

const mockParticipants: ChatParticipant[] = [
  { id: "1", name: "Sarah Johnson", isOnline: true },
  { id: "2", name: "You", isOnline: true },
];

const mockMessages: Message[] = [
  {
    id: "1",
    content: "Hey! Are you coming to the meeting tomorrow?",
    senderId: "1",
    senderName: "Sarah Johnson",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "2",
    content: "Yes, I'll be there! What time is it again?",
    senderId: "2",
    senderName: "You",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
    isCurrentUser: true,
    status: "read",
  },
  {
    id: "3",
    content: "It's at 3 PM in the main conference room.",
    senderId: "1",
    senderName: "Sarah Johnson",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
    isCurrentUser: false,
    status: "read",
    reactions: [
      { emoji: "👍", count: 1, userReacted: true },
    ],
  },
  {
    id: "4",
    content: "Perfect! I'll bring the documents we discussed.",
    senderId: "2",
    senderName: "You",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isCurrentUser: true,
    status: "read",
  },
  {
    id: "5",
    content: "Great, thanks! Looking forward to it.",
    senderId: "1",
    senderName: "Sarah Johnson",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "6",
    content: "By the way, did you see the latest design mockups?",
    senderId: "1",
    senderName: "Sarah Johnson",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    isCurrentUser: false,
    status: "read",
  },
];

// ---------------------------------------------------------------------------
// Chat Skeleton
// ---------------------------------------------------------------------------

function ChatSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonMessage key={i} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const flatListRef = useRef<FlatList>(null);

  // Offline queue and cache
  const { queueMessage, getChannelMessages, isOnline, retryMessage } = useMessageQueue();
  const { getMessages: getCachedMessages, cacheMessages } = useMessageCacheStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? "2";

  // Merge cached messages with queued (pending/sending) messages
  const queuedMessages = getChannelMessages(channelId ?? "");
  const cachedMessages = getCachedMessages(channelId ?? "");

  // Convert cached messages to display format
  const cachedAsDisplay: Message[] = useMemo(
    () =>
      cachedMessages.map((m: CachedMessage) => ({
        id: m.id,
        content: m.content,
        senderId: m.authorId,
        senderName: m.author?.displayName ?? m.authorId,
        senderAvatar: m.author?.avatar,
        timestamp: new Date(m.createdAt),
        isCurrentUser: m.authorId === currentUserId,
        status: "read" as const,
        attachments: m.attachments?.map((a) => ({
          type: (a.contentType.startsWith("image/")
            ? "image"
            : a.contentType.startsWith("audio/")
              ? "audio"
              : "file") as "image" | "file" | "audio",
          uri: a.url,
          name: a.filename,
          size: a.size,
        })),
      })),
    [cachedMessages, currentUserId]
  );

  // Convert queued messages to display format
  const queuedAsDisplay: Message[] = useMemo(
    () =>
      queuedMessages
        .filter((m) => m.status !== "sent")
        .map((m) => ({
          id: m.localId,
          localId: m.localId,
          content: m.content,
          senderId: m.authorId,
          senderName: user?.displayName ?? "You",
          timestamp: new Date(m.queuedAt),
          isCurrentUser: true,
          status: m.status === "failed" ? "sending" : (m.status as "sending" | "sent"),
        })),
    [queuedMessages, user]
  );

  // Use cached + queued if we have cached data, otherwise fall back to mock
  const hasCache = cachedMessages.length > 0;
  const baseMessages = hasCache ? cachedAsDisplay : mockMessages;

  const [messages, setMessages] = useState<Message[]>(baseMessages);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  // Merge base messages with queued outgoing messages
  useEffect(() => {
    // Deduplicate: queued messages that already appeared in cache (by serverId match)
    const existingIds = new Set(baseMessages.map((m) => m.id));
    const newQueued = queuedAsDisplay.filter((m) => !existingIds.has(m.id));
    setMessages([...baseMessages, ...newQueued]);
  }, [baseMessages, queuedAsDisplay]);

  // Cache messages when they're loaded from the server (mock for now)
  useEffect(() => {
    if (!hasCache && channelId) {
      // Cache mock messages for offline access
      const toCache: CachedMessage[] = mockMessages.map((m) => ({
        id: m.id,
        content: m.content,
        authorId: m.senderId,
        channelId: channelId,
        createdAt: m.timestamp.toISOString(),
      }));
      cacheMessages(channelId, toCache);
    }
  }, [channelId, hasCache, cacheMessages]);

  // Send button animation
  const sendScale = useSharedValue(1);
  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Simulate typing indicator
  useEffect(() => {
    const timer = setTimeout(() => {
      setTypingUsers([{ id: "1", username: "Sarah" }]);
      setTimeout(() => setTypingUsers([]), 3000);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const otherParticipant = mockParticipants.find((p) => p.id !== "2");

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() && pendingAttachments.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Send button bounce
    sendScale.value = withSpring(0.8, { damping: 10 });
    setTimeout(() => {
      sendScale.value = withSpring(1, { damping: 10 });
    }, 100);

    const messageAttachments = pendingAttachments.map((att) => ({
      type: att.type as "image" | "file" | "audio",
      uri: att.uri,
      name: att.name,
      size: att.size,
    }));

    // Queue message for offline-safe sending
    const queued = queueMessage(
      inputText.trim(),
      channelId ?? "",
      currentUserId,
      {
        replyTo: replyTo
          ? { messageId: replyTo.id, content: replyTo.content, authorName: replyTo.senderName }
          : undefined,
      }
    );

    // Optimistically add to local display
    const newMessage: Message = {
      id: queued.localId,
      localId: queued.localId,
      content: inputText.trim(),
      senderId: currentUserId,
      senderName: user?.displayName ?? "You",
      timestamp: new Date(),
      isCurrentUser: true,
      status: isOnline ? "sending" : "sending",
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
      replyTo: replyTo
        ? { id: replyTo.id, content: replyTo.content, senderName: replyTo.senderName }
        : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setPendingAttachments([]);
    setReplyTo(null);
  }, [inputText, pendingAttachments, replyTo, sendScale, queueMessage, channelId, currentUserId, user, isOnline]);

  const handleReply = useCallback((message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReplyTo(message);
  }, []);

  const handleDelete = useCallback((message: Message) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  }, []);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const existing = msg.reactions || [];
        const idx = existing.findIndex((r) => r.emoji === emoji);

        if (idx >= 0) {
          const reaction = existing[idx];
          if (reaction.userReacted) {
            return { ...msg, reactions: existing.filter((r) => r.emoji !== emoji) };
          }
          const updated = [...existing];
          updated[idx] = { ...reaction, count: reaction.count + 1, userReacted: true };
          return { ...msg, reactions: updated };
        }
        return {
          ...msg,
          reactions: [...existing, { emoji, count: 1, userReacted: true }],
        };
      }),
    );
    setShowContextMenu(false);
    setSelectedMessage(null);
  }, []);

  const handleLongPress = useCallback((message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(message);
    setShowContextMenu(true);
  }, []);

  const handleEdit = useCallback((message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Set the message content in the input for editing
    setInputText(message.content);
    setShowContextMenu(false);
    setSelectedMessage(null);
    // In a real app, you'd handle message editing differently
    console.log('Edit message:', message.id);
  }, []);

  const handlePin = useCallback((message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In a real app, you'd send pin/unpin request to server
    console.log('Pin message:', message.id);
    setShowContextMenu(false);
    setSelectedMessage(null);
  }, []);

  const handleAttachmentsSelected = useCallback((attachments: Attachment[]) => {
    setPendingAttachments((prev) => [...prev, ...attachments].slice(0, 10));
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Render message with swipe-to-reply
  // ---------------------------------------------------------------------------

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const isConsecutive =
        prevMessage !== null &&
        prevMessage.senderId === item.senderId &&
        item.timestamp.getTime() - prevMessage.timestamp.getTime() < 5 * 60 * 1000;

      return (
        <SwipeableMessage
          message={item}
          showAvatar={!isConsecutive}
          consecutive={isConsecutive}
          onReply={handleReply}
          onDelete={handleDelete}
          onReaction={handleReaction}
          onLongPress={handleLongPress}
          allowDelete={item.isCurrentUser}
        />
      );
    },
    [messages, handleReply, handleDelete, handleReaction, handleLongPress],
  );

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View className="flex-row items-center">
              <Avatar
                name={otherParticipant?.name || "Chat"}
                size={32}
              />
              <View className="ml-3">
                <Text
                  className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {otherParticipant?.name || "Chat"}
                </Text>
                <Text
                  className={`text-xs ${
                    otherParticipant?.isOnline
                      ? "text-green-500"
                      : isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  {otherParticipant?.isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
          ),
          headerStyle: { backgroundColor: isDark ? "#1e1f22" : "#ffffff" },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View className="flex-row mr-4">
              <TouchableOpacity className="mr-4">
                <Ionicons name="call-outline" size={24} color={isDark ? "#80848e" : "#6b7280"} />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="ellipsis-vertical" size={24} color={isDark ? "#80848e" : "#6b7280"} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {/* Message List */}
        <SkeletonLoader loading={isLoading} skeleton={<ChatSkeleton />}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerClassName="px-1 py-4"
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        </SkeletonLoader>

        {/* Typing Indicator */}
        <TypingIndicator users={typingUsers} showAvatars={false} />

        {/* Reply Preview */}
        {replyTo && (
          <Animated.View
            entering={SlideInDown.duration(200)}
            exiting={SlideOutDown.duration(150)}
            className={`mx-4 mt-2 p-3 rounded-lg flex-row items-center ${isDark ? "bg-dark-700" : "bg-gray-100"}`}
          >
            <View className="w-0.5 h-full bg-brand absolute left-0 rounded-full" />
            <View className="flex-1 pl-2">
              <Text className="text-brand text-xs font-semibold">
                Replying to {replyTo.senderName}
              </Text>
              <Text
                className={`text-sm mt-0.5 ${isDark ? "text-dark-300" : "text-gray-600"}`}
                numberOfLines={1}
              >
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyTo(null)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={20} color={isDark ? "#80848e" : "#9ca3af"} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Attachment Preview */}
        <AttachmentPreviewStrip
          attachments={pendingAttachments}
          onRemove={handleRemoveAttachment}
        />

        {/* Composer */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(400)}
          className={`flex-row items-center px-4 py-3 ${
            pendingAttachments.length === 0 ? "border-t" : ""
          } ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}`}
        >
          <TouchableOpacity
            className="mr-3"
            onPress={() => setShowAttachmentPicker(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={28}
              color={pendingAttachments.length > 0 ? "#5865f2" : isDark ? "#80848e" : "#6b7280"}
            />
            {pendingAttachments.length > 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {pendingAttachments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View
            className={`flex-1 flex-row items-center rounded-full px-4 py-2 mr-3 ${isDark ? "bg-dark-700" : "bg-gray-100"}`}
          >
            <TextInput
              className={`flex-1 text-base ${isDark ? "text-white" : "text-gray-900"}`}
              placeholder={
                pendingAttachments.length > 0
                  ? "Add a caption..."
                  : replyTo
                    ? `Reply to ${replyTo.senderName}...`
                    : "Type a message..."
              }
              placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity className="ml-2">
              <Ionicons name="happy-outline" size={24} color={isDark ? "#80848e" : "#6b7280"} />
            </TouchableOpacity>
          </View>

          <Animated.View style={sendAnimStyle}>
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputText.trim() && pendingAttachments.length === 0}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() || pendingAttachments.length > 0
                  ? "bg-brand"
                  : isDark ? "bg-dark-700" : "bg-gray-200"
              }`}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  inputText.trim() || pendingAttachments.length > 0
                    ? "white"
                    : isDark ? "#4e5058" : "#9ca3af"
                }
              />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Message Context Menu */}
      <MessageContextMenu
        visible={showContextMenu}
        message={selectedMessage}
        onClose={() => {
          setShowContextMenu(false);
          setSelectedMessage(null);
        }}
        onReaction={handleReaction}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
      />

      {/* Attachment Picker */}
      <AttachmentPicker
        visible={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onAttachmentsSelected={handleAttachmentsSelected}
        maxAttachments={10 - pendingAttachments.length}
      />
    </SafeAreaView>
  );
}
