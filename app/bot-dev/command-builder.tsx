import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Card } from "../../components/ui/Card";

interface CommandParameter {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "user" | "channel" | "role";
  description: string;
  required: boolean;
  choices?: string[];
}

interface BotCommand {
  id: string;
  name: string;
  description: string;
  category: "general" | "moderation" | "utility" | "fun" | "music" | "custom";
  parameters: CommandParameter[];
  permissions: string[];
  cooldown: number;
  response: string;
  isSlashCommand: boolean;
}

const PARAMETER_TYPES = [
  { value: "string", label: "Text", icon: "text-outline", color: "#5865f2" },
  { value: "number", label: "Number", icon: "calculator-outline", color: "#00d26a" },
  { value: "boolean", label: "True/False", icon: "checkbox-outline", color: "#ffa500" },
  { value: "user", label: "User", icon: "person-outline", color: "#f04747" },
  { value: "channel", label: "Channel", icon: "chatbubble-outline", color: "#8b5cf6" },
  { value: "role", label: "Role", icon: "shield-outline", color: "#10b981" },
] as const;

const COMMAND_CATEGORIES = [
  { value: "general", label: "General", color: "#5865f2" },
  { value: "moderation", label: "Moderation", color: "#f04747" },
  { value: "utility", label: "Utility", color: "#00d26a" },
  { value: "fun", label: "Fun", color: "#ffa500" },
  { value: "music", label: "Music", color: "#8b5cf6" },
  { value: "custom", label: "Custom", color: "#6b7280" },
] as const;

const PERMISSIONS = [
  "ADMINISTRATOR",
  "KICK_MEMBERS",
  "BAN_MEMBERS",
  "MODERATE_MEMBERS",
  "MANAGE_CHANNELS",
  "MANAGE_GUILD",
  "MANAGE_MESSAGES",
  "MANAGE_ROLES",
  "SEND_MESSAGES",
  "VIEW_CHANNEL",
] as const;

export default function CommandBuilderScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [command, setCommand] = useState<BotCommand>({
    id: Date.now().toString(),
    name: "",
    description: "",
    category: "general",
    parameters: [],
    permissions: [],
    cooldown: 0,
    response: "",
    isSlashCommand: true,
  });
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [newParameter, setNewParameter] = useState<Partial<CommandParameter>>({
    type: "string",
    required: true,
  });

  const colors = {
    background: isDark ? "#1e1f22" : "#ffffff",
    surface: isDark ? "#2b2d31" : "#f8f9fa",
    border: isDark ? "#3c4043" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#1f2937",
    textSecondary: isDark ? "#b9bbbe" : "#6b7280",
    accent: "#5865f2",
    success: "#00d26a",
    warning: "#ffa500",
    error: "#f04747",
  };

  const updateCommand = useCallback((updates: Partial<BotCommand>) => {
    setCommand(prev => ({ ...prev, ...updates }));
  }, []);

  const addParameter = useCallback(() => {
    if (!newParameter.name || !newParameter.description) {
      Alert.alert("Error", "Please fill in all parameter fields");
      return;
    }

    const parameter: CommandParameter = {
      id: Date.now().toString(),
      name: newParameter.name!,
      type: newParameter.type!,
      description: newParameter.description!,
      required: newParameter.required!,
      choices: newParameter.choices,
    };

    setCommand(prev => ({
      ...prev,
      parameters: [...prev.parameters, parameter],
    }));

    setNewParameter({ type: "string", required: true });
    setShowParameterModal(false);
  }, [newParameter]);

  const removeParameter = useCallback((id: string) => {
    setCommand(prev => ({
      ...prev,
      parameters: prev.parameters.filter(p => p.id !== id),
    }));
  }, []);

  const togglePermission = useCallback((permission: string) => {
    setCommand(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  }, []);

  const generateCode = useCallback(() => {
    const parametersCode = command.parameters.length > 0
      ? command.parameters.map(param => {
          const validation = param.required
            ? `if (!args.${param.name}) return message.reply('${param.name} is required!');`
            : '';
          return `    // ${param.description}\n    ${validation}`;
        }).join('\n')
      : '';

    const permissionCheck = command.permissions.length > 0
      ? `    // Check permissions\n    if (!message.member.permissions.has(['${command.permissions.join("', '")}'])) {\n      return message.reply('You do not have permission to use this command!');\n    }\n\n`
      : '';

    const cooldownCheck = command.cooldown > 0
      ? `    // Cooldown check (${command.cooldown}s)\n    // Implementation depends on your cooldown system\n\n`
      : '';

    const code = `${command.name}: {
  description: '${command.description}',${command.permissions.length > 0 ? `\n  permissions: ['${command.permissions.join("', '")}'],` : ''}${command.cooldown > 0 ? `\n  cooldown: ${command.cooldown},` : ''}
  execute: async (message, args) => {
${permissionCheck}${cooldownCheck}${parametersCode}

    // Command response
    await message.reply('${command.response || `Command ${command.name} executed!`}');
  }
}`;

    Alert.alert(
      "Generated Code",
      "Command code has been generated and copied to clipboard!",
      [
        { text: "OK" },
        {
          text: "Add to Editor",
          onPress: () => {
            // In a real app, this would integrate with the code editor
            router.push("/bot-dev/editor/my-first-bot");
          }
        }
      ]
    );
  }, [command]);

  const previewCommand = useCallback(() => {
    let preview = `/${command.name}`;

    if (command.parameters.length > 0) {
      const paramPreviews = command.parameters.map(param => {
        const paramName = param.required ? `<${param.name}>` : `[${param.name}]`;
        return paramName;
      });
      preview += ` ${paramPreviews.join(' ')}`;
    }

    return preview;
  }, [command]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b"
            style={{ borderBottomColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View>
            <Text className="text-lg font-semibold" style={{ color: colors.text }}>
              Command Builder
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              Create bot commands visually
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={generateCode}
          disabled={!command.name || !command.description}
          className={`px-4 py-2 rounded-lg ${!command.name || !command.description ? 'opacity-50' : ''}`}
          style={{ backgroundColor: colors.accent }}
        >
          <Text className="text-white font-medium">Generate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Command Preview */}
        {command.name && (
          <Animated.View
            entering={FadeInDown.delay(50).duration(400)}
            className="mb-6 p-4 rounded-lg border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
              Command Preview
            </Text>
            <Text
              className="text-lg font-mono p-3 rounded-lg"
              style={{ backgroundColor: colors.accent + "20", color: colors.accent }}
            >
              {previewCommand()}
            </Text>
            {command.description && (
              <Text className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                {command.description}
              </Text>
            )}
          </Animated.View>
        )}

        {/* Basic Information */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="mb-6"
        >
          <Card className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}>
            <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
              Basic Information
            </Text>

            <View className="gap-4">
              {/* Command Name */}
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Command Name
                </Text>
                <TextInput
                  value={command.name}
                  onChangeText={(text) => updateCommand({ name: text.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="ping, help, ban..."
                  placeholderTextColor={colors.textSecondary}
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                />
              </View>

              {/* Description */}
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Description
                </Text>
                <TextInput
                  value={command.description}
                  onChangeText={(text) => updateCommand({ description: text })}
                  placeholder="What does this command do?"
                  placeholderTextColor={colors.textSecondary}
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                  multiline
                />
              </View>

              {/* Category */}
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {COMMAND_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category.value}
                        onPress={() => updateCommand({ category: category.value })}
                        className={`px-3 py-2 rounded-lg border ${
                          command.category === category.value ? 'border-2' : ''
                        }`}
                        style={{
                          borderColor: command.category === category.value ? category.color : colors.border,
                          backgroundColor: command.category === category.value ? category.color + "20" : colors.surface,
                        }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{
                            color: command.category === category.value ? category.color : colors.text
                          }}
                        >
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Slash Command Toggle */}
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    Slash Command
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    Modern Discord command format
                  </Text>
                </View>
                <Switch
                  value={command.isSlashCommand}
                  onValueChange={(value) => updateCommand({ isSlashCommand: value })}
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Parameters */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          className="mb-6"
        >
          <Card className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                Parameters
              </Text>
              <TouchableOpacity
                onPress={() => setShowParameterModal(true)}
                className="p-2 rounded-lg"
                style={{ backgroundColor: colors.accent }}
              >
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {command.parameters.length === 0 ? (
              <Text className="text-center py-8" style={{ color: colors.textSecondary }}>
                No parameters yet. Add parameters to make your command more interactive.
              </Text>
            ) : (
              <View className="gap-3">
                {command.parameters.map((parameter, index) => (
                  <View
                    key={parameter.id}
                    className="p-3 rounded-lg border flex-row items-center justify-between"
                    style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="font-semibold" style={{ color: colors.text }}>
                          {parameter.name}
                        </Text>
                        {parameter.required && (
                          <Text className="ml-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.error + "20", color: colors.error }}>
                            Required
                          </Text>
                        )}
                      </View>
                      <Text className="text-sm" style={{ color: colors.textSecondary }}>
                        {parameter.description} • {parameter.type}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeParameter(parameter.id)}
                      className="ml-3 p-2"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Permissions & Settings */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          className="mb-6"
        >
          <Card className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}>
            <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
              Permissions & Settings
            </Text>

            <View className="gap-4">
              {/* Permissions */}
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    Required Permissions
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPermissionModal(true)}
                    className="px-3 py-1 rounded-lg"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Text className="text-white text-xs">Add</Text>
                  </TouchableOpacity>
                </View>

                {command.permissions.length === 0 ? (
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    No permissions required
                  </Text>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {command.permissions.map((permission) => (
                      <View
                        key={permission}
                        className="flex-row items-center px-3 py-1 rounded-lg"
                        style={{ backgroundColor: colors.warning + "20" }}
                      >
                        <Text className="text-xs font-medium" style={{ color: colors.warning }}>
                          {permission}
                        </Text>
                        <TouchableOpacity
                          onPress={() => togglePermission(permission)}
                          className="ml-2"
                        >
                          <Ionicons name="close" size={14} color={colors.warning} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Cooldown */}
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Cooldown (seconds)
                </Text>
                <TextInput
                  value={command.cooldown.toString()}
                  onChangeText={(text) => updateCommand({ cooldown: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                />
              </View>

              {/* Response */}
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Default Response
                </Text>
                <TextInput
                  value={command.response}
                  onChangeText={(text) => updateCommand({ response: text })}
                  placeholder="What should the bot reply with?"
                  placeholderTextColor={colors.textSecondary}
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                  multiline
                />
              </View>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Parameter Modal */}
      <Modal
        visible={showParameterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowParameterModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <Animated.View
            entering={FadeInUp.duration(300)}
            className="m-4 p-6 rounded-2xl"
            style={{ backgroundColor: colors.background, width: "90%" }}
          >
            <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Add Parameter
            </Text>

            <View className="gap-4">
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Parameter Name
                </Text>
                <TextInput
                  value={newParameter.name || ""}
                  onChangeText={(text) => setNewParameter(prev => ({ ...prev, name: text }))}
                  placeholder="user, message, amount..."
                  placeholderTextColor={colors.textSecondary}
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                />
              </View>

              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Description
                </Text>
                <TextInput
                  value={newParameter.description || ""}
                  onChangeText={(text) => setNewParameter(prev => ({ ...prev, description: text }))}
                  placeholder="Describe this parameter"
                  placeholderTextColor={colors.textSecondary}
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  }}
                />
              </View>

              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Type
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {PARAMETER_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        onPress={() => setNewParameter(prev => ({ ...prev, type: type.value }))}
                        className={`flex-row items-center px-3 py-2 rounded-lg border ${
                          newParameter.type === type.value ? 'border-2' : ''
                        }`}
                        style={{
                          borderColor: newParameter.type === type.value ? type.color : colors.border,
                          backgroundColor: newParameter.type === type.value ? type.color + "20" : colors.surface,
                        }}
                      >
                        <Ionicons name={type.icon as any} size={16} color={type.color} />
                        <Text
                          className="ml-2 text-sm font-medium"
                          style={{ color: newParameter.type === type.value ? type.color : colors.text }}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  Required Parameter
                </Text>
                <Switch
                  value={newParameter.required}
                  onValueChange={(value) => setNewParameter(prev => ({ ...prev, required: value }))}
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => setShowParameterModal(false)}
                className="flex-1 p-3 rounded-lg border"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-center font-medium" style={{ color: colors.text }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addParameter}
                className="flex-1 p-3 rounded-lg"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-center font-medium text-white">
                  Add Parameter
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Permission Modal */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <Animated.View
            entering={FadeInUp.duration(300)}
            className="m-4 p-6 rounded-2xl"
            style={{ backgroundColor: colors.background, width: "90%" }}
          >
            <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Select Permissions
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              <View className="gap-2">
                {PERMISSIONS.map((permission) => (
                  <TouchableOpacity
                    key={permission}
                    onPress={() => togglePermission(permission)}
                    className={`p-3 rounded-lg border ${
                      command.permissions.includes(permission) ? 'border-2' : ''
                    }`}
                    style={{
                      borderColor: command.permissions.includes(permission) ? colors.accent : colors.border,
                      backgroundColor: command.permissions.includes(permission) ? colors.accent + "20" : colors.surface,
                    }}
                  >
                    <Text
                      className="font-medium"
                      style={{
                        color: command.permissions.includes(permission) ? colors.accent : colors.text
                      }}
                    >
                      {permission}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowPermissionModal(false)}
              className="mt-6 p-3 rounded-lg"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="text-center font-medium text-white">
                Done
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}