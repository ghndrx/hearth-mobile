import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Dimensions,
  FlatList,
  ViewToken} from "react-native";
import { useColorScheme } from "../lib/hooks/useColorScheme";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  FadeInDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../components/ui";

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: "1",
    icon: "people",
    title: "Join Communities",
    description:
      "Connect with like-minded people in servers dedicated to your interests, hobbies, and passions.",
    color: "#5865f2",
  },
  {
    id: "2",
    icon: "chatbubbles",
    title: "Real-time Chat",
    description:
      "Send messages instantly with text, images, and reactions. Express yourself with custom emojis and GIFs.",
    color: "#3ba55c",
  },
  {
    id: "3",
    icon: "mic",
    title: "Voice & Video",
    description:
      "Drop into voice channels to chat hands-free, or start a video call with friends and screen share.",
    color: "#eb459e",
  },
  {
    id: "4",
    icon: "shield-checkmark",
    title: "Stay Secure",
    description:
      "Your privacy matters. Two-factor authentication, biometric login, and end-to-end encryption keep you safe.",
    color: "#faa61a",
  },
  {
    id: "5",
    icon: "notifications",
    title: "Never Miss Out",
    description:
      "Get notified about messages that matter. Customize notifications per server and channel.",
    color: "#ed4245",
  },
];

const ONBOARDING_KEY = "@hearth_onboarding_complete";

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      router.replace("/welcome");
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
      router.replace("/welcome");
    }
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    return (
      <View style={{ width }} className="flex-1 items-center justify-center px-8">
        <SlideContent slide={item} index={index} scrollX={scrollX} isDark={isDark} />
      </View>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      {/* Skip Button */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        className="absolute top-14 right-6 z-10"
      >
        <Button
          title="Skip"
          variant="ghost"
          size="sm"
          onPress={skipOnboarding}
        />
      </Animated.View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={(event) => {
          scrollX.value = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      />

      {/* Pagination & Button */}
      <View className="px-8 pb-12">
        {/* Dots */}
        <View className="flex-row justify-center mb-8">
          {slides.map((_, index) => (
            <PaginationDot
              key={index}
              index={index}
              currentIndex={currentIndex}
              isDark={isDark}
            />
          ))}
        </View>

        {/* Next/Get Started Button */}
        <Button
          title={currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          onPress={goToNext}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

interface SlideContentProps {
  slide: OnboardingSlide;
  index: number;
  scrollX: Animated.SharedValue<number>;
  isDark: boolean;
}

function SlideContent({ slide, index, scrollX, isDark }: SlideContentProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={animatedStyle} className="items-center">
      {/* Icon Container */}
      <View
        className="w-40 h-40 rounded-full items-center justify-center mb-10"
        style={{
          backgroundColor: slide.color + "20",
          shadowColor: slide.color,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <View
          className="w-28 h-28 rounded-full items-center justify-center"
          style={{ backgroundColor: slide.color }}
        >
          <Ionicons name={slide.icon} size={56} color="white" />
        </View>
      </View>

      {/* Title */}
      <Text
        className={`text-3xl font-bold text-center mb-4 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        {slide.title}
      </Text>

      {/* Description */}
      <Text
        className={`text-base text-center leading-6 max-w-xs ${
          isDark ? "text-dark-200" : "text-gray-600"
        }`}
      >
        {slide.description}
      </Text>
    </Animated.View>
  );
}

interface PaginationDotProps {
  index: number;
  currentIndex: number;
  isDark: boolean;
}

function PaginationDot({ index, currentIndex, isDark }: PaginationDotProps) {
  const isActive = index === currentIndex;
  const scale = useSharedValue(isActive ? 1 : 0.8);
  const width = useSharedValue(isActive ? 24 : 8);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.8);
    width.value = withSpring(isActive ? 24 : 8);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    width: width.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`h-2 rounded-full mx-1 ${
        isActive
          ? "bg-brand"
          : isDark
          ? "bg-dark-600"
          : "bg-gray-300"
      }`}
    />
  );
}
