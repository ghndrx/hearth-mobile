/**
 * Permission Rationale Component
 *
 * Displays clear explanations for why permissions are needed,
 * with benefits and alternatives to help users make informed decisions.
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// Removed expo-blur dependency for better compatibility
import {
  type PermissionType,
  type PermissionRationale as PermissionRationaleData,
  permissionManager
} from "../../lib/services/permissionManager";
import { Button } from "./Button";
import { Card } from "./Card";

interface PermissionRationaleProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Permission type to show rationale for */
  permissionType: PermissionType;
  /** Called when user decides to grant permission */
  onGrant: () => void;
  /** Called when user decides not to grant permission */
  onDecline: () => void;
  /** Called when modal should be closed */
  onClose: () => void;
  /** Whether permission was previously denied */
  isDenied?: boolean;
}

export function PermissionRationale({
  visible,
  permissionType,
  onGrant,
  onDecline,
  onClose,
  isDenied = false,
}: PermissionRationaleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const rationale = permissionManager.getRationale(permissionType);

  const getPermissionIcon = (): string => {
    switch (permissionType) {
      case "notifications":
        return "notifications";
      case "camera":
        return "camera";
      case "microphone":
        return "mic";
      case "mediaLibrary":
        return "images";
      case "cameraRoll":
        return "image";
      default:
        return "shield-checkmark";
    }
  };

  const getPermissionColor = (): string => {
    switch (permissionType) {
      case "notifications":
        return "#3b82f6"; // blue
      case "camera":
        return "#10b981"; // green
      case "microphone":
        return "#f59e0b"; // amber
      case "mediaLibrary":
      case "cameraRoll":
        return "#8b5cf6"; // violet
      default:
        return "#6b7280"; // gray
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View
        className={`flex-1 ${isDark ? "bg-black/80" : "bg-gray-900/50"}`}
        style={{ backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(17,24,39,0.5)" }}
      >
        <SafeAreaView className="flex-1">
          <View className="flex-1 justify-end">
            <Card className={`
              m-4
              ${isDark ? "bg-dark-800" : "bg-white"}
              border-0
              shadow-2xl
            `}>
              {/* Header */}
              <View className="flex-row items-center justify-between p-6 pb-4">
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: `${getPermissionColor()}20` }}
                  >
                    <Ionicons
                      name={getPermissionIcon() as any}
                      size={24}
                      color={getPermissionColor()}
                    />
                  </View>
                  <Text
                    className={`text-xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {rationale.title}
                  </Text>
                </View>

                <TouchableOpacity onPress={onClose} className="p-2">
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#80848e" : "#6b7280"}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-96">
                <View className="px-6">
                  {/* Description */}
                  <Text
                    className={`text-base leading-6 mb-4 ${
                      isDark ? "text-dark-200" : "text-gray-700"
                    }`}
                  >
                    {rationale.description}
                  </Text>

                  {/* Benefits */}
                  {rationale.benefits.length > 0 && (
                    <View className="mb-4">
                      <Text
                        className={`text-sm font-semibold mb-2 ${
                          isDark ? "text-dark-300" : "text-gray-600"
                        }`}
                      >
                        What you can do with this permission:
                      </Text>
                      {rationale.benefits.map((benefit, index) => (
                        <View key={index} className="flex-row items-start mb-2">
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={getPermissionColor()}
                            style={{ marginTop: 2 }}
                          />
                          <Text
                            className={`ml-2 text-sm leading-5 flex-1 ${
                              isDark ? "text-dark-300" : "text-gray-600"
                            }`}
                          >
                            {benefit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Alternatives */}
                  {rationale.alternatives && (
                    <View className={`
                      p-3 rounded-lg mb-4
                      ${isDark ? "bg-dark-700/50" : "bg-gray-100"}
                    `}>
                      <Text
                        className={`text-sm font-medium mb-1 ${
                          isDark ? "text-dark-300" : "text-gray-600"
                        }`}
                      >
                        Without this permission:
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-dark-400" : "text-gray-500"
                        }`}
                      >
                        {rationale.alternatives}
                      </Text>
                    </View>
                  )}

                  {/* Privacy Note */}
                  <View className={`
                    p-3 rounded-lg mb-4
                    ${isDark ? "bg-blue-500/10" : "bg-blue-50"}
                  `}>
                    <View className="flex-row items-center mb-1">
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color="#3b82f6"
                      />
                      <Text className="ml-2 text-sm font-medium text-blue-600">
                        Privacy & Security
                      </Text>
                    </View>
                    <Text className="text-sm text-blue-600 leading-5">
                      Hearth only uses this permission when you actively use the feature.
                      We never access your data in the background without your knowledge.
                    </Text>
                  </View>

                  {/* Denied State Message */}
                  {isDenied && (
                    <View className={`
                      p-3 rounded-lg mb-4
                      ${isDark ? "bg-amber-500/10" : "bg-amber-50"}
                      border border-amber-200
                    `}>
                      <View className="flex-row items-center mb-1">
                        <Ionicons
                          name="information-circle"
                          size={16}
                          color="#f59e0b"
                        />
                        <Text className="ml-2 text-sm font-medium text-amber-600">
                          Permission Previously Denied
                        </Text>
                      </View>
                      <Text className="text-sm text-amber-600 leading-5">
                        You'll need to enable this permission in your device Settings
                        since it was previously denied.
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="p-6 pt-4">
                <View className="flex-row space-x-3">
                  <Button
                    title={rationale.alternatives ? "Maybe Later" : "Not Now"}
                    variant="secondary"
                    className="flex-1"
                    onPress={onDecline}
                  />
                  <Button
                    title={isDenied ? "Open Settings" : "Allow Permission"}
                    variant="primary"
                    className="flex-1"
                    onPress={onGrant}
                    leftIcon={
                      <Ionicons
                        name={isDenied ? "settings" : "checkmark"}
                        size={16}
                        color="white"
                      />
                    }
                  />
                </View>

                {/* Educational Footer */}
                <Text
                  className={`text-xs text-center mt-3 ${
                    isDark ? "text-dark-500" : "text-gray-400"
                  }`}
                >
                  You can always change this later in your device Settings
                </Text>
              </View>
            </Card>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default PermissionRationale;