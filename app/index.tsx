import { Redirect } from 'expo-router';
import { useAuthStore } from '../lib/stores/auth';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
