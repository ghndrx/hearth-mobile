import React from "react";
import { Text, TouchableOpacity} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import type { Scene } from "../../lib/types/iot";

interface SceneCardProps {
  scene: Scene;
  onPress?: (scene: Scene) => void;
}

const SCENE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  movie: "film-outline",
  sleep: "moon-outline",
  morning: "sunny-outline",
  away: "exit-outline",
  party: "musical-notes-outline",
  focus: "glasses-outline",
  relax: "cafe-outline",
  dinner: "restaurant-outline",
  default: "color-wand-outline",
};

function getSceneIcon(scene: Scene): React.ComponentProps<typeof Ionicons>["name"] {
  if (scene.icon && SCENE_ICONS[scene.icon]) return SCENE_ICONS[scene.icon];
  const nameLower = scene.name.toLowerCase();
  for (const [key, icon] of Object.entries(SCENE_ICONS)) {
    if (nameLower.includes(key)) return icon;
  }
  return SCENE_ICONS.default;
}

export function SceneCard({ scene, onPress }: SceneCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const color = scene.color || "#5865f2";

  return (
    <TouchableOpacity
      onPress={() => onPress?.(scene)}
      activeOpacity={0.7}
      className={`
        items-center justify-center p-4 rounded-2xl mr-3
        ${isDark ? "bg-dark-800" : "bg-white"}
        border ${isDark ? "border-dark-700" : "border-gray-200"}
        ${scene.isActive ? "border-2" : ""}
      `}
      style={[
        { width: 100, height: 100 },
        scene.isActive ? { borderColor: color } : undefined,
      ]}
    >
      <Ionicons
        name={getSceneIcon(scene)}
        size={28}
        color={scene.isActive ? color : isDark ? "#949ba4" : "#6b7280"}
      />
      <Text
        className={`text-xs font-medium mt-2 text-center ${
          scene.isActive
            ? "text-brand"
            : isDark
              ? "text-dark-200"
              : "text-gray-600"
        }`}
        numberOfLines={1}
      >
        {scene.name}
      </Text>
    </TouchableOpacity>
  );
}
