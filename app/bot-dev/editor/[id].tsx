import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

interface BotProject {
  id: string;
  name: string;
  language: "javascript" | "python";
  code: string;
  lastModified: string;
  status: "draft" | "testing" | "deployed";
}

// Mock project data - in production this would be fetched from storage/API
const MOCK_PROJECT: BotProject = {
  id: "my-first-bot",
  name: "My First Bot",
  language: "javascript",
  code: `// Welcome Bot - Interactive Discord Bot
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');

class WelcomeBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    this.setupEvents();
    this.setupCommands();
  }

  setupEvents() {
    // Bot ready event
    this.client.once('ready', () => {
      console.log(\`✅ \${this.client.user.tag} is online!\`);
    });

    // New member join event
    this.client.on('guildMemberAdd', async (member) => {
      const welcomeChannel = member.guild.systemChannel;
      if (welcomeChannel) {
        const embed = {
          color: 0x00ff00,
          title: '🎉 Welcome to the Server!',
          description: \`Hello \${member.user.username}! Welcome to **\${member.guild.name}**\`,
          fields: [
            {
              name: '📋 Getting Started',
              value: '• Read the rules in #rules\\n• Introduce yourself in #introductions\\n• Get roles in #roles'
            },
            {
              name: '❓ Need Help?',
              value: 'Feel free to ask questions in #help or mention a moderator!'
            }
          ],
          thumbnail: {
            url: member.user.displayAvatarURL()
          },
          footer: {
            text: \`Member #\${member.guild.memberCount}\`
          },
          timestamp: new Date()
        };

        await welcomeChannel.send({ embeds: [embed] });
      }
    });

    // Member leave event
    this.client.on('guildMemberRemove', async (member) => {
      const logChannel = member.guild.systemChannel;
      if (logChannel) {
        await logChannel.send(\`👋 **\${member.user.tag}** has left the server.\`);
      }
    });
  }

  setupCommands() {
    // Server info command
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      if (message.content === '!serverinfo') {
        const embed = {
          color: 0x0099ff,
          title: '📊 Server Information',
          fields: [
            {
              name: '🏷️ Server Name',
              value: message.guild.name,
              inline: true
            },
            {
              name: '👥 Member Count',
              value: message.guild.memberCount.toString(),
              inline: true
            },
            {
              name: '📅 Created',
              value: message.guild.createdAt.toDateString(),
              inline: true
            },
            {
              name: '👑 Owner',
              value: \`<@\${message.guild.ownerId}>\`,
              inline: true
            },
            {
              name: '🌍 Region',
              value: message.guild.preferredLocale || 'Unknown',
              inline: true
            },
            {
              name: '📺 Channels',
              value: message.guild.channels.cache.size.toString(),
              inline: true
            }
          ],
          thumbnail: {
            url: message.guild.iconURL() || ''
          },
          timestamp: new Date()
        };

        await message.reply({ embeds: [embed] });
      }

      if (message.content === '!ping') {
        const ping = Date.now() - message.createdTimestamp;
        await message.reply(\`🏓 Pong! Latency: \${ping}ms\`);
      }

      if (message.content === '!help') {
        const embed = {
          color: 0xffa500,
          title: '📚 Bot Commands',
          description: 'Here are all available commands:',
          fields: [
            {
              name: '!ping',
              value: 'Check bot latency and response time'
            },
            {
              name: '!serverinfo',
              value: 'Display detailed server information'
            },
            {
              name: '!help',
              value: 'Show this help message'
            }
          ],
          footer: {
            text: 'Use ! prefix for all commands'
          }
        };

        await message.reply({ embeds: [embed] });
      }
    });
  }

  // Start the bot
  async start(token) {
    try {
      await this.client.login(token);
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  }

  // Stop the bot
  async stop() {
    this.client.destroy();
  }
}

// Export the bot class
module.exports = WelcomeBot;

// Example usage:
// const bot = new WelcomeBot();
// bot.start('YOUR_BOT_TOKEN_HERE');`,
  lastModified: "2 hours ago",
  status: "draft",
};

// Simple syntax highlighting for mobile
const highlightCode = (code: string, language: string) => {
  if (language === "javascript") {
    return code
      .split('\n')
      .map((line, index) => {
        let highlighted = line;

        // Keywords
        highlighted = highlighted.replace(
          /\b(const|let|var|function|class|if|else|for|while|return|async|await|try|catch|new|this|export|import|require|module)\b/g,
          '🔵$1'
        );

        // Strings
        highlighted = highlighted.replace(
          /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
          '🟢$1$2$1'
        );

        // Comments
        highlighted = highlighted.replace(
          /\/\/.*$/g,
          '🟡$&'
        );

        return { line: highlighted, number: index + 1 };
      });
  }

  return code.split('\n').map((line, index) => ({ line, number: index + 1 }));
};

export default function BotEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [project, setProject] = useState<BotProject>(MOCK_PROJECT);
  const [code, setCode] = useState(MOCK_PROJECT.code);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    setProject(prev => ({
      ...prev,
      code,
      lastModified: "Just now"
    }));
    setHasUnsavedChanges(false);
    setShowSaveModal(false);
    Alert.alert("Success", "Bot saved successfully!");
  }, [code]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setShowOutputPanel(true);
    setOutput(["🚀 Starting bot...", "✅ Bot is running!"]);

    // Simulate bot execution
    setTimeout(() => {
      setOutput(prev => [...prev, "📝 Bot ready to receive commands"]);
    }, 1000);

    setTimeout(() => {
      setIsRunning(false);
    }, 3000);
  }, []);

  const handleDeploy = useCallback(() => {
    Alert.alert(
      "Deploy Bot",
      "Are you sure you want to deploy this bot to production?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deploy", onPress: () => {
          setProject(prev => ({ ...prev, status: "deployed" }));
          Alert.alert("Success", "Bot deployed successfully!");
        }}
      ]
    );
  }, []);

  const highlightedCode = highlightCode(code, project.language);

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
              {project.name}
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {project.language} • {hasUnsavedChanges ? "Unsaved" : "Saved"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => setShowSaveModal(true)}
            disabled={!hasUnsavedChanges}
            className={`px-3 py-2 rounded-lg ${hasUnsavedChanges ? '' : 'opacity-50'}`}
            style={{ backgroundColor: colors.accent }}
          >
            <Text className="text-white font-medium text-sm">Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRun}
            disabled={isRunning}
            className={`px-3 py-2 rounded-lg ${isRunning ? 'opacity-50' : ''}`}
            style={{ backgroundColor: colors.success }}
          >
            <Text className="text-white font-medium text-sm">
              {isRunning ? "Running..." : "Run"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1">
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            style={{ backgroundColor: colors.surface }}
            showsVerticalScrollIndicator={true}
          >
            <View className="flex-row">
              {/* Line Numbers */}
              <View className="min-w-[50px] bg-gray-900/5 border-r" style={{ borderRightColor: colors.border }}>
                {highlightedCode.map((line) => (
                  <Text
                    key={line.number}
                    className="text-xs text-center py-1 font-mono"
                    style={{ color: colors.textSecondary, lineHeight: 20 }}
                  >
                    {line.number}
                  </Text>
                ))}
              </View>

              {/* Code Editor */}
              <View className="flex-1">
                <TextInput
                  value={code}
                  onChangeText={handleCodeChange}
                  multiline
                  scrollEnabled={false}
                  className="flex-1 p-3 font-mono text-sm"
                  style={{
                    color: colors.text,
                    backgroundColor: 'transparent',
                    lineHeight: 20,
                    minHeight: Math.max(500, highlightedCode.length * 20 + 40)
                  }}
                  placeholder="Start coding your bot..."
                  placeholderTextColor={colors.textSecondary}
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </View>
            </View>
          </ScrollView>

          {/* Output Panel */}
          {showOutputPanel && (
            <Animated.View
              entering={FadeInUp.duration(300)}
              className="border-t"
              style={{
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                height: 200
              }}
            >
              <View className="flex-row items-center justify-between px-4 py-2 border-b"
                    style={{ borderBottomColor: colors.border }}>
                <Text className="font-semibold" style={{ color: colors.text }}>
                  Console Output
                </Text>
                <TouchableOpacity
                  onPress={() => setShowOutputPanel(false)}
                  className="p-1"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1 px-4 py-2">
                {output.map((line, index) => (
                  <Text
                    key={index}
                    className="text-sm font-mono mb-1"
                    style={{ color: colors.text }}
                  >
                    {line}
                  </Text>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Toolbar */}
      <View className="flex-row items-center justify-between px-4 py-3 border-t"
            style={{ backgroundColor: colors.surface, borderTopColor: colors.border }}>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={() => setShowOutputPanel(!showOutputPanel)}
            className="flex-row items-center"
          >
            <Ionicons
              name="terminal-outline"
              size={20}
              color={showOutputPanel ? colors.accent : colors.textSecondary}
            />
            <Text
              className="ml-1 text-sm font-medium"
              style={{ color: showOutputPanel ? colors.accent : colors.textSecondary }}
            >
              Console
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="bug-outline" size={20} color={colors.textSecondary} />
            <Text className="ml-1 text-sm font-medium" style={{ color: colors.textSecondary }}>
              Debug
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleDeploy}
          className="px-4 py-2 rounded-lg"
          style={{ backgroundColor: colors.warning }}
        >
          <Text className="text-white font-medium text-sm">Deploy</Text>
        </TouchableOpacity>
      </View>

      {/* Save Confirmation Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <Animated.View
            entering={FadeInUp.duration(300)}
            className="m-4 p-6 rounded-2xl"
            style={{ backgroundColor: colors.background, width: "80%" }}
          >
            <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              Save Changes
            </Text>
            <Text className="mb-6" style={{ color: colors.textSecondary }}>
              Do you want to save your changes to {project.name}?
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowSaveModal(false)}
                className="flex-1 p-3 rounded-lg border"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-center font-medium" style={{ color: colors.text }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 p-3 rounded-lg"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-center font-medium text-white">
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}