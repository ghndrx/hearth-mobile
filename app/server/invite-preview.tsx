import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  BounceIn,
} from "react-native-reanimated";
import { Avatar, Button } from "../../components/ui";

interface ServerPreview {
  id: string;
  name: string;
  icon?: string;
  description: string;
  memberCount: number;
  onlineCount: number;
  features: string[];
  inviter: {
    name: string;
    avatar?: string;
  };
  channels: { name: string; type: "text" | "voice" }[];
}

type JoinState = "idle" | "loading" | "success" | "error" | "already_member";

export default function InvitePreviewScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isLoading, setIsLoading] = useState(true);
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [server, setServer] = useState<ServerPreview | null>(null);

  useEffect(() => {
    // Simulate fetching invite preview data
    const timer = setTimeout(() => {
      setServer({
        id: "srv-1",
        name: "Hearth Community",
        description:
          "The official Hearth community server. Chat about smart home tech, share setups, and get help from the community.",
        memberCount: 12453,
        onlineCount: 3821,
        features: ["Community", "Smart Home", "IoT", "Tech"],
        inviter: {
          name: "Sarah Johnson",
        },
        channels: [
          { name: "general", type: "text" },
          { name: "introductions", type: "text" },
          { name: "smart-home-help", type: "text" },
          { name: "show-your-setup", type: "text" },
          { name: "Voice Lounge", type: "voice" },
          { name: "Music", type: "voice" },
        ],
      });
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [code]);

  const handleJoin = () => {
    setJoinState("loading");
    // Simulate join API call
    setTimeout(() => {
      setJoinState("success");
      setTimeout(() => {
        router.replace(`/(tabs)/dashboard`);
      }, 1500);
    }, 1000);
  };

  const formatCount = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator
          size="large"
          color={isDark ? "#5865f2" : "#4f46e5"}
        />
        <Text
          className={`mt-4 text-base ${isDark ? "text-dark-300" : "text-gray-500"}`}
        >
          Loading invite...
        </Text>
      </SafeAreaView>
    );
  }

  if (!server) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center px-8 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={isDark ? "#ef4444" : "#dc2626"}
        />
        <Text
          className={`mt-4 text-xl font-bold text-center ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Invalid Invite
        </Text>
        <Text
          className={`mt-2 text-base text-center ${isDark ? "text-dark-300" : "text-gray-500"}`}
        >
          This invite may have expired or the server no longer exists.
        </Text>
        <Button
          title="Go Back"
          variant="secondary"
          className="mt-6"
          onPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
                isDark ? "bg-dark-800/80" : "bg-white/80"
              }`}
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#ffffff" : "#111827"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View className="flex-1 items-center justify-center px-6">
        {/* Invited by */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="items-center mb-6"
        >
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            <Text className={isDark ? "text-dark-200" : "text-gray-700"}>
              {server.inviter.name}
            </Text>{" "}
            invited you to join
          </Text>
        </Animated.View>

        {/* Server Icon */}
        <Animated.View entering={BounceIn.delay(200).duration(500)}>
          <View
            className={`w-24 h-24 rounded-3xl items-center justify-center mb-4 ${
              isDark ? "bg-brand" : "bg-brand"
            }`}
          >
            <Text className="text-white text-4xl font-bold">
              {server.name.charAt(0)}
            </Text>
          </View>
        </Animated.View>

        {/* Server Name */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          className="items-center"
        >
          <Text
            className={`text-2xl font-bold text-center ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {server.name}
          </Text>

          {/* Member counts */}
          <View className="flex-row items-center mt-3 space-x-4">
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5" />
              <Text
                className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
              >
                {formatCount(server.onlineCount)} Online
              </Text>
            </View>
            <View className="flex-row items-center">
              <View
                className={`w-2.5 h-2.5 rounded-full mr-1.5 ${isDark ? "bg-dark-400" : "bg-gray-400"}`}
              />
              <Text
                className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
              >
                {formatCount(server.memberCount)} Members
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          className="mt-5"
        >
          <Text
            className={`text-center text-base leading-6 ${isDark ? "text-dark-300" : "text-gray-600"}`}
          >
            {server.description}
          </Text>
        </Animated.View>

        {/* Tags */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          className="flex-row flex-wrap justify-center mt-4"
          style={{ gap: 8 }}
        >
          {server.features.map((feature) => (
            <View
              key={feature}
              className={`px-3 py-1.5 rounded-full ${
                isDark ? "bg-dark-700" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-medium ${isDark ? "text-dark-200" : "text-gray-700"}`}
              >
                {feature}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Channels Preview */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(400)}
          className={`w-full mt-6 p-4 rounded-2xl ${
            isDark ? "bg-dark-800" : "bg-white"
          }`}
        >
          <Text
            className={`text-xs font-semibold uppercase mb-3 ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            Channels
          </Text>
          {server.channels.slice(0, 5).map((channel, index) => (
            <View
              key={channel.name}
              className={`flex-row items-center py-2 ${
                index < Math.min(server.channels.length, 5) - 1
                  ? `border-b ${isDark ? "border-dark-700" : "border-gray-100"}`
                  : ""
              }`}
            >
              <Ionicons
                name={
                  channel.type === "voice"
                    ? "volume-medium-outline"
                    : "chatbubble-outline"
                }
                size={16}
                color={isDark ? "#80848e" : "#9ca3af"}
              />
              <Text
                className={`ml-2 text-sm ${isDark ? "text-dark-200" : "text-gray-700"}`}
              >
                {channel.name}
              </Text>
            </View>
          ))}
          {server.channels.length > 5 && (
            <Text
              className={`text-xs mt-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              +{server.channels.length - 5} more channels
            </Text>
          )}
        </Animated.View>

        {/* Join Button */}
        <Animated.View
          entering={FadeInUp.delay(700).duration(400)}
          className="w-full mt-6"
        >
          {joinState === "success" ? (
            <View className="items-center py-4">
              <Animated.View entering={BounceIn.duration(400)}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color="#22c55e"
                />
              </Animated.View>
              <Text className="text-green-500 font-semibold mt-2">
                Joined successfully!
              </Text>
            </View>
          ) : joinState === "error" ? (
            <View className="items-center">
              <Text className="text-red-500 text-sm mb-3">
                Failed to join. Please try again.
              </Text>
              <Button
                title="Try Again"
                variant="primary"
                fullWidth
                onPress={handleJoin}
              />
            </View>
          ) : (
            <Button
              title={joinState === "loading" ? "Joining..." : "Accept Invite"}
              variant="primary"
              fullWidth
              onPress={handleJoin}
              isLoading={joinState === "loading"}
              disabled={joinState === "loading"}
              leftIcon={
                joinState !== "loading" ? (
                  <Ionicons name="enter-outline" size={20} color="white" />
                ) : undefined
              }
            />
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
