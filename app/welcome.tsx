import React, { useEffect } from "react";
import { View, Text, useColorScheme } from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../lib/stores/auth";
import { Button } from "../components/ui";

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isAuthenticated, isLoading } = useAuthStore();

  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(50);

  useEffect(() => {
    // Initial animation sequence
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    logoRotate.value = withDelay(500, withTiming(360, { duration: 1000 }));
    contentOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(
      1000,
      withSpring(0, { damping: 15, stiffness: 100 }),
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonsTranslateY.value }],
    opacity: interpolate(buttonsTranslateY.value, [50, 0], [0, 1]),
  }));

  const navigateToLogin = () => {
    router.push("/(auth)/login");
  };

  const navigateToRegister = () => {
    router.push("/(auth)/register");
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <View className="flex-1 items-center justify-center px-6">
        {/* Logo Animation */}
        <Animated.View style={logoAnimatedStyle} className="mb-8">
          <View
            className={`
              w-32 h-32 
              rounded-3xl 
              items-center 
              justify-center
              shadow-lg
              ${isDark ? "bg-brand" : "bg-brand"}
            `}
            style={{
              shadowColor: "#5865f2",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Ionicons name="chatbubbles" size={64} color="white" />
          </View>
        </Animated.View>

        {/* Content */}
        <Animated.View style={contentAnimatedStyle} className="items-center">
          <Text
            className={`text-4xl font-bold mb-3 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Welcome to Hearth
          </Text>
          <Text
            className={`text-lg text-center mb-2 ${
              isDark ? "text-dark-200" : "text-gray-600"
            }`}
          >
            Connect with friends and communities
          </Text>
          <Text
            className={`text-base text-center max-w-xs ${
              isDark ? "text-dark-300" : "text-gray-500"
            }`}
          >
            Join servers, chat in real-time, and build your network
          </Text>
        </Animated.View>

        {/* Feature highlights */}
        <Animated.View
          entering={FadeInUp.delay(1200).duration(600)}
          className="flex-row mt-8 space-x-6"
        >
          <FeatureIcon icon="people" label="Communities" isDark={isDark} />
          <FeatureIcon
            icon="chatbubbles"
            label="Real-time Chat"
            isDark={isDark}
          />
          <FeatureIcon
            icon="notifications"
            label="Stay Updated"
            isDark={isDark}
          />
        </Animated.View>
      </View>

      {/* Buttons */}
      <Animated.View style={buttonsAnimatedStyle} className="px-6 pb-8 pt-4">
        <Button
          title="Get Started"
          onPress={navigateToRegister}
          fullWidth
          size="lg"
          className="mb-4"
        />
        <Button
          title="I already have an account"
          variant="secondary"
          onPress={navigateToLogin}
          fullWidth
          size="lg"
        />
      </Animated.View>
    </View>
  );
}

interface FeatureIconProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  isDark: boolean;
}

function FeatureIcon({ icon, label, isDark }: FeatureIconProps) {
  return (
    <View className="items-center">
      <View
        className={`
          w-14 h-14 
          rounded-2xl 
          items-center 
          justify-center 
          mb-2
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={icon}
          size={24}
          color={isDark ? "#5865f2" : "#4f46e5"}
        />
      </View>
      <Text className={`text-xs ${isDark ? "text-dark-300" : "text-gray-500"}`}>
        {label}
      </Text>
    </View>
  );
}
