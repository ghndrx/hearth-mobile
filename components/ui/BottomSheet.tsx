import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  useColorScheme,
  type ViewProps,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

interface BottomSheetProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  ...props
}: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(300);

  const animateIn = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: 200 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
  }, [backdropOpacity, translateY]);

  const animateOut = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(300, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  }, [backdropOpacity, translateY, onClose]);

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, animateIn]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} statusBarTranslucent animationType="none">
      <View className="flex-1 justify-end">
        <Animated.View style={backdropStyle} className="absolute inset-0">
          <Pressable
            onPress={animateOut}
            className="flex-1 bg-black/50"
          />
        </Animated.View>

        <Animated.View
          style={sheetStyle}
          className={`rounded-t-3xl pb-8 ${
            isDark ? "bg-dark-800" : "bg-white"
          }`}
          {...props}
        >
          <View className="w-10 h-1 bg-dark-400 rounded-full self-center mt-3 mb-4" />

          {title && (
            <Text
              className={`text-center text-lg font-semibold mb-4 px-6 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {title}
            </Text>
          )}

          <View className="px-6">{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}
