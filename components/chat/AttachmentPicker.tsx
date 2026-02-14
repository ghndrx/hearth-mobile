import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  useColorScheme,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export interface Attachment {
  id: string;
  type: "image" | "video" | "audio" | "document";
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  duration?: number; // for audio/video
  width?: number;
  height?: number;
}

interface AttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onAttachmentsSelected: (attachments: Attachment[]) => void;
  maxAttachments?: number;
}

interface AttachmentOption {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

const ATTACHMENT_OPTIONS: AttachmentOption[] = [
  { id: "camera", icon: "camera", label: "Camera", color: "#ef4444" },
  { id: "gallery", icon: "images", label: "Gallery", color: "#8b5cf6" },
  { id: "document", icon: "document", label: "Document", color: "#3b82f6" },
  { id: "audio", icon: "musical-notes", label: "Audio", color: "#f59e0b" },
];

export function AttachmentPicker({
  visible,
  onClose,
  onAttachmentsSelected,
  maxAttachments = 10,
}: AttachmentPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async (
    type: "camera" | "mediaLibrary"
  ): Promise<boolean> => {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to take photos.",
          [{ text: "OK" }]
        );
        return false;
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to select images.",
          [{ text: "OK" }]
        );
        return false;
      }
    }
    return true;
  };

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const handleCamera = async () => {
    const hasPermission = await requestPermissions("camera");
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const attachment: Attachment = {
          id: generateId(),
          type: asset.type === "video" ? "video" : "image",
          uri: asset.uri,
          name: asset.fileName || `capture_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ?? undefined,
        };
        onAttachmentsSelected([attachment]);
        onClose();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture media. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGallery = async () => {
    const hasPermission = await requestPermissions("mediaLibrary");
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: maxAttachments,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const attachments: Attachment[] = result.assets.map((asset) => ({
          id: generateId(),
          type: asset.type === "video" ? "video" : "image",
          uri: asset.uri,
          name: asset.fileName || `media_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ?? undefined,
        }));
        onAttachmentsSelected(attachments);
        onClose();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select media. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocument = async () => {
    setIsLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const attachments: Attachment[] = result.assets.map((asset) => ({
          id: generateId(),
          type: "document",
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        }));
        onAttachmentsSelected(attachments);
        onClose();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select document. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudio = async () => {
    setIsLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        multiple: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const attachments: Attachment[] = result.assets.map((asset) => ({
          id: generateId(),
          type: "audio",
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        }));
        onAttachmentsSelected(attachments);
        onClose();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select audio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionPress = (optionId: string) => {
    switch (optionId) {
      case "camera":
        handleCamera();
        break;
      case "gallery":
        handleGallery();
        break;
      case "document":
        handleDocument();
        break;
      case "audio":
        handleAudio();
        break;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 justify-end bg-black/50"
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          className={`rounded-t-3xl pt-4 pb-8 ${
            isDark ? "bg-dark-800" : "bg-white"
          }`}
        >
          {/* Handle Bar */}
          <View className="items-center mb-4">
            <View
              className={`w-10 h-1 rounded-full ${
                isDark ? "bg-dark-600" : "bg-gray-300"
              }`}
            />
          </View>

          {/* Title */}
          <Text
            className={`text-center text-lg font-semibold mb-6 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Add Attachment
          </Text>

          {/* Loading Overlay */}
          {isLoading && (
            <View className="absolute inset-0 bg-black/20 items-center justify-center z-10 rounded-t-3xl">
              <ActivityIndicator size="large" color="#5865f2" />
            </View>
          )}

          {/* Options Grid */}
          <View className="flex-row flex-wrap justify-center px-6">
            {ATTACHMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleOptionPress(option.id)}
                disabled={isLoading}
                className="items-center w-20 mx-4 mb-4"
                activeOpacity={0.7}
              >
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: `${option.color}20` }}
                >
                  <Ionicons name={option.icon} size={28} color={option.color} />
                </View>
                <Text
                  className={`text-sm ${
                    isDark ? "text-dark-200" : "text-gray-700"
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={onClose}
            className={`mx-6 mt-4 py-3 rounded-xl items-center ${
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
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Attachment Preview Strip Component
interface AttachmentPreviewStripProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  maxDisplay?: number;
}

export function AttachmentPreviewStrip({
  attachments,
  onRemove,
  maxDisplay = 5,
}: AttachmentPreviewStripProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (attachments.length === 0) return null;

  const formatSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeIcon = (type: Attachment["type"]): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "image":
        return "image";
      case "video":
        return "videocam";
      case "audio":
        return "musical-notes";
      case "document":
        return "document";
    }
  };

  const renderAttachment = ({ item }: { item: Attachment }) => (
    <View
      className={`mr-3 rounded-xl overflow-hidden ${
        isDark ? "bg-dark-700" : "bg-gray-100"
      }`}
    >
      {item.type === "image" || item.type === "video" ? (
        <View className="relative">
          <Image
            source={{ uri: item.uri }}
            className="w-20 h-20"
            resizeMode="cover"
          />
          {item.type === "video" && (
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <Ionicons name="play-circle" size={32} color="white" />
            </View>
          )}
        </View>
      ) : (
        <View className="w-20 h-20 items-center justify-center p-2">
          <Ionicons
            name={getTypeIcon(item.type)}
            size={28}
            color={isDark ? "#80848e" : "#6b7280"}
          />
          <Text
            className={`text-[10px] mt-1 text-center ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
            numberOfLines={2}
          >
            {item.name.length > 12 ? `${item.name.slice(0, 10)}...` : item.name}
          </Text>
          {item.size && (
            <Text
              className={`text-[9px] ${isDark ? "text-dark-500" : "text-gray-400"}`}
            >
              {formatSize(item.size)}
            </Text>
          )}
        </View>
      )}

      {/* Remove Button */}
      <TouchableOpacity
        onPress={() => onRemove(item.id)}
        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons name="close" size={14} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className={`py-3 border-t ${isDark ? "border-dark-700" : "border-gray-200"}`}>
      <FlatList
        horizontal
        data={attachments.slice(0, maxDisplay)}
        keyExtractor={(item) => item.id}
        renderItem={renderAttachment}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsHorizontalScrollIndicator={false}
        ListFooterComponent={
          attachments.length > maxDisplay ? (
            <View
              className={`w-20 h-20 rounded-xl items-center justify-center ${
                isDark ? "bg-dark-700" : "bg-gray-100"
              }`}
            >
              <Text className={`font-bold ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                +{attachments.length - maxDisplay}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
