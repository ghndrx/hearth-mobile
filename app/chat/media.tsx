import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  FlatList,
  Dimensions,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

type MediaType = "images" | "files" | "links";

interface MediaItem {
  id: string;
  type: "image" | "video" | "file" | "link";
  uri: string;
  thumbnail?: string;
  filename: string;
  size?: number;
  sender: string;
  timestamp: string;
  linkTitle?: string;
  linkDescription?: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

const mockMedia: MediaItem[] = [
  {
    id: "1",
    type: "image",
    uri: "https://picsum.photos/400/400?random=1",
    thumbnail: "https://picsum.photos/200/200?random=1",
    filename: "sunset.jpg",
    size: 2400000,
    sender: "Sarah Johnson",
    timestamp: "2h ago",
  },
  {
    id: "2",
    type: "image",
    uri: "https://picsum.photos/400/600?random=2",
    thumbnail: "https://picsum.photos/200/300?random=2",
    filename: "mountain.jpg",
    size: 3100000,
    sender: "Michael Chen",
    timestamp: "5h ago",
  },
  {
    id: "3",
    type: "video",
    uri: "https://picsum.photos/400/400?random=3",
    thumbnail: "https://picsum.photos/200/200?random=3",
    filename: "demo.mp4",
    size: 15000000,
    sender: "Emily Davis",
    timestamp: "Yesterday",
  },
  {
    id: "4",
    type: "image",
    uri: "https://picsum.photos/600/400?random=4",
    thumbnail: "https://picsum.photos/300/200?random=4",
    filename: "design-v2.png",
    size: 1800000,
    sender: "Alex Thompson",
    timestamp: "Yesterday",
  },
  {
    id: "5",
    type: "image",
    uri: "https://picsum.photos/400/400?random=5",
    thumbnail: "https://picsum.photos/200/200?random=5",
    filename: "team-photo.jpg",
    size: 4200000,
    sender: "Sarah Johnson",
    timestamp: "2 days ago",
  },
  {
    id: "6",
    type: "image",
    uri: "https://picsum.photos/400/500?random=6",
    thumbnail: "https://picsum.photos/200/250?random=6",
    filename: "wireframes.png",
    size: 900000,
    sender: "Jessica Lee",
    timestamp: "3 days ago",
  },
  {
    id: "7",
    type: "image",
    uri: "https://picsum.photos/500/400?random=7",
    thumbnail: "https://picsum.photos/250/200?random=7",
    filename: "screenshot.png",
    size: 1200000,
    sender: "David Wilson",
    timestamp: "4 days ago",
  },
  {
    id: "8",
    type: "image",
    uri: "https://picsum.photos/400/400?random=8",
    thumbnail: "https://picsum.photos/200/200?random=8",
    filename: "logo-final.svg",
    size: 500000,
    sender: "Emily Davis",
    timestamp: "1 week ago",
  },
  {
    id: "9",
    type: "image",
    uri: "https://picsum.photos/400/300?random=9",
    thumbnail: "https://picsum.photos/200/150?random=9",
    filename: "banner.jpg",
    size: 2800000,
    sender: "Michael Chen",
    timestamp: "1 week ago",
  },
];

const mockFiles: MediaItem[] = [
  {
    id: "f1",
    type: "file",
    uri: "",
    filename: "project-spec.pdf",
    size: 4500000,
    sender: "Sarah Johnson",
    timestamp: "1h ago",
  },
  {
    id: "f2",
    type: "file",
    uri: "",
    filename: "budget-2026.xlsx",
    size: 1200000,
    sender: "Michael Chen",
    timestamp: "Yesterday",
  },
  {
    id: "f3",
    type: "file",
    uri: "",
    filename: "meeting-notes.docx",
    size: 350000,
    sender: "Emily Davis",
    timestamp: "2 days ago",
  },
  {
    id: "f4",
    type: "file",
    uri: "",
    filename: "app-release.apk",
    size: 45000000,
    sender: "Alex Thompson",
    timestamp: "3 days ago",
  },
  {
    id: "f5",
    type: "file",
    uri: "",
    filename: "design-system.fig",
    size: 8700000,
    sender: "Jessica Lee",
    timestamp: "1 week ago",
  },
];

const mockLinks: MediaItem[] = [
  {
    id: "l1",
    type: "link",
    uri: "https://react-native.dev",
    filename: "react-native.dev",
    sender: "Sarah Johnson",
    timestamp: "3h ago",
    linkTitle: "React Native - Learn once, write anywhere",
    linkDescription:
      "A framework for building native apps using React",
  },
  {
    id: "l2",
    type: "link",
    uri: "https://expo.dev",
    filename: "expo.dev",
    sender: "Michael Chen",
    timestamp: "Yesterday",
    linkTitle: "Expo - Make any app",
    linkDescription:
      "An open-source platform for making universal native apps",
  },
  {
    id: "l3",
    type: "link",
    uri: "https://nativewind.dev",
    filename: "nativewind.dev",
    sender: "Emily Davis",
    timestamp: "3 days ago",
    linkTitle: "NativeWind - Tailwind CSS for React Native",
    linkDescription: "Use Tailwind CSS in React Native projects",
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(
  filename: string,
): React.ComponentProps<typeof Ionicons>["name"] {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "document-text";
    case "doc":
    case "docx":
      return "document-text";
    case "xls":
    case "xlsx":
      return "grid";
    case "ppt":
    case "pptx":
      return "easel";
    case "zip":
    case "rar":
      return "archive";
    case "apk":
    case "ipa":
      return "phone-portrait";
    case "fig":
      return "color-palette";
    default:
      return "document";
  }
}

function getFileColor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "#ef4444";
    case "doc":
    case "docx":
      return "#3b82f6";
    case "xls":
    case "xlsx":
      return "#22c55e";
    case "ppt":
    case "pptx":
      return "#f97316";
    case "fig":
      return "#a855f7";
    default:
      return "#6b7280";
  }
}

export default function MediaGalleryScreen() {
  const { channelName } = useLocalSearchParams<{ channelName?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [activeTab, setActiveTab] = useState<MediaType>("images");
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const tabs: { key: MediaType; label: string; count: number }[] = [
    { key: "images", label: "Media", count: mockMedia.length },
    { key: "files", label: "Files", count: mockFiles.length },
    { key: "links", label: "Links", count: mockLinks.length },
  ];

  const renderMediaItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => (
      <Animated.View entering={FadeIn.delay(index * 30).duration(200)}>
        <TouchableOpacity
          onPress={() => {
            setSelectedImage(item);
            setImageLoading(true);
          }}
          activeOpacity={0.8}
          style={{
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            margin: GRID_GAP / 2,
          }}
        >
          <Image
            source={{ uri: item.thumbnail || item.uri }}
            style={{ width: "100%", height: "100%", borderRadius: 4 }}
            resizeMode="cover"
          />
          {item.type === "video" && (
            <View className="absolute inset-0 items-center justify-center bg-black/30 rounded">
              <View className="w-10 h-10 rounded-full bg-white/90 items-center justify-center">
                <Ionicons name="play" size={20} color="#000000" />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    ),
    [],
  );

  const renderFileItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-3 border-b ${
          isDark ? "border-dark-800" : "border-gray-100"
        }`}
        activeOpacity={0.7}
      >
        <View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{ backgroundColor: getFileColor(item.filename) + "20" }}
        >
          <Ionicons
            name={getFileIcon(item.filename)}
            size={22}
            color={getFileColor(item.filename)}
          />
        </View>
        <View className="flex-1 ml-3">
          <Text
            className={`text-base font-medium ${isDark ? "text-white" : "text-gray-900"}`}
            numberOfLines={1}
          >
            {item.filename}
          </Text>
          <Text
            className={`text-xs mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            {item.size ? formatFileSize(item.size) : ""} · {item.sender} ·{" "}
            {item.timestamp}
          </Text>
        </View>
        <TouchableOpacity className="p-2">
          <Ionicons
            name="download-outline"
            size={22}
            color={isDark ? "#80848e" : "#6b7280"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [isDark],
  );

  const renderLinkItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <TouchableOpacity
        className={`mx-4 mb-3 rounded-xl overflow-hidden border ${
          isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"
        }`}
        activeOpacity={0.7}
      >
        <View className="p-4">
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="link-outline"
              size={16}
              color="#5865f2"
            />
            <Text
              className="text-xs text-brand ml-1.5"
              numberOfLines={1}
            >
              {item.filename}
            </Text>
          </View>
          {item.linkTitle && (
            <Text
              className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
              numberOfLines={2}
            >
              {item.linkTitle}
            </Text>
          )}
          {item.linkDescription && (
            <Text
              className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
              numberOfLines={2}
            >
              {item.linkDescription}
            </Text>
          )}
          <Text
            className={`text-xs mt-2 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Shared by {item.sender} · {item.timestamp}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [isDark],
  );

  const renderEmpty = useCallback(
    () => (
      <View className="items-center justify-center py-20">
        <Ionicons
          name={
            activeTab === "images"
              ? "images-outline"
              : activeTab === "files"
                ? "document-outline"
                : "link-outline"
          }
          size={64}
          color={isDark ? "#4e5058" : "#d1d5db"}
        />
        <Text
          className={`mt-4 text-lg font-medium ${
            isDark ? "text-dark-300" : "text-gray-500"
          }`}
        >
          No {activeTab} shared yet
        </Text>
        <Text
          className={`mt-1 text-sm ${isDark ? "text-dark-400" : "text-gray-400"}`}
        >
          {activeTab === "images"
            ? "Images and videos shared in this chat will appear here"
            : activeTab === "files"
              ? "Files shared in this chat will appear here"
              : "Links shared in this chat will appear here"}
        </Text>
      </View>
    ),
    [activeTab, isDark],
  );

  const getData = () => {
    switch (activeTab) {
      case "images":
        return mockMedia;
      case "files":
        return mockFiles;
      case "links":
        return mockLinks;
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: channelName
            ? `#${channelName}`
            : "Shared Media",
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
        }}
      />

      {/* Tabs */}
      <View
        className={`flex-row px-4 py-2 border-b ${
          isDark ? "bg-dark-900 border-dark-800" : "bg-white border-gray-200"
        }`}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-row items-center px-4 py-2 mr-2 rounded-lg ${
              activeTab === tab.key
                ? "bg-brand"
                : isDark
                  ? "bg-dark-700"
                  : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.key
                  ? "text-white"
                  : isDark
                    ? "text-dark-200"
                    : "text-gray-700"
              }`}
            >
              {tab.label}
            </Text>
            <View
              className={`ml-1.5 px-1.5 py-0.5 rounded-full min-w-[20px] items-center ${
                activeTab === tab.key
                  ? "bg-white/20"
                  : isDark
                    ? "bg-dark-600"
                    : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === tab.key
                    ? "text-white"
                    : isDark
                      ? "text-dark-300"
                      : "text-gray-600"
                }`}
              >
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "images" ? (
        <FlatList
          data={getData()}
          keyExtractor={(item) => item.id}
          renderItem={renderMediaItem}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={{ padding: GRID_GAP / 2 }}
          ListEmptyComponent={renderEmpty}
        />
      ) : (
        <FlatList
          data={getData()}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === "files" ? renderFileItem : renderLinkItem}
          contentContainerStyle={
            activeTab === "links" ? { paddingTop: 12 } : undefined
          }
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Full-screen Image Viewer */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3">
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <View className="flex-1 mx-4 items-center">
                <Text
                  className="text-white text-sm font-medium"
                  numberOfLines={1}
                >
                  {selectedImage?.filename}
                </Text>
                <Text className="text-white/60 text-xs">
                  {selectedImage?.sender} · {selectedImage?.timestamp}
                </Text>
              </View>
              <TouchableOpacity className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="download-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>

            {/* Image */}
            <View className="flex-1 items-center justify-center">
              {imageLoading && (
                <ActivityIndicator
                  size="large"
                  color="white"
                  className="absolute"
                />
              )}
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage.uri }}
                  className="w-full h-full"
                  resizeMode="contain"
                  onLoadEnd={() => setImageLoading(false)}
                />
              )}
            </View>

            {/* Footer */}
            <View className="flex-row items-center justify-center py-4 space-x-6">
              <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="share-outline" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="bookmark-outline" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
