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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components/ui/Avatar";
import { MessageBubble, Message } from "../../components/chat/MessageBubble";

interface ThreadReply extends Message {
  parentId: string;
}

// Mock data for the parent message
const mockParentMessage: Message = {
  id: "parent-1",
  content: "Has anyone figured out the best way to handle authentication in React Native? I've been looking at several approaches but can't decide.",
  senderId: "user-1",
  senderName: "Sarah Johnson",
  timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  isCurrentUser: false,
  status: "read",
  reactions: [
    { emoji: "👍", count: 5, userReacted: false },
    { emoji: "🤔", count: 2, userReacted: true },
  ],
};

// Mock thread replies
const mockThreadReplies: ThreadReply[] = [
  {
    id: "reply-1",
    parentId: "parent-1",
    content: "I've been using Expo SecureStore combined with a JWT approach. Works great!",
    senderId: "user-2",
    senderName: "Mike Chen",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "reply-2",
    parentId: "parent-1",
    content: "For my projects, I use Auth0. The SDK is well-maintained and handles most edge cases.",
    senderId: "user-3",
    senderName: "Emma Wilson",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "reply-3",
    parentId: "parent-1",
    content: "Thanks for the suggestions! I'll look into both options.",
    senderId: "user-1",
    senderName: "Sarah Johnson",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
    isCurrentUser: false,
    status: "read",
  },
  {
    id: "reply-4",
    parentId: "parent-1",
    content: "I've had great results with Supabase Auth. Easy setup and works seamlessly with their database.",
    senderId: "current",
    senderName: "You",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isCurrentUser: true,
    status: "delivered",
  },
];

export default function ThreadScreen() {
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [parentMessage] = useState<Message>(mockParentMessage);
  const [replies, setReplies] = useState<ThreadReply[]>(mockThreadReplies);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Fade in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Simulate loading thread data
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, []);
  
  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || isSending) return;
    
    setIsSending(true);
    
    const newReply: ThreadReply = {
      id: `reply-${Date.now()}`,
      parentId: parentMessage.id,
      content: replyText.trim(),
      senderId: "current",
      senderName: "You",
      timestamp: new Date(),
      isCurrentUser: true,
      status: "sending",
    };
    
    setReplies(prev => [...prev, newReply]);
    setReplyText("");
    
    // Simulate sending
    setTimeout(() => {
      setReplies(prev =>
        prev.map(r =>
          r.id === newReply.id ? { ...r, status: "delivered" } : r
        )
      );
      setIsSending(false);
    }, 1000);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [replyText, isSending, parentMessage.id]);
  
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (messageId === parentMessage.id) {
      // Handle parent message reaction
      return;
    }
    
    setReplies(prev =>
      prev.map(reply => {
        if (reply.id !== messageId) return reply;
        
        const reactions = reply.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          if (existingReaction.userReacted) {
            // Remove reaction
            return {
              ...reply,
              reactions: reactions
                .map(r =>
                  r.emoji === emoji
                    ? { ...r, count: r.count - 1, userReacted: false }
                    : r
                )
                .filter(r => r.count > 0),
            };
          } else {
            // Add to existing reaction
            return {
              ...reply,
              reactions: reactions.map(r =>
                r.emoji === emoji
                  ? { ...r, count: r.count + 1, userReacted: true }
                  : r
              ),
            };
          }
        } else {
          // New reaction
          return {
            ...reply,
            reactions: [...reactions, { emoji, count: 1, userReacted: true }],
          };
        }
      })
    );
  }, [parentMessage.id]);
  
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };
  
  const renderHeader = () => (
    <View className="pb-4 mb-4 border-b border-neutral-200 dark:border-neutral-700">
      {/* Parent message */}
      <View className="flex-row mb-3">
        <Avatar
          name={parentMessage.senderName}
          size={40}
          imageUrl={parentMessage.senderAvatar}
        />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
              {parentMessage.senderName}
            </Text>
            <Text className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
              {formatTimestamp(parentMessage.timestamp)}
            </Text>
          </View>
          <Text className="mt-1 text-base text-neutral-800 dark:text-neutral-200 leading-relaxed">
            {parentMessage.content}
          </Text>
          
          {/* Reactions on parent */}
          {parentMessage.reactions && parentMessage.reactions.length > 0 && (
            <View className="flex-row flex-wrap mt-2 gap-1">
              {parentMessage.reactions.map((reaction, index) => (
                <TouchableOpacity
                  key={index}
                  className={`flex-row items-center px-2 py-1 rounded-full ${
                    reaction.userReacted
                      ? "bg-violet-100 dark:bg-violet-900/30"
                      : "bg-neutral-100 dark:bg-neutral-800"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className="text-sm">{reaction.emoji}</Text>
                  <Text className={`ml-1 text-xs font-medium ${
                    reaction.userReacted
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}>
                    {reaction.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      
      {/* Thread info */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </Text>
        <View className="flex-row items-center">
          <Ionicons
            name="people-outline"
            size={14}
            color={isDark ? "#a1a1aa" : "#71717a"}
          />
          <Text className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">
            {new Set(replies.map(r => r.senderId)).size} participants
          </Text>
        </View>
      </View>
    </View>
  );
  
  const renderReply = ({ item, index }: { item: ThreadReply; index: number }) => {
    const showAvatar =
      index === 0 || replies[index - 1].senderId !== item.senderId;
    
    return (
      <View className="mb-2">
        {showAvatar && !item.isCurrentUser && (
          <View className="flex-row items-center mb-1 ml-1">
            <Avatar
              name={item.senderName}
              size={24}
              imageUrl={item.senderAvatar}
            />
            <Text className="ml-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {item.senderName}
            </Text>
            <Text className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        )}
        <View className={`${showAvatar && !item.isCurrentUser ? "ml-8" : ""}`}>
          <MessageBubble
            message={item}
            showAvatar={false}
            onReaction={handleReaction}
            consecutive={!showAvatar}
          />
        </View>
      </View>
    );
  };
  
  const renderEmpty = () => (
    <View className="items-center justify-center py-12">
      <Ionicons
        name="chatbubbles-outline"
        size={48}
        color={isDark ? "#525252" : "#a1a1aa"}
      />
      <Text className="mt-4 text-base text-neutral-500 dark:text-neutral-400">
        No replies yet
      </Text>
      <Text className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
        Be the first to reply to this message
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Thread",
          headerStyle: {
            backgroundColor: isDark ? "#171717" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#000000",
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#ffffff" : "#000000"}
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
          {isLoading ? (
            <View className="items-center justify-center flex-1">
              <ActivityIndicator size="large" color={isDark ? "#a78bfa" : "#7c3aed"} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={replies}
              renderItem={renderReply}
              keyExtractor={item => item.id}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={{
                padding: 16,
                flexGrow: replies.length === 0 ? 1 : undefined,
              }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (replies.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
            />
          )}
        </Animated.View>
        
        {/* Reply Input */}
        <View className="flex-row items-end px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <View className="flex-1 flex-row items-end bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 px-4 py-2 min-h-[44px] max-h-32">
            <TextInput
              ref={inputRef}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Reply in thread..."
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
              className="flex-1 text-base text-neutral-900 dark:text-neutral-100"
              multiline
              maxLength={2000}
              editable={!isSending}
            />
          </View>
          
          <TouchableOpacity
            onPress={handleSendReply}
            disabled={!replyText.trim() || isSending}
            className={`ml-3 w-11 h-11 rounded-full items-center justify-center ${
              replyText.trim() && !isSending
                ? "bg-violet-600"
                : "bg-neutral-200 dark:bg-neutral-700"
            }`}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={replyText.trim() ? "#ffffff" : isDark ? "#71717a" : "#a1a1aa"}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
