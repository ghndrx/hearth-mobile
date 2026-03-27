import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "../../components/ui/Card";

interface DocSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  content: string[];
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of bot development",
    icon: "play-circle-outline",
    color: "#00d26a",
    content: [
      "# Getting Started with Bot Development\n\nWelcome to the Hearth Mobile Bot Development Kit! This guide will help you create your first bot.",
      "## Prerequisites\n\n• Basic understanding of JavaScript or Python\n• Familiarity with Discord bots\n• A Discord server for testing",
      "## Creating Your First Bot\n\n1. Navigate to the Bot Dev tab\n2. Choose a template or start from scratch\n3. Give your bot a name\n4. Start coding!",
      "## Basic Bot Structure\n\n```javascript\nconst bot = {\n  name: 'MyBot',\n  commands: {\n    ping: {\n      execute: async (message) => {\n        await message.reply('Pong!');\n      }\n    }\n  }\n};\n```"
    ],
  },
  {
    id: "commands",
    title: "Bot Commands",
    description: "Learn how to create and manage bot commands",
    icon: "terminal-outline",
    color: "#5865f2",
    content: [
      "# Bot Commands\n\nCommands are the primary way users interact with your bot.",
      "## Command Structure\n\n```javascript\ncommands: {\n  commandName: {\n    description: 'What this command does',\n    permissions: ['OPTIONAL_PERMISSION'],\n    execute: async (message, args) => {\n      // Command logic here\n    }\n  }\n}\n```",
      "## Message Handling\n\n• `message.reply()` - Reply to the user\n• `message.channel.send()` - Send to the channel\n• `args` - Command arguments array",
      "## Example Commands\n\n**Ping Command:**\n```javascript\nping: {\n  description: 'Check bot latency',\n  execute: async (message) => {\n    const ping = Date.now() - message.createdTimestamp;\n    await message.reply(`🏓 Pong! ${ping}ms`);\n  }\n}\n```"
    ],
  },
  {
    id: "events",
    title: "Event Handling",
    description: "Respond to Discord events and user actions",
    icon: "flash-outline",
    color: "#ffa500",
    content: [
      "# Event Handling\n\nBots can respond to various Discord events automatically.",
      "## Common Events\n\n• `guildMemberAdd` - New member joins\n• `guildMemberRemove` - Member leaves\n• `messageCreate` - New message sent\n• `voiceStateUpdate` - Voice channel changes",
      "## Event Structure\n\n```javascript\nevents: {\n  guildMemberAdd: async (member) => {\n    const welcomeChannel = member.guild.systemChannel;\n    if (welcomeChannel) {\n      await welcomeChannel.send(`Welcome ${member.user.username}!`);\n    }\n  }\n}\n```",
      "## Member Welcome Example\n\n```javascript\nguildMemberAdd: async (member) => {\n  const embed = {\n    color: 0x00ff00,\n    title: '🎉 Welcome!',\n    description: `Hello ${member.user.username}!`,\n    fields: [\n      {\n        name: 'Getting Started',\n        value: 'Read #rules and introduce yourself!'\n      }\n    ]\n  };\n  \n  await member.guild.systemChannel.send({ embeds: [embed] });\n}\n```"
    ],
  },
  {
    id: "testing",
    title: "Testing & Debugging",
    description: "Test your bot safely before deployment",
    icon: "bug-outline",
    color: "#f04747",
    content: [
      "# Testing & Debugging\n\nUse the playground to test your bot safely.",
      "## Playground Features\n\n• Simulate Discord events\n• Test commands without a real server\n• View console output and errors\n• Quick command testing",
      "## Debugging Tips\n\n1. **Use Console Logs**\n   ```javascript\n   console.log('Debug:', variable);\n   ```\n\n2. **Check Permissions**\n   Ensure your bot has the right permissions\n\n3. **Test Edge Cases**\n   What happens with empty commands?",
      "## Common Issues\n\n**Bot Not Responding**\n• Check if bot is online\n• Verify command syntax\n• Check permissions\n\n**Commands Not Working**\n• Ensure proper command structure\n• Check for syntax errors\n• Test in playground first"
    ],
  },
  {
    id: "deployment",
    title: "Deployment",
    description: "Deploy your bot to production",
    icon: "cloud-upload-outline",
    color: "#8b5cf6",
    content: [
      "# Bot Deployment\n\nDeploy your bot to production when it's ready.",
      "## Pre-Deployment Checklist\n\n✓ Bot tested in playground\n✓ All commands working properly\n✓ Error handling implemented\n✓ Permissions configured\n✓ Bot token secured",
      "## Deployment Process\n\n1. Click 'Deploy' in the editor\n2. Confirm deployment settings\n3. Monitor bot status\n4. Test in production server",
      "## Best Practices\n\n• **Security**: Never share your bot token\n• **Monitoring**: Check logs regularly\n• **Updates**: Test changes in staging first\n• **Backups**: Keep copies of working code"
    ],
  },
  {
    id: "examples",
    title: "Code Examples",
    description: "Ready-to-use bot examples and templates",
    icon: "code-slash-outline",
    color: "#10b981",
    content: [
      "# Code Examples\n\nCollection of useful bot examples and snippets.",
      "## Moderation Bot Example\n\n```javascript\nconst moderationBot = {\n  name: 'ModBot',\n  commands: {\n    kick: {\n      permissions: ['KICK_MEMBERS'],\n      execute: async (message, args) => {\n        const user = message.mentions.users.first();\n        if (!user) return message.reply('Please mention a user');\n        \n        await message.guild.members.kick(user);\n        await message.reply(`${user.tag} has been kicked`);\n      }\n    }\n  }\n};\n```",
      "## Music Bot Example\n\n```javascript\nconst musicBot = {\n  name: 'MusicBot',\n  commands: {\n    play: {\n      execute: async (message, args) => {\n        const query = args.join(' ');\n        if (!query) return message.reply('Please provide a song');\n        \n        await message.reply(`🎵 Playing: ${query}`);\n        // Music playing logic here\n      }\n    }\n  }\n};\n```",
      "## Utility Functions\n\n```javascript\n// Generate random number\nfunction randomNumber(min, max) {\n  return Math.floor(Math.random() * (max - min + 1)) + min;\n}\n\n// Format timestamp\nfunction formatTime(date) {\n  return new Intl.DateTimeFormat('en-US', {\n    hour: '2-digit',\n    minute: '2-digit'\n  }).format(date);\n}\n```"
    ],
  },
];

export default function DocsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedSection, setSelectedSection] = useState<DocSection | null>(null);

  const colors = {
    background: isDark ? "#1e1f22" : "#ffffff",
    surface: isDark ? "#2b2d31" : "#f8f9fa",
    border: isDark ? "#3c4043" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#1f2937",
    textSecondary: isDark ? "#b9bbbe" : "#6b7280",
    accent: "#5865f2",
  };

  const renderDocContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <Text key={index} className="text-xl font-bold mb-3 mt-4" style={{ color: colors.text }}>
            {line.substring(2)}
          </Text>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={index} className="text-lg font-semibold mb-2 mt-3" style={{ color: colors.text }}>
            {line.substring(3)}
          </Text>
        );
      }
      if (line.startsWith('```')) {
        return <View key={index} className="mb-2" />;
      }
      if (line.startsWith('• ') || line.startsWith('✓ ')) {
        return (
          <Text key={index} className="text-sm mb-1 ml-4" style={{ color: colors.textSecondary }}>
            {line}
          </Text>
        );
      }
      if (line.trim() === '') {
        return <View key={index} className="mb-2" />;
      }

      return (
        <Text key={index} className="text-sm mb-2 leading-5" style={{ color: colors.textSecondary }}>
          {line}
        </Text>
      );
    });
  };

  if (selectedSection) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b"
              style={{ borderBottomColor: colors.border }}>
          <TouchableOpacity
            onPress={() => setSelectedSection(null)}
            className="mr-3 p-2 rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: selectedSection.color + "20" }}
            >
              <Ionicons name={selectedSection.icon as any} size={18} color={selectedSection.color} />
            </View>
            <Text className="text-lg font-semibold" style={{ color: colors.text }}>
              {selectedSection.title}
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          {selectedSection.content.map((section, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 100).duration(400)}
              className="mb-6"
            >
              {renderDocContent(section)}
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

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
              Bot Development Docs
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              Learn how to build amazing bots
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/bot-dev/playground")}
          className="p-2 rounded-lg"
          style={{ backgroundColor: colors.accent }}
        >
          <Ionicons name="play-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Documentation Sections */}
      <ScrollView className="flex-1 p-4">
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="mb-6"
        >
          <Text className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
            Bot Development Guide
          </Text>
          <Text className="text-base leading-6" style={{ color: colors.textSecondary }}>
            Everything you need to know to build, test, and deploy Discord bots using the Hearth Mobile Bot Development Kit.
          </Text>
        </Animated.View>

        <FlatList
          data={DOC_SECTIONS}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 16 }}
          renderItem={({ item: section, index }) => (
            <Animated.View
              entering={FadeInDown.delay(100 + index * 50).duration(400)}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedSection(section)}
              >
                <Card className={isDark ? "bg-dark-800 border-dark-700" : "bg-white border-gray-200"}>
                  <View className="flex-row items-center">
                    <View
                      className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                      style={{ backgroundColor: section.color + "20" }}
                    >
                      <Ionicons name={section.icon as any} size={24} color={section.color} />
                    </View>

                    <View className="flex-1">
                      <Text className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                        {section.title}
                      </Text>
                      <Text className={`text-sm ${isDark ? "text-dark-300" : "text-gray-600"}`}>
                        {section.description}
                      </Text>
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

        {/* Quick Links */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          className="mt-8 p-6 rounded-xl border"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
            Quick Actions
          </Text>

          <View className="gap-3">
            <TouchableOpacity
              onPress={() => router.push("/bot-dev")}
              className="flex-row items-center p-3 rounded-lg"
              style={{ backgroundColor: colors.accent + "20" }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              <Text className="ml-3 font-medium" style={{ color: colors.accent }}>
                Create New Bot
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/bot-dev/playground")}
              className="flex-row items-center p-3 rounded-lg"
              style={{ backgroundColor: "#00d26a20" }}
            >
              <Ionicons name="play-outline" size={20} color="#00d26a" />
              <Text className="ml-3 font-medium" style={{ color: "#00d26a" }}>
                Open Playground
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}