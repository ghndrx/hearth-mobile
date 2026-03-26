import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions} from "react-native";
import { useColorScheme } from "../../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

type ConnectionState = "disconnected" | "connecting" | "connected";

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
}

const mockParticipants: Participant[] = [
  {
    id: "local",
    name: "You",
    isMuted: false,
    isCameraOn: false,
    isSpeaking: false,
    isLocal: true,
  },
  {
    id: "2",
    name: "Alice",
    isMuted: false,
    isCameraOn: true,
    isSpeaking: true,
    isLocal: false,
  },
  {
    id: "3",
    name: "Bob",
    isMuted: true,
    isCameraOn: false,
    isSpeaking: false,
    isLocal: false,
  },
  {
    id: "4",
    name: "Charlie",
    isMuted: false,
    isCameraOn: true,
    isSpeaking: false,
    isLocal: false,
  },
];

const CONNECTION_COLORS: Record<ConnectionState, string> = {
  disconnected: "#ef4444",
  connecting: "#f59e0b",
  connected: "#22c55e",
};

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected",
};

function ConnectionIndicator({
  state,
  isDark,
}: {
  state: ConnectionState;
  isDark: boolean;
}) {
  return (
    <View className="flex-row items-center">
      <View
        className="w-2.5 h-2.5 rounded-full mr-2"
        style={{ backgroundColor: CONNECTION_COLORS[state] }}
      />
      <Text
        className={`text-sm font-medium ${isDark ? "text-dark-200" : "text-gray-600"}`}
      >
        {CONNECTION_LABELS[state]}
      </Text>
    </View>
  );
}

function ParticipantTile({
  participant,
  isDark,
  tileSize,
}: {
  participant: Participant;
  isDark: boolean;
  tileSize: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={{ width: tileSize, height: tileSize }}
      className="p-1"
    >
      <View
        className={`flex-1 rounded-2xl items-center justify-center relative overflow-hidden ${
          isDark ? "bg-dark-700" : "bg-gray-100"
        }`}
        style={
          participant.isSpeaking
            ? { borderWidth: 2, borderColor: "#22c55e" }
            : undefined
        }
      >
        {participant.isCameraOn ? (
          <View className="flex-1 w-full items-center justify-center bg-dark-800 rounded-2xl">
            <Ionicons name="videocam" size={40} color="#5865f2" />
            <Text className="text-dark-200 text-xs mt-1">Camera Feed</Text>
          </View>
        ) : (
          <View className="items-center justify-center">
            <View
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{
                backgroundColor: participant.isLocal ? "#5865f2" : "#4e5058",
              }}
            >
              <Text className="text-white text-xl font-bold">
                {participant.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Participant name + mic status */}
        <View className="absolute bottom-2 left-2 right-2 flex-row items-center justify-between">
          <View className="flex-row items-center bg-black/50 rounded-lg px-2 py-1">
            <Text className="text-white text-xs font-medium" numberOfLines={1}>
              {participant.name}
            </Text>
          </View>
          {participant.isMuted && (
            <View className="bg-red-500/80 rounded-full p-1">
              <Ionicons name="mic-off" size={12} color="#ffffff" />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function VoiceChannelScreen() {
  const { id, serverId, serverName } = useLocalSearchParams<{
    id: string;
    serverId?: string;
    serverName?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [participants, setParticipants] =
    useState<Participant[]>(mockParticipants);

  const screenWidth = Dimensions.get("window").width;
  const numColumns = participants.length <= 2 ? 1 : 2;
  const tileSize =
    numColumns === 1 ? screenWidth - 32 : (screenWidth - 32) / 2;

  // Simulate LiveKit connection lifecycle
  useEffect(() => {
    setConnectionState("connecting");
    const timer = setTimeout(() => {
      setConnectionState("connected");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleMic = useCallback(() => {
    setIsMicOn((prev) => !prev);
    setParticipants((prev) =>
      prev.map((p) => (p.isLocal ? { ...p, isMuted: isMicOn } : p)),
    );
  }, [isMicOn]);

  const handleToggleCamera = useCallback(() => {
    setIsCameraOn((prev) => !prev);
    setParticipants((prev) =>
      prev.map((p) => (p.isLocal ? { ...p, isCameraOn: !isCameraOn } : p)),
    );
  }, [isCameraOn]);

  const handleDisconnect = useCallback(() => {
    setConnectionState("disconnected");
    router.back();
  }, []);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-950" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerStyle: {
            backgroundColor: isDark ? "#111214" : "#f9fafb",
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center ml-2"
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <ConnectionIndicator state={connectionState} isDark={isDark} />
          ),
        }}
      />

      {/* Channel info header */}
      <Animated.View
        entering={FadeIn.duration(400)}
        className={`px-4 pt-2 pb-4 border-b ${isDark ? "border-dark-800" : "border-gray-200"}`}
      >
        <View className="flex-row items-center">
          <Ionicons
            name="volume-high"
            size={20}
            color={isDark ? "#f59e0b" : "#d97706"}
          />
          <Text
            className={`ml-2 text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Voice Channel
          </Text>
        </View>
        {serverName && (
          <Text
            className={`text-sm mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {serverName}
          </Text>
        )}
        <Text
          className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          {participants.length} participant{participants.length !== 1 ? "s" : ""}
        </Text>
      </Animated.View>

      {/* Participant grid */}
      <FlatList
        data={participants}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerClassName="p-4 flex-grow"
        columnWrapperStyle={numColumns > 1 ? { justifyContent: "center" } : undefined}
        renderItem={({ item }) => (
          <ParticipantTile
            participant={item}
            isDark={isDark}
            tileSize={tileSize}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons
              name="people-outline"
              size={48}
              color={isDark ? "#4e5058" : "#9ca3af"}
            />
            <Text
              className={`mt-4 text-base ${isDark ? "text-dark-400" : "text-gray-500"}`}
            >
              No participants yet
            </Text>
          </View>
        }
      />

      {/* Controls bar */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        className={`px-6 py-4 border-t ${isDark ? "border-dark-800 bg-dark-900" : "border-gray-200 bg-white"}`}
      >
        <View className="flex-row items-center justify-center gap-5">
          {/* Mic toggle */}
          <TouchableOpacity
            onPress={handleToggleMic}
            className={`w-14 h-14 rounded-full items-center justify-center ${
              isMicOn
                ? isDark
                  ? "bg-dark-600"
                  : "bg-gray-200"
                : "bg-red-500"
            }`}
          >
            <Ionicons
              name={isMicOn ? "mic" : "mic-off"}
              size={24}
              color={isMicOn ? (isDark ? "#ffffff" : "#374151") : "#ffffff"}
            />
          </TouchableOpacity>

          {/* Camera toggle */}
          <TouchableOpacity
            onPress={handleToggleCamera}
            className={`w-14 h-14 rounded-full items-center justify-center ${
              isCameraOn
                ? isDark
                  ? "bg-dark-600"
                  : "bg-gray-200"
                : "bg-red-500"
            }`}
          >
            <Ionicons
              name={isCameraOn ? "videocam" : "videocam-off"}
              size={24}
              color={isCameraOn ? (isDark ? "#ffffff" : "#374151") : "#ffffff"}
            />
          </TouchableOpacity>

          {/* Screen share (placeholder) */}
          <TouchableOpacity
            className={`w-14 h-14 rounded-full items-center justify-center ${
              isDark ? "bg-dark-600" : "bg-gray-200"
            }`}
          >
            <Ionicons
              name="tv-outline"
              size={24}
              color={isDark ? "#ffffff" : "#374151"}
            />
          </TouchableOpacity>

          {/* Disconnect */}
          <TouchableOpacity
            onPress={handleDisconnect}
            className="w-14 h-14 rounded-full items-center justify-center bg-red-600"
          >
            <Ionicons name="call" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
