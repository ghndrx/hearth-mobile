import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../ui";

export interface NewServerData {
  name: string;
  description: string;
  icon?: string;
  template: string;
  isPrivate: boolean;
}

interface CreateServerScreenProps {
  /** Callback when server is created */
  onCreateServer?: (server: NewServerData) => void;
  /** Whether to show back navigation */
  showHeader?: boolean;
}

const SERVER_TEMPLATES = [
  { id: "gaming", icon: "game-controller-outline", label: "Gaming", color: "#22c55e", description: "For gaming communities and esports teams" },
  { id: "community", icon: "people-outline", label: "Community", color: "#3b82f6", description: "Build and grow your community" },
  { id: "friends", icon: "heart-outline", label: "Friends", color: "#ec4899", description: "A private space for close friends" },
  { id: "study", icon: "book-outline", label: "Study Group", color: "#f59e0b", description: "Perfect for study groups and classes" },
  { id: "work", icon: "briefcase-outline", label: "Work", color: "#6366f1", description: "For teams and professional collaboration" },
  { id: "custom", icon: "sparkles-outline", label: "Custom", color: "#8b5cf6", description: "Start from scratch with your own setup" },
] as const;

const SERVER_ICONS = [
  { id: "planet", icon: "planet-outline", color: "#3b82f6" },
  { id: "rocket", icon: "rocket-outline", color: "#22c55e" },
  { id: "star", icon: "star-outline", color: "#f59e0b" },
  { id: "heart", icon: "heart-outline", color: "#ec4899" },
  { id: "diamond", icon: "diamond-outline", color: "#8b5cf6" },
  { id: "flame", icon: "flame-outline", color: "#ef4444" },
  { id: "flash", icon: "flash-outline", color: "#eab308" },
  { id: "leaf", icon: "leaf-outline", color: "#22c55e" },
  { id: "moon", icon: "moon-outline", color: "#6366f1" },
  { id: "musical-notes", icon: "musical-notes-outline", color: "#ec4899" },
  { id: "game-controller", icon: "game-controller-outline", color: "#3b82f6" },
  { id: "code-slash", icon: "code-slash-outline", color: "#14b8a6" },
] as const;

export function CreateServerScreen({
  onCreateServer,
  showHeader = true,
}: CreateServerScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState<"template" | "details">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [serverName, setServerName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const _resetForm = useCallback(() => {
    setStep("template");
    setSelectedTemplate(null);
    setServerName("");
    setDescription("");
    setIconUri(null);
    setSelectedIcon(null);
    setIsPrivate(false);
    setIsCreating(false);
    setNameError(null);
  }, []);

  const handleBack = useCallback(() => {
    if (step === "details") {
      setStep("template");
    } else {
      router.back();
    }
  }, [step]);

  const pickImage = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIconUri(result.assets[0].uri);
      setSelectedIcon(null); // Clear selected preset icon when custom image is chosen
    }
  }, []);

  const selectPresetIcon = useCallback((iconId: string) => {
    setSelectedIcon(iconId);
    setIconUri(null); // Clear custom image when preset icon is selected
  }, []);

  const validateServerName = useCallback((name: string): boolean => {
    if (name.length < 2) {
      setNameError("Server name must be at least 2 characters");
      return false;
    }
    if (name.length > 100) {
      setNameError("Server name must be 100 characters or less");
      return false;
    }
    setNameError(null);
    return true;
  }, []);

  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    setStep("details");
    if (templateId !== "custom") {
      const template = SERVER_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setServerName(`My ${template.label} Server`);
      }
    }
  }, []);

  const handleCreateServer = useCallback(async () => {
    if (!validateServerName(serverName)) return;
    if (!selectedTemplate) return;

    setIsCreating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newServer: NewServerData = {
      name: serverName.trim(),
      description: description.trim(),
      icon: iconUri || selectedIcon || undefined,
      template: selectedTemplate,
      isPrivate,
    };

    if (onCreateServer) {
      onCreateServer(newServer);
    }
    
    // Navigate back to server list
    router.back();
  }, [serverName, description, iconUri, selectedIcon, selectedTemplate, isPrivate, validateServerName, onCreateServer]);

  const renderTemplateStep = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-6 pt-6">
        <Text
          className={`text-2xl font-bold text-center mb-2 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Create Your Server
        </Text>
        <Text
          className={`text-center mb-8 ${isDark ? "text-dark-400" : "text-gray-500"}`}
        >
          Your server is where you and your friends hang out. Choose a template to get started.
        </Text>

        <Text
          className={`text-xs font-semibold uppercase mb-4 ${
            isDark ? "text-dark-400" : "text-gray-500"
          }`}
        >
          Choose a Template
        </Text>

        {SERVER_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            onPress={() => handleSelectTemplate(template.id)}
            className={`
              flex-row items-center p-4 mb-3 rounded-xl border
              ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
              ${selectedTemplate === template.id ? "border-brand" : ""}
            `}
            activeOpacity={0.7}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: `${template.color}20` }}
            >
              <Ionicons
                name={template.icon as any}
                size={24}
                color={template.color}
              />
            </View>
            <View className="flex-1 ml-4">
              <Text
                className={`font-semibold text-base ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {template.label}
              </Text>
              <Text
                className={`text-sm mt-0.5 ${isDark ? "text-dark-400" : "text-gray-500"}`}
              >
                {template.description}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? "#80848e" : "#9ca3af"}
            />
          </TouchableOpacity>
        ))}

        <View className="mt-6 pt-6 border-t border-dark-700">
          <Text
            className={`text-center mb-4 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Have an invite already?
          </Text>
          <Button
            title="Join a Server"
            variant="secondary"
            fullWidth
            leftIcon={<Ionicons name="enter-outline" size={20} color="#5865f2" />}
            onPress={() => router.push("/invites" as any)}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderDetailsStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-6">
          <Text
            className={`text-2xl font-bold text-center mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Customize Your Server
          </Text>
          <Text
            className={`text-center mb-6 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Give your server a personality with a name and icon.
          </Text>

          {/* Server Icon Section */}
          <Text
            className={`text-xs font-semibold uppercase mb-3 ${
              isDark ? "text-dark-400" : "text-gray-500"
            }`}
          >
            Server Icon
          </Text>

          {/* Upload Custom Icon */}
          <View className="items-center mb-4">
            <TouchableOpacity
              onPress={pickImage}
              className={`
                w-24 h-24 rounded-full items-center justify-center border-2 border-dashed
                ${iconUri ? "border-brand" : isDark ? "border-dark-500 bg-dark-800" : "border-gray-300 bg-gray-50"}
              `}
            >
              {iconUri ? (
                <Image
                  source={{ uri: iconUri }}
                  className="w-full h-full rounded-full"
                />
              ) : selectedIcon ? (
                <View
                  className="w-full h-full rounded-full items-center justify-center"
                  style={{ 
                    backgroundColor: `${SERVER_ICONS.find(i => i.id === selectedIcon)?.color}20` 
                  }}
                >
                  <Ionicons
                    name={SERVER_ICONS.find(i => i.id === selectedIcon)?.icon as any}
                    size={40}
                    color={SERVER_ICONS.find(i => i.id === selectedIcon)?.color}
                  />
                </View>
              ) : (
                <View className="items-center">
                  <Ionicons
                    name="camera-outline"
                    size={32}
                    color={isDark ? "#80848e" : "#6b7280"}
                  />
                  <Text
                    className={`text-xs mt-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}
                  >
                    UPLOAD
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {(iconUri || selectedIcon) && (
              <TouchableOpacity
                onPress={() => {
                  setIconUri(null);
                  setSelectedIcon(null);
                }}
                className="mt-2"
              >
                <Text className="text-red-500 text-sm">Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Preset Icons */}
          <Text
            className={`text-xs mb-3 ${isDark ? "text-dark-400" : "text-gray-500"}`}
          >
            Or choose a preset icon:
          </Text>
          <View className="flex-row flex-wrap justify-center mb-6">
            {SERVER_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon.id}
                onPress={() => selectPresetIcon(icon.id)}
                className={`
                  w-12 h-12 rounded-full items-center justify-center m-1.5 border-2
                  ${selectedIcon === icon.id ? "border-brand" : isDark ? "border-dark-700" : "border-gray-200"}
                `}
                style={{ 
                  backgroundColor: selectedIcon === icon.id ? `${icon.color}20` : isDark ? "#2b2d31" : "#f3f4f6" 
                }}
              >
                <Ionicons
                  name={icon.icon as any}
                  size={22}
                  color={icon.color}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Server Name */}
          <View className="mb-4">
            <Text
              className={`text-xs font-semibold uppercase mb-2 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Server Name
            </Text>
            <TextInput
              value={serverName}
              onChangeText={(text) => {
                setServerName(text);
                if (nameError) validateServerName(text);
              }}
              onBlur={() => validateServerName(serverName)}
              placeholder="Enter server name"
              placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
              className={`
                px-4 py-3 rounded-xl text-base
                ${isDark ? "bg-dark-800 text-white" : "bg-gray-100 text-gray-900"}
                ${nameError ? "border border-red-500" : ""}
              `}
              maxLength={100}
            />
            {nameError && (
              <Text className="text-red-500 text-xs mt-1">{nameError}</Text>
            )}
            <Text
              className={`text-xs mt-1 ${isDark ? "text-dark-500" : "text-gray-400"}`}
            >
              {serverName.length}/100
            </Text>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text
              className={`text-xs font-semibold uppercase mb-2 ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            >
              Description (Optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's your server about?"
              placeholderTextColor={isDark ? "#4e5058" : "#9ca3af"}
              multiline
              numberOfLines={3}
              className={`
                px-4 py-3 rounded-xl text-base min-h-[80px]
                ${isDark ? "bg-dark-800 text-white" : "bg-gray-100 text-gray-900"}
              `}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text
              className={`text-xs mt-1 ${isDark ? "text-dark-500" : "text-gray-400"}`}
            >
              {description.length}/500
            </Text>
          </View>

          {/* Privacy Toggle */}
          <TouchableOpacity
            onPress={() => setIsPrivate(!isPrivate)}
            className={`
              flex-row items-center justify-between p-4 rounded-xl mb-6
              ${isDark ? "bg-dark-800" : "bg-gray-100"}
            `}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name={isPrivate ? "lock-closed-outline" : "globe-outline"}
                size={24}
                color={isDark ? "#80848e" : "#6b7280"}
              />
              <View className="ml-3 flex-1">
                <Text
                  className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {isPrivate ? "Private Server" : "Public Server"}
                </Text>
                <Text
                  className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
                >
                  {isPrivate
                    ? "Only people with an invite can join"
                    : "Anyone can discover and join"}
                </Text>
              </View>
            </View>
            <View
              className={`
                w-12 h-7 rounded-full p-1
                ${isPrivate ? "bg-brand" : isDark ? "bg-dark-600" : "bg-gray-300"}
              `}
            >
              <View
                className={`
                  w-5 h-5 rounded-full bg-white
                  ${isPrivate ? "ml-auto" : ""}
                `}
              />
            </View>
          </TouchableOpacity>

          <Text
            className={`text-xs text-center mb-4 ${isDark ? "text-dark-500" : "text-gray-400"}`}
          >
            By creating a server, you agree to Hearth&apos;s{" "}
            <Text className="text-brand">Community Guidelines</Text>
          </Text>

          <Button
            title={isCreating ? "Creating..." : "Create Server"}
            fullWidth
            onPress={handleCreateServer}
            disabled={!serverName.trim() || isCreating}
            leftIcon={
              isCreating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="add-circle-outline" size={20} color="white" />
              )
            }
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView 
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["bottom"]}
    >
      {showHeader && (
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: step === "template" ? "Create Server" : "Customize Server",
            headerTitleStyle: {
              color: isDark ? "#ffffff" : "#111827",
              fontSize: 18,
              fontWeight: "bold",
            },
            headerStyle: {
              backgroundColor: isDark ? "#1e1f22" : "#ffffff",
            },
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} className="ml-2">
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
              </TouchableOpacity>
            ),
          }}
        />
      )}

      {/* Progress Indicator */}
      <View
        className={`
          flex-row items-center justify-center py-3 border-b
          ${isDark ? "border-dark-700" : "border-gray-200"}
        `}
      >
        <View
          className={`
            w-2.5 h-2.5 rounded-full mr-2
            ${step === "template" ? "bg-brand" : isDark ? "bg-dark-600" : "bg-gray-300"}
          `}
        />
        <View
          className={`
            w-2.5 h-2.5 rounded-full
            ${step === "details" ? "bg-brand" : isDark ? "bg-dark-600" : "bg-gray-300"}
          `}
        />
      </View>

      {/* Content */}
      {step === "template" ? renderTemplateStep() : renderDetailsStep()}
    </SafeAreaView>
  );
}

export default CreateServerScreen;
