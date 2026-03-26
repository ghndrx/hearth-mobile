import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar, SearchInput } from "../../components/ui";

type UserStatus = "online" | "idle" | "dnd" | "offline";

interface Contact {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  status: UserStatus;
  isFriend: boolean;
}

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    username: "sarahj",
    status: "online",
    isFriend: true,
  },
  {
    id: "2",
    name: "Michael Chen",
    username: "mchen",
    status: "online",
    isFriend: true,
  },
  {
    id: "3",
    name: "Emily Davis",
    username: "emilyd",
    status: "idle",
    isFriend: true,
  },
  {
    id: "4",
    name: "David Wilson",
    username: "dwilson",
    status: "dnd",
    isFriend: true,
  },
  {
    id: "5",
    name: "Alex Thompson",
    username: "athompson",
    status: "offline",
    isFriend: true,
  },
  {
    id: "6",
    name: "Jessica Lee",
    username: "jlee",
    status: "online",
    isFriend: true,
  },
  {
    id: "7",
    name: "Chris Martinez",
    username: "cmartinez",
    status: "offline",
    isFriend: true,
  },
  {
    id: "8",
    name: "Amanda Brown",
    username: "abrown",
    status: "idle",
    isFriend: true,
  },
];

const statusColors: Record<UserStatus, string> = {
  online: "#22c55e",
  idle: "#f59e0b",
  dnd: "#ef4444",
  offline: "#80848e",
};

function ContactItem({
  contact,
  isDark,
  isSelected,
  onToggle,
}: {
  contact: Contact;
  isDark: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      className={`
        flex-row items-center px-4 py-3
        ${isSelected ? (isDark ? "bg-brand/10" : "bg-blue-50") : ""}
      `}
    >
      <View className="relative">
        <Avatar uri={contact.avatar} name={contact.name} size={40} />
        <View
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
          style={{
            backgroundColor: statusColors[contact.status],
            borderColor: isDark ? "#1e1f22" : "#ffffff",
          }}
        />
      </View>

      <View className="flex-1 ml-3">
        <Text
          className={`text-base font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {contact.name}
        </Text>
        <Text
          className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          @{contact.username}
        </Text>
      </View>

      <View
        className={`
          w-6 h-6 rounded-full items-center justify-center border-2
          ${
            isSelected
              ? "bg-brand border-brand"
              : isDark
                ? "border-dark-500"
                : "border-gray-300"
          }
        `}
      >
        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
      </View>
    </TouchableOpacity>
  );
}

export default function NewConversationScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const isGroupMode = selectedIds.size > 1;

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return mockContacts;
    const query = searchQuery.toLowerCase();
    return mockContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.username.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const onlineContacts = useMemo(
    () => filteredContacts.filter((c) => c.status !== "offline"),
    [filteredContacts],
  );

  const offlineContacts = useMemo(
    () => filteredContacts.filter((c) => c.status === "offline"),
    [filteredContacts],
  );

  const toggleContact = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreate = useCallback(() => {
    if (selectedIds.size === 0) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate creating conversation
    setTimeout(() => {
      setIsCreating(false);
      const firstId = Array.from(selectedIds)[0];
      router.replace(`/chat/${firstId}`);
    }, 500);
  }, [selectedIds]);

  const selectedContacts = useMemo(
    () => mockContacts.filter((c) => selectedIds.has(c.id)),
    [selectedIds],
  );

  const renderContact = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactItem
        contact={item}
        isDark={isDark}
        isSelected={selectedIds.has(item.id)}
        onToggle={() => toggleContact(item.id)}
      />
    ),
    [isDark, selectedIds, toggleContact],
  );

  const renderSectionHeader = useCallback(
    (title: string, count: number) => (
      <View
        className={`px-4 py-2 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      >
        <Text
          className={`text-xs font-bold uppercase ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          {title} — {count}
        </Text>
      </View>
    ),
    [isDark],
  );

  const allContacts = useMemo(() => {
    const sections: (
      | { type: "header"; title: string; count: number }
      | { type: "contact"; data: Contact }
    )[] = [];

    if (onlineContacts.length > 0) {
      sections.push({
        type: "header",
        title: "Online",
        count: onlineContacts.length,
      });
      onlineContacts.forEach((c) => sections.push({ type: "contact", data: c }));
    }
    if (offlineContacts.length > 0) {
      sections.push({
        type: "header",
        title: "Offline",
        count: offlineContacts.length,
      });
      offlineContacts.forEach((c) =>
        sections.push({ type: "contact", data: c }),
      );
    }
    return sections;
  }, [onlineContacts, offlineContacts]);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: isGroupMode ? "New Group" : "New Message",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons
                name="close"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreate}
              disabled={selectedIds.size === 0 || isCreating}
              className="mr-4"
            >
              <Text
                className={`text-base font-semibold ${
                  selectedIds.size > 0 && !isCreating
                    ? "text-brand"
                    : isDark
                      ? "text-dark-500"
                      : "text-gray-400"
                }`}
              >
                {isCreating ? "Creating..." : isGroupMode ? "Create" : "Chat"}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Selected chips */}
      {selectedContacts.length > 0 && (
        <View
          className={`px-4 py-3 border-b ${
            isDark ? "border-dark-700" : "border-gray-200"
          }`}
        >
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {selectedContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                onPress={() => toggleContact(contact.id)}
                className={`
                  flex-row items-center px-3 py-1.5 rounded-full
                  ${isDark ? "bg-brand/20" : "bg-blue-100"}
                `}
              >
                <Text
                  className={`text-sm font-medium ${
                    isDark ? "text-brand" : "text-blue-700"
                  }`}
                >
                  {contact.name}
                </Text>
                <Ionicons
                  name="close"
                  size={14}
                  color={isDark ? "#5865f2" : "#1d4ed8"}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Search */}
      <View className="px-4 py-3">
        <SearchInput
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Contact list */}
      <FlatList
        data={allContacts}
        keyExtractor={(item, index) =>
          item.type === "header"
            ? `header-${item.title}-${index}`
            : `contact-${item.data.id}`
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return renderSectionHeader(item.title, item.count);
          }
          return renderContact({ item: item.data });
        }}
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <Ionicons
              name="people-outline"
              size={64}
              color={isDark ? "#4e5058" : "#d1d5db"}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? "text-dark-300" : "text-gray-500"
              }`}
            >
              {searchQuery ? "No friends found" : "No friends yet"}
            </Text>
            <Text
              className={`mt-1 text-sm text-center px-8 ${
                isDark ? "text-dark-400" : "text-gray-400"
              }`}
            >
              {searchQuery
                ? "Try a different search term"
                : "Add friends to start messaging"}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
