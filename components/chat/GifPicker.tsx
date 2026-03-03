import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  useColorScheme,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ============================================================================
// Types
// ============================================================================

export interface GifImage {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string;
}

interface GifCategory {
  id: string;
  name: string;
  gifUrl: string;
}

interface GifPickerProps {
  /** Whether the picker is visible */
  visible: boolean;
  /** Callback when a GIF is selected */
  onSelect: (gif: GifImage) => void;
  /** Callback when the picker is closed */
  onClose: () => void;
  /** Giphy API key */
  apiKey?: string;
  /** Whether to show trending GIFs on open */
  showTrending?: boolean;
  /** Number of columns in the grid */
  columns?: number;
  /** Maximum height of the picker */
  maxHeight?: number;
}

interface GifItemProps {
  gif: GifImage;
  onSelect: (gif: GifImage) => void;
  width: number;
  isDark: boolean;
}

interface CategoryChipProps {
  category: GifCategory;
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";
const _GIPHY_STICKER_URL = "https://api.giphy.com/v1/stickers"; // Reserved for sticker support

// Default API key (replace with your own for production)
const DEFAULT_API_KEY = "YOUR_GIPHY_API_KEY";

const TRENDING_CATEGORIES: GifCategory[] = [
  { id: "reactions", name: "Reactions", gifUrl: "" },
  { id: "emotions", name: "Emotions", gifUrl: "" },
  { id: "actions", name: "Actions", gifUrl: "" },
  { id: "animals", name: "Animals", gifUrl: "" },
  { id: "memes", name: "Memes", gifUrl: "" },
  { id: "entertainment", name: "Entertainment", gifUrl: "" },
];

// ============================================================================
// GIF Item Component
// ============================================================================

function GifItem({ gif, onSelect, width, isDark }: GifItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const aspectRatio = gif.width / gif.height;
  const itemHeight = width / aspectRatio;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(gif);
  };

  if (hasError) {
    return (
      <View
        style={{ width, height: itemHeight }}
        className={`m-0.5 rounded-lg items-center justify-center ${
          isDark ? "bg-neutral-800" : "bg-neutral-200"
        }`}
      >
        <Ionicons
          name="image-outline"
          size={24}
          color={isDark ? "#525252" : "#a3a3a3"}
        />
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handleSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        className="m-0.5"
      >
        <View
          style={{ width, height: itemHeight }}
          className={`rounded-lg overflow-hidden ${
            isDark ? "bg-neutral-800" : "bg-neutral-200"
          }`}
        >
          {isLoading && (
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator
                size="small"
                color={isDark ? "#737373" : "#a3a3a3"}
              />
            </View>
          )}
          <Image
            source={{ uri: gif.previewUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Category Chip Component
// ============================================================================

function CategoryChip({
  category,
  isSelected,
  onPress,
  isDark,
}: CategoryChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`
        px-4 py-2 rounded-full mr-2
        ${
          isSelected
            ? "bg-indigo-500"
            : isDark
              ? "bg-neutral-700"
              : "bg-neutral-200"
        }
      `}
      activeOpacity={0.7}
    >
      <Text
        className={`text-sm font-medium ${
          isSelected
            ? "text-white"
            : isDark
              ? "text-neutral-300"
              : "text-neutral-700"
        }`}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// Search Input Component
// ============================================================================

function SearchInput({
  value,
  onChange,
  onClear,
  isDark,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  onClear: () => void;
  isDark: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View
      className={`
        flex-row items-center px-3 py-2.5 rounded-xl mx-4
        ${isDark ? "bg-neutral-700" : "bg-neutral-100"}
      `}
    >
      <Ionicons
        name="search"
        size={20}
        color={isDark ? "#a3a3a3" : "#737373"}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? "Search GIFs"}
        placeholderTextColor={isDark ? "#737373" : "#a3a3a3"}
        className={`flex-1 ml-2 text-base ${
          isDark ? "text-white" : "text-neutral-900"
        }`}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} className="p-1">
          <Ionicons
            name="close-circle"
            size={20}
            color={isDark ? "#737373" : "#a3a3a3"}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  type,
  searchQuery,
  isDark,
}: {
  type: "no-results" | "error" | "initial";
  searchQuery?: string;
  isDark: boolean;
}) {
  const config = {
    "no-results": {
      icon: "search-outline" as const,
      title: "No GIFs found",
      subtitle: searchQuery
        ? `No results for "${searchQuery}"`
        : "Try a different search",
    },
    error: {
      icon: "cloud-offline-outline" as const,
      title: "Couldn't load GIFs",
      subtitle: "Check your connection and try again",
    },
    initial: {
      icon: "images-outline" as const,
      title: "Search for GIFs",
      subtitle: "Find the perfect GIF to share",
    },
  };

  const { icon, title, subtitle } = config[type];

  return (
    <View className="flex-1 items-center justify-center py-12">
      <View
        className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
          isDark ? "bg-neutral-800" : "bg-neutral-100"
        }`}
      >
        <Ionicons
          name={icon}
          size={32}
          color={isDark ? "#737373" : "#a3a3a3"}
        />
      </View>
      <Text
        className={`text-lg font-semibold mb-1 ${
          isDark ? "text-neutral-300" : "text-neutral-700"
        }`}
      >
        {title}
      </Text>
      <Text
        className={`text-sm text-center px-8 ${
          isDark ? "text-neutral-500" : "text-neutral-500"
        }`}
      >
        {subtitle}
      </Text>
    </View>
  );
}

// ============================================================================
// Giphy API Functions
// ============================================================================

async function fetchTrendingGifs(
  apiKey: string,
  limit = 25,
  offset = 0
): Promise<GifImage[]> {
  try {
    const response = await fetch(
      `${GIPHY_BASE_URL}/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=pg-13`
    );
    const data = await response.json();
    return parseGiphyResponse(data);
  } catch (error) {
    console.error("Error fetching trending GIFs:", error);
    return [];
  }
}

async function searchGifs(
  apiKey: string,
  query: string,
  limit = 25,
  offset = 0
): Promise<GifImage[]> {
  try {
    const response = await fetch(
      `${GIPHY_BASE_URL}/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg-13`
    );
    const data = await response.json();
    return parseGiphyResponse(data);
  } catch (error) {
    console.error("Error searching GIFs:", error);
    return [];
  }
}

async function fetchGifsByCategory(
  apiKey: string,
  category: string,
  limit = 25,
  offset = 0
): Promise<GifImage[]> {
  // Use search with category name as query
  return searchGifs(apiKey, category, limit, offset);
}

function parseGiphyResponse(data: {
  data?: Array<{
    id: string;
    title: string;
    images: {
      fixed_width: {
        url: string;
        width: string;
        height: string;
      };
      original: {
        url: string;
        width: string;
        height: string;
      };
      fixed_width_still?: {
        url: string;
      };
    };
  }>;
}): GifImage[] {
  if (!data.data) return [];

  return data.data.map((gif) => ({
    id: gif.id,
    url: gif.images.original.url,
    previewUrl: gif.images.fixed_width.url,
    width: parseInt(gif.images.fixed_width.width, 10) || 200,
    height: parseInt(gif.images.fixed_width.height, 10) || 200,
    title: gif.title,
  }));
}

// ============================================================================
// Custom Hooks
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Main GifPicker Component
// ============================================================================

export function GifPicker({
  visible,
  onSelect,
  onClose,
  apiKey = DEFAULT_API_KEY,
  showTrending = true,
  columns = 2,
  maxHeight,
}: GifPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const pickerHeight = maxHeight ?? screenHeight * 0.6;

  // Item width calculation (accounting for margins)
  const itemWidth = (screenWidth - 16 - columns * 4) / columns;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<GifImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Animations
  const slideAnim = useRef(new Animated.Value(pickerHeight)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Debounced search query
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Reset state when opening
  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setSelectedCategory(null);
      setOffset(0);
      setHasMore(true);
      setHasError(false);

      // Load trending GIFs on open
      if (showTrending) {
        loadTrendingGifs();
      }

      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: pickerHeight,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, showTrending, slideAnim, backdropAnim, pickerHeight]);

  // Search effect
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      handleSearch(debouncedQuery);
    } else if (visible && showTrending && !selectedCategory) {
      loadTrendingGifs();
    }
  }, [debouncedQuery]);

  const loadTrendingGifs = async () => {
    setIsLoading(true);
    setHasError(false);

    const results = await fetchTrendingGifs(apiKey, 25, 0);

    if (results.length === 0 && gifs.length === 0) {
      setHasError(true);
    } else {
      setGifs(results);
      setOffset(25);
      setHasMore(results.length === 25);
    }

    setIsLoading(false);
  };

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setHasError(false);
    setSelectedCategory(null);

    const results = await searchGifs(apiKey, query, 25, 0);

    setGifs(results);
    setOffset(25);
    setHasMore(results.length === 25);
    setIsLoading(false);
  };

  const handleCategorySelect = async (category: GifCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    if (selectedCategory === category.id) {
      // Deselect and show trending
      setSelectedCategory(null);
      loadTrendingGifs();
      return;
    }

    setSelectedCategory(category.id);
    setSearchQuery("");
    setIsLoading(true);
    setHasError(false);

    const results = await fetchGifsByCategory(apiKey, category.name, 25, 0);

    setGifs(results);
    setOffset(25);
    setHasMore(results.length === 25);
    setIsLoading(false);
  };

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    let results: GifImage[];

    if (searchQuery) {
      results = await searchGifs(apiKey, searchQuery, 25, offset);
    } else if (selectedCategory) {
      const category = TRENDING_CATEGORIES.find(
        (c) => c.id === selectedCategory
      );
      results = category
        ? await fetchGifsByCategory(apiKey, category.name, 25, offset)
        : [];
    } else {
      results = await fetchTrendingGifs(apiKey, 25, offset);
    }

    if (results.length > 0) {
      setGifs((prev) => [...prev, ...results]);
      setOffset((prev) => prev + 25);
      setHasMore(results.length === 25);
    } else {
      setHasMore(false);
    }

    setIsLoading(false);
  };

  const handleGifSelect = useCallback(
    (gif: GifImage) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelect(gif);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClearSearch = () => {
    setSearchQuery("");
    if (showTrending) {
      loadTrendingGifs();
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const renderGifItem = useCallback(
    ({ item }: { item: GifImage }) => (
      <GifItem
        gif={item}
        onSelect={handleGifSelect}
        width={itemWidth}
        isDark={isDark}
      />
    ),
    [handleGifSelect, itemWidth, isDark]
  );

  const renderFooter = () => {
    if (!isLoading || gifs.length === 0) return null;

    return (
      <View className="py-4 items-center">
        <ActivityIndicator
          size="small"
          color={isDark ? "#737373" : "#a3a3a3"}
        />
      </View>
    );
  };

  const keyExtractor = useCallback((item: GifImage) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<GifImage> | null | undefined, index: number) => ({
      length: itemWidth,
      offset: itemWidth * index,
      index,
    }),
    [itemWidth]
  );

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        {/* Backdrop */}
        <Animated.View
          style={{ opacity: backdropAnim }}
          className="absolute inset-0 bg-black/50"
        >
          <Pressable className="flex-1" onPress={handleClose} />
        </Animated.View>

        {/* Picker Container */}
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            height: pickerHeight + insets.bottom,
            paddingBottom: insets.bottom,
          }}
          className={`
            absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden
            ${isDark ? "bg-neutral-900" : "bg-white"}
          `}
        >
          {/* Handle Bar */}
          <View className="items-center pt-3 pb-2">
            <View
              className={`w-10 h-1 rounded-full ${
                isDark ? "bg-neutral-700" : "bg-neutral-300"
              }`}
            />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text
              className={`text-lg font-bold ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              GIFs
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className={`w-8 h-8 rounded-full items-center justify-center ${
                isDark ? "bg-neutral-800" : "bg-neutral-100"
              }`}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#d4d4d4" : "#525252"}
              />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={handleClearSearch}
            isDark={isDark}
          />

          {/* Category Chips */}
          <FlatList
            data={TRENDING_CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            renderItem={({ item }) => (
              <CategoryChip
                category={item}
                isSelected={selectedCategory === item.id}
                onPress={() => handleCategorySelect(item)}
                isDark={isDark}
              />
            )}
          />

          {/* GIF Grid */}
          {hasError ? (
            <EmptyState type="error" isDark={isDark} />
          ) : isLoading && gifs.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator
                size="large"
                color={isDark ? "#737373" : "#a3a3a3"}
              />
            </View>
          ) : gifs.length === 0 && searchQuery ? (
            <EmptyState
              type="no-results"
              searchQuery={searchQuery}
              isDark={isDark}
            />
          ) : (
            <FlatList
              data={gifs}
              numColumns={columns}
              keyExtractor={keyExtractor}
              renderItem={renderGifItem}
              contentContainerStyle={{ paddingHorizontal: 4 }}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderFooter}
              getItemLayout={getItemLayout}
              removeClippedSubviews
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          )}

          {/* Giphy Attribution */}
          <View className="items-center py-2 border-t border-neutral-200 dark:border-neutral-800">
            <Text
              className={`text-xs ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            >
              Powered by GIPHY
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default GifPicker;
