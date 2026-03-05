import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface QuickCaptureFabProps {
  onPress?: () => void;
  size?: "sm" | "md" | "lg";
  position?: "bottomRight" | "bottomCenter" | "custom";
  customPosition?: { bottom?: number; right?: number; left?: number };
}

export function QuickCaptureFab({
  onPress,
  size = "lg",
  position = "bottomRight",
  customPosition,
}: QuickCaptureFabProps) {
  const router = useRouter();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) {
      onPress();
    } else {
      router.push("/quick-capture");
    }
  };

  const sizeStyles = {
    sm: { width: 44, height: 44, iconSize: 20 },
    md: { width: 52, height: 52, iconSize: 24 },
    lg: { width: 60, height: 60, iconSize: 28 },
  };

  const { width, height, iconSize } = sizeStyles[size];

  const getPositionStyle = () => {
    switch (position) {
      case "bottomCenter":
        return { bottom: 20, left: 0, right: 0, alignItems: "center" as const };
      case "custom":
        return { position: "absolute" as const, ...customPosition, zIndex: 50 };
      case "bottomRight":
      default:
        return { bottom: 20, right: 20 };
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        ...getPositionStyle(),
        zIndex: 50,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{
          width,
          height,
          borderRadius: width / 2,
          backgroundColor: "#f59e0b",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
        className="active:opacity-80"
      >
        <Ionicons name="flash-outline" size={iconSize} color="white" />
      </Pressable>
    </View>
  );
}

export default QuickCaptureFab;
