import React from "react";
import { View, Text, useColorScheme, type ViewProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";

interface EmptyStateProps extends ViewProps {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({
  icon = "albums-outline",
  title,
  description,
  action,
  className = "",
  ...props
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className={`items-center justify-center py-12 px-6 ${className}`}
      {...props}
    >
      <View
        className={`
          w-20 h-20
          rounded-full
          items-center
          justify-center
          mb-4
          ${isDark ? "bg-dark-800" : "bg-gray-100"}
        `}
      >
        <Ionicons
          name={icon}
          size={36}
          color={isDark ? "#4e5058" : "#9ca3af"}
        />
      </View>
      <Text
        className={`text-lg font-semibold mb-1 text-center ${
          isDark ? "text-dark-200" : "text-gray-700"
        }`}
      >
        {title}
      </Text>
      {description && (
        <Text
          className={`text-sm text-center max-w-xs ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          {description}
        </Text>
      )}
      {action && (
        <View className="mt-6">
          <Button
            title={action.label}
            onPress={action.onPress}
            variant="secondary"
            size="sm"
          />
        </View>
      )}
    </View>
  );
}

// Preset empty states for common scenarios
export function EmptyMessages({ onStartChat }: { onStartChat?: () => void }) {
  return (
    <EmptyState
      icon="chatbubbles-outline"
      title="No messages yet"
      description="Start a conversation by sending a message"
      action={onStartChat ? { label: "Start Chat", onPress: onStartChat } : undefined}
    />
  );
}

export function EmptyFriends({ onAddFriend }: { onAddFriend?: () => void }) {
  return (
    <EmptyState
      icon="people-outline"
      title="No friends yet"
      description="Add friends to start chatting and join servers together"
      action={onAddFriend ? { label: "Add Friend", onPress: onAddFriend } : undefined}
    />
  );
}

export function EmptyServers({ onCreateServer }: { onCreateServer?: () => void }) {
  return (
    <EmptyState
      icon="planet-outline"
      title="No servers"
      description="Create or join a server to connect with communities"
      action={onCreateServer ? { label: "Create Server", onPress: onCreateServer } : undefined}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="notifications-outline"
      title="All caught up!"
      description="You have no new notifications"
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon="search-outline"
      title="No results found"
      description={`We couldn't find anything matching "${query}"`}
    />
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="You're offline"
      description="Check your internet connection and try again"
      action={onRetry ? { label: "Retry", onPress: onRetry } : undefined}
    />
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="warning-outline"
      title="Something went wrong"
      description={message || "An error occurred while loading content"}
      action={onRetry ? { label: "Try Again", onPress: onRetry } : undefined}
    />
  );
}
