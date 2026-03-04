import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui";
import * as Haptics from "expo-haptics";

// ============================================================================
// Types
// ============================================================================

interface InviteLink {
  id: string;
  code: string;
  url: string;
  expiresAt?: string;
  maxUses?: number;
  uses: number;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    displayName: string;
  };
  isTemporary: boolean;
}

interface InviteLinkScreenProps {
  serverId?: string;
  serverName?: string;
}

interface ExpirationOption {
  label: string;
  value: number | null; // null = never
}

interface MaxUsesOption {
  label: string;
  value: number | null; // null = unlimited
}

// ============================================================================
// Constants
// ============================================================================

const HEARTH_INVITE_BASE_URL = "https://hearth.app/invite";

const expirationOptions: ExpirationOption[] = [
  { label: "30 minutes", value: 30 * 60 * 1000 },
  { label: "1 hour", value: 60 * 60 * 1000 },
  { label: "6 hours", value: 6 * 60 * 60 * 1000 },
  { label: "12 hours", value: 12 * 60 * 60 * 1000 },
  { label: "1 day", value: 24 * 60 * 60 * 1000 },
  { label: "7 days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "Never", value: null },
];

const maxUsesOptions: MaxUsesOption[] = [
  { label: "No limit", value: null },
  { label: "1 use", value: 1 },
  { label: "5 uses", value: 5 },
  { label: "10 uses", value: 10 },
  { label: "25 uses", value: 25 },
  { label: "50 uses", value: 50 },
  { label: "100 uses", value: 100 },
];

// Mock existing invites
const mockExistingInvites: InviteLink[] = [
  {
    id: "inv1",
    code: "abc123xyz",
    url: `${HEARTH_INVITE_BASE_URL}/abc123xyz`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    maxUses: undefined,
    uses: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdBy: {
      id: "u1",
      username: "you",
      displayName: "You",
    },
    isTemporary: false,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatExpiresIn(dateString?: string): string {
  if (!dateString) return "Never expires";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `Expires in ${diffMins}m`;
  if (diffHours < 24) return `Expires in ${diffHours}h`;
  return `Expires in ${diffDays}d`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================================================
// Subcomponents
// ============================================================================

function InviteLinkItem({
  invite,
  isDark,
  onCopy,
  onShare,
  onDelete,
}: {
  invite: InviteLink;
  isDark: boolean;
  onCopy: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const expiresText = formatExpiresIn(invite.expiresAt);
  const isExpired = expiresText === "Expired";

  return (
    <View
      className={`
        p-4 rounded-xl mb-3
        ${isDark ? "bg-dark-800" : "bg-white"}
        ${isExpired ? "opacity-50" : ""}
      `}
    >
      {/* Code Display */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View
            className={`
              w-10 h-10 rounded-xl items-center justify-center mr-3
              ${isDark ? "bg-dark-700" : "bg-gray-100"}
            `}
          >
            <Ionicons
              name="link-outline"
              size={20}
              color={isDark ? "#80848e" : "#6b7280"}
            />
          </View>
          <View className="flex-1">
            <Text
              className={`font-mono font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              selectable
            >
              hearth.app/invite/{invite.code}
            </Text>
            <Text
              className={`text-sm mt-0.5 ${
                isExpired
                  ? "text-red-500"
                  : isDark
                    ? "text-dark-400"
                    : "text-gray-500"
              }`}
            >
              {expiresText} • {invite.uses} use{invite.uses !== 1 ? "s" : ""}
              {invite.maxUses ? ` / ${invite.maxUses}` : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row space-x-2">
        <TouchableOpacity
          onPress={onCopy}
          disabled={isExpired}
          className={`
            flex-1 py-2 px-3 rounded-lg flex-row items-center justify-center
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons
            name="copy-outline"
            size={16}
            color={isDark ? "#b5bac1" : "#6b7280"}
          />
          <Text
            className={`ml-2 font-medium ${
              isDark ? "text-dark-200" : "text-gray-700"
            }`}
          >
            Copy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShare}
          disabled={isExpired}
          className={`
            flex-1 py-2 px-3 rounded-lg flex-row items-center justify-center
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons
            name="share-outline"
            size={16}
            color={isDark ? "#b5bac1" : "#6b7280"}
          />
          <Text
            className={`ml-2 font-medium ${
              isDark ? "text-dark-200" : "text-gray-700"
            }`}
          >
            Share
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          className={`
            py-2 px-3 rounded-lg items-center justify-center
            ${isDark ? "bg-dark-700" : "bg-gray-100"}
          `}
        >
          <Ionicons
            name="trash-outline"
            size={16}
            color="#ef4444"
          />
        </TouchableOpacity>
      </View>

      {/* Created info */}
      <Text
        className={`text-xs mt-3 ${isDark ? "text-dark-500" : "text-gray-400"}`}
      >
        Created {formatTimeAgo(invite.createdAt)} by {invite.createdBy.displayName}
      </Text>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InviteLinkScreen({
  serverId: propServerId,
  serverName: propServerName,
}: InviteLinkScreenProps = {}) {
  const params = useLocalSearchParams<{ serverId: string; serverName?: string }>();
  const _serverId = propServerId || params.serverId || "1";
  const serverName = propServerName || params.serverName || "My Server";

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isCreating, setIsCreating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [invites, setInvites] = useState<InviteLink[]>(mockExistingInvites);
  const [newInvite, setNewInvite] = useState<InviteLink | null>(null);
  const [copied, setCopied] = useState(false);

  // Settings for new invite
  const [selectedExpiration, setSelectedExpiration] = useState<number | null>(
    24 * 60 * 60 * 1000 // 1 day default
  );
  const [selectedMaxUses, setSelectedMaxUses] = useState<number | null>(null);
  const [isTemporary, setIsTemporary] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreateInvite = useCallback(async () => {
    setIsCreating(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const code = generateInviteCode();
      const invite: InviteLink = {
        id: `inv_${Date.now()}`,
        code,
        url: `${HEARTH_INVITE_BASE_URL}/${code}`,
        expiresAt: selectedExpiration
          ? new Date(Date.now() + selectedExpiration).toISOString()
          : undefined,
        maxUses: selectedMaxUses ?? undefined,
        uses: 0,
        createdAt: new Date().toISOString(),
        createdBy: {
          id: "me",
          username: "you",
          displayName: "You",
        },
        isTemporary,
      };

      setNewInvite(invite);
      setInvites((prev) => [invite, ...prev]);
      setShowOptions(false);

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to create invite link. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }, [selectedExpiration, selectedMaxUses, isTemporary]);

  const handleCopyLink = useCallback(async (url: string) => {
    try {
      Clipboard.setString(url);
      setCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  }, []);

  const handleShareLink = useCallback(async (url: string) => {
    try {
      await Share.share({
        message: `Join ${serverName} on Hearth! ${url}`,
        url: url,
      });
    } catch {
      // User cancelled or error
    }
  }, [serverName]);

  const handleDeleteInvite = useCallback((inviteId: string) => {
    Alert.alert(
      "Revoke Invite",
      "Are you sure you want to revoke this invite link? Anyone with this link will no longer be able to join.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => {
            setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
            if (newInvite?.id === inviteId) {
              setNewInvite(null);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }, [newInvite]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Invite People",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity className="ml-4" onPress={() => router.back()}>
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Server Info Header */}
        <View
          className={`
            mx-4 mt-4 p-4 rounded-2xl
            ${isDark ? "bg-dark-800" : "bg-white"}
            border ${isDark ? "border-dark-700" : "border-gray-200"}
          `}
        >
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-brand items-center justify-center">
              <Text className="text-white text-xl font-bold">
                {serverName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {serverName}
              </Text>
              <Text
                className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
              >
                Invite friends to join your server
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Invite Creation */}
        {!newInvite && (
          <View className="px-4 mt-6">
            <TouchableOpacity
              onPress={() => setShowOptions(!showOptions)}
              disabled={isCreating}
              className={`
                p-4 rounded-2xl flex-row items-center justify-between
                ${isDark ? "bg-brand" : "bg-brand"}
              `}
            >
              <View className="flex-row items-center">
                <Ionicons name="link-outline" size={24} color="#ffffff" />
                <View className="ml-3">
                  <Text className="text-white font-bold text-lg">
                    Create Invite Link
                  </Text>
                  <Text className="text-white/70 text-sm">
                    Generate a shareable link
                  </Text>
                </View>
              </View>
              {isCreating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Ionicons
                  name={showOptions ? "chevron-up" : "chevron-down"}
                  size={24}
                  color="#ffffff"
                />
              )}
            </TouchableOpacity>

            {/* Options Panel */}
            {showOptions && (
              <View
                className={`
                  mt-2 p-4 rounded-2xl
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                {/* Expiration */}
                <Text
                  className={`text-sm font-semibold uppercase mb-3 ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  Expire After
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {expirationOptions.map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      onPress={() => setSelectedExpiration(option.value)}
                      className={`
                        px-3 py-2 rounded-lg mr-2
                        ${
                          selectedExpiration === option.value
                            ? "bg-brand"
                            : isDark
                              ? "bg-dark-700"
                              : "bg-gray-100"
                        }
                      `}
                    >
                      <Text
                        className={`font-medium text-sm ${
                          selectedExpiration === option.value
                            ? "text-white"
                            : isDark
                              ? "text-dark-200"
                              : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Max Uses */}
                <Text
                  className={`text-sm font-semibold uppercase mb-3 ${
                    isDark ? "text-dark-400" : "text-gray-500"
                  }`}
                >
                  Max Uses
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {maxUsesOptions.map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      onPress={() => setSelectedMaxUses(option.value)}
                      className={`
                        px-3 py-2 rounded-lg mr-2
                        ${
                          selectedMaxUses === option.value
                            ? "bg-brand"
                            : isDark
                              ? "bg-dark-700"
                              : "bg-gray-100"
                        }
                      `}
                    >
                      <Text
                        className={`font-medium text-sm ${
                          selectedMaxUses === option.value
                            ? "text-white"
                            : isDark
                              ? "text-dark-200"
                              : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Temporary Membership */}
                <View className="flex-row items-center justify-between py-3 border-t border-dark-700/30">
                  <View className="flex-1">
                    <Text
                      className={`font-medium ${
                        isDark ? "text-dark-100" : "text-gray-900"
                      }`}
                    >
                      Temporary Membership
                    </Text>
                    <Text
                      className={`text-sm ${
                        isDark ? "text-dark-400" : "text-gray-500"
                      }`}
                    >
                      Members are kicked when they go offline
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsTemporary(!isTemporary)}
                    className={`
                      w-12 h-7 rounded-full p-1
                      ${isTemporary ? "bg-brand" : isDark ? "bg-dark-600" : "bg-gray-300"}
                    `}
                  >
                    <View
                      className={`
                        w-5 h-5 rounded-full bg-white
                        ${isTemporary ? "ml-auto" : ""}
                      `}
                    />
                  </TouchableOpacity>
                </View>

                {/* Generate Button */}
                <Button
                  title="Generate Link"
                  onPress={handleCreateInvite}
                  isLoading={isCreating}
                  fullWidth
                  className="mt-4"
                />
              </View>
            )}
          </View>
        )}

        {/* New Invite Display */}
        {newInvite && (
          <View className="px-4 mt-6">
            <Text
              className={`text-sm font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Your Invite Link
            </Text>
            <View
              className={`
                p-4 rounded-2xl
                ${isDark ? "bg-dark-800" : "bg-white"}
                border-2 border-brand
              `}
            >
              {/* Link display */}
              <View className="flex-row items-center mb-4">
                <View
                  className={`
                    flex-1 p-3 rounded-lg mr-2
                    ${isDark ? "bg-dark-900" : "bg-gray-100"}
                  `}
                >
                  <Text
                    className={`font-mono ${isDark ? "text-white" : "text-gray-900"}`}
                    selectable
                  >
                    {newInvite.url}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleCopyLink(newInvite.url)}
                  className={`
                    p-3 rounded-lg
                    ${copied ? "bg-green-500" : "bg-brand"}
                  `}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={20}
                    color="#ffffff"
                  />
                </TouchableOpacity>
              </View>

              {/* Share buttons */}
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => handleCopyLink(newInvite.url)}
                  className={`
                    flex-1 py-3 rounded-xl flex-row items-center justify-center
                    ${isDark ? "bg-dark-700" : "bg-gray-100"}
                  `}
                >
                  <Ionicons
                    name="copy-outline"
                    size={20}
                    color={isDark ? "#b5bac1" : "#6b7280"}
                  />
                  <Text
                    className={`ml-2 font-semibold ${
                      isDark ? "text-dark-200" : "text-gray-700"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareLink(newInvite.url)}
                  className="flex-1 py-3 rounded-xl flex-row items-center justify-center bg-brand"
                >
                  <Ionicons name="share-outline" size={20} color="#ffffff" />
                  <Text className="ml-2 font-semibold text-white">Share</Text>
                </TouchableOpacity>
              </View>

              {/* Create another */}
              <TouchableOpacity
                onPress={() => {
                  setNewInvite(null);
                  setShowOptions(true);
                }}
                className="mt-4 py-2"
              >
                <Text className="text-brand text-center font-medium">
                  Create Another Invite
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Existing Invites */}
        {invites.length > 0 && (
          <View className="px-4 mt-6">
            <Text
              className={`text-sm font-semibold uppercase mb-3 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Your Invite Links ({invites.length})
            </Text>
            {invites
              .filter((inv) => inv.id !== newInvite?.id)
              .map((invite) => (
                <InviteLinkItem
                  key={invite.id}
                  invite={invite}
                  isDark={isDark}
                  onCopy={() => handleCopyLink(invite.url)}
                  onShare={() => handleShareLink(invite.url)}
                  onDelete={() => handleDeleteInvite(invite.id)}
                />
              ))}
          </View>
        )}

        {/* Info Section */}
        <View className="px-4 mt-6">
          <View
            className={`
              p-4 rounded-2xl flex-row
              ${isDark ? "bg-dark-800/50" : "bg-gray-100"}
            `}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={isDark ? "#5865f2" : "#4f46e5"}
            />
            <View className="flex-1 ml-3">
              <Text
                className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}
              >
                Invite links allow people to join your server. You can create
                links with custom expirations and usage limits. Revoke a link
                at any time to prevent further joins.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default InviteLinkScreen;
