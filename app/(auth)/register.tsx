import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../lib/stores/auth';

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

function validateUsername(username: string): string | undefined {
  if (!username.trim()) {
    return 'Username is required';
  }
  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  if (username.length > 32) {
    return 'Username must be 32 characters or less';
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return undefined;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return undefined;
}

function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return undefined;
}

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      confirmPassword
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
      // TODO: Replace with actual API call
      // Simulating API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful registration and auto-login
      await login('mock_token_123', {
        id: '1',
        username: username,
        displayName: username,
      });

      router.replace('/(tabs)');
    } catch (error) {
      setErrors({
        general: 'Registration failed. Please try again.',
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
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1e1f22]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-10">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Create account
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-400">
              Join Hearth and start connecting
            </Text>
          </View>

          {errors.general && (
            <View className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <Text className="text-red-500 text-center text-sm">
                {errors.general}
              </Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </Text>
            <TextInput
              className={`bg-gray-100 dark:bg-[#2b2d31] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base ${
                errors.username
                  ? 'border-2 border-red-500'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
              placeholder="Choose a username"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                clearFieldError('username');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username-new"
              editable={!isSubmitting}
            />
            {errors.username && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.username}
              </Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </Text>
            <TextInput
              className={`bg-gray-100 dark:bg-[#2b2d31] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base ${
                errors.email
                  ? 'border-2 border-red-500'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!isSubmitting}
            />
            {errors.email && (
              <Text className="text-red-500 text-sm mt-1">{errors.email}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </Text>
            <TextInput
              className={`bg-gray-100 dark:bg-[#2b2d31] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base ${
                errors.password
                  ? 'border-2 border-red-500'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
              placeholder="Create a password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
              editable={!isSubmitting}
            />
            {errors.password && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.password}
              </Text>
            )}
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Must be 8+ characters with uppercase, lowercase, and number
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </Text>
            <TextInput
              className={`bg-gray-100 dark:bg-[#2b2d31] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base ${
                errors.confirmPassword
                  ? 'border-2 border-red-500'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
              placeholder="Confirm your password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearFieldError('confirmPassword');
              }}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
              editable={!isSubmitting}
            />
            {errors.confirmPassword && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </Text>
            )}
          </View>

          <TouchableOpacity
            className={`rounded-lg py-4 items-center mb-6 ${
              isSubmitting ? 'bg-[#4752c4]' : 'bg-[#5865f2] active:bg-[#4752c4]'
            }`}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center">
            <Text className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity disabled={isSubmitting}>
                <Text className="text-[#5865f2] font-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
