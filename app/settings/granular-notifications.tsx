import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ListDivider,
  SwitchItem,
  Card,
  Button,
} from "../../components/ui";
import { useGranularNotifications } from "../../lib/hooks/useGranularNotifications";
import type { ServerNotificationSettings, KeywordFilter } from "../../lib/services/granularNotifications";

interface Server {
  id: string;
  name: string;
  icon?: string;
}

interface Channel {
  id: string;
  name: string;
  serverId: string;
  type: 'text' | 'voice';
}

// Mock data - in real app this would come from your server/API
const mockServers: Server[] = [
  { id: "server1", name: "Gaming Squad", icon: "🎮" },
  { id: "server2", name: "Work Team", icon: "💼" },
  { id: "server3", name: "Study Group", icon: "📚" },
];

const mockChannels: Channel[] = [
  { id: "ch1", name: "general", serverId: "server1", type: "text" },
  { id: "ch2", name: "gaming-chat", serverId: "server1", type: "text" },
  { id: "ch3", name: "team-updates", serverId: "server2", type: "text" },
  { id: "ch4", name: "random", serverId: "server2", type: "text" },
  { id: "ch5", name: "study-help", serverId: "server3", type: "text" },
];

export default function GranularNotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    settings,
    isLoading,
    error,
    updateServerSettings,
    getServerSettings,
    keywordFilters,
    addFilter,
    updateFilter,
    removeFilter,
  } = useGranularNotifications();

  const [activeTab, setActiveTab] = useState<'servers' | 'keywords'>('servers');
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<KeywordFilter | null>(null);
  const [keywordForm, setKeywordForm] = useState({
    keyword: '',
    action: 'notify' as 'notify' | 'suppress',
    priority: 'normal' as 'low' | 'normal' | 'high',
    contexts: ['dms', 'channels', 'mentions'] as ('dms' | 'channels' | 'mentions')[],
  });

  const toggleServerExpansion = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const handleServerToggle = async (serverId: string, field: keyof ServerNotificationSettings, value: boolean) => {
    try {
      await updateServerSettings(serverId, { [field]: value });
    } catch (err) {
      Alert.alert("Error", "Failed to update server settings. Please try again.");
    }
  };

  const getServerSettingsSync = (serverId: string): ServerNotificationSettings | null => {
    return settings?.servers[serverId] || null;
  };

  const handleAddKeywordFilter = async () => {
    try {
      await addFilter({
        keyword: keywordForm.keyword,
        action: keywordForm.action,
        priority: keywordForm.priority,
        enabled: true,
        contexts: keywordForm.contexts,
      });
      setShowKeywordModal(false);
      setKeywordForm({
        keyword: '',
        action: 'notify' as 'notify' | 'suppress',
        priority: 'normal' as 'low' | 'normal' | 'high',
        contexts: ['dms', 'channels', 'mentions'] as ('dms' | 'channels' | 'mentions')[],
      });
    } catch (err) {
      Alert.alert("Error", "Failed to add keyword filter. Please try again.");
    }
  };

  const handleEditKeywordFilter = (filter: KeywordFilter) => {
    setEditingFilter(filter);
    setKeywordForm({
      keyword: filter.keyword,
      action: filter.action,
      priority: filter.priority,
      contexts: filter.contexts,
    });
    setShowKeywordModal(true);
  };

  const handleUpdateKeywordFilter = async () => {
    if (!editingFilter) return;

    try {
      await updateFilter(editingFilter.id, {
        keyword: keywordForm.keyword,
        action: keywordForm.action,
        priority: keywordForm.priority,
        contexts: keywordForm.contexts,
      });
      setShowKeywordModal(false);
      setEditingFilter(null);
      setKeywordForm({
        keyword: '',
        action: 'notify' as 'notify' | 'suppress',
        priority: 'normal' as 'low' | 'normal' | 'high',
        contexts: ['dms', 'channels', 'mentions'] as ('dms' | 'channels' | 'mentions')[],
      });
    } catch (err) {
      Alert.alert("Error", "Failed to update keyword filter. Please try again.");
    }
  };

  const handleDeleteKeywordFilter = async (filterId: string) => {
    Alert.alert(
      "Delete Filter",
      "Are you sure you want to delete this keyword filter?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFilter(filterId);
            } catch (err) {
              Alert.alert("Error", "Failed to delete keyword filter. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "Granular Notifications",
            headerTitleStyle: {
              color: isDark ? "#ffffff" : "#111827",
              fontSize: 20,
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
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={isDark ? "#5865f2" : "#5865f2"} />
          <Text className={`mt-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            Loading notification settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Granular Notifications",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 20,
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

      {/* Error Banner */}
      {error && (
        <View className="mx-4 mt-4">
          <Card className="p-4 bg-red-500/10 border-red-500/30">
            <Text className="text-red-500">{error}</Text>
          </Card>
        </View>
      )}

      {/* Tab Navigation */}
      <View className="mx-4 mt-4">
        <View className={`
          flex-row
          rounded-xl
          overflow-hidden
          ${isDark ? "bg-dark-800" : "bg-white"}
          border
          ${isDark ? "border-dark-700" : "border-gray-200"}
        `}>
          <TouchableOpacity
            className={`
              flex-1 py-3 px-4 items-center
              ${activeTab === 'servers' ? (isDark ? 'bg-indigo-600' : 'bg-indigo-100') : ''}
            `}
            onPress={() => setActiveTab('servers')}
          >
            <Text className={`
              font-medium
              ${activeTab === 'servers'
                ? (isDark ? 'text-white' : 'text-indigo-900')
                : (isDark ? 'text-gray-300' : 'text-gray-600')
              }
            `}>
              Servers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`
              flex-1 py-3 px-4 items-center
              ${activeTab === 'keywords' ? (isDark ? 'bg-indigo-600' : 'bg-indigo-100') : ''}
            `}
            onPress={() => setActiveTab('keywords')}
          >
            <Text className={`
              font-medium
              ${activeTab === 'keywords'
                ? (isDark ? 'text-white' : 'text-indigo-900')
                : (isDark ? 'text-gray-300' : 'text-gray-600')
              }
            `}>
              Keywords
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Links */}
      <View className="mx-4 mt-4">
        <TouchableOpacity
          onPress={() => router.push("/settings/user-notifications")}
          className={`
            flex-row items-center justify-between
            p-3 rounded-lg
            ${isDark ? "bg-dark-800" : "bg-white"}
            border
            ${isDark ? "border-dark-700" : "border-gray-200"}
          `}
        >
          <View className="flex-row items-center">
            <Ionicons
              name="people-outline"
              size={20}
              color={isDark ? "#80848e" : "#6b7280"}
            />
            <Text className={`
              ml-3 font-medium
              ${isDark ? "text-white" : "text-gray-900"}
            `}>
              User Notifications
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? "#80848e" : "#6b7280"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {activeTab === 'servers' && (
          <View className="mx-4 mt-6">
            <Text className={`
              text-xs
              font-semibold
              uppercase
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}>
              Server Notification Settings
            </Text>

            {mockServers.map((server) => {
              const serverSettings = getServerSettingsSync(server.id);
              const isExpanded = expandedServers.has(server.id);
              const serverChannels = mockChannels.filter(ch => ch.serverId === server.id);

              return (
                <View key={server.id} className="mb-4">
                  <View className={`
                    rounded-xl
                    overflow-hidden
                    ${isDark ? "bg-dark-800" : "bg-white"}
                    border
                    ${isDark ? "border-dark-700" : "border-gray-200"}
                  `}>
                    {/* Server Header */}
                    <TouchableOpacity
                      onPress={() => toggleServerExpansion(server.id)}
                      className="p-4 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1">
                        <Text className="text-xl mr-3">{server.icon}</Text>
                        <View className="flex-1">
                          <Text className={`
                            font-semibold
                            ${isDark ? "text-white" : "text-gray-900"}
                          `}>
                            {server.name}
                          </Text>
                          <Text className={`
                            text-sm
                            ${isDark ? "text-dark-400" : "text-gray-500"}
                          `}>
                            {serverSettings?.enabled ? 'Notifications enabled' : 'Notifications disabled'}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={isDark ? "#80848e" : "#6b7280"}
                      />
                    </TouchableOpacity>

                    {/* Server Settings (when expanded) */}
                    {isExpanded && (
                      <>
                        <ListDivider />
                        <SwitchItem
                          title="Enable Notifications"
                          subtitle="Receive notifications from this server"
                          value={serverSettings?.enabled || false}
                          onValueChange={(value) => handleServerToggle(server.id, 'enabled', value)}
                        />
                        <ListDivider />
                        <SwitchItem
                          title="Channel Messages"
                          subtitle="General channel messages"
                          value={serverSettings?.messages || false}
                          onValueChange={(value) => handleServerToggle(server.id, 'messages', value)}
                          disabled={!serverSettings?.enabled}
                        />
                        <ListDivider />
                        <SwitchItem
                          title="Mentions"
                          subtitle="When you're mentioned"
                          value={serverSettings?.mentions || false}
                          onValueChange={(value) => handleServerToggle(server.id, 'mentions', value)}
                          disabled={!serverSettings?.enabled}
                        />
                        <ListDivider />
                        <SwitchItem
                          title="Server Activity"
                          subtitle="Server events and updates"
                          value={serverSettings?.serverActivity || false}
                          onValueChange={(value) => handleServerToggle(server.id, 'serverActivity', value)}
                          disabled={!serverSettings?.enabled}
                        />
                        <ListDivider />
                        <SwitchItem
                          title="Sounds"
                          subtitle="Play notification sounds"
                          value={serverSettings?.sounds || false}
                          onValueChange={(value) => handleServerToggle(server.id, 'sounds', value)}
                          disabled={!serverSettings?.enabled}
                        />
                        <ListDivider />
                        <SwitchItem
                          title="Show Previews"
                          subtitle="Show message content in notifications"
                          value={serverSettings?.showPreviews || false}
                          onValueChange={(value) => handleServerToggle(server.id, 'showPreviews', value)}
                          disabled={!serverSettings?.enabled}
                        />

                        {/* Channel-specific settings preview */}
                        {serverChannels.length > 0 && (
                          <>
                            <ListDivider />
                            <TouchableOpacity
                              className="p-4 flex-row items-center justify-between"
                              onPress={() => router.push(`/settings/server-channels?serverId=${server.id}`)}
                            >
                              <View>
                                <Text className={`
                                  font-medium
                                  ${isDark ? "text-white" : "text-gray-900"}
                                `}>
                                  Channel Settings
                                </Text>
                                <Text className={`
                                  text-sm mt-0.5
                                  ${isDark ? "text-dark-400" : "text-gray-500"}
                                `}>
                                  Configure per-channel notifications
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={isDark ? "#80848e" : "#6b7280"}
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'keywords' && (
          <View className="mx-4 mt-6">
            {/* Add Keyword Button */}
            <View className="mb-4">
              <Button
                title="Add Keyword Filter"
                variant="primary"
                size="sm"
                onPress={() => {
                  setEditingFilter(null);
                  setKeywordForm({
                    keyword: '',
                    action: 'notify' as 'notify' | 'suppress',
                    priority: 'normal' as 'low' | 'normal' | 'high',
                    contexts: ['dms', 'channels', 'mentions'] as ('dms' | 'channels' | 'mentions')[],
                  });
                  setShowKeywordModal(true);
                }}
                leftIcon={<Ionicons name="add" size={16} color="white" />}
              />
            </View>

            <Text className={`
              text-xs
              font-semibold
              uppercase
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}>
              Keyword Filters ({keywordFilters.length})
            </Text>

            {keywordFilters.length === 0 ? (
              <Card className="p-6 items-center">
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={isDark ? "#80848e" : "#9ca3af"}
                />
                <Text className={`
                  text-center mt-4 font-medium
                  ${isDark ? "text-white" : "text-gray-900"}
                `}>
                  No Keyword Filters
                </Text>
                <Text className={`
                  text-center mt-2 text-sm
                  ${isDark ? "text-dark-400" : "text-gray-500"}
                `}>
                  Add keyword filters to customize when you receive notifications
                </Text>
              </Card>
            ) : (
              <View className={`
                rounded-xl
                overflow-hidden
                ${isDark ? "bg-dark-800" : "bg-white"}
                border
                ${isDark ? "border-dark-700" : "border-gray-200"}
              `}>
                {keywordFilters.map((filter, index) => (
                  <React.Fragment key={filter.id}>
                    {index > 0 && <ListDivider />}
                    <TouchableOpacity
                      className="p-4 flex-row items-center justify-between"
                      onPress={() => handleEditKeywordFilter(filter)}
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className={`
                            font-medium
                            ${isDark ? "text-white" : "text-gray-900"}
                          `}>
                            "{filter.keyword}"
                          </Text>
                          <View className={`
                            ml-2 px-2 py-1 rounded
                            ${filter.action === 'notify'
                              ? 'bg-green-500/20'
                              : 'bg-red-500/20'
                            }
                          `}>
                            <Text className={`
                              text-xs font-medium
                              ${filter.action === 'notify'
                                ? 'text-green-600'
                                : 'text-red-600'
                              }
                            `}>
                              {filter.action}
                            </Text>
                          </View>
                        </View>
                        <Text className={`
                          text-sm mt-1
                          ${isDark ? "text-dark-400" : "text-gray-500"}
                        `}>
                          {filter.contexts.join(', ')} • {filter.priority} priority
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteKeywordFilter(filter.id)}
                        className="ml-4 p-2"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}
          </View>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Keyword Filter Modal */}
      <Modal
        visible={showKeywordModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowKeywordModal(false)}>
              <Text className="text-blue-500 font-medium">Cancel</Text>
            </TouchableOpacity>
            <Text className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
              {editingFilter ? "Edit Filter" : "Add Filter"}
            </Text>
            <TouchableOpacity
              onPress={editingFilter ? handleUpdateKeywordFilter : handleAddKeywordFilter}
              disabled={!keywordForm.keyword.trim()}
            >
              <Text className={`
                font-medium
                ${keywordForm.keyword.trim() ? 'text-blue-500' : 'text-gray-400'}
              `}>
                {editingFilter ? "Save" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="space-y-4">
              <View>
                <Text className={`
                  text-sm font-medium mb-2
                  ${isDark ? "text-white" : "text-gray-900"}
                `}>
                  Keyword
                </Text>
                <TextInput
                  value={keywordForm.keyword}
                  onChangeText={(text) => setKeywordForm(prev => ({ ...prev, keyword: text }))}
                  placeholder="Enter keyword or phrase..."
                  className={`
                    p-3 rounded-lg border
                    ${isDark
                      ? "bg-dark-800 border-dark-700 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                    }
                  `}
                  placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
                />
              </View>

              <View>
                <Text className={`
                  text-sm font-medium mb-2
                  ${isDark ? "text-white" : "text-gray-900"}
                `}>
                  Action
                </Text>
                <View className="flex-row space-x-2">
                  {(['notify', 'suppress'] as const).map((action) => (
                    <TouchableOpacity
                      key={action}
                      onPress={() => setKeywordForm(prev => ({ ...prev, action }))}
                      className={`
                        flex-1 p-3 rounded-lg border
                        ${keywordForm.action === action
                          ? (isDark ? 'bg-indigo-600 border-indigo-600' : 'bg-indigo-100 border-indigo-300')
                          : (isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200')
                        }
                      `}
                    >
                      <Text className={`
                        text-center font-medium
                        ${keywordForm.action === action
                          ? (isDark ? 'text-white' : 'text-indigo-900')
                          : (isDark ? 'text-gray-300' : 'text-gray-700')
                        }
                      `}>
                        {action === 'notify' ? 'Notify' : 'Suppress'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}