import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  Modal,
  TextInput,
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, SearchInput, Button, Badge } from "../../components/ui";

type FriendStatus = "online" | "idle" | "dnd" | "offline";

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  status: FriendStatus;
  activity?: string;
  mutualServers?: number;
}

interface FriendRequest {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  mutualFriends: number;
  type: "incoming" | "outgoing";
  timestamp: string;
}

const mockFriends: Friend[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    username: "sarahj",
    status: "online",
    activity: "Playing Valorant",
    mutualServers: 3,
  },
  {
    id: "2",
    name: "Michael Chen",
    username: "mchen",
    status: "online",
    activity: "Listening to Spotify",
    mutualServers: 5,
  },
  {
    id: "3",
    name: "Emily Davis",
    username: "emilyd",
    status: "idle",
    mutualServers: 2,
  },
  {
    id: "4",
    name: "David Wilson",
    username: "dwilson",
    status: "dnd",
    activity: "In a call",
    mutualServers: 1,
  },
  {
    id: "5",
    name: "Alex Thompson",
    username: "athompson",
    status: "offline",
    mutualServers: 4,
  },
  {
    id: "6",
    name: "Jessica Lee",
    username: "jlee",
    status: "offline",
    mutualServers: 2,
  },
  {
    id: "7",
    name: "Chris Martinez",
    username: "cmartinez",
    status: "online",
    mutualServers: 1,
  },
  {
    id: "8",
    name: "Amanda Brown",
    username: "abrown",
    status: "idle",
    activity: "Watching YouTube",
    mutualServers: 3,
  },
];

const mockRequests: FriendRequest[] = [
  {
    id: "r1",
    name: "Tom Anderson",
    username: "tanderson",
    mutualFriends: 5,
    type: "incoming",
    timestamp: "2h ago",
  },
  {
    id: "r2",
    name: "Lisa Wang",
    username: "lwang",
    mutualFriends: 3,
    type: "incoming",
    timestamp: "1d ago",
  },
  {
    id: "r3",
    name: "Jake Miller",
    username: "jmiller",
    mutualFriends: 0,
    type: "outgoing",
    timestamp: "3d ago",
  },
];

const statusColors: Record<FriendStatus, string> = {
  online: "#22c55e",
  idle: "#f59e0b",
  dnd: "#ef4444",
  offline: "#80848e",
};

const statusLabels: Record<FriendStatus, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

type TabType = "all" | "online" | "pending" | "blocked";

function FriendItem({
  friend,
  isDark,
  onMessage,
  onMore,
}: {
  friend: Friend;
  isDark: boolean;
  onMessage: () => void;
  onMore: () => void;
}) {
  return (
    <View
      className={`
        flex-row items-center px-4 py-3
        border-b ${isDark ? "border-dark-800" : "border-gray-100"}
      `}
    >
      <View className="relative">
        <Avatar uri={friend.avatar} name={friend.name} size="md" />
        <View
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
          style={{
            backgroundColor: statusColors[friend.status],
            borderColor: isDark ? "#1e1f22" : "#ffffff",
          }}
        />
      </View>

      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text
            className={`text-base font-semibold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {friend.name}
          </Text>
        </View>
        {friend.activity ? (
          <Text
            className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
            numberOfLines={1}
          >
            {friend.activity}
          </Text>
        ) : (
          <Text
            className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {statusLabels[friend.status]}
          </Text>
        )}
      </View>

      <View className="flex-row items-center space-x-2">
        <TouchableOpacity
          onPress={onMessage}
          className={`
            w-9 h-9 rounded-full items-center justify-center
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons
            name="chatbubble"
            size={18}
            color={isDark ? "#b5bac1" : "#6b7280"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMore}
          className={`
            w-9 h-9 rounded-full items-center justify-center
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={isDark ? "#b5bac1" : "#6b7280"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FriendRequestItem({
  request,
  isDark,
  onAccept,
  onDecline,
  onCancel,
}: {
  request: FriendRequest;
  isDark: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  const isIncoming = request.type === "incoming";

  return (
    <View
      className={`
        flex-row items-center px-4 py-3
        border-b ${isDark ? "border-dark-800" : "border-gray-100"}
      `}
    >
      <Avatar uri={request.avatar} name={request.name} size="md" />

      <View className="flex-1 ml-3">
        <Text
          className={`text-base font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {request.name}
        </Text>
        <Text
          className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          {isIncoming
            ? `${request.mutualFriends} mutual friend${request.mutualFriends !== 1 ? "s" : ""}`
            : `Outgoing • ${request.timestamp}`}
        </Text>
      </View>

      {isIncoming ? (
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={onAccept}
            className="w-9 h-9 rounded-full bg-green-500 items-center justify-center"
          >
            <Ionicons name="checkmark" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDecline}
            className={`
              w-9 h-9 rounded-full items-center justify-center
              ${isDark ? "bg-dark-700" : "bg-gray-200"}
            `}
          >
            <Ionicons
              name="close"
              size={20}
              color={isDark ? "#b5bac1" : "#6b7280"}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onCancel}
          className={`
            px-3 py-1.5 rounded-lg
            ${isDark ? "bg-dark-700" : "bg-gray-200"}
          `}
        >
          <Text
            className={`text-sm font-medium ${
              isDark ? "text-dark-200" : "text-gray-700"
            }`}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AddFriendModal({
  visible,
  onClose,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSendRequest = useCallback(() => {
    if (!username.trim()) return;
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setUsername("");
        setStatus("idle");
        onClose();
      }, 1500);
    }, 1000);
  }, [username, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View
          className={`
            rounded-t-3xl px-6 pt-6 pb-10
            ${isDark ? "bg-dark-800" : "bg-white"}
          `}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text
              className={`text-xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Add Friend
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          </View>

          <Text
            className={`text-sm mb-2 ${
              isDark ? "text-dark-300" : "text-gray-600"
            }`}
          >
            You can add friends with their username.
          </Text>

          <View
            className={`
              flex-row items-center rounded-xl px-4 py-3 mt-2
              ${isDark ? "bg-dark-900" : "bg-gray-100"}
              ${status === "error" ? "border border-red-500" : ""}
              ${status === "success" ? "border border-green-500" : ""}
            `}
          >
            <TextInput
              className={`flex-1 text-base ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              placeholder="Enter a username"
              placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={status === "idle"}
            />
            {status === "success" && (
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            )}
            {status === "error" && (
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            )}
          </View>

          {status === "success" && (
            <Text className="text-green-500 text-sm mt-2">
              Friend request sent successfully!
            </Text>
          )}
          {status === "error" && (
            <Text className="text-red-500 text-sm mt-2">
              User not found. Please check the username.
            </Text>
          )}

          <Button
            title={status === "loading" ? "Sending..." : "Send Friend Request"}
            variant="primary"
            fullWidth
            className="mt-6"
            onPress={handleSendRequest}
            disabled={!username.trim() || status === "loading" || status === "success"}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState<TabType>("online");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>(mockFriends);
  const [requests, setRequests] = useState<FriendRequest[]>(mockRequests);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: "online", label: "Online", count: friends.filter((f) => f.status !== "offline").length },
    { key: "all", label: "All", count: friends.length },
    { key: "pending", label: "Pending", count: requests.length },
    { key: "blocked", label: "Blocked" },
  ];

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch =
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "online") {
      return matchesSearch && friend.status !== "offline";
    }
    return matchesSearch;
  });

  const onlineFriends = filteredFriends.filter((f) => f.status === "online");
  const idleFriends = filteredFriends.filter((f) => f.status === "idle");
  const dndFriends = filteredFriends.filter((f) => f.status === "dnd");
  const offlineFriends = filteredFriends.filter((f) => f.status === "offline");

  const sections =
    activeTab === "all"
      ? [
          { title: "Online", data: onlineFriends },
          { title: "Idle", data: idleFriends },
          { title: "Do Not Disturb", data: dndFriends },
          { title: "Offline", data: offlineFriends },
        ].filter((s) => s.data.length > 0)
      : activeTab === "online"
        ? [
            { title: "Online", data: onlineFriends },
            { title: "Idle", data: idleFriends },
            { title: "Do Not Disturb", data: dndFriends },
          ].filter((s) => s.data.length > 0)
        : [];

  const incomingRequests = requests.filter((r) => r.type === "incoming");
  const outgoingRequests = requests.filter((r) => r.type === "outgoing");

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleAcceptRequest = useCallback((id: string) => {
    const request = requests.find((r) => r.id === id);
    if (request) {
      const newFriend: Friend = {
        id: `f-${id}`,
        name: request.name,
        username: request.username,
        avatar: request.avatar,
        status: "online",
        mutualServers: 0,
      };
      setFriends((prev) => [newFriend, ...prev]);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }, [requests]);

  const handleDeclineRequest = useCallback((id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Friends",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerRight: () => (
            <TouchableOpacity
              className="mr-4"
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons
                name="person-add"
                size={24}
                color={isDark ? "#5865f2" : "#4f46e5"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Tabs */}
      <View
        className={`
          flex-row px-4 py-2 border-b
          ${isDark ? "bg-dark-900 border-dark-800" : "bg-white border-gray-200"}
        `}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`
              flex-row items-center px-3 py-2 mr-2 rounded-lg
              ${activeTab === tab.key ? "bg-brand" : isDark ? "bg-dark-700" : "bg-gray-100"}
            `}
          >
            <Text
              className={`
                text-sm font-medium
                ${activeTab === tab.key ? "text-white" : isDark ? "text-dark-200" : "text-gray-700"}
              `}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View
                className={`
                  ml-1.5 px-1.5 py-0.5 rounded-full min-w-[20px] items-center
                  ${activeTab === tab.key ? "bg-white/20" : isDark ? "bg-dark-600" : "bg-gray-200"}
                `}
              >
                <Text
                  className={`
                    text-xs font-bold
                    ${activeTab === tab.key ? "text-white" : isDark ? "text-dark-300" : "text-gray-600"}
                  `}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      {(activeTab === "all" || activeTab === "online") && (
        <View className="px-4 py-3">
          <SearchInput
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Content */}
      {activeTab === "pending" ? (
        <FlatList
          data={[...incomingRequests, ...outgoingRequests]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendRequestItem
              request={item}
              isDark={isDark}
              onAccept={() => handleAcceptRequest(item.id)}
              onDecline={() => handleDeclineRequest(item.id)}
              onCancel={() => handleDeclineRequest(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? "#5865f2" : "#4f46e5"}
            />
          }
          ListHeaderComponent={
            incomingRequests.length > 0 ? (
              <Text
                className={`px-4 py-2 text-xs font-bold uppercase ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Incoming — {incomingRequests.length}
              </Text>
            ) : null
          }
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20">
              <Ionicons
                name="people-outline"
                size={64}
                color={isDark ? "#4e5058" : "#d1d5db"}
              />
              <Text
                className={`mt-4 text-lg font-medium ${
                  isDark ? "text-dark-300" : "text-gray-500"
                }`}
              >
                No pending requests
              </Text>
              <Text
                className={`mt-1 text-sm text-center px-8 ${
                  isDark ? "text-dark-400" : "text-gray-400"
                }`}
              >
                When someone sends you a friend request, it will appear here
              </Text>
            </View>
          )}
        />
      ) : activeTab === "blocked" ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons
            name="ban-outline"
            size={64}
            color={isDark ? "#4e5058" : "#d1d5db"}
          />
          <Text
            className={`mt-4 text-lg font-medium ${
              isDark ? "text-dark-300" : "text-gray-500"
            }`}
          >
            No blocked users
          </Text>
          <Text
            className={`mt-1 text-sm ${
              isDark ? "text-dark-400" : "text-gray-400"
            }`}
          >
            You haven't blocked anyone
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendItem
              friend={item}
              isDark={isDark}
              onMessage={() => router.push(`/chat/${item.id}`)}
              onMore={() => {}}
            />
          )}
          renderSectionHeader={({ section: { title, data } }) => (
            <View
              className={`px-4 py-2 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                {title} — {data.length}
              </Text>
            </View>
          )}
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
                name="people-outline"
                size={64}
                color={isDark ? "#4e5058" : "#d1d5db"}
              />
              <Text
                className={`mt-4 text-lg font-medium ${
                  isDark ? "text-dark-300" : "text-gray-500"
                }`}
              >
                {searchQuery ? "No friends found" : "No friends yet"}
              </Text>
              <Text
                className={`mt-1 text-sm text-center px-8 ${
                  isDark ? "text-dark-400" : "text-gray-400"
                }`}
              >
                {searchQuery
                  ? "Try a different search term"
                  : "Add friends to start chatting"}
              </Text>
              {!searchQuery && (
                <Button
                  title="Add Friend"
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onPress={() => setShowAddModal(true)}
                  leftIcon={<Ionicons name="person-add" size={16} color="white" />}
                />
              )}
            </View>
          )}
          stickySectionHeadersEnabled
        />
      )}

      <AddFriendModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}
