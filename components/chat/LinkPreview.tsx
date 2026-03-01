/**
 * LinkPreview - Display rich previews for URLs in messages
 * Extracts Open Graph metadata and displays as an embedded card
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  useColorScheme,
  Linking,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

// ============================================================================
// Types
// ============================================================================

export interface LinkMetadata {
  /** Original URL */
  url: string;
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Preview image URL */
  image?: string;
  /** Site name (e.g., "YouTube", "Twitter") */
  siteName?: string;
  /** Favicon URL */
  favicon?: string;
  /** Domain name */
  domain: string;
  /** Content type (article, video, etc.) */
  type?: string;
  /** Video embed URL (for YouTube, Vimeo, etc.) */
  videoUrl?: string;
}

interface LinkPreviewProps {
  /** URL to preview */
  url: string;
  /** Whether to show the preview (respects user settings) */
  enabled?: boolean;
  /** Callback when preview is pressed */
  onPress?: (url: string) => void;
  /** Callback when preview fails to load */
  onError?: (error: Error) => void;
  /** Compact mode (smaller preview) */
  compact?: boolean;
  /** Custom metadata (skip fetching) */
  metadata?: LinkMetadata;
}

// ============================================================================
// URL Parsing Utilities
// ============================================================================

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Check if URL is a known video platform
 */
function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /twitch\.tv\//i,
    /dailymotion\.com\//i,
  ];
  return videoPatterns.some((pattern) => pattern.test(url));
}

/**
 * Get platform icon for known sites
 */
function getPlatformIcon(domain: string): string | null {
  const iconMap: Record<string, string> = {
    "youtube.com": "logo-youtube",
    "youtu.be": "logo-youtube",
    "twitter.com": "logo-twitter",
    "x.com": "logo-twitter",
    "github.com": "logo-github",
    "reddit.com": "logo-reddit",
    "instagram.com": "logo-instagram",
    "facebook.com": "logo-facebook",
    "linkedin.com": "logo-linkedin",
    "tiktok.com": "logo-tiktok",
    "discord.com": "logo-discord",
    "twitch.tv": "logo-twitch",
  };
  return iconMap[domain] || null;
}

// ============================================================================
// Mock Metadata Fetcher (replace with actual API)
// ============================================================================

/**
 * Fetch metadata for a URL
 * In production, this would call a backend service or use a library
 */
async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));
  
  const domain = getDomain(url);
  
  // Mock metadata based on domain patterns
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return {
      url,
      domain,
      title: "Video Title - YouTube",
      description: "Watch this video on YouTube",
      siteName: "YouTube",
      type: "video",
      image: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    };
  }
  
  if (url.includes("github.com")) {
    const pathParts = url.split("github.com/")[1]?.split("/") || [];
    return {
      url,
      domain,
      title: pathParts.slice(0, 2).join("/") || "GitHub Repository",
      description: "GitHub is where the world builds software",
      siteName: "GitHub",
      type: "object",
      image: `https://opengraph.githubassets.com/1/${pathParts.slice(0, 2).join("/")}`,
    };
  }
  
  // Generic fallback
  return {
    url,
    domain,
    title: `Link to ${domain}`,
    type: "website",
  };
}

// ============================================================================
// Component
// ============================================================================

export function LinkPreview({
  url,
  enabled = true,
  onPress,
  onError,
  compact = false,
  metadata: providedMetadata,
}: LinkPreviewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [metadata, setMetadata] = useState<LinkMetadata | null>(
    providedMetadata || null
  );
  const [isLoading, setIsLoading] = useState(!providedMetadata);
  const [hasError, setHasError] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Animation values
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  // Fetch metadata on mount
  useEffect(() => {
    if (!enabled || providedMetadata) return;
    
    let isMounted = true;
    
    const loadMetadata = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const data = await fetchLinkMetadata(url);
        if (isMounted) {
          setMetadata(data);
        }
      } catch (error) {
        if (isMounted) {
          setHasError(true);
          onError?.(error as Error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadMetadata();
    
    return () => {
      isMounted = false;
    };
  }, [url, enabled, providedMetadata, onError]);
  
  // Handle press
  const handlePress = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15 });
    }, 100);
    
    if (onPress) {
      onPress(url);
    } else {
      Linking.openURL(url).catch(console.error);
    }
  }, [url, onPress, scale]);
  
  // Platform icon
  const platformIcon = useMemo(() => {
    if (!metadata) return null;
    return getPlatformIcon(metadata.domain);
  }, [metadata]);
  
  // Don't render if disabled or error
  if (!enabled || hasError) return null;
  
  // Loading state
  if (isLoading) {
    return (
      <View
        className={`mt-2 p-3 rounded-lg ${
          isDark ? "bg-dark-700" : "bg-gray-100"
        }`}
      >
        <View className="flex-row items-center">
          <ActivityIndicator
            size="small"
            color={isDark ? "#80848e" : "#6b7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            Loading preview...
          </Text>
        </View>
      </View>
    );
  }
  
  if (!metadata) return null;
  
  const isVideo = isVideoUrl(url);
  const hasImage = metadata.image && !imageError;
  
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        className={`mt-2 rounded-lg overflow-hidden border ${
          isDark ? "bg-dark-700 border-dark-600" : "bg-gray-50 border-gray-200"
        }`}
      >
        {/* Image Preview */}
        {hasImage && !compact && (
          <View className="relative">
            <Image
              source={{ uri: metadata.image }}
              className="w-full h-40"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            
            {/* Video play overlay */}
            {isVideo && (
              <View className="absolute inset-0 items-center justify-center bg-black/30">
                <View className="w-14 h-14 rounded-full bg-white/90 items-center justify-center">
                  <Ionicons name="play" size={28} color="#000" />
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Content */}
        <View className={`p-3 ${compact ? "flex-row items-center" : ""}`}>
          {/* Compact image */}
          {hasImage && compact && (
            <Image
              source={{ uri: metadata.image }}
              className="w-16 h-16 rounded mr-3"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          )}
          
          <View className={compact ? "flex-1" : ""}>
            {/* Site info */}
            <View className="flex-row items-center mb-1">
              {platformIcon ? (
                <Ionicons
                  name={platformIcon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              ) : metadata.favicon ? (
                <Image
                  source={{ uri: metadata.favicon }}
                  className="w-4 h-4 rounded"
                />
              ) : (
                <Ionicons
                  name="globe-outline"
                  size={14}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              )}
              <Text
                className={`ml-1.5 text-xs ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                {metadata.siteName || metadata.domain}
              </Text>
            </View>
            
            {/* Title */}
            {metadata.title && (
              <Text
                className={`font-semibold ${compact ? "text-sm" : "text-base"} ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                numberOfLines={compact ? 1 : 2}
              >
                {metadata.title}
              </Text>
            )}
            
            {/* Description */}
            {metadata.description && !compact && (
              <Text
                className={`text-sm mt-1 ${
                  isDark ? "text-dark-300" : "text-gray-600"
                }`}
                numberOfLines={2}
              >
                {metadata.description}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// Link Preview List (for messages with multiple URLs)
// ============================================================================

interface LinkPreviewListProps {
  /** Text content to extract URLs from */
  content: string;
  /** Whether link previews are enabled */
  enabled?: boolean;
  /** Maximum number of previews to show */
  maxPreviews?: number;
  /** Use compact mode for previews */
  compact?: boolean;
}

export function LinkPreviewList({
  content,
  enabled = true,
  maxPreviews = 3,
  compact = false,
}: LinkPreviewListProps) {
  const urls = useMemo(
    () => extractUrls(content).slice(0, maxPreviews),
    [content, maxPreviews]
  );
  
  if (!enabled || urls.length === 0) return null;
  
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      {urls.map((url, index) => (
        <LinkPreview
          key={`${url}-${index}`}
          url={url}
          enabled={enabled}
          compact={compact || urls.length > 1}
        />
      ))}
    </Animated.View>
  );
}

export default LinkPreview;
