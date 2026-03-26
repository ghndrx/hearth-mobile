import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, PasswordInput, Alert } from "../../components/ui";
import * as authService from "../../lib/services/auth";
import { ShakeAnimation } from "../../components/animations";

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

function validateNewPassword(password: string): string | undefined {
  if (!password) {
    return "New password is required";
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

export default function ChangePasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
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

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) newErrors.newPassword = passwordError;

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword =
        "New password must be different from your current password";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

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
      const response = await authService.changePassword(
        currentPassword,
        newPassword
      );

      if (response.error) {
        setErrors({
          general: authService.getAuthErrorMessage(response.error.code),
        });
        triggerShake();
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.back();
      }, 2000);
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

  return (
    <View className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <Stack.Screen
        options={{
          title: "Change Password",
          headerStyle: {
            backgroundColor: isDark ? "#1e1f22" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#1a1a1a",
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-6 py-6"
          keyboardShouldPersistTaps="handled"
        >
          {isSuccess && (
            <Alert
              variant="success"
              title="Password changed"
              message="Your password has been updated successfully."
              className="mb-6"
            />
          )}

          {errors.general && (
            <Alert
              variant="error"
              message={errors.general}
              onClose={() =>
                setErrors((prev) => ({ ...prev, general: undefined }))
              }
              className="mb-6"
            />
          )}

          <ShakeAnimation trigger={shakeTrigger}>
            <View>
              <PasswordInput
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  clearFieldError("currentPassword");
                }}
                autoComplete="password"
                editable={!isSubmitting && !isSuccess}
                error={errors.currentPassword}
              />

              <View className="my-2">
                <View
                  className={`h-px ${isDark ? "bg-dark-700" : "bg-gray-200"}`}
                />
              </View>

              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  clearFieldError("newPassword");
                }}
                autoComplete="password-new"
                editable={!isSubmitting && !isSuccess}
                error={errors.newPassword}
                helperText="Must be 8+ characters with uppercase, lowercase, and number"
              />

              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  clearFieldError("confirmPassword");
                }}
                autoComplete="password-new"
                editable={!isSubmitting && !isSuccess}
                error={errors.confirmPassword}
              />
            </View>
          </ShakeAnimation>

          <Button
            title="Update Password"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSuccess}
            fullWidth
            size="lg"
            className="mt-2"
            leftIcon={
              <Ionicons name="lock-closed-outline" size={20} color="white" />
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
