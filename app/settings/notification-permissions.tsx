/**
 * Notification Permission Setup Screen
 * Dedicated screen for managing notification permissions
 */

import React from 'react';
import { router } from 'expo-router';
import { NotificationPermissionScreen } from '../../src/screens/NotificationPermissionScreen';

export default function NotificationPermissionsRoute() {
  const handlePermissionGranted = () => {
    // Navigate back to previous screen or settings
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings/notifications');
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  };

  return (
    <NotificationPermissionScreen
      onPermissionGranted={handlePermissionGranted}
      onGoBack={handleGoBack}
      showHeader={true}
    />
  );
}