import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Avatar, Button } from "../ui";
import type { User, Server } from "../../lib/types";

type FriendshipStatus = "none" | "friends" | "pending_outgoing" | "pending_incoming" | "blocked";

interface UserProfileScreenProps {
  /** The user to display */
  user: User;
  /** Whether this is the current user's own profile (shows edit button) */
  isOwnProfile?: boolean;
  /** Friendship status with this user */
  friendshipStatus?: FriendshipStatus;
  /** Date when friendship started */
  friendSince?: string;
  /** List of mutual servers */
  mutualServers?: Server[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when edit button is pressed */
  onEditPress?: () => void;
  /** Callback when message button is pressed */
  onMessagePress?: () => void;
  /** Callback when add friend button is pressed */
  onAddFriendPress?: () => void;
  /** Callback when accept friend request button is pressed */
  onAcceptFriendPress?: () => void;
  /** Callback when remove friend button is pressed */
  onRemoveFriendPress?: () => void;
  /** Callback when block user button is pressed */
  onBlockPress?: () => void;
  /** Callback when report user button is pressed */
  onReportPress?: () => void;
  /** Callback when unblock user button is pressed */
  onUnblockPress?: () => void;
  /** Show header with back button */
  showHeader?: boolean;
  /** Callback when back button is pressed */
  onBackPress?: () => void;
  /** Callback when a mutual server is pressed */
  onMutualServerPress?: (server: Server) => void;
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
  friendshipStatus = "none",
  friendSince,
  mutualServers = [],
  isLoading = false,
  onEditPress,
  onMessagePress,
  onAddFriendPress,
  onAcceptFriendPress,
  onRemoveFriendPress,
  onBlockPress,
  onUnblockPress,
  onReportPress,
  showHeader = true,
  onBackPress,
  onMutualServerPress,
}: UserProfileScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleMessagePress = useCallback(async () => {
    if (onMessagePress) {
      setActionLoading("message");
      try {
        await onMessagePress();
      } finally {
        setActionLoading(null);
      }
    } else {
      router.push(`/chat/${user.id}`);
    }
  }, [onMessagePress, user.id]);

  const handleAddFriend = useCallback(async () => {
    if (onAddFriendPress) {
      setActionLoading("friend");
      try {
        await onAddFriendPress();
      } finally {
        setActionLoading(null);
      }
    }
  }, [onAddFriendPress]);

  const handleAcceptFriend = useCallback(async () => {
    if (onAcceptFriendPress) {
      setActionLoading("accept");
      try {
        await onAcceptFriendPress();
      } finally {
        setActionLoading(null);
      }
    }
  }, [onAcceptFriendPress]);

  const handleRemoveFriend = useCallback(async () => {
    if (onRemoveFriendPress) {
      setActionLoading("remove");
      try {
        await onRemoveFriendPress();
      } finally {
        setActionLoading(null);
      }
    }
  }, [onRemoveFriendPress]);

  const handleServerPress = useCallback(
    (server: Server) => {
      if (onMutualServerPress) {
        onMutualServerPress(server);
      } else {
        router.push(`/server/${server.id}`);
      }
    },
    [onMutualServerPress]
  );

  const handleOptionsMenu = useCallback(() => {
    const options: Array<{
      text: string;
      style?: "default" | "cancel" | "destructive";
      onPress?: () => void;
    }> = [];

    if (friendshipStatus !== "blocked") {
      options.push({
        text: "Block User",
        style: "destructive",
        onPress: onBlockPress,
      });
    }

    options.push({
      text: "Report User",
      style: "destructive",
      onPress: onReportPress,
    });

    options.push({
      text: "Cancel",
      style: "cancel",
    });

    Alert.alert(
      "Options",
      undefined,
      options
    );
  }, [friendshipStatus, onBlockPress, onReportPress]);

  const currentStatus = user.status || "offline";

  // Render action buttons based on relationship
  const renderActionButtons = () => {
    if (isOwnProfile) {
      return (
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
      );
    }

    if (friendshipStatus === "blocked") {
      return (
        <View className="mt-6 w-full">
          <Button
            title="Unblock User"
            variant="secondary"
            size="md"
            fullWidth
            onPress={onUnblockPress}
            leftIcon={
              <Ionicons
                name="ban-outline"
                size={18}
                color={isDark ? "#e0e0e0" : "#374151"}
              />
            }
          />
        </View>
      );
    }

    return (
      <View className="mt-6 w-full">
        {/* Primary action buttons */}
        <View className="flex-row space-x-3 mb-3">
          {/* Message Button */}
          <View className="flex-1">
            <Button
              title={actionLoading === "message" ? "" : "Message"}
              variant="primary"
              size="md"
              fullWidth
              onPress={handleMessagePress}
              disabled={actionLoading !== null}
              leftIcon={
                actionLoading === "message" ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="chatbubble" size={18} color="#ffffff" />
                )
              }
            />
          </View>

          {/* Friend Button - changes based on status */}
          <View className="flex-1">
            {friendshipStatus === "none" && (
              <Button
                title={actionLoading === "friend" ? "" : "Add Friend"}
                variant="secondary"
                size="md"
                fullWidth
                onPress={handleAddFriend}
                disabled={actionLoading !== null}
                leftIcon={
                  actionLoading === "friend" ? (
                    <ActivityIndicator
                      size="small"
                      color={isDark ? "#e0e0e0" : "#374151"}
                    />
                  ) : (
                    <Ionicons
                      name="person-add"
                      size={18}
                      color={isDark ? "#e0e0e0" : "#374151"}
                    />
                  )
                }
              />
            )}
            {friendshipStatus === "pending_outgoing" && (
              <Button
                title="Request Sent"
                variant="secondary"
                size="md"
                fullWidth
                disabled
                leftIcon={
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={isDark ? "#80848e" : "#9ca3af"}
                  />
                }
              />
            )}
            {friendshipStatus === "pending_incoming" && (
              <Button
                title={actionLoading === "accept" ? "" : "Accept"}
                variant="primary"
                size="md"
                fullWidth
                onPress={handleAcceptFriend}
                disabled={actionLoading !== null}
                leftIcon={
                  actionLoading === "accept" ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                  )
                }
              />
            )}
            {friendshipStatus === "friends" && (
              <Button
                title="Friends"
                variant="secondary"
                size="md"
                fullWidth
                onPress={handleRemoveFriend}
                leftIcon={
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#22c55e"
                  />
                }
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render mutual servers section
  const renderMutualServers = () => {
    if (isOwnProfile || mutualServers.length === 0) {
      return null;
    }

    return (
      <View className="mx-4 mt-4">
        <View
          className={`
            p-4
            rounded-xl
            ${isDark ? "bg-dark-800" : "bg-white"}
            border
            ${isDark ? "border-dark-700" : "border-gray-200"}
          `}
        >
          <View className="flex-row items-center mb-3">
            <Ionicons
              name="server-outline"
              size={18}
              color={isDark ? "#80848e" : "#6b7280"}
            />
            <Text
              className={`
                ml-2
                text-sm
                font-semibold
                ${isDark ? "text-dark-300" : "text-gray-600"}
              `}
            >
              {mutualServers.length} Mutual Server
              {mutualServers.length !== 1 ? "s" : ""}
            </Text>
          </View>

          <View className="flex-row flex-wrap -m-1">
            {mutualServers.slice(0, 6).map((server) => (
              <TouchableOpacity
                key={server.id}
                onPress={() => handleServerPress(server)}
                activeOpacity={0.7}
                className="p-1"
              >
                <View
                  className={`
                    flex-row
                    items-center
                    px-3
                    py-2
                    rounded-lg
                    ${isDark ? "bg-dark-700" : "bg-gray-100"}
                  `}
                >
                  {server.icon ? (
                    <Avatar uri={server.icon} name={server.name} size={24} />
                  ) : (
                    <View
                      className={`
                        w-6 h-6 rounded-md items-center justify-center
                        ${isDark ? "bg-dark-600" : "bg-gray-200"}
                      `}
                    >
                      <Text
                        className={`
                          text-xs font-semibold
                          ${isDark ? "text-dark-300" : "text-gray-600"}
                        `}
                      >
                        {server.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text
                    className={`
                      ml-2
                      text-sm
                      font-medium
                      ${isDark ? "text-dark-200" : "text-gray-700"}
                    `}
                    numberOfLines={1}
                  >
                    {server.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {mutualServers.length > 6 && (
              <View className="p-1">
                <View
                  className={`
                    flex-row
                    items-center
                    px-3
                    py-2
                    rounded-lg
                    ${isDark ? "bg-dark-700" : "bg-gray-100"}
                  `}
                >
                  <Text
                    className={`
                      text-sm
                      font-medium
                      ${isDark ? "text-dark-400" : "text-gray-500"}
                    `}
                  >
                    +{mutualServers.length - 6} more
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
        edges={["top", "left", "right"]}
      >
        <ActivityIndicator size="large" color="#5865f2" />
        <Text className={`mt-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

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
          {/* More options button */}
          {!isOwnProfile && (
            <TouchableOpacity
              onPress={handleOptionsMenu}
              className="p-2 -mr-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          )}
          {isOwnProfile && <View className="w-8" />}
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

            {/* Friends since badge (shown for friends) */}
            {friendshipStatus === "friends" && friendSince && (
              <View
                className={`
                  flex-row
                  items-center
                  mt-3
                  px-3
                  py-1.5
                  rounded-full
                  ${isDark ? "bg-dark-700" : "bg-gray-100"}
                `}
              >
                <Ionicons
                  name="heart"
                  size={14}
                  color="#f43f5e"
                />
                <Text
                  className={`
                    ml-1.5
                    text-xs
                    font-medium
                    ${isDark ? "text-dark-300" : "text-gray-600"}
                  `}
                >
                  Friends since{" "}
                  {new Date(friendSince).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}

            {/* About / Bio Section */}
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
                {user.bio ? (
                  <Text
                    className={`
                      text-sm
                      leading-5
                      ${isDark ? "text-dark-200" : "text-gray-700"}
                    `}
                  >
                    {user.bio}
                  </Text>
                ) : (
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
                )}
              </View>
            </View>

            {/* Action Buttons */}
            {renderActionButtons()}
          </View>
        </View>

        {/* Mutual Servers */}
        {renderMutualServers()}

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

        {/* Note Section (for friends) - Coming soon */}
        {friendshipStatus === "friends" && (
          <View className="mx-4 mt-4">
            <View
              className={`
                p-4
                rounded-xl
                ${isDark ? "bg-dark-800" : "bg-white"}
                border
                ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
                <Text
                  className={`
                    ml-2
                    text-sm
                    font-semibold
                    ${isDark ? "text-dark-300" : "text-gray-600"}
                  `}
                >
                  Note
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                className="mt-2"
              >
                <Text
                  className={`
                    text-sm
                    italic
                    ${isDark ? "text-dark-500" : "text-gray-400"}
                  `}
                >
                  Click to add a note about this user
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
