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
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, PasswordInput, Alert } from "../../components/ui";
import * as authService from "../../lib/services/auth";
import { AnimatedView, ShakeAnimation } from "../../components/animations";

interface FormErrors {
  code?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

function validateCode(code: string): string | undefined {
  if (!code.trim()) {
    return "Verification code is required";
  }
  if (code.trim().length < 6) {
    return "Code must be at least 6 characters";
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
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return undefined;
}

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(false);

  const triggerShake = () => {
    setShakeTrigger(true);
    setTimeout(() => setShakeTrigger(false), 500);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const codeError = validateCode(code);
    if (codeError) newErrors.code = codeError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword
    );
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await authService.resetPassword(
        email || "",
        code.trim(),
        password
      );

      if (response.error) {
        setErrors({
          general: authService.getAuthErrorMessage(response.error.code),
        });
        triggerShake();
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
        <View className="flex-1 items-center justify-center px-6">
          <AnimatedView animation="zoom" className="items-center">
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
              Password reset!
            </Text>
            <Text
              className={`text-base text-center mb-8 ${
                isDark ? "text-dark-200" : "text-gray-600"
              }`}
            >
              Your password has been changed successfully.{"\n"}You can now sign
              in with your new password.
            </Text>
            <Button
              title="Sign In"
              onPress={() => router.replace("/(auth)/login")}
              fullWidth
              size="lg"
            />
          </AnimatedView>
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
          <AnimatedView animation="zoom" delay={0} className="items-center mb-10">
            <View className="w-20 h-20 rounded-2xl items-center justify-center mb-4 bg-brand">
              <Ionicons name="key" size={40} color="white" />
            </View>
            <Text
              className={`text-3xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Reset password
            </Text>
            <Text
              className={`text-base text-center ${
                isDark ? "text-dark-200" : "text-gray-600"
              }`}
            >
              Enter the code from your email{"\n"}and choose a new password
            </Text>
          </AnimatedView>

          <ShakeAnimation trigger={shakeTrigger}>
            <View>
              {errors.general && (
                <AnimatedView animation="fade" className="mb-6">
                  <Alert
                    variant="error"
                    message={errors.general}
                    onClose={() =>
                      setErrors((prev) => ({ ...prev, general: undefined }))
                    }
                  />
                </AnimatedView>
              )}

              <AnimatedView animation="slide-up" delay={100}>
                <Input
                  label="Reset Code"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChangeText={(text) => {
                    setCode(text);
                    clearFieldError("code");
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  error={errors.code}
                  leftIcon={
                    <Ionicons
                      name="keypad-outline"
                      size={20}
                      color={isDark ? "#80848e" : "#6b7280"}
                    />
                  }
                />
              </AnimatedView>

              <AnimatedView animation="slide-up" delay={200}>
                <PasswordInput
                  label="New Password"
                  placeholder="Enter new password"
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
              </AnimatedView>

              <AnimatedView animation="slide-up" delay={300}>
                <PasswordInput
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearFieldError("confirmPassword");
                  }}
                  autoComplete="password-new"
                  editable={!isSubmitting}
                  error={errors.confirmPassword}
                />
              </AnimatedView>
            </View>
          </ShakeAnimation>

          <AnimatedView animation="slide-up" delay={400}>
            <Button
              title="Reset Password"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              fullWidth
              size="lg"
              className="mb-6"
            />
          </AnimatedView>

          <AnimatedView animation="fade" delay={500}>
            <View className="flex-row justify-center">
              <Text className={isDark ? "text-dark-200" : "text-gray-600"}>
                Remember your password?{" "}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Text className="text-brand font-semibold">Sign In</Text>
              </Link>
            </View>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
