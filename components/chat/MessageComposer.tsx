import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  useColorScheme,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AttachmentPicker,
  AttachmentPreviewStrip,
  type Attachment,
} from "./AttachmentPicker";

interface TypingUser {
  id: string;
  name: string;
}

interface MessageComposerProps {
  /** Callback when message is sent */
  onSend: (message: string, attachments?: Attachment[]) => void;
  /** Callback when user starts/stops typing */
  onTypingChange?: (isTyping: boolean) => void;
  /** Callback when emoji button is pressed */
  onEmojiPress?: () => void;
  /** List of users currently typing */
  typingUsers?: TypingUser[];
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether sending is disabled */
  disabled?: boolean;
  /** Whether message is being sent */
  isSending?: boolean;
  /** Maximum character limit */
  maxLength?: number;
  /** Reply context */
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
  /** Callback to cancel reply */
  onCancelReply?: () => void;
  /** Maximum number of attachments */
  maxAttachments?: number;
}

export function MessageComposer({
  onSend,
  onTypingChange,
  onEmojiPress,
  typingUsers = [],
  placeholder = "Type a message...",
  disabled = false,
  isSending = false,
  maxLength = 2000,
  replyTo,
  onCancelReply,
  maxAttachments = 10,
}: MessageComposerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [message, setMessage] = useState("");
  const [inputHeight, setInputHeight] = useState(44);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAttachmentPickerVisible, setIsAttachmentPickerVisible] =
    useState(false);

  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Typing indicator animation
  const typingDot1 = useRef(new Animated.Value(0)).current;
  const typingDot2 = useRef(new Animated.Value(0)).current;
  const typingDot3 = useRef(new Animated.Value(0)).current;

  // Send button scale animation
  const sendButtonScale = useRef(new Animated.Value(1)).current;

  const canSend =
    (message.trim().length > 0 || attachments.length > 0) &&
    !disabled &&
    !isSending;

  // Animated typing dots
  useEffect(() => {
    if (typingUsers.length > 0) {
      const animateDot = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        );
      };

      const animation = Animated.parallel([
        animateDot(typingDot1, 0),
        animateDot(typingDot2, 150),
        animateDot(typingDot3, 300),
      ]);

      animation.start();
      return () => animation.stop();
    }
    return undefined;
  }, [typingUsers.length, typingDot1, typingDot2, typingDot3]);

  // Handle typing state changes
  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingChange?.(false);
    }, 3000);
  }, [onTypingChange]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTextChange = (text: string) => {
    if (text.length <= maxLength) {
      setMessage(text);
      if (text.length > 0) {
        handleTypingStart();
      }
    }
  };

  const handleContentSizeChange = (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    const { height } = event.nativeEvent.contentSize;
    // Clamp height between 44 and 120 (approximately 4 lines)
    const newHeight = Math.min(Math.max(44, height + 12), 120);
    setInputHeight(newHeight);
  };

  const handleSend = () => {
    if (!canSend) return;

    // Animate send button
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
    setMessage("");
    setAttachments([]);
    setInputHeight(44);

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    onTypingChange?.(false);

    Keyboard.dismiss();
  };

  const handleAttachmentsSelected = (newAttachments: Attachment[]) => {
    const totalAttachments = [...attachments, ...newAttachments];
    if (totalAttachments.length <= maxAttachments) {
      setAttachments(totalAttachments);
    } else {
      setAttachments(totalAttachments.slice(0, maxAttachments));
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const getTypingText = (): string => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing`;
    if (typingUsers.length === 2)
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing`;
  };

  return (
    <View className={`${isDark ? "bg-dark-800" : "bg-white"}`}>
      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <View className="px-4 py-2 flex-row items-center">
          <View className="flex-row items-center mr-2">
            {[typingDot1, typingDot2, typingDot3].map((dot, index) => (
              <Animated.View
                key={index}
                className={`w-1.5 h-1.5 rounded-full mx-0.5 ${
                  isDark ? "bg-dark-400" : "bg-gray-400"
                }`}
                style={{
                  transform: [
                    {
                      translateY: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -4],
                      }),
                    },
                  ],
                }}
              />
            ))}
          </View>
          <Text
            className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {getTypingText()}
          </Text>
        </View>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <View
          className={`mx-4 mt-2 p-3 rounded-lg flex-row items-center ${
            isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
        >
          <View className="w-0.5 h-full bg-brand absolute left-0 rounded-full" />
          <View className="flex-1 pl-2">
            <Text className="text-brand text-xs font-semibold">
              Replying to {replyTo.senderName}
            </Text>
            <Text
              className={`text-sm mt-0.5 ${
                isDark ? "text-dark-300" : "text-gray-600"
              }`}
              numberOfLines={1}
            >
              {replyTo.content}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons
              name="close"
              size={20}
              color={isDark ? "#80848e" : "#9ca3af"}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Attachment Preview Strip */}
      <AttachmentPreviewStrip
        attachments={attachments}
        onRemove={handleRemoveAttachment}
      />

      {/* Composer Row */}
      <View
        className={`flex-row items-end px-4 py-3 border-t ${
          isDark ? "border-dark-700" : "border-gray-200"
        }`}
      >
        {/* Attachment Button */}
        <TouchableOpacity
          onPress={() => setIsAttachmentPickerVisible(true)}
          disabled={disabled || attachments.length >= maxAttachments}
          className={`p-2 mr-1 ${
            attachments.length >= maxAttachments ? "opacity-50" : ""
          }`}
          hitSlop={{ top: 10, right: 5, bottom: 10, left: 10 }}
        >
          <Ionicons
            name="add-circle-outline"
            size={26}
            color={isDark ? "#b5bac1" : "#6b7280"}
          />
        </TouchableOpacity>

        {/* Text Input Container */}
        <View
          className={`flex-1 flex-row items-end rounded-2xl px-4 ${
            isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
          style={{ minHeight: 44 }}
        >
          <TextInput
            ref={inputRef}
            value={message}
            onChangeText={handleTextChange}
            onContentSizeChange={handleContentSizeChange}
            placeholder={placeholder}
            placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
            multiline
            maxLength={maxLength}
            editable={!disabled && !isSending}
            className={`flex-1 py-2.5 text-base ${
              isDark ? "text-white" : "text-gray-900"
            }`}
            style={{ height: inputHeight, maxHeight: 120 }}
          />

          {/* Emoji Button */}
          <TouchableOpacity
            onPress={onEmojiPress}
            disabled={disabled}
            className="p-2 ml-1"
            hitSlop={{ top: 10, right: 5, bottom: 10, left: 5 }}
          >
            <Ionicons
              name="happy-outline"
              size={24}
              color={isDark ? "#b5bac1" : "#6b7280"}
            />
          </TouchableOpacity>
        </View>

        {/* Send Button */}
        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            className={`ml-2 p-2.5 rounded-full ${
              canSend ? "bg-brand" : isDark ? "bg-dark-700" : "bg-gray-200"
            }`}
          >
            <Ionicons
              name="send"
              size={20}
              color={canSend ? "#ffffff" : isDark ? "#4e5058" : "#9ca3af"}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Character Count (shown when approaching limit) */}
      {message.length > maxLength * 0.8 && (
        <View className="px-4 pb-2">
          <Text
            className={`text-xs text-right ${
              message.length > maxLength * 0.95
                ? "text-red-500"
                : isDark
                  ? "text-dark-400"
                  : "text-gray-500"
            }`}
          >
            {message.length}/{maxLength}
          </Text>
        </View>
      )}

      {/* Attachment Picker Modal */}
      <AttachmentPicker
        visible={isAttachmentPickerVisible}
        onClose={() => setIsAttachmentPickerVisible(false)}
        onAttachmentsSelected={handleAttachmentsSelected}
        maxAttachments={maxAttachments - attachments.length}
      />
    </View>
  );
}

// Typing Indicator Component (standalone, for use elsewhere)
interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
}

export function TypingIndicator({
  users,
  className = "",
}: TypingIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (users.length > 0) {
      const animateDot = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        );
      };

      const animation = Animated.parallel([
        animateDot(dot1, 0),
        animateDot(dot2, 150),
        animateDot(dot3, 300),
      ]);

      animation.start();
      return () => animation.stop();
    }
    return undefined;
  }, [users.length, dot1, dot2, dot3]);

  if (users.length === 0) return null;

  const getText = (): string => {
    if (users.length === 1) return `${users[0].name} is typing`;
    if (users.length === 2)
      return `${users[0].name} and ${users[1].name} are typing`;
    return `${users[0].name} and ${users.length - 1} others are typing`;
  };

  return (
    <View className={`flex-row items-center px-4 py-2 ${className}`}>
      <View
        className={`flex-row items-center justify-center px-3 py-2 rounded-2xl ${
          isDark ? "bg-dark-700" : "bg-gray-100"
        }`}
      >
        {[dot1, dot2, dot3].map((dot, index) => (
          <Animated.View
            key={index}
            className={`w-2 h-2 rounded-full mx-0.5 ${
              isDark ? "bg-dark-400" : "bg-gray-400"
            }`}
            style={{
              transform: [
                {
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -6],
                  }),
                },
              ],
            }}
          />
        ))}
      </View>
      <Text
        className={`ml-2 text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
      >
        {getText()}
      </Text>
    </View>
  );
}
