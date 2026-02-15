import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Avatar, Button, Badge } from "../ui";
import type { User } from "../../lib/types";

interface UserProfileScreenProps {
  /** The user to display */
  user: User;
  /** Whether this is the current user's own profile (shows edit button) */
  isOwnProfile?: boolean;
  /** Callback when edit button is pressed */
  onEditPress?: () => void;
  /** Show header with back button */
  showHeader?: boolean;
  /** Callback when back button is pressed */
  onBackPress?: () => void;
}

const statusLabels: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  idle: "Idle",
  dnd: "Do Not Disturb",
  invisible: "Invisible",
};

const statusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  idle: "bg-yellow-500",
  dnd: "bg-red-500",
  invisible: "bg-gray-400",
};

export function UserProfileScreen({
  user,
  isOwnProfile = false,
  onEditPress,
  showHeader = true,
  onBackPress,
}: UserProfileScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleEditPress = () => {
    if (onEditPress) {
      onEditPress();
    } else {
      router.push("/profile/edit");
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const currentStatus = user.status || "offline";

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={showHeader ? ["top", "left", "right"] : ["left", "right"]}
    >
      {/* Header */}
      {showHeader && (
        <View
          className={`
            flex-row 
            items-center 
            px-4 
            py-3
            border-b
            ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
          `}
        >
          <TouchableOpacity
            onPress={handleBackPress}
            className="p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </TouchableOpacity>
          <Text
            className={`
              flex-1
              text-lg 
              font-bold 
              text-center
              ${isDark ? "text-white" : "text-gray-900"}
            `}
          >
            Profile
          </Text>
          {/* Spacer for centering title */}
          <View className="w-8" />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View
          className={`
            mx-4 
            mt-6 
            rounded-2xl
            overflow-hidden
            ${isDark ? "bg-dark-800" : "bg-white"}
            border
            ${isDark ? "border-dark-700" : "border-gray-200"}
          `}
        >
          {/* Banner/Top section */}
          <View className="h-20 bg-brand" />

          {/* Avatar - positioned overlapping banner */}
          <View className="items-center -mt-12">
            <View
              className={`
                rounded-full 
                p-1
                ${isDark ? "bg-dark-800" : "bg-white"}
              `}
            >
              <Avatar
                uri={user.avatar}
                name={user.displayName || user.username}
                size="xl"
                status={currentStatus}
                showStatus
              />
            </View>
          </View>

          {/* User Info */}
          <View className="items-center px-6 pt-3 pb-6">
            {/* Display Name */}
            <Text
              className={`
                text-2xl 
                font-bold 
                ${isDark ? "text-white" : "text-gray-900"}
              `}
            >
              {user.displayName || user.username}
            </Text>

            {/* Username */}
            <Text
              className={`
                text-base
                mt-1
                ${isDark ? "text-dark-400" : "text-gray-500"}
              `}
            >
              @{user.username}
            </Text>

            {/* Status Badge */}
            <View className="flex-row items-center mt-3">
              <View
                className={`
                  w-3 
                  h-3 
                  rounded-full 
                  mr-2
                  ${statusColors[currentStatus]}
                `}
              />
              <Text
                className={`
                  text-sm
                  font-medium
                  ${isDark ? "text-dark-300" : "text-gray-600"}
                `}
              >
                {statusLabels[currentStatus]}
              </Text>
            </View>

            {/* About / Bio Section */}
            {user.bio ? (
              <View className="mt-4 w-full">
                <Text
                  className={`
                    text-xs 
                    font-semibold 
                    uppercase 
                    mb-2
                    ${isDark ? "text-dark-400" : "text-gray-500"}
                  `}
                >
                  About Me
                </Text>
                <View
                  className={`
                    p-3
                    rounded-xl
                    ${isDark ? "bg-dark-700" : "bg-gray-50"}
                  `}
                >
                  <Text
                    className={`
                      text-sm
                      leading-5
                      ${isDark ? "text-dark-200" : "text-gray-700"}
                    `}
                  >
                    {user.bio}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mt-4 w-full">
                <Text
                  className={`
                    text-xs 
                    font-semibold 
                    uppercase 
                    mb-2
                    ${isDark ? "text-dark-400" : "text-gray-500"}
                  `}
                >
                  About Me
                </Text>
                <View
                  className={`
                    p-3
                    rounded-xl
                    ${isDark ? "bg-dark-700" : "bg-gray-50"}
                  `}
                >
                  <Text
                    className={`
                      text-sm
                      italic
                      ${isDark ? "text-dark-500" : "text-gray-400"}
                    `}
                  >
                    {isOwnProfile
                      ? "You haven't written anything about yourself yet."
                      : "This user hasn't written anything about themselves yet."}
                  </Text>
                </View>
              </View>
            )}

            {/* Edit Button - Only show for own profile */}
            {isOwnProfile && (
              <Button
                title="Edit Profile"
                variant="secondary"
                size="md"
                fullWidth
                className="mt-6"
                onPress={handleEditPress}
                leftIcon={
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={isDark ? "#e0e0e0" : "#374151"}
                  />
                }
              />
            )}
          </View>
        </View>

        {/* Member Since */}
        {user.createdAt && (
          <View className="mx-4 mt-4">
            <View
              className={`
                flex-row
                items-center
                p-4
                rounded-xl
                ${isDark ? "bg-dark-800" : "bg-white"}
                border
                ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3">
                <Text
                  className={`
                    text-xs
                    ${isDark ? "text-dark-400" : "text-gray-500"}
                  `}
                >
                  Member Since
                </Text>
                <Text
                  className={`
                    text-sm
                    font-medium
                    ${isDark ? "text-dark-200" : "text-gray-700"}
                  `}
                >
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
