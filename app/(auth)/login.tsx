import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../lib/stores/auth";
import { Button, Input, PasswordInput, Alert } from "../../components/ui";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return undefined;
}

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((state) => state.login);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await login("mock_token_123", {
        id: "1",
        username: "user",
        displayName: "User",
        email: email,
      });

      router.replace("/(tabs)");
    } catch (error) {
      setErrors({
        general: "Invalid email or password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-10">
            <View
              className={`
                w-20 h-20 
                rounded-2xl 
                items-center 
                justify-center 
                mb-4
                ${isDark ? "bg-brand" : "bg-brand"}
              `}
            >
              <Ionicons name="chatbubbles" size={40} color="white" />
            </View>
            <Text
              className={`text-3xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Welcome back
            </Text>
            <Text
              className={`text-base ${isDark ? "text-dark-200" : "text-gray-600"}`}
            >
              Sign in to continue to Hearth
            </Text>
          </View>

          {errors.general && (
            <View className="mb-6">
              <Alert
                variant="error"
                message={errors.general}
                onClose={() =>
                  setErrors((prev) => ({ ...prev, general: undefined }))
                }
              />
            </View>
          )}

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearFieldError("email");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!isSubmitting}
            error={errors.email}
            leftIcon={
              <Ionicons
                name="mail-outline"
                size={20}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            }
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearFieldError("password");
            }}
            autoComplete="password"
            editable={!isSubmitting}
            error={errors.password}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Text className="text-brand text-sm mb-6 self-end">
              Forgot password?
            </Text>
          </Link>

          <Button
            title="Sign In"
            onPress={handleLogin}
            isLoading={isSubmitting}
            fullWidth
            size="lg"
            className="mb-6"
          />

          <View className="flex-row justify-center">
            <Text className={isDark ? "text-dark-200" : "text-gray-600"}>
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Text className="text-brand font-semibold">Sign Up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
