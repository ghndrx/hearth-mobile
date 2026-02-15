import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuthStore } from "../../lib/stores/auth";
import { Button, Input, PasswordInput, Alert } from "../../components/ui";
import * as authService from "../../lib/services/auth";

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
      const response = await authService.login(email, password);

      if (response.error) {
        setErrors({
          general: authService.getAuthErrorMessage(response.error.code),
        });
        return;
      }

      if (response.data) {
        await login(response.data.token, response.data.user);
        router.replace("/(tabs)");
      }
    } catch (error) {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setErrors({
          general: "Biometric authentication is not available on this device.",
        });
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setErrors({
          general:
            "No biometric credentials found. Please set up biometrics first.",
        });
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to login",
        fallbackLabel: "Use password",
      });

      if (result.success) {
        // Biometric login would use stored credentials
        // For now, show a message that this requires a saved session
        setErrors({
          general: "Please log in with email and password first to enable biometric login.",
        });
      }
    } catch (error) {
      setErrors({
        general: "Biometric authentication failed. Please try again.",
      });
    }
  };

  const handleSocialLogin = (_provider: string) => {
    // OAuth not yet implemented on backend
    setErrors({
      general: "Social login is not yet available.",
    });
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
            className="mb-4"
          />

          <TouchableOpacity
            onPress={handleBiometricLogin}
            className={`
              flex-row items-center justify-center 
              py-3 px-4 rounded-xl mb-6
              ${isDark ? "bg-dark-800" : "bg-gray-100"}
            `}
          >
            <Ionicons
              name="finger-print-outline"
              size={24}
              color={isDark ? "#80848e" : "#6b7280"}
            />
            <Text
              className={`ml-2 font-medium ${
                isDark ? "text-dark-200" : "text-gray-600"
              }`}
            >
              Login with Biometrics
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-6">
            <View
              className={`flex-1 h-px ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
            />
            <Text
              className={`mx-4 text-sm ${isDark ? "text-dark-400" : "text-gray-400"}`}
            >
              or continue with
            </Text>
            <View
              className={`flex-1 h-px ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
            />
          </View>

          <View className="flex-row justify-center space-x-4 mb-6">
            <TouchableOpacity
              onPress={() => handleSocialLogin("google")}
              disabled={isSubmitting}
              className={`
                w-14 h-14 rounded-full items-center justify-center
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <Ionicons name="logo-google" size={24} color="#DB4437" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSocialLogin("apple")}
              disabled={isSubmitting}
              className={`
                w-14 h-14 rounded-full items-center justify-center
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <Ionicons
                name="logo-apple"
                size={24}
                color={isDark ? "#ffffff" : "#000000"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSocialLogin("discord")}
              disabled={isSubmitting}
              className={`
                w-14 h-14 rounded-full items-center justify-center
                ${isDark ? "bg-dark-800" : "bg-white"}
                border ${isDark ? "border-dark-700" : "border-gray-200"}
              `}
            >
              <Ionicons name="logo-discord" size={24} color="#5865F2" />
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center">
            <Text className={isDark ? "text-dark-200" : "text-gray-600"}>
              Don&apos;t have an account?{" "}
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
