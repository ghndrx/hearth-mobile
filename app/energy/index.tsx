import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PowerManagementDashboard from '../../src/components/power/PowerManagementDashboard';

export default function EnergyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Battery & Performance',
          headerTitleStyle: {
            color: isDark ? '#ffffff' : '#111827',
            fontSize: 18,
            fontWeight: 'bold',
          },
          headerStyle: {
            backgroundColor: isDark ? '#1e1f22' : '#ffffff',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <Ionicons
                name="chevron-back"
                size={28}
                color={isDark ? '#80848e' : '#6b7280'}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <PowerManagementDashboard />
    </>
  );
}