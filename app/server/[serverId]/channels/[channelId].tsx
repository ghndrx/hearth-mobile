import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "../../../../components/ui/Avatar";
import {
  MessageBubble,
  Message,
} from "../../../../components/chat/MessageBubble";
import {
  AttachmentPicker,
  AttachmentPreviewStrip,
  Attachment,
} from "../../../../components/chat/AttachmentPicker";

// Mock channel messages
const mockChannelMessages: Message[] = [
  {
    id: "1",
    content: "Welcome to the channel! Feel free to introduce yourself.",
    senderId: "admin-1",
    senderName: "Alice",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "2",
    content: "Hey everyone! Excited to be here.",
    senderId: "user-2",
    senderName: "Bob",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "3",
    content: "Welcome Bob! Glad to have you.",
    senderId: "admin-1",
    senderName: "Alice",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 11),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "4",
    content:
      "Has anyone tried the new update? There are some cool features.",
    senderId: "user-3",
    senderName: "Charlie",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "5",
    content: "Yeah, the performance improvements are noticeable!",
    senderId: "current",
    senderName: "You",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isCurrentUser: true,
    status: "read",
  },
  {
    id: "6",
    content: "Agreed, especially on older devices.",
    senderId: "user-2",
    senderName: "Bob",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "7",
    content: "Anyone up for a gaming session tonight?",
    senderId: "user-3",
    senderName: "Charlie",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    isCurrentUser: false,
    status: "read",
  },
];

const CHANNEL_NAMES: Record<string, string> = {
  "1": "general",
  "2": "introductions",
  "4": "random",
  "5": "memes",
  "6": "announcements",
};

const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

export default function ChannelChatScreen() {
  const { channelId, serverId: _serverId } = useLocalSearchParams<{
    channelId: string;
    serverId: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const flatListRef = useRef<FlatList>(null);

  const channelName = CHANNEL_NAMES[channelId || ""] || "general";

  const [messages, setMessages] = useState<Message[]>(mockChannelMessages);
  const [inputText, setInputText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [showMemberPanel, setShowMemberPanel] = useState(false);

  const typingAnimation = useRef(new Animated.Value(0)).current;

  // Simulate typing indicator
  useEffect(() => {
    const timer = setTimeout(() => {
      setTypingUsers(["Charlie"]);
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      setTimeout(() => {
        setTypingUsers([]);
        typingAnimation.stopAnimation();
      }, 3000);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const sendMessage = useCallback(() => {
    if (!inputText.trim() && pendingAttachments.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const messageAttachments = pendingAttachments.map((att) => ({
      type: att.type as "image" | "file" | "audio",
      uri: att.uri,
      name: att.name,
      size: att.size,
    }));

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputText.trim(),
      senderId: "current",
      senderName: "You",
      timestamp: new Date(),
      isCurrentUser: true,
      status: "sending",
      attachments:
        messageAttachments.length > 0 ? messageAttachments : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setPendingAttachments([]);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "sent" } : msg,
        ),
      );
    }, 500);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg,
        ),
      );
    }, 1500);
  }, [inputText, pendingAttachments]);

  const handleAttachmentsSelected = useCallback(
    (attachments: Attachment[]) => {
      setPendingAttachments((prev) => {
        const combined = [...prev, ...attachments];
        return combined.slice(0, 10);
      });
    },
    [],
  );

  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const existingReactions = msg.reactions || [];
        const existingIndex = existingReactions.findIndex(
          (r) => r.emoji === emoji,
        );

        if (existingIndex >= 0) {
          const reaction = existingReactions[existingIndex];
          if (reaction.userReacted) {
            return {
              ...msg,
              reactions: existingReactions.filter((r) => r.emoji !== emoji),
            };
          } else {
            const updatedReactions = [...existingReactions];
            updatedReactions[existingIndex] = {
              ...reaction,
              count: reaction.count + 1,
              userReacted: true,
            };
            return { ...msg, reactions: updatedReactions };
          }
        } else {
          return {
            ...msg,
            reactions: [
              ...existingReactions,
              { emoji, count: 1, userReacted: true },
            ],
          };
        }
      }),
    );
    setShowReactionModal(false);
    setSelectedMessage(null);
  }, []);

  const handleLongPress = useCallback((message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(message);
    setShowReactionModal(true);
  }, []);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const isConsecutive =
        prevMessage !== null &&
        prevMessage.senderId === item.senderId &&
        item.timestamp.getTime() - prevMessage.timestamp.getTime() <
          5 * 60 * 1000;

      return (
        <MessageBubble
          message={item}
          showAvatar={!isConsecutive}
          consecutive={isConsecutive}
          onReaction={handleReaction}
          onLongPress={handleLongPress}
        />
      );
    },
    [messages, handleReaction, handleLongPress],
  );

  const mockMembers = [
    { id: "admin-1", name: "Alice", status: "online", role: "Admin" },
    { id: "user-2", name: "Bob", status: "online" },
    { id: "user-3", name: "Charlie", status: "idle" },
    { id: "current", name: "You", status: "online" },
  ];

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <TouchableOpacity
              className="flex-row items-center"
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <Text
                className={`ml-2 text-base font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {channelName}
              </Text>
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
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
                <Ionicons
                  name="search-outline"
                  size={22}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
              <TouchableOpacity className="mr-4">
                <Ionicons
                  name="pin-outline"
                  size={22}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowMemberPanel(!showMemberPanel)}
              >
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={
                    showMemberPanel
                      ? "#f59e0b"
                      : isDark
                        ? "#80848e"
                        : "#6b7280"
                  }
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View className="flex-1 flex-row">
        {/* Main chat area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerClassName="px-4 py-4"
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <View
              className={`px-4 py-2 ${isDark ? "bg-dark-900" : "bg-white"}`}
            >
              <View className="flex-row items-center">
                <Text
                  className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  {typingUsers.join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing
                </Text>
                <View className="flex-row ml-1">
                  {[0, 1, 2].map((i) => (
                    <Animated.View
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full mx-0.5 ${isDark ? "bg-dark-400" : "bg-gray-400"}`}
                      style={{
                        opacity: typingAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1, 0.3],
                          extrapolate: "clamp",
                        }),
                        transform: [
                          {
                            translateY: typingAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -3],
                              extrapolate: "clamp",
                            }),
                          },
                        ],
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Attachment Preview */}
          <AttachmentPreviewStrip
            attachments={pendingAttachments}
            onRemove={handleRemoveAttachment}
          />

          {/* Message input */}
          <View
            className={`
              flex-row items-center px-4 py-3 ${pendingAttachments.length === 0 ? "border-t" : ""}
              ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
            `}
          >
            <TouchableOpacity
              className="mr-3"
              onPress={() => setShowAttachmentPicker(true)}
            >
              <Ionicons
                name="add-circle-outline"
                size={28}
                color={
                  pendingAttachments.length > 0
                    ? "#5865f2"
                    : isDark
                      ? "#80848e"
                      : "#6b7280"
                }
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
              className={`
                flex-1 flex-row items-center rounded-full px-4 py-2 mr-3
                ${isDark ? "bg-dark-700" : "bg-gray-100"}
              `}
            >
              <TextInput
                className={`flex-1 text-base ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                placeholder={`Message #${channelName}`}
                placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity className="ml-2">
                <Ionicons
                  name="happy-outline"
                  size={24}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() && pendingAttachments.length === 0}
              className={`
                w-10 h-10 rounded-full items-center justify-center
                ${inputText.trim() || pendingAttachments.length > 0 ? "bg-hearth-amber" : isDark ? "bg-dark-700" : "bg-gray-200"}
              `}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  inputText.trim() || pendingAttachments.length > 0
                    ? "white"
                    : isDark
                      ? "#4e5058"
                      : "#9ca3af"
                }
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Member side panel */}
        {showMemberPanel && (
          <View
            className={`w-56 border-l ${isDark ? "bg-dark-800 border-dark-700" : "bg-gray-50 border-gray-200"}`}
          >
            <View className="px-3 py-3">
              <Text
                className={`text-xs font-bold tracking-wider ${isDark ? "text-dark-400" : "text-gray-500"}`}
              >
                MEMBERS — {mockMembers.length}
              </Text>
            </View>
            <FlatList
              data={mockMembers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center px-3 py-2"
                  activeOpacity={0.7}
                >
                  <Avatar name={item.name} size="xs" />
                  <View className="ml-2 flex-1">
                    <Text
                      className={`text-sm ${
                        item.role
                          ? "text-hearth-amber font-medium"
                          : isDark
                            ? "text-dark-200"
                            : "text-gray-700"
                      }`}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.role && (
                      <Text
                        className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
                      >
                        {item.role}
                      </Text>
                    )}
                  </View>
                  <View
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        item.status === "online"
                          ? "#22c55e"
                          : item.status === "idle"
                            ? "#f59e0b"
                            : "#80848e",
                    }}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Reaction Modal */}
      <Modal
        visible={showReactionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowReactionModal(false)}
        >
          <View
            className={`
              rounded-2xl p-4 mx-8
              ${isDark ? "bg-dark-800" : "bg-white"}
            `}
          >
            <Text
              className={`text-center mb-4 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Add Reaction
            </Text>
            <View className="flex-row flex-wrap justify-center">
              {commonEmojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() =>
                    selectedMessage &&
                    handleReaction(selectedMessage.id, emoji)
                  }
                  className={`
                    w-12 h-12 rounded-full items-center justify-center m-1
                    ${isDark ? "bg-dark-700" : "bg-gray-100"}
                  `}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedMessage && (
              <View
                className={`mt-4 pt-4 border-t ${isDark ? "border-dark-700" : "border-gray-200"}`}
              >
                <TouchableOpacity
                  onPress={() => {
                    setMessages((prev) =>
                      prev.filter((m) => m.id !== selectedMessage.id),
                    );
                    setShowReactionModal(false);
                    setSelectedMessage(null);
                  }}
                  className="flex-row items-center justify-center py-2"
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text className="text-red-500 ml-2">Delete Message</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

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
