import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity} from "react-native";
import { useColorScheme } from "../../lib/hooks/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../lib/stores/auth";
import { Button, Alert } from "../../components/ui";
import * as authService from "../../lib/services/auth";
import { AnimatedView, ShakeAnimation } from "../../components/animations";

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { email } = useLocalSearchParams<{ email: string }>();
  const login = useAuthStore((state) => state.login);

  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const triggerShake = () => {
    setShakeTrigger(true);
    setTimeout(() => setShakeTrigger(false), 500);
  };

  const handleCodeChange = (text: string, index: number) => {
    setError(null);

    // Handle paste of full code
    if (text.length > 1) {
      const pasted = text.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
      const newCode = [...code];
      for (let i = 0; i < pasted.length && index + i < CODE_LENGTH; i++) {
        newCode[index + i] = pasted[i];
      }
      setCode(newCode);
      const nextIndex = Math.min(index + pasted.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = text.replace(/[^0-9]/g, "");
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < CODE_LENGTH) {
      setError("Please enter the full verification code");
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authService.verifyEmail(email || "", fullCode);

      if (response.error) {
        setError(authService.getAuthErrorMessage(response.error.code));
        triggerShake();
        return;
      }

      if (response.data?.token && response.data?.user) {
        await login(response.data.token, response.data.user);
        router.replace("/(tabs)");
      } else {
        // Verification succeeded but no auto-login
        router.replace("/(auth)/login");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      const response = await authService.resendVerificationEmail(email || "");
      if (response.error) {
        setError(authService.getAuthErrorMessage(response.error.code));
        return;
      }
      setResendCooldown(60);
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark-900" : "bg-white"}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center px-6">
          <AnimatedView animation="zoom" delay={0} className="items-center mb-10">
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
              <Ionicons name="mail-open" size={40} color="white" />
            </View>
            <Text
              className={`text-3xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Verify your email
            </Text>
            <Text
              className={`text-base text-center ${
                isDark ? "text-dark-200" : "text-gray-600"
              }`}
            >
              We sent a code to{"\n"}
              <Text className="font-semibold">{email}</Text>
            </Text>
          </AnimatedView>

          {error && (
            <AnimatedView animation="fade" className="mb-6 w-full">
              <Alert
                variant="error"
                message={error}
                onClose={() => setError(null)}
              />
            </AnimatedView>
          )}

          <ShakeAnimation trigger={shakeTrigger}>
            <AnimatedView animation="slide-up" delay={200}>
              <View className="flex-row justify-center space-x-3 mb-8">
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={({ nativeEvent }) =>
                      handleKeyPress(nativeEvent.key, index)
                    }
                    keyboardType="number-pad"
                    maxLength={index === 0 ? CODE_LENGTH : 1}
                    editable={!isSubmitting}
                    className={`
                      w-12 h-14
                      text-center text-2xl font-bold
                      rounded-xl border-2
                      ${
                        digit
                          ? isDark
                            ? "border-brand bg-dark-800 text-white"
                            : "border-brand bg-white text-gray-900"
                          : isDark
                            ? "border-dark-600 bg-dark-800 text-white"
                            : "border-gray-300 bg-gray-50 text-gray-900"
                      }
                    `}
                    selectTextOnFocus
                  />
                ))}
              </View>
            </AnimatedView>
          </ShakeAnimation>

          <AnimatedView animation="slide-up" delay={300} className="w-full">
            <Button
              title="Verify Email"
              onPress={handleVerify}
              isLoading={isSubmitting}
              fullWidth
              size="lg"
              className="mb-6"
            />
          </AnimatedView>

          <AnimatedView animation="fade" delay={400}>
            <View className="items-center">
              <Text className={isDark ? "text-dark-200" : "text-gray-600"}>
                Didn&apos;t receive the code?
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendCooldown > 0}
                className="mt-2"
              >
                <Text
                  className={`font-semibold ${
                    resendCooldown > 0
                      ? isDark
                        ? "text-dark-400"
                        : "text-gray-400"
                      : "text-brand"
                  }`}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"}
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
