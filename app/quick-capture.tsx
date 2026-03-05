import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Animated,
  Dimensions,
  PanResponder,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessageQueue } from "../lib/contexts/MessageQueueContext";
import { useAuthStore } from "../lib/stores/auth";
import { Avatar } from "../components/ui";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface RecentContact {
  id: string;
  type: "user" | "channel";
  name: string;
  avatar?: string;
  serverId?: string;
  serverName?: string;
  lastMessageAt?: string;
}

// Mock recent contacts - in production, this would come from API/store
const MOCK_RECENTS: RecentContact[] = [
  { id: "dm-1", type: "user", name: "Alice Chen", lastMessageAt: "2026-03-05T00:30:00Z" },
  { id: "ch-1", type: "channel", name: "general", serverId: "srv-1", serverName: "Hearth Team", lastMessageAt: "2026-03-05T00:15:00Z" },
  { id: "dm-2", type: "user", name: "Bob Smith", lastMessageAt: "2026-03-04T23:45:00Z" },
  { id: "ch-2", type: "channel", name: "random", serverId: "srv-1", serverName: "Hearth Team", lastMessageAt: "2026-03-04T22:00:00Z" },
  { id: "dm-3", type: "user", name: "Carol White", lastMessageAt: "2026-03-04T20:30:00Z" },
];

export default function QuickCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { queueMessage, isOnline } = useMessageQueue();
  const { user } = useAuthStore();

  const [message, setMessage] = useState("");
  const [selectedContact, setSelectedContact] = useState<RecentContact | null>(null);
  const [recents] = useState<RecentContact[]>(MOCK_RECENTS);
  const [isSending, setIsSending] = useState(false);
  const [showRecents, setShowRecents] = useState(true);

  // Animation for slide-up
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Initial content from params (e.g., shared text)
  useEffect(() => {
    if (params.text && typeof params.text === "string") {
      setMessage(params.text);
    }
    if (params.contactId && typeof params.contactId === "string") {
      const contact = recents.find((r) => r.id === params.contactId);
      if (contact) {
        setSelectedContact(contact);
        setShowRecents(false);
      }
    }
  }, [params]);

  // Animate in
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pan responder for swipe-down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 0,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleDismiss();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  }, [router, slideAnim, backdropOpacity]);

  const handleSelectContact = useCallback((contact: RecentContact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedContact(contact);
    setShowRecents(false);
  }, []);

  const handleClearContact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedContact(null);
    setShowRecents(true);
  }, []);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !selectedContact || !user) return;

    setIsSending(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Queue the message for sending (handles offline gracefully)
      queueMessage(
        message.trim(),
        selectedContact.id,
        user.id,
        {
          serverId: selectedContact.serverId,
        }
      );

      // Clear and dismiss after brief delay for UX
      setTimeout(() => {
        handleDismiss();
      }, 300);
    } catch (error) {
      console.error("Failed to queue message:", error);
      Alert.alert(
        "Error",
        "Failed to send message. It will be retried when you're back online."
      );
    } finally {
      setIsSending(false);
    }
  }, [message, selectedContact, user, queueMessage, handleDismiss]);

  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
    // Show recents when typing and no contact selected
    if (!selectedContact && text.length > 0 && !showRecents) {
      setShowRecents(true);
    }
  }, [selectedContact, showRecents]);

  const canSend = message.trim().length > 0 && selectedContact !== null && !isSending;

  // Format timestamp for display (used in future enhancement)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <View className="flex-1">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Backdrop */}
      <Animated.View
        style={{ opacity: backdropOpacity }}
        className="absolute inset-0 bg-black/50"
      >
        <Pressable className="flex-1" onPress={handleDismiss} />
      </Animated.View>

      {/* Slide-up Panel */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateY: slideAnim }],
          paddingBottom: insets.bottom,
        }}
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl ${
          isDark ? "bg-[#1e1f22]" : "bg-white"
        }`}
      >
        {/* Handle bar */}
        <View className="items-center pt-3 pb-2">
          <View className={`w-10 h-1 rounded-full ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />
        </View>

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-4">
          <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Quick Send
          </Text>
          <Pressable
            onPress={handleDismiss}
            className={`w-8 h-8 rounded-full items-center justify-center ${
              isDark ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            <Ionicons name="close" size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
          </Pressable>
        </View>

        {/* Selected Contact */}
        {selectedContact && (
          <View className="px-4 pb-4">
            <View
              className={`flex-row items-center p-3 rounded-xl ${
                isDark ? "bg-gray-800/50" : "bg-gray-50"
              }`}
            >
              <Avatar
                name={selectedContact.name}
                uri={selectedContact.avatar}
                size="lg"
                status={selectedContact.type === "user" ? "online" : undefined}
                showStatus={selectedContact.type === "user"}
              />
              <View className="flex-1 ml-3">
                <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {selectedContact.name}
                </Text>
                {selectedContact.serverName && (
                  <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    #{selectedContact.serverName}
                  </Text>
                )}
                <Text className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {selectedContact.type === "channel" ? "Channel" : "Direct Message"}
                </Text>
              </View>
              <Pressable
                onPress={handleClearContact}
                className={`p-2 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
              >
                <Ionicons name="close" size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Recents List */}
        {showRecents && !selectedContact && (
          <View className="px-4 pb-4">
            <Text className={`text-sm font-medium mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Recent
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {recents.map((contact) => (
                <Pressable
                  key={contact.id}
                  onPress={() => handleSelectContact(contact)}
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Avatar
                    name={contact.name}
                    uri={contact.avatar}
                    size="xs"
                    showStatus={false}
                  />
                  <Text className={`ml-2 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    {contact.name}
                  </Text>
                  {contact.serverName && (
                    <Text className={`ml-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      in {contact.serverName}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <View className="px-4 pb-4">
            {/* Offline indicator */}
            {!isOnline && (
              <View className="flex-row items-center mb-3 px-3 py-2 rounded-lg bg-amber-500/10">
                <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
                <Text className="ml-2 text-sm text-amber-500">
                  Offline - message will be sent when connection is restored
                </Text>
              </View>
            )}

            <View
              className={`flex-row items-end p-3 rounded-2xl border ${
                isDark
                  ? "bg-gray-800/50 border-gray-700"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <TextInput
                value={message}
                onChangeText={handleTextChange}
                placeholder="Type a quick message..."
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                multiline
                maxLength={2000}
                className={`flex-1 max-h-32 text-base ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                autoFocus
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (canSend) handleSend();
                }}
              />
              
              {/* Send Button */}
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                className={`ml-3 w-10 h-10 rounded-full items-center justify-center ${
                  canSend
                    ? "bg-amber-500"
                    : isDark
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={canSend ? "white" : isDark ? "#6b7280" : "#9ca3af"}
                />
              </Pressable>
            </View>

            {/* Character count */}
            <View className="flex-row justify-between mt-2">
              <Text className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {message.length}/2000
              </Text>
              {selectedContact && (
                <Text className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Sending to {selectedContact.name}
                </Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}
