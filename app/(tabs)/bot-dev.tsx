import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Card } from "../../components/ui/Card";

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  code: string;
  language: "javascript" | "python";
  tags: string[];
}

interface BotProject {
  id: string;
  name: string;
  language: "javascript" | "python";
  code: string;
  lastModified: string;
  status: "draft" | "testing" | "deployed";
}

// Mock bot templates
const BOT_TEMPLATES: BotTemplate[] = [
  {
    id: "welcome-bot",
    name: "Welcome Bot",
    description: "Greets new members and provides server info",
    icon: "hand-left-outline",
    color: "#10b981",
    language: "javascript",
    code: `// Welcome Bot Template
const bot = {
  name: "WelcomeBot",

  onMemberJoin: async (member, channel) => {
    const welcomeMessage = \`👋 Welcome to the server, \${member.username}!

Please read our rules in #rules and introduce yourself in #introductions.
Feel free to ask questions in #help if you need assistance!\`;

    await channel.send(welcomeMessage);
  },

  commands: {
    serverinfo: {
      description: "Get server information",
      execute: async (message, args) => {
        const serverInfo = {
          name: message.guild.name,
          memberCount: message.guild.memberCount,
          createdAt: message.guild.createdAt.toDateString()
        };

        await message.reply(\`**\${serverInfo.name}**
👥 Members: \${serverInfo.memberCount}
📅 Created: \${serverInfo.createdAt}\`);
      }
    }
  }
};`,
    tags: ["moderation", "welcome", "beginner"],
  },
  {
    id: "music-bot",
    name: "Music Bot",
    description: "Play music from YouTube and manage playlists",
    icon: "musical-notes-outline",
    color: "#8b5cf6",
    language: "javascript",
    code: `// Music Bot Template
const bot = {
  name: "MusicBot",

  commands: {
    play: {
      description: "Play a song from YouTube",
      execute: async (message, args) => {
        const query = args.join(' ');
        if (!query) {
          return message.reply('Please provide a song name or URL!');
        }

        // Connect to voice channel
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
          return message.reply('You need to be in a voice channel!');
        }

        await message.reply(\`🎵 Searching for: \${query}\`);
        // Music playing logic here
      }
    },

    stop: {
      description: "Stop playing music",
      execute: async (message, args) => {
        await message.reply('⏹️ Music stopped!');
        // Stop music logic here
      }
    },

    queue: {
      description: "Show current music queue",
      execute: async (message, args) => {
        await message.reply('📋 Current queue is empty');
        // Queue display logic here
      }
    }
  }
};`,
    tags: ["entertainment", "voice", "music"],
  },
  {
    id: "moderation-bot",
    name: "Moderation Bot",
    description: "Moderate chat with kick, ban, and warning systems",
    icon: "shield-checkmark-outline",
    color: "#ef4444",
    language: "javascript",
    code: `// Moderation Bot Template
const bot = {
  name: "ModerationBot",

  commands: {
    kick: {
      description: "Kick a user from the server",
      permissions: ["KICK_MEMBERS"],
      execute: async (message, args) => {
        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';

        if (!user) {
          return message.reply('Please mention a user to kick!');
        }

        try {
          await message.guild.members.kick(user, reason);
          await message.reply(\`✅ \${user.tag} has been kicked. Reason: \${reason}\`);
        } catch (error) {
          await message.reply('❌ Failed to kick user. Check permissions.');
        }
      }
    },

    warn: {
      description: "Warn a user",
      permissions: ["MODERATE_MEMBERS"],
      execute: async (message, args) => {
        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';

        if (!user) {
          return message.reply('Please mention a user to warn!');
        }

        // Store warning in database
        await message.reply(\`⚠️ \${user.tag} has been warned. Reason: \${reason}\`);
      }
    },

    mute: {
      description: "Mute a user for specified duration",
      permissions: ["MODERATE_MEMBERS"],
      execute: async (message, args) => {
        const user = message.mentions.users.first();
        const duration = args[1] || '10m';

        if (!user) {
          return message.reply('Please mention a user to mute!');
        }

        await message.reply(\`🔇 \${user.tag} has been muted for \${duration}\`);
      }
    }
  }
};`,
    tags: ["moderation", "admin", "security"],
  },
  {
    id: "poll-bot",
    name: "Poll Bot",
    description: "Create interactive polls with reactions",
    icon: "bar-chart-outline",
    color: "#f59e0b",
    language: "python",
    code: `# Poll Bot Template
import discord
from discord.ext import commands

class PollBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix='!', intents=discord.Intents.all())

    @commands.command(name='poll')
    async def create_poll(self, ctx, question, *options):
        """Create a poll with multiple options"""
        if len(options) < 2:
            await ctx.send("❌ Please provide at least 2 options!")
            return

        if len(options) > 10:
            await ctx.send("❌ Maximum 10 options allowed!")
            return

        # Reaction emojis for options
        emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

        # Create poll embed
        embed = discord.Embed(
            title="📊 " + question,
            color=0xf59e0b,
            timestamp=ctx.message.created_at
        )

        description = ""
        for i, option in enumerate(options):
            description += f"{emojis[i]} {option}\\n"

        embed.description = description
        embed.set_footer(text=f"Poll created by {ctx.author.display_name}")

        # Send poll and add reactions
        poll_message = await ctx.send(embed=embed)
        for i in range(len(options)):
            await poll_message.add_reaction(emojis[i])

    @commands.command(name='quickpoll')
    async def quick_poll(self, ctx, *, question):
        """Create a simple yes/no poll"""
        embed = discord.Embed(
            title="📊 " + question,
            description="React with ✅ for Yes or ❌ for No",
            color=0xf59e0b
        )

        poll_message = await ctx.send(embed=embed)
        await poll_message.add_reaction('✅')
        await poll_message.add_reaction('❌')`,
    tags: ["polls", "engagement", "voting"],
  },
];

// Mock user projects
const MOCK_PROJECTS: BotProject[] = [
  {
    id: "my-first-bot",
    name: "My First Bot",
    language: "javascript",
    code: `// My First Bot
const bot = {
  name: "MyBot",
  commands: {
    hello: {
      execute: async (message) => {
        await message.reply("Hello, World!");
      }
    }
  }
};`,
    lastModified: "2 hours ago",
    status: "draft",
  },
];

export default function BotDevScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState<"templates" | "projects" | "playground">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLanguage, setNewProjectLanguage] = useState<"javascript" | "python">("javascript");
  const [userProjects, setUserProjects] = useState(MOCK_PROJECTS);

  const handleCreateProject = useCallback(() => {
    if (!newProjectName.trim()) {
      Alert.alert("Error", "Please enter a project name");
      return;
    }

    const newProject: BotProject = {
      id: Date.now().toString(),
      name: newProjectName,
      language: newProjectLanguage,
      code: selectedTemplate?.code || `// New ${newProjectLanguage} bot
const bot = {
  name: "${newProjectName}",
  commands: {
    hello: {
      execute: async (message) => {
        await message.reply("Hello from ${newProjectName}!");
      }
    }
  }
};`,
      lastModified: "Just now",
      status: "draft",
    };

    setUserProjects(prev => [newProject, ...prev]);
    setNewProjectName("");
    setShowCreateProject(false);
    setSelectedTemplate(null);

    // Navigate to code editor
    router.push(`/bot-dev/editor/${newProject.id}`);
  }, [newProjectName, newProjectLanguage, selectedTemplate]);

  const handleTemplateSelect = useCallback((template: BotTemplate) => {
    setSelectedTemplate(template);
    setNewProjectLanguage(template.language);
    setShowCreateProject(true);
  }, []);

  const colors = {
    background: isDark ? "#1e1f22" : "#ffffff",
    surface: isDark ? "#2b2d31" : "#f8f9fa",
    border: isDark ? "#3c4043" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#1f2937",
    textSecondary: isDark ? "#b9bbbe" : "#6b7280",
    accent: "#5865f2",
  };

  const renderTemplates = () => (
    <View className="flex-1">
      <FlatList
        data={BOT_TEMPLATES}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        renderItem={({ item: template, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 100).duration(400)}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTemplateSelect(template)}
            >
              <Card className={`${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}`}>
                <View className="flex-row items-start">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: template.color + "20" }}
                  >
                    <Ionicons name={template.icon as any} size={24} color={template.color} />
                  </View>

                  <View className="flex-1">
                    <Text className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {template.name}
                    </Text>
                    <Text className={`text-sm mb-3 ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                      {template.description}
                    </Text>

                    <View className="flex-row flex-wrap gap-2">
                      <View className={`px-2 py-1 rounded-md ${isDark ? "bg-blue-500/20" : "bg-blue-50"}`}>
                        <Text className="text-xs font-medium text-blue-500">
                          {template.language}
                        </Text>
                      </View>
                      {template.tags.map(tag => (
                        <View key={tag} className={`px-2 py-1 rounded-md ${isDark ? "bg-dark-600" : "bg-gray-100"}`}>
                          <Text className={`text-xs ${isDark ? "text-dark-200" : "text-gray-600"}`}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDark ? "#949ba4" : "#6b7280"}
                  />
                </View>
              </Card>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </View>
  );

  const renderProjects = () => (
    <View className="flex-1">
      <View className="px-4 py-3 border-b" style={{ borderBottomColor: colors.border }}>
        <TouchableOpacity
          onPress={() => setShowCreateProject(true)}
          className="flex-row items-center justify-center py-3 px-4 rounded-lg border-2 border-dashed"
          style={{ borderColor: colors.accent }}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
          <Text className="ml-2 font-medium" style={{ color: colors.accent }}>
            Create New Bot
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={userProjects}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item: project, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 100).duration(400)}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/bot-dev/editor/${project.id}`)}
            >
              <Card className={`${isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {project.name}
                    </Text>
                    <Text className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                      {project.language} • {project.lastModified}
                    </Text>
                  </View>

                  <View className="items-end">
                    <View
                      className={`px-3 py-1 rounded-full ${
                        project.status === "deployed"
                          ? "bg-green-100"
                          : project.status === "testing"
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          project.status === "deployed"
                            ? "text-green-800"
                            : project.status === "testing"
                            ? "text-blue-800"
                            : "text-gray-800"
                        }`}
                      >
                        {project.status}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? "#949ba4" : "#6b7280"}
                      className="mt-1"
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </View>
  );

  const renderPlayground = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons
        name="code-slash-outline"
        size={64}
        color={isDark ? "#6b7280" : "#9ca3af"}
      />
      <Text className={`text-xl font-semibold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
        Bot Playground
      </Text>
      <Text className={`text-center leading-6 ${isDark ? "text-dark-300" : "text-gray-600"}`}>
        Test your bot commands and simulate events in a safe environment
      </Text>
      <TouchableOpacity
        className="mt-6 px-6 py-3 rounded-lg"
        style={{ backgroundColor: colors.accent }}
        onPress={() => router.push("/bot-dev/playground")}
      >
        <Text className="text-white font-medium">Open Playground</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(50).duration(400)}
        className="px-4 py-3 border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Bot Development
            </Text>
            <Text className={`text-sm ${isDark ? "text-dark-400" : "text-gray-500"}`}>
              Build and deploy intelligent bots
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/bot-dev/docs")}
            className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-dark-700" : "bg-gray-100"}`}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={isDark ? "#949ba4" : "#6b7280"}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        className="flex-row border-b"
        style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}
      >
        {[
          { key: "templates", label: "Templates", icon: "library-outline" },
          { key: "projects", label: "My Bots", icon: "folder-outline" },
          { key: "playground", label: "Playground", icon: "play-outline" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === tab.key ? "border-brand" : "border-transparent"
            }`}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? colors.accent : colors.textSecondary}
            />
            <Text
              className={`text-xs font-medium mt-1 ${
                activeTab === tab.key
                  ? isDark ? "text-brand" : "text-brand"
                  : isDark ? "text-dark-300" : "text-gray-600"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Tab Content */}
      <View className="flex-1">
        {activeTab === "templates" && renderTemplates()}
        {activeTab === "projects" && renderProjects()}
        {activeTab === "playground" && renderPlayground()}
      </View>

      {/* Create Project Modal */}
      <Modal
        visible={showCreateProject}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateProject(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <Animated.View
            entering={FadeInUp.duration(300)}
            className={`m-4 p-6 rounded-2xl ${isDark ? "bg-dark-800" : "bg-white"}`}
            style={{ width: "90%" }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Create New Bot
              </Text>
              <TouchableOpacity onPress={() => setShowCreateProject(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#949ba4" : "#6b7280"}
                />
              </TouchableOpacity>
            </View>

            {selectedTemplate && (
              <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: selectedTemplate.color + "10" }}>
                <Text className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  Template: {selectedTemplate.name}
                </Text>
                <Text className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                  {selectedTemplate.description}
                </Text>
              </View>
            )}

            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Project Name
              </Text>
              <TextInput
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder="Enter bot name..."
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                className={`p-3 rounded-lg border ${isDark ? "bg-dark-700 border-dark-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`}
              />
            </View>

            <View className="mb-6">
              <Text className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Language
              </Text>
              <View className="flex-row gap-3">
                {["javascript", "python"].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => setNewProjectLanguage(lang as any)}
                    className={`flex-1 p-3 rounded-lg border-2 ${
                      newProjectLanguage === lang
                        ? "border-brand bg-brand/10"
                        : isDark ? "border-dark-600 bg-dark-700" : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <Text
                      className={`text-center font-medium ${
                        newProjectLanguage === lang
                          ? "text-brand"
                          : isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {lang === "javascript" ? "JavaScript" : "Python"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowCreateProject(false)}
                className={`flex-1 p-3 rounded-lg border ${isDark ? "border-dark-600" : "border-gray-300"}`}
              >
                <Text className={`text-center font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateProject}
                className="flex-1 p-3 rounded-lg"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-center font-medium text-white">
                  Create Bot
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}