import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function JoinServerScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert("Success", "You have joined the server!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }, 1500);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-[#0c0c0d]" : "bg-gray-50"}`}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Join Server",
          headerStyle: {
            backgroundColor: isDark ? "#0c0c0d" : "#f9fafb",
          },
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "600",
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="ml-2 w-10 h-10 items-center justify-center"
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#ffffff" : "#111827"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View className="items-center mt-8 mb-6">
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center"
              style={{ backgroundColor: "#5865f2" }}
            >
              <Ionicons name="link" size={36} color="#ffffff" />
            </View>
          </View>

          {/* Title */}
          <Text
            className={`text-2xl font-bold text-center mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Join a Server
          </Text>
          <Text
            className={`text-base text-center mb-8 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Enter an invite link or code to join an existing server
          </Text>

          {/* Input */}
          <View className="mb-6">
            <Text
              className={`text-sm font-medium mb-2 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Invite Link or Code
            </Text>
            <View
              className={`flex-row items-center px-4 py-3 rounded-xl border ${
                isDark
                  ? "bg-[#1e1f22] border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <Ionicons
                name="link-outline"
                size={20}
                color={isDark ? "#80848e" : "#9ca3af"}
              />
              <TextInput
                className={`flex-1 ml-3 text-base ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                placeholder="https://discord.gg/... or ABC123"
                placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {inviteCode.length > 0 && (
                <TouchableOpacity onPress={() => setInviteCode("")}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={isDark ? "#80848e" : "#9ca3af"}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Examples */}
          <View
            className={`p-4 rounded-xl mb-6 ${
              isDark ? "bg-[#1e1f22]" : "bg-white"
            }`}
          >
            <Text
              className={`text-sm font-medium mb-3 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Examples:
            </Text>
            {[
              "https://discord.gg/hearth",
              "https://discord.com/invite/hearth",
              "hearth",
            ].map((example, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setInviteCode(example)}
                className="flex-row items-center py-2"
              >
                <Ionicons
                  name="copy-outline"
                  size={16}
                  color="#5865f2"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-[#5865f2] text-sm">{example}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Join Button */}
          <TouchableOpacity
            onPress={handleJoin}
            disabled={isLoading || !inviteCode.trim()}
            className={`py-4 rounded-xl mb-6 ${
              inviteCode.trim() && !isLoading
                ? "bg-[#5865f2]"
                : isDark
                ? "bg-gray-700"
                : "bg-gray-300"
            }`}
          >
            <Text className="text-white text-center text-base font-semibold">
              {isLoading ? "Joining..." : "Join Server"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
