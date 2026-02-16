import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../lib/stores/auth";
import { Avatar, Button } from "../../components/ui";

interface FormErrors {
  displayName?: string;
  username?: string;
  bio?: string;
}

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, updateProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasChanges, setHasChanges] = useState(false);

  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = "Display name is required";
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = "Display name must be at least 2 characters";
    } else if (displayName.trim().length > 32) {
      newErrors.displayName = "Display name must be less than 32 characters";
    }

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (username.trim().length > 20) {
      newErrors.username = "Username must be less than 20 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    if (bio.length > 200) {
      newErrors.bio = "Bio must be less than 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [displayName, username, bio]);

  const handlePickImage = useCallback(async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to change your avatar.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
      markChanged();
    }
  }, [markChanged]);

  const handleTakePhoto = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your camera to take a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
      markChanged();
    }
  }, [markChanged]);

  const showImageOptions = useCallback(() => {
    Alert.alert("Change Avatar", "Choose an option", [
      { text: "Take Photo", onPress: handleTakePhoto },
      { text: "Choose from Library", onPress: handlePickImage },
      ...(avatar
        ? [
            {
              text: "Remove Avatar",
              style: "destructive" as const,
              onPress: () => {
                setAvatar(undefined);
                markChanged();
              },
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }, [avatar, handleTakePhoto, handlePickImage, markChanged]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar,
      });

      Alert.alert("Success", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [displayName, username, bio, avatar, validateForm, updateProfile]);

  const handleDiscard = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  }, [hasChanges]);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Edit Profile",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "bold",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity onPress={handleDiscard} className="ml-2">
              <Ionicons
                name="close"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading || !hasChanges}
              className="mr-4"
            >
              <Text
                className={`text-base font-semibold ${
                  hasChanges && !isLoading
                    ? "text-brand"
                    : isDark
                      ? "text-dark-500"
                      : "text-gray-400"
                }`}
              >
                Save
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View className="items-center py-8">
            <TouchableOpacity
              onPress={showImageOptions}
              activeOpacity={0.8}
              className="relative"
            >
              <Avatar
                uri={avatar}
                name={displayName || user?.displayName || "User"}
                size="xl"
              />
              <View
                className={`
                  absolute 
                  bottom-0 
                  right-0 
                  w-10 
                  h-10 
                  rounded-full 
                  items-center 
                  justify-center
                  border-4
                  ${isDark ? "bg-brand border-dark-900" : "bg-brand border-gray-50"}
                `}
              >
                <Ionicons name="camera" size={18} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={showImageOptions} className="mt-3">
              <Text className="text-brand font-medium">Change Avatar</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View className="px-4">
            <View className="mb-6">
              <Text
                className={`text-xs font-semibold uppercase mb-3 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Profile Information
              </Text>
              <View
                className={`
                  rounded-xl
                  overflow-hidden
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border
                  ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                {/* Display Name */}
                <View className="px-4 py-3">
                  <Text
                    className={`text-xs font-medium mb-1.5 ${
                      isDark ? "text-dark-300" : "text-gray-600"
                    }`}
                  >
                    Display Name
                  </Text>
                  <TextInput
                    className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}
                    value={displayName}
                    onChangeText={(text) => {
                      setDisplayName(text);
                      markChanged();
                    }}
                    placeholder="Enter your display name"
                    placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                    maxLength={32}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  {errors.displayName && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.displayName}
                    </Text>
                  )}
                </View>

                <View
                  className={`h-px ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
                />

                {/* Username */}
                <View className="px-4 py-3">
                  <Text
                    className={`text-xs font-medium mb-1.5 ${
                      isDark ? "text-dark-300" : "text-gray-600"
                    }`}
                  >
                    Username
                  </Text>
                  <View className="flex-row items-center">
                    <Text
                      className={`text-base ${isDark ? "text-dark-400" : "text-gray-400"}`}
                    >
                      @
                    </Text>
                    <TextInput
                      className={`flex-1 text-base ${isDark ? "text-white" : "text-gray-900"}`}
                      value={username}
                      onChangeText={(text) => {
                        setUsername(
                          text.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                        );
                        markChanged();
                      }}
                      placeholder="username"
                      placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {errors.username && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.username}
                    </Text>
                  )}
                </View>

                <View
                  className={`h-px ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
                />

                {/* Bio */}
                <View className="px-4 py-3">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text
                      className={`text-xs font-medium ${
                        isDark ? "text-dark-300" : "text-gray-600"
                      }`}
                    >
                      About Me
                    </Text>
                    <Text
                      className={`text-xs ${
                        bio.length > 180
                          ? "text-orange-500"
                          : isDark
                            ? "text-dark-500"
                            : "text-gray-400"
                      }`}
                    >
                      {bio.length}/200
                    </Text>
                  </View>
                  <TextInput
                    className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}
                    value={bio}
                    onChangeText={(text) => {
                      setBio(text);
                      markChanged();
                    }}
                    placeholder="Tell others about yourself..."
                    placeholderTextColor={isDark ? "#80848e" : "#9ca3af"}
                    maxLength={200}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{ minHeight: 80 }}
                  />
                  {errors.bio && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.bio}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Preview Section */}
            <View className="mb-6">
              <Text
                className={`text-xs font-semibold uppercase mb-3 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                Preview
              </Text>
              <View
                className={`
                  rounded-xl
                  p-4
                  ${isDark ? "bg-dark-800" : "bg-white"}
                  border
                  ${isDark ? "border-dark-700" : "border-gray-200"}
                `}
              >
                <View className="flex-row items-center">
                  <Avatar
                    uri={avatar}
                    name={displayName || "User"}
                    size="lg"
                    status="online"
                    showStatus
                  />
                  <View className="ml-4 flex-1">
                    <Text
                      className={`text-lg font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {displayName || "Display Name"}
                    </Text>
                    <Text
                      className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}
                    >
                      @{username || "username"}
                    </Text>
                  </View>
                </View>
                {bio.trim() && (
                  <Text
                    className={`mt-3 text-sm ${
                      isDark ? "text-dark-200" : "text-gray-700"
                    }`}
                  >
                    {bio}
                  </Text>
                )}
              </View>
            </View>

            {/* Save Button */}
            <Button
              title={isLoading ? "Saving..." : "Save Changes"}
              variant="primary"
              fullWidth
              onPress={handleSave}
              isLoading={isLoading}
              disabled={!hasChanges}
              leftIcon={
                !isLoading && (
                  <Ionicons name="checkmark" size={20} color="white" />
                )
              }
            />

            {/* Tips */}
            <View
              className={`mt-6 p-4 rounded-xl ${
                isDark ? "bg-dark-800/50" : "bg-gray-100"
              }`}
            >
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={isDark ? "#80848e" : "#6b7280"}
                />
                <Text
                  className={`ml-2 text-sm font-medium ${
                    isDark ? "text-dark-300" : "text-gray-600"
                  }`}
                >
                  Profile Tips
                </Text>
              </View>
              <Text
                className={`text-sm leading-5 ${
                  isDark ? "text-dark-400" : "text-gray-500"
                }`}
              >
                • Your display name is how others see you in chat{"\n"}•
                Usernames must be unique and can only contain letters, numbers,
                and underscores{"\n"}• Keep your bio friendly and welcoming
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
