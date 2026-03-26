import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Image,
  Modal} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

interface ServerEmoji {
  id: string;
  name: string;
  imageUrl: string;
  createdBy: string;
  createdAt: Date;
  animated: boolean;
  usageCount: number;
}

const mockEmojis: ServerEmoji[] = [
  {
    id: "e1",
    name: "hearth_fire",
    imageUrl: "https://via.placeholder.com/48/f59e0b/ffffff?text=🔥",
    createdBy: "Sarah Johnson",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    animated: false,
    usageCount: 234,
  },
  {
    id: "e2",
    name: "party_blob",
    imageUrl: "https://via.placeholder.com/48/a855f7/ffffff?text=🎉",
    createdBy: "Alex Thompson",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
    animated: true,
    usageCount: 189,
  },
  {
    id: "e3",
    name: "thumbs_up_custom",
    imageUrl: "https://via.placeholder.com/48/22c55e/ffffff?text=👍",
    createdBy: "Michael Chen",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    animated: false,
    usageCount: 156,
  },
  {
    id: "e4",
    name: "server_logo",
    imageUrl: "https://via.placeholder.com/48/5865f2/ffffff?text=⚡",
    createdBy: "Sarah Johnson",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    animated: false,
    usageCount: 98,
  },
  {
    id: "e5",
    name: "wave_hello",
    imageUrl: "https://via.placeholder.com/48/3b82f6/ffffff?text=👋",
    createdBy: "Emily Davis",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    animated: true,
    usageCount: 312,
  },
  {
    id: "e6",
    name: "pepe_happy",
    imageUrl: "https://via.placeholder.com/48/22c55e/ffffff?text=😊",
    createdBy: "Alex Thompson",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    animated: false,
    usageCount: 445,
  },
  {
    id: "e7",
    name: "sad_cat",
    imageUrl: "https://via.placeholder.com/48/ef4444/ffffff?text=😿",
    createdBy: "Jake Miller",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    animated: false,
    usageCount: 67,
  },
  {
    id: "e8",
    name: "spinning_hearth",
    imageUrl: "https://via.placeholder.com/48/f59e0b/ffffff?text=💛",
    createdBy: "Sarah Johnson",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    animated: true,
    usageCount: 78,
  },
];

const MAX_EMOJIS = 50;

function EmojiItem({
  emoji,
  isDark,
  index,
  onRename,
  onDelete,
}: {
  emoji: ServerEmoji;
  isDark: boolean;
  index: number;
  onRename: (emoji: ServerEmoji) => void;
  onDelete: (emoji: ServerEmoji) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <View
        className={`
          flex-row items-center px-4 py-3
          border-b ${isDark ? "border-dark-800" : "border-gray-100"}
        `}
      >
        <View
          className={`w-12 h-12 rounded-lg items-center justify-center ${
            isDark ? "bg-dark-700" : "bg-gray-100"
          }`}
        >
          <Image
            source={{ uri: emoji.imageUrl }}
            className="w-8 h-8"
            resizeMode="contain"
          />
        </View>

        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <Text
              className={`text-sm font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              :{emoji.name}:
            </Text>
            {emoji.animated && (
              <View className="ml-2 px-1.5 py-0.5 rounded bg-brand/20">
                <Text className="text-xs text-brand font-medium">GIF</Text>
              </View>
            )}
          </View>
          <Text
            className={`text-xs mt-0.5 ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            by {emoji.createdBy} · {emoji.usageCount} uses
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={() => onRename(emoji)}
            className={`w-9 h-9 rounded-lg items-center justify-center ${
              isDark ? "bg-dark-700" : "bg-gray-100"
            }`}
          >
            <Ionicons
              name="pencil"
              size={16}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(emoji)}
            className={`w-9 h-9 rounded-lg items-center justify-center ${
              isDark ? "bg-dark-700" : "bg-gray-100"
            }`}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export function EmojiManagementScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [emojis, setEmojis] = useState(mockEmojis);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<ServerEmoji | null>(null);
  const [newName, setNewName] = useState("");

  const filteredEmojis = emojis.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const staticCount = emojis.filter((e) => !e.animated).length;
  const animatedCount = emojis.filter((e) => e.animated).length;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleUpload = () => {
    Alert.alert(
      "Upload Emoji",
      "Choose a source for your new emoji. Images must be under 256KB and 128x128px or smaller.",
      [
        { text: "Camera", onPress: () => {} },
        { text: "Photo Library", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const handleRename = (emoji: ServerEmoji) => {
    setSelectedEmoji(emoji);
    setNewName(emoji.name);
    setRenameModalVisible(true);
  };

  const confirmRename = () => {
    if (!selectedEmoji || !newName.trim()) return;
    const sanitized = newName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    if (!sanitized) return;

    setEmojis((prev) =>
      prev.map((e) =>
        e.id === selectedEmoji.id ? { ...e, name: sanitized } : e,
      ),
    );
    setRenameModalVisible(false);
    setSelectedEmoji(null);
  };

  const handleDelete = (emoji: ServerEmoji) => {
    Alert.alert(
      "Delete Emoji",
      `Are you sure you want to delete :${emoji.name}:? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setEmojis((prev) => prev.filter((e) => e.id !== emoji.id));
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Emojis",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleUpload} className="mr-2">
              <Ionicons name="add-circle" size={28} color="#5865f2" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Emoji Slots Info */}
      <View
        className={`px-4 py-3 border-b ${
          isDark ? "border-dark-700 bg-dark-800" : "border-gray-200 bg-gray-50"
        }`}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text
            className={`text-xs font-semibold uppercase ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            Emoji Slots
          </Text>
          <Text
            className={`text-xs font-medium ${
              isDark ? "text-dark-300" : "text-gray-600"
            }`}
          >
            {emojis.length}/{MAX_EMOJIS}
          </Text>
        </View>
        <View
          className={`h-2 rounded-full overflow-hidden ${
            isDark ? "bg-dark-700" : "bg-gray-200"
          }`}
        >
          <View
            className="h-full rounded-full bg-brand"
            style={{ width: `${(emojis.length / MAX_EMOJIS) * 100}%` }}
          />
        </View>
        <View className="flex-row mt-2 gap-4">
          <Text
            className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Static: {staticCount}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Animated: {animatedCount}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 py-3">
        <View
          className={`flex-row items-center rounded-xl px-3 py-2.5 ${
            isDark ? "bg-dark-800" : "bg-gray-100"
          }`}
        >
          <Ionicons
            name="search"
            size={18}
            color={isDark ? "#4e5058" : "#9ca3af"}
          />
          <TextInput
            className={`flex-1 ml-2 text-sm ${
              isDark ? "text-white" : "text-gray-900"
            }`}
            placeholder="Search emojis..."
            placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={isDark ? "#4e5058" : "#9ca3af"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        onPress={handleUpload}
        className={`mx-4 mb-3 flex-row items-center justify-center py-3 rounded-xl border-2 border-dashed ${
          isDark ? "border-dark-600" : "border-gray-300"
        }`}
      >
        <Ionicons
          name="cloud-upload-outline"
          size={20}
          color={isDark ? "#80848e" : "#6b7280"}
        />
        <Text
          className={`ml-2 text-sm font-medium ${
            isDark ? "text-dark-300" : "text-gray-600"
          }`}
        >
          Upload Emoji
        </Text>
      </TouchableOpacity>

      {/* Emoji List */}
      <FlatList
        data={filteredEmojis}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <EmojiItem
            emoji={item}
            isDark={isDark}
            index={index}
            onRename={handleRename}
            onDelete={handleDelete}
          />
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
              name="happy-outline"
              size={64}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              {searchQuery ? "No emojis found" : "No emojis yet"}
            </Text>
            <Text
              className={`mt-1 text-sm text-center px-8 ${
                isDark ? "text-dark-400" : "text-gray-400"
              }`}
            >
              {searchQuery
                ? "Try a different search term"
                : "Upload custom emojis for your server"}
            </Text>
          </View>
        )}
      />

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setRenameModalVisible(false)}
          className="flex-1 items-center justify-center bg-black/50"
        >
          <TouchableOpacity
            activeOpacity={1}
            className={`w-80 rounded-2xl p-5 ${
              isDark ? "bg-dark-800" : "bg-white"
            }`}
          >
            <Text
              className={`text-lg font-bold mb-1 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Rename Emoji
            </Text>
            <Text
              className={`text-sm mb-4 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Enter a new name for this emoji. Only lowercase letters, numbers,
              and underscores are allowed.
            </Text>

            {selectedEmoji && (
              <View className="items-center mb-4">
                <View
                  className={`w-16 h-16 rounded-xl items-center justify-center ${
                    isDark ? "bg-dark-700" : "bg-gray-100"
                  }`}
                >
                  <Image
                    source={{ uri: selectedEmoji.imageUrl }}
                    className="w-10 h-10"
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            <TextInput
              className={`rounded-xl px-4 py-3 text-sm mb-4 ${
                isDark
                  ? "bg-dark-700 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
              value={newName}
              onChangeText={setNewName}
              placeholder="emoji_name"
              placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRenameModalVisible(false)}
                className={`flex-1 py-3 rounded-xl items-center ${
                  isDark ? "bg-dark-700" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`font-medium ${
                    isDark ? "text-dark-200" : "text-gray-700"
                  }`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmRename}
                className="flex-1 py-3 rounded-xl items-center bg-brand"
              >
                <Text className="font-medium text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
