import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl} from "react-native";
import { useColorScheme } from "../../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
// Avatar component available for future use

interface Server {
  id: string;
  name: string;
  icon?: string;
  memberCount: number;
  unreadCount?: number;
  isOwner?: boolean;
  hasNotifications?: boolean;
}

const mockServers: Server[] = [
  {
    id: "1",
    name: "General Chat",
    memberCount: 1243,
    unreadCount: 5,
    hasNotifications: true,
  },
  {
    id: "2",
    name: "Developer Hub",
    memberCount: 856,
    unreadCount: 12,
    isOwner: true,
    hasNotifications: true,
  },
  {
    id: "3",
    name: "Gaming Zone",
    memberCount: 3421,
    hasNotifications: false,
  },
  {
    id: "4",
    name: "Music Lounge",
    memberCount: 567,
    unreadCount: 3,
    hasNotifications: true,
  },
  {
    id: "5",
    name: "Study Group",
    memberCount: 89,
    hasNotifications: false,
  },
  {
    id: "6",
    name: "Design Team",
    memberCount: 45,
    isOwner: true,
    hasNotifications: false,
  },
];

const getServerInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getServerColor = (id: string): string => {
  const colors = [
    "#5865f2",
    "#eb459e",
    "#3ba55d",
    "#f26522",
    "#9b59b6",
    "#1abc9c",
    "#e74c3c",
    "#3498db",
  ];
  return colors[parseInt(id, 10) % colors.length];
};

function ServerCard({
  server,
  isDark,
  onPress,
}: {
  server: Server;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mx-4 mb-3 p-4 rounded-xl flex-row items-center ${
        isDark ? "bg-[#1e1f22]" : "bg-white"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      {/* Server Icon */}
      <View
        className="w-14 h-14 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: getServerColor(server.id) }}
      >
        <Text className="text-white text-lg font-bold">
          {getServerInitials(server.name)}
        </Text>
      </View>

      {/* Server Info */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            className={`text-base font-semibold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {server.name}
          </Text>
          {server.isOwner && (
            <View className="ml-2 px-2 py-0.5 bg-[#5865f2] rounded">
              <Text className="text-white text-xs font-medium">Owner</Text>
            </View>
          )}
        </View>
        <Text
          className={`text-sm mt-0.5 ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {server.memberCount.toLocaleString()} members
        </Text>
      </View>

      {/* Unread Badge */}
      {server.unreadCount ? (
        <View className="bg-[#f23f43] min-w-[24px] h-6 rounded-full items-center justify-center px-2">
          <Text className="text-white text-xs font-bold">
            {server.unreadCount > 99 ? "99+" : server.unreadCount}
          </Text>
        </View>
      ) : server.hasNotifications ? (
        <View className="w-2.5 h-2.5 rounded-full bg-[#f23f43]" />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? "#80848e" : "#9ca3af"}
        />
      )}
    </TouchableOpacity>
  );
}

export default function ServerListScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [servers] = useState<Server[]>(mockServers);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleServerPress = (serverId: string) => {
    router.push(`/(tabs)/server/${serverId}` as const);
  };

  const handleCreateServer = () => {
    router.push("/server/create");
  };

  const handleJoinServer = () => {
    router.push("/server/join");
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-[#0c0c0d]" : "bg-gray-50"}`}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Servers",
          headerStyle: {
            backgroundColor: isDark ? "#0c0c0d" : "#f9fafb",
          },
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "600",
          },
          headerRight: () => (
            <View className="flex-row mr-2">
              <TouchableOpacity
                onPress={handleJoinServer}
                className="w-10 h-10 items-center justify-center rounded-full active:opacity-70"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={26}
                  color={isDark ? "#5865f2" : "#5865f2"}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Search Bar */}
      <TouchableOpacity
        className={`mx-4 mt-2 mb-4 p-3 rounded-xl flex-row items-center ${
          isDark ? "bg-[#1e1f22]" : "bg-white"
        }`}
        onPress={() => router.push("/search")}
      >
        <Ionicons
          name="search"
          size={20}
          color={isDark ? "#80848e" : "#9ca3af"}
        />
        <Text
          className={`ml-3 text-base ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Search servers...
        </Text>
      </TouchableOpacity>

      {/* Server List */}
      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServerCard
            server={item}
            isDark={isDark}
            onPress={() => handleServerPress(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#5865f2" : "#5865f2"}
            colors={["#5865f2"]}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons
              name="server-outline"
              size={64}
              color={isDark ? "#383a40" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              No servers yet
            </Text>
            <Text
              className={`mt-1 text-sm ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Join or create a server to get started
            </Text>
          </View>
        )}
      />

      {/* Create Server FAB */}
      <TouchableOpacity
        onPress={handleCreateServer}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#5865f2] items-center justify-center shadow-lg"
        style={{
          shadowColor: "#5865f2",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
