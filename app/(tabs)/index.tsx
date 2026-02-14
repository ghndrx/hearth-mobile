import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, SearchInput } from "../../components/ui";

interface Server {
  id: string;
  name: string;
  icon?: string;
  memberCount: number;
  unreadCount: number;
  isOnline: boolean;
}

const mockServers: Server[] = [
  {
    id: "1",
    name: "Gaming Hub",
    memberCount: 1234,
    unreadCount: 5,
    isOnline: true,
  },
  {
    id: "2",
    name: "Tech Talk",
    memberCount: 567,
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "3",
    name: "Design Community",
    memberCount: 890,
    unreadCount: 12,
    isOnline: false,
  },
  {
    id: "4",
    name: "Music Lovers",
    memberCount: 2345,
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "5",
    name: "Book Club",
    memberCount: 456,
    unreadCount: 3,
    isOnline: false,
  },
];

function ServerItem({ server, isDark }: { server: Server; isDark: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`
        flex-row 
        items-center 
        p-4 
        mx-4 
        mb-3 
        rounded-xl
        ${isDark ? "bg-dark-800" : "bg-white"}
        border
        ${isDark ? "border-dark-700" : "border-gray-200"}
      `}
    >
      <Avatar
        uri={server.icon}
        name={server.name}
        size="lg"
        status={server.isOnline ? "online" : "offline"}
        showStatus
      />
      <View className="flex-1 ml-4">
        <Text
          className={`text-base font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {server.name}
        </Text>
        <Text
          className={`text-sm mt-0.5 ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          {server.memberCount.toLocaleString()} members
        </Text>
      </View>
      {server.unreadCount > 0 ? (
        <View className="bg-brand rounded-full min-w-[24px] h-6 items-center justify-center px-2">
          <Text className="text-white text-xs font-bold">
            {server.unreadCount > 99 ? "99+" : server.unreadCount}
          </Text>
        </View>
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

export default function ServersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredServers = mockServers.filter((server) =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Servers",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerRight: () => (
            <TouchableOpacity className="mr-4">
              <Ionicons
                name="add-circle"
                size={28}
                color={isDark ? "#5865f2" : "#4f46e5"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View className="px-4 py-4">
        <SearchInput
          placeholder="Search servers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredServers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ServerItem server={item} isDark={isDark} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#5865f2" : "#4f46e5"}
          />
        }
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <Ionicons
              name="planet-outline"
              size={64}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              No servers found
            </Text>
            <Text
              className={`mt-1 text-sm ${
                isDark ? "text-dark-400" : "text-gray-400"
              }`}
            >
              Try adjusting your search
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
