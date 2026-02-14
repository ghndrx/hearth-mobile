import { useState, useRef, useCallback } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components/ui/Avatar";
import { MessageBubble, Message } from "../../components/chat/MessageBubble";

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

export default function ChatScreen() {
  useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputText, setInputText] = useState("");

  const otherParticipant = mockParticipants.find((p) => p.id !== "2");

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputText.trim(),
      senderId: "2",
      senderName: "You",
      timestamp: new Date(),
      isCurrentUser: true,
      status: "sending",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

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
  }, [inputText]);

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
        />
      );
    },
    [messages],
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View className="flex-row items-center">
              <Avatar
                name={otherParticipant?.name || "Chat"}
                size="sm"
                status={otherParticipant?.isOnline ? "online" : "offline"}
                showStatus
              />
              <View className="ml-3">
                <Text
                  className={`text-base font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {otherParticipant?.name || "Chat"}
                </Text>
                <Text
                  className={`text-xs ${
                    otherParticipant?.isOnline
                      ? "text-green-500"
                      : isDark
                        ? "text-dark-400"
                        : "text-gray-500"
                  }`}
                >
                  {otherParticipant?.isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
          ),
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
          },
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
                  name="call-outline"
                  size={24}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons
                  name="ellipsis-vertical"
                  size={24}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
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
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerClassName="px-4 py-4"
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View
          className={`
            flex-row items-center px-4 py-3 border-t
            ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
          `}
        >
          <TouchableOpacity className="mr-3">
            <Ionicons
              name="add-circle-outline"
              size={28}
              color={isDark ? "#80848e" : "#6b7280"}
            />
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
              placeholder="Type a message..."
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
            disabled={!inputText.trim()}
            className={`
              w-10 h-10 rounded-full items-center justify-center
              ${inputText.trim() ? "bg-brand" : isDark ? "bg-dark-700" : "bg-gray-200"}
            `}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                inputText.trim() ? "white" : isDark ? "#4e5058" : "#9ca3af"
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
