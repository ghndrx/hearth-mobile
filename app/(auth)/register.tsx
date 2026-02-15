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
import * as authService from "../../lib/services/auth";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

function validateUsername(username: string): string | undefined {
  if (!username.trim()) {
    return "Username is required";
  }
  if (username.length < 3) {
    return "Username must be at least 3 characters";
  }
  if (username.length > 32) {
    return "Username must be 32 characters or less";
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return undefined;
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
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  return undefined;
}

function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return undefined;
}

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((state) => state.login);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const usernameError = validateUsername(username);
    if (usernameError) newErrors.username = usernameError;

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword,
    );
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // First register the user
      const registerResponse = await authService.register(
        email,
        username,
        password,
        username // displayName defaults to username
      );

      if (registerResponse.error) {
        setErrors({
          general: authService.getAuthErrorMessage(registerResponse.error.code),
        });
        return;
      }

      // If registration returned a token, use it
      if (registerResponse.data?.token) {
        await login(registerResponse.data.token, registerResponse.data.user);
        router.replace("/(tabs)");
        return;
      }

      // Otherwise, log in with the new credentials
      const loginResponse = await authService.login(email, password);

      if (loginResponse.error) {
        // Registration succeeded but login failed - redirect to login page
        setErrors({
          general: "Account created! Please log in.",
        });
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 1500);
        return;
      }

      if (loginResponse.data) {
        await login(loginResponse.data.token, loginResponse.data.user);
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
              <Ionicons name="person-add" size={40} color="white" />
            </View>
            <Text
              className={`text-3xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Create account
            </Text>
            <Text
              className={`text-base ${isDark ? "text-dark-200" : "text-gray-600"}`}
            >
              Join Hearth and start connecting
            </Text>
          </View>

          {errors.general && (
            <View className="mb-6">
              <Alert
                variant={errors.general.includes("created") ? "success" : "error"}
                message={errors.general}
                onClose={() =>
                  setErrors((prev) => ({ ...prev, general: undefined }))
                }
              />
            </View>
          )}

          <Input
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              clearFieldError("username");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username-new"
            editable={!isSubmitting}
            error={errors.username}
            leftIcon={
              <Ionicons
                name="at-outline"
                size={20}
                color={isDark ? "#80848e" : "#6b7280"}
              />
            }
          />

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
            placeholder="Create a password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearFieldError("password");
            }}
            autoComplete="password-new"
            editable={!isSubmitting}
            error={errors.password}
            helperText="Must be 8+ characters with uppercase, lowercase, and number"
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearFieldError("confirmPassword");
            }}
            autoComplete="password-new"
            editable={!isSubmitting}
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            isLoading={isSubmitting}
            fullWidth
            size="lg"
            className="mb-6 mt-2"
          />

          <View className="flex-row justify-center">
            <Text className={isDark ? "text-dark-200" : "text-gray-600"}>
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Text className="text-brand font-semibold">Sign In</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
