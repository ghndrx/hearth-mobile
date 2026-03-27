import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Card } from "../../components/ui/Card";

interface SimulatedEvent {
  id: string;
  type: "message" | "member_join" | "member_leave" | "reaction_add" | "voice_join";
  description: string;
  icon: string;
  color: string;
  payload: any;
}

interface TestMessage {
  id: string;
  content: string;
  author: {
    username: string;
    avatar?: string;
  };
  timestamp: string;
  type: "user" | "bot";
}

const EVENT_TYPES: SimulatedEvent[] = [
  {
    id: "message",
    type: "message",
    description: "Simulate a user sending a message",
    icon: "chatbubble-outline",
    color: "#5865f2",
    payload: {
      content: "!ping",
      author: { username: "TestUser", id: "123456789" },
      channel: { name: "general" },
    },
  },
  {
    id: "member_join",
    type: "member_join",
    description: "Simulate a new member joining the server",
    icon: "person-add-outline",
    color: "#00d26a",
    payload: {
      user: { username: "NewUser", id: "987654321" },
      guild: { name: "Test Server", memberCount: 42 },
    },
  },
  {
    id: "member_leave",
    type: "member_leave",
    description: "Simulate a member leaving the server",
    icon: "person-remove-outline",
    color: "#f04747",
    payload: {
      user: { username: "LeftUser", id: "555666777" },
      guild: { name: "Test Server" },
    },
  },
  {
    id: "reaction_add",
    type: "reaction_add",
    description: "Simulate adding a reaction to a message",
    icon: "heart-outline",
    color: "#ffa500",
    payload: {
      emoji: "👍",
      user: { username: "ReactUser", id: "111222333" },
      message: { content: "Great bot!" },
    },
  },
  {
    id: "voice_join",
    type: "voice_join",
    description: "Simulate joining a voice channel",
    icon: "mic-outline",
    color: "#8b5cf6",
    payload: {
      user: { username: "VoiceUser", id: "444555666" },
      channel: { name: "General Voice" },
    },
  },
];

const QUICK_COMMANDS = [
  "!ping",
  "!help",
  "!serverinfo",
  "!roll 1d6",
  "!weather",
  "!joke",
];

export default function PlaygroundScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [messages, setMessages] = useState<TestMessage[]>([
    {
      id: "1",
      content: "🤖 Bot is now online and ready for testing!",
      author: { username: "System" },
      timestamp: "now",
      type: "bot",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedBot, setSelectedBot] = useState("My First Bot");
  const [isProcessing, setIsProcessing] = useState(false);

  const colors = {
    background: isDark ? "#1e1f22" : "#ffffff",
    surface: isDark ? "#2b2d31" : "#f8f9fa",
    border: isDark ? "#3c4043" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#1f2937",
    textSecondary: isDark ? "#b9bbbe" : "#6b7280",
    accent: "#5865f2",
    success: "#00d26a",
    warning: "#ffa500",
    error: "#f04747",
  };

  const simulateEvent = useCallback((event: SimulatedEvent) => {
    setIsProcessing(true);

    const eventMessage: TestMessage = {
      id: Date.now().toString(),
      content: `🔔 Event: ${event.description}`,
      author: { username: "System" },
      timestamp: "now",
      type: "bot",
    };

    setMessages(prev => [...prev, eventMessage]);

    // Simulate bot response based on event type
    setTimeout(() => {
      let botResponse: TestMessage;

      switch (event.type) {
        case "member_join":
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: `👋 Welcome to the server, ${event.payload.user.username}!

Please read our rules in #rules and introduce yourself in #introductions.
Feel free to ask questions in #help if you need assistance!`,
            author: { username: selectedBot },
            timestamp: "now",
            type: "bot",
          };
          break;

        case "member_leave":
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: `👋 **${event.payload.user.username}** has left the server.`,
            author: { username: selectedBot },
            timestamp: "now",
            type: "bot",
          };
          break;

        case "reaction_add":
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: `${event.payload.emoji} Reaction added by ${event.payload.user.username}`,
            author: { username: selectedBot },
            timestamp: "now",
            type: "bot",
          };
          break;

        case "voice_join":
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: `🎵 ${event.payload.user.username} joined ${event.payload.channel.name}`,
            author: { username: selectedBot },
            timestamp: "now",
            type: "bot",
          };
          break;

        default:
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: `✅ Event processed successfully`,
            author: { username: selectedBot },
            timestamp: "now",
            type: "bot",
          };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsProcessing(false);
    }, 1000);
  }, [selectedBot]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    const userMessage: TestMessage = {
      id: Date.now().toString(),
      content,
      author: { username: "TestUser" },
      timestamp: "now",
      type: "user",
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsProcessing(true);

    // Simulate bot response
    setTimeout(() => {
      let botResponse: TestMessage;

      if (content.toLowerCase().includes("ping")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: "🏓 Pong! Latency: 42ms",
          author: { username: selectedBot },
          timestamp: "now",
          type: "bot",
        };
      } else if (content.toLowerCase().includes("help")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: `📚 **Available Commands:**

!ping - Check bot latency
!serverinfo - Show server information
!help - Display this help message
!roll [dice] - Roll dice (e.g., !roll 1d6)
!weather [city] - Get weather info
!joke - Tell a random joke`,
          author: { username: selectedBot },
          timestamp: "now",
          type: "bot",
        };
      } else if (content.toLowerCase().includes("serverinfo")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: `📊 **Server Information**

🏷️ **Name:** Test Server
👥 **Members:** 42
📅 **Created:** March 15, 2024
👑 **Owner:** <@123456789>
🌍 **Region:** US East
📺 **Channels:** 15`,
          author: { username: selectedBot },
          timestamp: "now",
          type: "bot",
        };
      } else if (content.toLowerCase().includes("roll")) {
        const roll = Math.floor(Math.random() * 6) + 1;
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: `🎲 You rolled a **${roll}**!`,
          author: { username: selectedBot },
          timestamp: "now",
          type: "bot",
        };
      } else if (content.toLowerCase().includes("joke")) {
        const jokes = [
          "Why do programmers prefer dark mode? Because light attracts bugs!",
          "Why don't scientists trust atoms? Because they make up everything!",
          "Why did the bot cross the road? To get to the other API!",
        ];
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: `😄 ${jokes[Math.floor(Math.random() * jokes.length)]}`,
          author: { username: selectedBot },
          timestamp: "now",
          type: "bot",
        };
      } else {
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: "🤔 I didn't understand that command. Try `!help` for available commands.",
          author: { username: selectedBot },
          timestamp: "now",
          type: "bot",
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsProcessing(false);
    }, Math.random() * 1000 + 500);
  }, [selectedBot]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: "1",
        content: "🤖 Bot playground cleared and ready for testing!",
        author: { username: "System" },
        timestamp: "now",
        type: "bot",
      },
    ]);
  }, []);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{ borderBottomColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View>
            <Text className="text-lg font-semibold" style={{ color: colors.text }}>
              Bot Playground
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              Test your bot in a safe environment
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={clearMessages}
          className="p-2 rounded-lg"
          style={{ backgroundColor: colors.surface }}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Event Simulator */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="p-4 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
            Event Simulator
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={EVENT_TYPES}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item: event }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => simulateEvent(event)}
                disabled={isProcessing}
                className={`p-3 rounded-lg min-w-[140px] ${isProcessing ? 'opacity-50' : ''}`}
                style={{ backgroundColor: event.color + "20", borderColor: event.color, borderWidth: 1 }}
              >
                <View className="items-center">
                  <Ionicons name={event.icon as any} size={24} color={event.color} />
                  <Text className="text-xs text-center mt-2 font-medium" style={{ color: event.color }}>
                    {event.description}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </Animated.View>

        {/* Quick Commands */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="p-4 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
            Quick Commands
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {QUICK_COMMANDS.map((command) => (
              <TouchableOpacity
                key={command}
                onPress={() => sendMessage(command)}
                disabled={isProcessing}
                className={`px-3 py-2 rounded-lg border ${isProcessing ? 'opacity-50' : ''}`}
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <Text className="text-sm font-mono" style={{ color: colors.accent }}>
                  {command}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Chat Messages */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          className="flex-1 p-4"
        >
          <Text className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
            Chat Simulation
          </Text>

          <View className="mb-4 rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.surface, minHeight: 300 }}>
            <ScrollView className="flex-1 p-3">
              {messages.map((message) => (
                <View key={message.id} className="mb-3">
                  <View className="flex-row items-center mb-1">
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: message.type === "bot" ? colors.accent : colors.success
                      }}
                    >
                      {message.author.username}
                    </Text>
                    <Text className="text-xs ml-2" style={{ color: colors.textSecondary }}>
                      {message.timestamp}
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: colors.text }}>
                    {message.content}
                  </Text>
                </View>
              ))}

              {isProcessing && (
                <View className="mb-3 flex-row items-center">
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    {selectedBot} is typing...
                  </Text>
                  <View className="ml-2 flex-row">
                    <Text className="text-sm animate-pulse" style={{ color: colors.textSecondary }}>●</Text>
                    <Text className="text-sm animate-pulse" style={{ color: colors.textSecondary }}>●</Text>
                    <Text className="text-sm animate-pulse" style={{ color: colors.textSecondary }}>●</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Message Input */}
          <View className="flex-row gap-2">
            <TextInput
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Type a message or command..."
              placeholderTextColor={colors.textSecondary}
              className="flex-1 p-3 rounded-lg border"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              onSubmitEditing={() => sendMessage(inputMessage)}
            />
            <TouchableOpacity
              onPress={() => sendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isProcessing}
              className={`px-4 py-3 rounded-lg ${!inputMessage.trim() || isProcessing ? 'opacity-50' : ''}`}
              style={{ backgroundColor: colors.accent }}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}