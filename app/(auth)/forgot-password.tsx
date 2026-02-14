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
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Alert } from "../../components/ui";

interface FormErrors {
  email?: string;
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

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
    } catch (error) {
      setErrors({
        general: "Failed to send reset link. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
        <View className="flex-1 items-center justify-center px-6">
          <View
            className={`
              w-20 h-20 
              rounded-full 
              items-center 
              justify-center 
              mb-6
              ${isDark ? "bg-green-500/20" : "bg-green-100"}
            `}
          >
            <Ionicons name="checkmark" size={40} color="#22c55e" />
          </View>
          <Text
            className={`text-2xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Check your email
          </Text>
          <Text
            className={`text-base text-center mb-8 ${
              isDark ? "text-dark-200" : "text-gray-600"
            }`}
          >
            We've sent a password reset link to{"\n"}
            <Text className="font-semibold">{email}</Text>
          </Text>
          <Link href="/(auth)/login" asChild>
            <Text className="text-brand font-semibold text-base">
              Back to Sign In
            </Text>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

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
                bg-brand
              `}
            >
              <Ionicons name="lock-closed" size={40} color="white" />
            </View>
            <Text
              className={`text-3xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Forgot password?
            </Text>
            <Text
              className={`text-base text-center ${
                isDark ? "text-dark-200" : "text-gray-600"
              }`}
            >
              Enter your email and we'll send you{"\n"}a reset link
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
            onChangeText={setEmail}
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

          <Button
            title="Send Reset Link"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            fullWidth
            size="lg"
            className="mb-6"
          />

          <View className="flex-row justify-center">
            <Text className={isDark ? "text-dark-200" : "text-gray-600"}>
              Remember your password?{" "}
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
