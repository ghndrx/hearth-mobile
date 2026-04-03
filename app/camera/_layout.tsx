/**
 * Camera Layout - MS-002
 * Layout for camera-related screens
 */

import { Stack } from 'expo-router';

export default function CameraLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
    </Stack>
  );
}