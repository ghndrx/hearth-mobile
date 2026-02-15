import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Card, ListItem, ListDivider, Badge } from "../../components/ui";

const APP_VERSION = "0.1.0";
const BUILD_NUMBER = "2024.2.14";

export default function AboutScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [tapCount, setTapCount] = useState(0);

  const handleVersionTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 7) {
      Alert.alert("🔥 Developer Mode", "You've unlocked developer options!", [
        { text: "Cool!", style: "default" },
      ]);
      setTapCount(0);
    }
  };

  const handleCopyVersion = async () => {
    const versionString = `Hearth v${APP_VERSION} (${BUILD_NUMBER})`;
    await Clipboard.setStringAsync(versionString);
    Alert.alert("Copied!", "Version info copied to clipboard");
  };

  const legalLinks = [
    {
      icon: "document-text-outline",
      label: "Terms of Service",
      onPress: () => Linking.openURL("https://hearth.chat/terms"),
    },
    {
      icon: "shield-checkmark-outline",
      label: "Privacy Policy",
      onPress: () => Linking.openURL("https://hearth.chat/privacy"),
    },
    {
      icon: "code-slash-outline",
      label: "Open Source Licenses",
      onPress: () => router.push("/settings/licenses"),
    },
  ];

  const socialLinks = [
    {
      icon: "logo-twitter",
      label: "Twitter",
      value: "@hearthchat",
      onPress: () => Linking.openURL("https://twitter.com/hearthchat"),
    },
    {
      icon: "logo-github",
      label: "GitHub",
      value: "hearth-app",
      onPress: () => Linking.openURL("https://github.com/hearth-app"),
    },
    {
      icon: "logo-discord",
      label: "Discord Community",
      value: "Join us",
      onPress: () => Linking.openURL("https://discord.gg/hearth"),
    },
  ];

  const supportLinks = [
    {
      icon: "help-circle-outline",
      label: "Help Center",
      onPress: () => Linking.openURL("https://help.hearth.chat"),
    },
    {
      icon: "bug-outline",
      label: "Report a Bug",
      onPress: () => Linking.openURL("mailto:bugs@hearth.chat"),
    },
    {
      icon: "chatbubble-ellipses-outline",
      label: "Send Feedback",
      onPress: () => Linking.openURL("mailto:feedback@hearth.chat"),
    },
  ];

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-dark-900" : "bg-gray-50"}`}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "About",
          headerTitleStyle: {
            color: isDark ? "#ffffff" : "#111827",
            fontSize: 18,
            fontWeight: "600",
          },
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerLeft: () => (
            <TouchableOpacity className="ml-2" onPress={() => router.back()}>
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* App Branding Section */}
        <View className="items-center pt-8 pb-6">
          <TouchableOpacity
            onPress={handleVersionTap}
            activeOpacity={0.8}
            className={`
              w-24 
              h-24 
              rounded-3xl 
              items-center 
              justify-center
              ${isDark ? "bg-brand-600" : "bg-brand-500"}
              shadow-lg
            `}
          >
            <Ionicons name="flame" size={48} color="white" />
          </TouchableOpacity>

          <Text
            className={`
              text-2xl 
              font-bold 
              mt-4
              ${isDark ? "text-white" : "text-gray-900"}
            `}
          >
            Hearth
          </Text>

          <Text
            className={`
              text-sm
              mt-1
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Bringing people together
          </Text>

          <TouchableOpacity onPress={handleCopyVersion} activeOpacity={0.7}>
            <View className="flex-row items-center mt-3 space-x-2">
              <Badge variant="default" size="sm">
                v{APP_VERSION}
              </Badge>
              <Text
                className={`text-xs ${isDark ? "text-dark-500" : "text-gray-400"}`}
              >
                Build {BUILD_NUMBER}
              </Text>
              <Ionicons
                name="copy-outline"
                size={14}
                color={isDark ? "#5c5f66" : "#9ca3af"}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* What's New Section */}
        <View className="mx-4 mt-2">
          <Card className="p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="sparkles"
                size={20}
                color={isDark ? "#a78bfa" : "#7c3aed"}
              />
              <Text
                className={`
                  text-base
                  font-semibold
                  ml-2
                  ${isDark ? "text-white" : "text-gray-900"}
                `}
              >
                What's New
              </Text>
            </View>
            <Text
              className={`
                text-sm
                leading-5
                ${isDark ? "text-dark-300" : "text-gray-600"}
              `}
            >
              • Enhanced push notifications{"\n"}
              • Improved chat performance{"\n"}
              • New server customization options{"\n"}
              • Bug fixes and stability improvements
            </Text>
            <TouchableOpacity
              className="mt-3"
              onPress={() => Linking.openURL("https://hearth.chat/changelog")}
            >
              <Text className="text-brand-500 font-medium text-sm">
                View full changelog →
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Legal Section */}
        <View className="mx-4 mt-6">
          <Text
            className={`
              text-xs 
              font-semibold 
              uppercase 
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Legal
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
            {legalLinks.map((item, index) => (
              <View key={item.label}>
                <ListItem
                  title={item.label}
                  onPress={item.onPress}
                  showChevron
                  leftIcon={
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < legalLinks.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Support Section */}
        <View className="mx-4 mt-6">
          <Text
            className={`
              text-xs 
              font-semibold 
              uppercase 
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Support
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
            {supportLinks.map((item, index) => (
              <View key={item.label}>
                <ListItem
                  title={item.label}
                  onPress={item.onPress}
                  showChevron
                  leftIcon={
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < supportLinks.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Social Section */}
        <View className="mx-4 mt-6">
          <Text
            className={`
              text-xs 
              font-semibold 
              uppercase 
              mb-2
              ${isDark ? "text-dark-400" : "text-gray-500"}
            `}
          >
            Connect With Us
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
            {socialLinks.map((item, index) => (
              <View key={item.label}>
                <ListItem
                  title={item.label}
                  subtitle={item.value}
                  onPress={item.onPress}
                  showChevron
                  leftIcon={
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
                {index < socialLinks.length - 1 && <ListDivider inset />}
              </View>
            ))}
          </View>
        </View>

        {/* Credits Section */}
        <View className="mx-4 mt-6">
          <Card className="p-4">
            <Text
              className={`
                text-xs
                font-semibold
                uppercase
                mb-2
                ${isDark ? "text-dark-400" : "text-gray-500"}
              `}
            >
              Acknowledgments
            </Text>
            <Text
              className={`
                text-sm
                leading-5
                ${isDark ? "text-dark-300" : "text-gray-600"}
              `}
            >
              Built with ❤️ using React Native, Expo, and NativeWind.
              Thanks to our amazing community of contributors and beta testers.
            </Text>
          </Card>
        </View>

        {/* Footer */}
        <View className="items-center py-8">
          <Text
            className={`
              text-xs
              ${isDark ? "text-dark-500" : "text-gray-400"}
            `}
          >
            © 2024 Hearth. All rights reserved.
          </Text>
          <Text
            className={`
              text-xs
              mt-1
              ${isDark ? "text-dark-600" : "text-gray-300"}
            `}
          >
            Made with 🔥 for communities everywhere
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
