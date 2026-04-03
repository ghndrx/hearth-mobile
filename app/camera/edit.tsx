/**
 * Camera Edit Screen - MS-002
 * Full-screen image editing interface
 */

import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ImageEditor } from '../../components/camera';

export default function CameraEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const imageUri = typeof params.uri === 'string' ? params.uri : '';
  const type = typeof params.type === 'string' ? params.type : 'photo';

  if (!imageUri) {
    router.back();
    return null;
  }

  const handleSave = (result: any) => {
    // Navigate back to the calling screen with the edited image
    router.back();
    // TODO: Pass the edited image result back to the calling component
    console.log('Edited image result:', result);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ImageEditor
      imageUri={imageUri}
      onSave={handleSave}
      onCancel={handleCancel}
      allowCrop={true}
      allowRotate={true}
    />
  );
}