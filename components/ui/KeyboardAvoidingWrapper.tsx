import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ViewStyle,
  StyleSheet,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// Types
// ============================================================================

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  /** Extra offset from keyboard top (for toolbars, etc.) */
  extraOffset?: number;
  /** Enable smooth animated transitions */
  animated?: boolean;
  /** Disable keyboard avoiding behavior */
  disabled?: boolean;
  /** Style for the container */
  style?: ViewStyle;
  /** Additional className for NativeWind */
  className?: string;
  /** Behavior override (default: 'padding' on iOS, 'height' on Android) */
  behavior?: "padding" | "height" | "position";
}

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

// ============================================================================
// Hook: useKeyboardState
// ============================================================================

export function useKeyboardState(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleShow = (event: { endCoordinates: { height: number } }) => {
      if (Platform.OS === "ios") {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            250,
            LayoutAnimation.Types.keyboard,
            LayoutAnimation.Properties.opacity
          )
        );
      }
      setState({
        isVisible: true,
        keyboardHeight: event.endCoordinates.height,
      });
    };

    const handleHide = () => {
      if (Platform.OS === "ios") {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            250,
            LayoutAnimation.Types.keyboard,
            LayoutAnimation.Properties.opacity
          )
        );
      }
      setState({
        isVisible: false,
        keyboardHeight: 0,
      });
    };

    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return state;
}

// ============================================================================
// Hook: useDismissKeyboard
// ============================================================================

export function useDismissKeyboard() {
  return useCallback(() => {
    Keyboard.dismiss();
  }, []);
}

// ============================================================================
// Animated Keyboard Spacer
// ============================================================================

interface KeyboardSpacerProps {
  extraOffset?: number;
}

export function KeyboardSpacer({ extraOffset = 0 }: KeyboardSpacerProps) {
  const { isVisible, keyboardHeight } = useKeyboardState();
  const insets = useSafeAreaInsets();
  const height = useSharedValue(0);

  useEffect(() => {
    const targetHeight = isVisible
      ? keyboardHeight - insets.bottom + extraOffset
      : 0;
    height.value = withTiming(Math.max(0, targetHeight), {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [isVisible, keyboardHeight, insets.bottom, extraOffset, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={animatedStyle} />;
}

// ============================================================================
// KeyboardAvoidingWrapper Component
// ============================================================================

export function KeyboardAvoidingWrapper({
  children,
  extraOffset = 0,
  animated: _animated = true,
  disabled = false,
  style,
  className,
  behavior,
}: KeyboardAvoidingWrapperProps) {
  const insets = useSafeAreaInsets();

  if (disabled) {
    return (
      <View style={[styles.container, style]} className={className}>
        {children}
      </View>
    );
  }

  // iOS uses 'padding' by default, Android uses 'height'
  const defaultBehavior = Platform.OS === "ios" ? "padding" : "height";
  const keyboardBehavior = behavior ?? defaultBehavior;

  // Calculate vertical offset
  // On iOS, we need to account for the safe area and any extra offset
  const keyboardVerticalOffset =
    Platform.OS === "ios" ? insets.top + extraOffset : extraOffset;

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      className={className}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// ============================================================================
// Exports
// ============================================================================

export default KeyboardAvoidingWrapper;
