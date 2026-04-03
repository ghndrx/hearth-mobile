/**
 * Camera Main Screen - MS-002
 * Entry point for camera functionality
 */

import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AdvancedCameraView, type CameraResult } from '../../components/camera';

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialMode = typeof params.mode === 'string' ? params.mode as 'photo' | 'video' : 'photo';

  const handleCapture = (result: CameraResult) => {
    // Handle the captured result
    console.log('Captured:', result);

    // Navigate back or to editing screen based on type
    if (result.type === 'photo') {
      router.push({
        pathname: '/camera/edit',
        params: { uri: result.uri, type: result.type },
      });
    } else {
      // For video, just go back for now
      router.back();
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  return (
    <AdvancedCameraView
      onCapture={handleCapture}
      onDismiss={handleDismiss}
      initialMode={initialMode}
      allowModeSwitch={true}
      showEditingOptions={true}
    />
  );
}