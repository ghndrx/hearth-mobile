import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui";

interface ServerCategory {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface PublicServer {
  id: string;
  name: string;
  description: string;
  icon?: string;
  banner?: string;
  category: string;
  memberCount: number;
  isVerified: boolean;
  tags: string[];
}

const categories: ServerCategory[] = [
  { id: "all", name: "All", icon: "apps-outline" },
  { id: "gaming", name: "Gaming", icon: "game-controller-outline" },
  { id: "tech", name: "Technology", icon: "hardware-chip-outline" },
  { id: "art", name: "Art & Design", icon: "color-palette-outline" },
  { id: "music", name: "Music", icon: "musical-notes-outline" },
  { id: "education", name: "Education", icon: "school-outline" },
  { id: "community", name: "Community", icon: "people-outline" },
];

const mockPublicServers: PublicServer[] = [
  {
    id: "1",
    name: "React Native Developers",
    description:
      "A community for React Native developers to share knowledge, ask questions, and collaborate on projects.",
    category: "tech",
    memberCount: 45200,
    isVerified: true,
    tags: ["react", "mobile", "javascript"],
  },
  {
    id: "2",
    name: "Indie Game Dev Hub",
    description:
      "Connect with indie game developers, share your projects, and get feedback from the community.",
    category: "gaming",
    memberCount: 28500,
    isVerified: true,
    tags: ["gamedev", "indie", "unity"],
  },
  {
    id: "3",
    name: "Digital Artists Collective",
    description:
      "A supportive community for digital artists of all skill levels. Share your work and get constructive feedback.",
    category: "art",
    memberCount: 18900,
    isVerified: false,
    tags: ["digital-art", "illustration", "design"],
  },
  {
    id: "4",
    name: "Music Production Lounge",
    description:
      "Discuss music production techniques, share your tracks, and collaborate with other producers.",
    category: "music",
    memberCount: 12400,
    isVerified: true,
    tags: ["production", "audio", "mixing"],
  },
  {
    id: "5",
    name: "Computer Science Study Group",
    description:
      "Study together, share resources, and help each other learn computer science concepts.",
    category: "education",
    memberCount: 32100,
    isVerified: true,
    tags: ["programming", "algorithms", "learning"],
  },
  {
    id: "6",
    name: "Local Community Hangout",
    description:
      "A friendly space for people to connect, make friends, and discuss various topics.",
    category: "community",
    memberCount: 5600,
    isVerified: false,
    tags: ["social", "chat", "friends"],
  },
  {
    id: "7",
    name: "AI & Machine Learning",
    description:
      "Discuss the latest in AI, share resources, and collaborate on ML projects.",
    category: "tech",
    memberCount: 67800,
    isVerified: true,
    tags: ["ai", "machine-learning", "python"],
  },
  {
    id: "8",
    name: "Pixel Art Paradise",
    description:
      "For pixel art enthusiasts! Share your sprites, get feedback, and participate in challenges.",
    category: "art",
    memberCount: 8900,
    isVerified: false,
    tags: ["pixel-art", "sprites", "retro"],
  },
];

function formatMemberCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function CategoryPill({
  category,
  isActive,
  onPress,
  isDark,
}: {
  category: ServerCategory;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`
        flex-row items-center px-4 py-2 rounded-full mr-2
        ${
          isActive
            ? "bg-brand"
            : isDark
              ? "bg-dark-800 border border-dark-700"
              : "bg-white border border-gray-200"
        }
      `}
    >
      <Ionicons
        name={category.icon}
        size={16}
        color={isActive ? "white" : isDark ? "#80848e" : "#6b7280"}
      />
      <Text
        className={`ml-2 text-sm font-medium ${
          isActive ? "text-white" : isDark ? "text-dark-200" : "text-gray-700"
        }`}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

function ServerCard({
  server,
  isDark,
  onJoin,
}: {
  server: PublicServer;
  isDark: boolean;
  onJoin: (server: PublicServer) => void;
}) {
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsJoining(false);
    setHasJoined(true);
    onJoin(server);
  };

  // Generate a gradient-like background based on server id
  const getBackgroundColor = (id: string) => {
    const colors = [
      ["#5865f2", "#4752c4"],
      ["#eb459e", "#d63384"],
      ["#3ba55d", "#2d8a4a"],
      ["#fAA61a", "#d98f0b"],
    ];
    const index = parseInt(id) % colors.length;
    return colors[index];
  };

  const [bgColor1, bgColor2] = getBackgroundColor(server.id);

  return (
    <View
      className={`
        mx-4 mb-4 rounded-2xl overflow-hidden
        ${isDark ? "bg-dark-800" : "bg-white"}
        border
        ${isDark ? "border-dark-700" : "border-gray-200"}
      `}
    >
      {/* Banner */}
      <View
        style={{
          height: 100,
          backgroundColor: bgColor1,
        }}
      >
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            backgroundColor: bgColor2,
            opacity: 0.5,
          }}
        />
      </View>

      {/* Content */}
      <View className="px-4 pb-4 -mt-8">
        {/* Server Icon */}
        <View
          className={`
            w-16 h-16 rounded-2xl items-center justify-center
            ${isDark ? "bg-dark-800" : "bg-white"}
            border-4
            ${isDark ? "border-dark-800" : "border-white"}
          `}
          style={{ backgroundColor: bgColor1 }}
        >
          <Text className="text-white text-2xl font-bold">
            {server.name.charAt(0)}
          </Text>
        </View>

        {/* Server Info */}
        <View className="mt-3">
          <View className="flex-row items-center">
            <Text
              className={`text-lg font-bold flex-1 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              numberOfLines={1}
            >
              {server.name}
            </Text>
            {server.isVerified && (
              <View className="bg-brand/20 px-2 py-0.5 rounded-full ml-2">
                <Text className="text-brand text-xs font-medium">Verified</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center mt-1">
            <Ionicons
              name="people-outline"
              size={14}
              color={isDark ? "#80848e" : "#6b7280"}
            />
            <Text
              className={`ml-1 text-sm ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              {formatMemberCount(server.memberCount)} members
            </Text>
          </View>

          <Text
            className={`mt-2 text-sm leading-5 ${
              isDark ? "text-dark-300" : "text-gray-600"
            }`}
            numberOfLines={2}
          >
            {server.description}
          </Text>

          {/* Tags */}
          <View className="flex-row flex-wrap mt-3">
            {server.tags.map((tag) => (
              <View
                key={tag}
                className={`
                  px-2 py-1 rounded-md mr-2 mb-2
                  ${isDark ? "bg-dark-700" : "bg-gray-100"}
                `}
              >
                <Text
                  className={`text-xs ${
                    isDark ? "text-dark-400" : "text-gray-600"
                  }`}
                >
                  #{tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Join Button */}
          <Button
            title={hasJoined ? "Joined" : "Join Server"}
            variant={hasJoined ? "secondary" : "primary"}
            size="md"
            fullWidth
            isLoading={isJoining}
            disabled={hasJoined}
            onPress={handleJoin}
            className="mt-3"
          />
        </View>
      </View>
    </View>
  );
}

function EmptyState({
  isDark,
  hasSearch,
}: {
  isDark: boolean;
  hasSearch: boolean;
}) {
  return (
    <View className="items-center justify-center py-20 px-8">
      <View
        className={`
          w-24 h-24 rounded-full items-center justify-center mb-4
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={hasSearch ? "search-outline" : "compass-outline"}
          size={48}
          color={isDark ? "#4e5058" : "#9ca3af"}
        />
      </View>
      <Text
        className={`text-xl font-semibold text-center ${
          isDark ? "text-dark-200" : "text-gray-700"
        }`}
      >
        {hasSearch ? "No servers found" : "Discover Servers"}
      </Text>
      <Text
        className={`mt-2 text-sm text-center ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        {hasSearch
          ? "Try adjusting your search terms"
          : "Explore communities that match your interests"}
      </Text>
    </View>
  );
}

interface ServerDiscoveryScreenProps {
  servers?: PublicServer[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onJoinServer?: (server: PublicServer) => void;
}

export function ServerDiscoveryScreen({
  servers = mockPublicServers,
  onRefresh,
  onJoinServer,
}: ServerDiscoveryScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredServers = React.useMemo(() => {
    let result = servers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (server) =>
          server.name.toLowerCase().includes(query) ||
          server.description.toLowerCase().includes(query) ||
          server.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Filter by category
    if (activeCategory !== "all") {
      result = result.filter((server) => server.category === activeCategory);
    }

    return result;
  }, [servers, searchQuery, activeCategory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleJoinServer = useCallback(
    (server: PublicServer) => {
      onJoinServer?.(server);
    },
    [onJoinServer],
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Discover",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
        }}
      />

      {/* Search Bar */}
      <View className="px-4 py-3">
        <View
          className={`
            flex-row items-center px-4 py-3 rounded-xl
            ${isDark ? "bg-dark-800" : "bg-white"}
            border
            ${isDark ? "border-dark-700" : "border-gray-200"}
          `}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={isDark ? "#80848e" : "#6b7280"}
          />
          <TextInput
            className={`flex-1 ml-3 text-base ${
              isDark ? "text-white" : "text-gray-900"
            }`}
            placeholder="Search servers..."
            placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <View className="pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {categories.map((category) => (
            <CategoryPill
              key={category.id}
              category={category}
              isActive={activeCategory === category.id}
              onPress={() => setActiveCategory(category.id)}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View className="px-4 py-2">
        <Text
          className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          {filteredServers.length} server
          {filteredServers.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      {/* Server List */}
      <FlatList
        data={filteredServers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServerCard server={item} isDark={isDark} onJoin={handleJoinServer} />
        )}
        ListEmptyComponent={
          <EmptyState isDark={isDark} hasSearch={searchQuery.length > 0} />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? "#5865f2" : "#4f46e5"}
            colors={["#5865f2"]}
          />
        }
        contentContainerStyle={{
          paddingBottom: 20,
          flexGrow: filteredServers.length === 0 ? 1 : undefined,
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export default ServerDiscoveryScreen;
