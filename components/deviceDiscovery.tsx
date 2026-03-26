/**
 * Temporary stub for device discovery components
 * TODO: Implement proper device discovery components for UI
 */

import React from 'react';
import { View } from 'react-native';
import type { UserDevice, CallState, DeviceCapabilities } from '../lib/types/callHandoff';

interface CallHandoffButtonProps {
  callState: CallState;
  variant?: string;
  requiredCapabilities?: Partial<DeviceCapabilities>;
  className?: string;
  onHandoffStarted?: (device: UserDevice) => void;
}

export const CallHandoffButton: React.FC<CallHandoffButtonProps> = () => {
  // Temporary stub - renders nothing
  return <View style={{ display: 'none' }} />;
};