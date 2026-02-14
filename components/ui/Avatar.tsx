import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useColorScheme } from "react-native";

interface AvatarProps {
  uri?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "idle" | "dnd" | "invisible";
  showStatus?: boolean;
  onPress?: () => void;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const statusColors = {
  online: "#22c55e",
  offline: "#80848e",
  idle: "#eab308",
  dnd: "#ef4444",
  invisible: "#80848e",
};

export function Avatar({
  uri,
  name,
  size = "md",
  status,
  showStatus = false,
  onPress,
}: AvatarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const sizeValue = sizeMap[size];
  const statusSize = Math.max(8, sizeValue / 4);

  // Get initials from name
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const AvatarContent = uri ? (
    <Image
      source={{ uri }}
      className="rounded-full"
      style={{ width: sizeValue, height: sizeValue }}
    />
  ) : (
    <View
      className={`rounded-full items-center justify-center ${isDark ? "bg-brand" : "bg-brand"}`}
      style={{ width: sizeValue, height: sizeValue }}
    >
      <Text
        className="text-white font-semibold"
        style={{ fontSize: sizeValue / 2.5 }}
      >
        {initials}
      </Text>
    </View>
  );

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
      <View>
        {AvatarContent}
        {showStatus && status && (
          <View
            className="absolute rounded-full border-2"
            style={{
              width: statusSize,
              height: statusSize,
              backgroundColor: statusColors[status],
              borderColor: isDark ? "#1e1f22" : "#ffffff",
              bottom: 0,
              right: 0,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

interface AvatarGroupProps {
  avatars: Array<{ uri?: string; name: string }>;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  spacing?: number;
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = "sm",
  spacing = -8,
}: AvatarGroupProps) {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <View className="flex-row">
      {displayAvatars.map((avatar, index) => (
        <View key={index} style={{ marginLeft: index > 0 ? spacing : 0 }}>
          <Avatar uri={avatar.uri} name={avatar.name} size={size} />
        </View>
      ))}
      {remaining > 0 && (
        <View
          className="rounded-full bg-gray-300 items-center justify-center"
          style={{
            width: sizeMap[size],
            height: sizeMap[size],
            marginLeft: spacing,
          }}
        >
          <Text className="text-gray-700 font-medium text-xs">
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}
