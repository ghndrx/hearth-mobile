import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useBiometric } from "../lib/contexts/BiometricContext";

interface BiometricLockScreenProps {
  children: React.ReactNode;
}

export function BiometricLockScreen({ children }: BiometricLockScreenProps) {
  const {
    isLocked,
    isLoading,
    unlock,
    biometricName,
    biometricIcon,
    capabilities,
  } = useBiometric();
  
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  // Animation values
  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Pulse animation for the icon
  useEffect(() => {
    if (isLocked && !isAuthenticating) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isLocked, isAuthenticating, pulseScale]);

  const handleUnlock = useCallback(async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);
    
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Scale down animation
    iconScale.value = withSpring(0.9);
    
    try {
      const result = await unlock();
      
      if (result.success) {
        // Success animation
        iconScale.value = withSpring(1.2, {}, () => {
          iconScale.value = withSpring(1);
        });
        iconOpacity.value = withTiming(0, { duration: 300 });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Error animation - shake
        shakeX.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
        iconScale.value = withSpring(1);
        
        if (result.error) {
          setError(result.error);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch {
      setError("An unexpected error occurred");
      iconScale.value = withSpring(1);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, unlock, iconScale, iconOpacity, shakeX]);

  // Auto-authenticate on mount
  useEffect(() => {
    if (isLocked && !isLoading && capabilities?.isAvailable && capabilities?.isEnrolled) {
      // Small delay to let the screen render first
      const timer = setTimeout(() => {
        handleUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLocked, isLoading, capabilities, handleUnlock]);

  // Animated styles
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value * pulseScale.value },
      { translateX: shakeX.value },
    ],
    opacity: iconOpacity.value,
  }));

  // Don't show lock screen while loading
  if (isLoading) {
    return (
      <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <MaterialCommunityIcons
          name="loading"
          size={48}
          color={isDark ? "#ffffff" : "#1a1a1a"}
        />
      </View>
    );
  }

  // Show children if not locked
  if (!isLocked) {
    return <>{children}</>;
  }

  // Lock screen
  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* App branding */}
      <View style={styles.branding}>
        <MaterialCommunityIcons
          name="fire"
          size={48}
          color="#ef4444"
        />
        <Text style={[styles.appName, isDark && styles.textDark]}>
          Hearth
        </Text>
      </View>

      {/* Lock icon button */}
      <Pressable
        onPress={handleUnlock}
        disabled={isAuthenticating}
        style={styles.unlockButton}
      >
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          <View style={[styles.iconBackground, isDark && styles.iconBackgroundDark]}>
            <MaterialCommunityIcons
              name={biometricIcon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={64}
              color={isDark ? "#ffffff" : "#1a1a1a"}
            />
          </View>
        </Animated.View>
      </Pressable>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionText, isDark && styles.textDark]}>
          {isAuthenticating ? "Authenticating..." : `Tap to unlock with ${biometricName}`}
        </Text>
        
        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>

      {/* Retry button */}
      {error && !isAuthenticating && (
        <Pressable
          onPress={handleUnlock}
          style={[styles.retryButton, isDark && styles.retryButtonDark]}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color={isDark ? "#ffffff" : "#1a1a1a"}
          />
          <Text style={[styles.retryText, isDark && styles.textDark]}>
            Try Again
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  containerLight: {
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#0a0a0a",
  },
  branding: {
    alignItems: "center",
    marginBottom: 64,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 12,
  },
  textDark: {
    color: "#ffffff",
  },
  unlockButton: {
    marginBottom: 32,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e5e5e5",
  },
  iconBackgroundDark: {
    backgroundColor: "#1f1f1f",
    borderColor: "#333333",
  },
  instructions: {
    alignItems: "center",
  },
  instructionText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    marginTop: 24,
    gap: 8,
  },
  retryButtonDark: {
    backgroundColor: "#1f1f1f",
  },
  retryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
  },
});

export default BiometricLockScreen;
