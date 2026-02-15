import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../ui";

interface CreateServerModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateServer?: (server: NewServer) => void;
}

interface NewServer {
  name: string;
  description: string;
  icon?: string;
  isPrivate: boolean;
}

const SERVER_TEMPLATES = [
  { id: "gaming", icon: "game-controller-outline", label: "Gaming", color: "#22c55e" },
  { id: "community", icon: "people-outline", label: "Community", color: "#3b82f6" },
  { id: "friends", icon: "heart-outline", label: "Friends", color: "#ec4899" },
  { id: "study", icon: "book-outline", label: "Study Group", color: "#f59e0b" },
  { id: "work", icon: "briefcase-outline", label: "Work", color: "#6366f1" },
  { id: "custom", icon: "sparkles-outline", label: "Custom", color: "#8b5cf6" },
] as const;

export function CreateServerModal({
  visible,
  onClose,
  onCreateServer,
}: CreateServerModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState<"template" | "details">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [serverName, setServerName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep("template");
    setSelectedTemplate(null);
    setServerName("");
    setDescription("");
    setIconUri(null);
    setIsPrivate(false);
    setIsCreating(false);
    setNameError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

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
    }
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

  const handleCreateServer = useCallback(async () => {
    if (!validateServerName(serverName)) return;

    setIsCreating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newServer: NewServer = {
      name: serverName.trim(),
      description: description.trim(),
      icon: iconUri || undefined,
      isPrivate,
    };

    onCreateServer?.(newServer);
    handleClose();
  }, [serverName, description, iconUri, isPrivate, validateServerName, onCreateServer, handleClose]);

  const renderTemplateStep = () => (
    <View className="flex-1">
      <Text
        className={`text-2xl font-bold text-center mb-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        Create Your Server
      </Text>
      <Text
        className={`text-center mb-6 ${isDark ? "text-dark-400" : "text-gray-500"}`}
      >
        Your server is where you and your friends hang out. Make yours and start talking.
      </Text>

      <Text
        className={`text-xs font-semibold uppercase mb-3 ${
          isDark ? "text-dark-400" : "text-gray-500"
        }`}
      >
        Start from a template
      </Text>

      <View className="flex-row flex-wrap justify-between">
        {SERVER_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            onPress={() => {
              setSelectedTemplate(template.id);
              setStep("details");
              if (template.id !== "custom") {
                setServerName(`My ${template.label} Server`);
              }
            }}
            className={`
              w-[48%] mb-3 p-4 rounded-xl border
              ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
            `}
            style={{ borderColor: selectedTemplate === template.id ? template.color : undefined }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: `${template.color}20` }}
            >
              <Ionicons
                name={template.icon as any}
                size={24}
                color={template.color}
              />
            </View>
            <Text
              className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {template.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          onPress={() => {}}
        />
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        onPress={() => setStep("template")}
        className="flex-row items-center mb-4"
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={isDark ? "#80848e" : "#6b7280"}
        />
        <Text className={`ml-1 ${isDark ? "text-dark-400" : "text-gray-500"}`}>
          Back
        </Text>
      </TouchableOpacity>

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
        Give your new server a personality with a name and an icon. You can always change it later.
      </Text>

      {/* Server Icon */}
      <View className="items-center mb-6">
        <TouchableOpacity
          onPress={pickImage}
          className={`
            w-24 h-24 rounded-full items-center justify-center border-2 border-dashed
            ${isDark ? "border-dark-500 bg-dark-800" : "border-gray-300 bg-gray-50"}
          `}
        >
          {iconUri ? (
            <Image
              source={{ uri: iconUri }}
              className="w-full h-full rounded-full"
            />
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
        {iconUri && (
          <TouchableOpacity
            onPress={() => setIconUri(null)}
            className="mt-2"
          >
            <Text className="text-red-500 text-sm">Remove</Text>
          </TouchableOpacity>
        )}
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
                : "Anyone can discover and join your server"}
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
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      >
        {/* Header */}
        <View
          className={`
            flex-row items-center justify-between px-4 py-3 border-b
            ${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}
          `}
        >
          <TouchableOpacity onPress={handleClose} className="w-16">
            <Text className="text-brand font-medium">Cancel</Text>
          </TouchableOpacity>

          <View className="flex-row items-center">
            <View
              className={`
                w-2 h-2 rounded-full mr-2
                ${step === "template" ? "bg-brand" : isDark ? "bg-dark-600" : "bg-gray-300"}
              `}
            />
            <View
              className={`
                w-2 h-2 rounded-full
                ${step === "details" ? "bg-brand" : isDark ? "bg-dark-600" : "bg-gray-300"}
              `}
            />
          </View>

          <View className="w-16" />
        </View>

        {/* Content */}
        <View className="flex-1 px-6 pt-6">
          {step === "template" ? renderTemplateStep() : renderDetailsStep()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default CreateServerModal;
