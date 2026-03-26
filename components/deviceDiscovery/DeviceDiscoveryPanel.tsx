/**
 * Device Discovery Panel Component (Stub)
 * CDH-001: Real-time device discovery and registration
 */

import React from "react";
import { View, Text } from "react-native";
import type { UserDevice, CallState, DeviceCapabilities } from "../../lib/types/callHandoff";

interface DeviceDiscoveryPanelProps {
  onDeviceSelect?: (device: UserDevice) => void;
  onCallHandoff?: (device: UserDevice, callState: CallState) => void;
  showHandoffButtons?: boolean;
  currentCallState?: CallState | null;
  requiredCapabilities?: Partial<DeviceCapabilities>;
  filterCurrentDevice?: boolean;
  className?: string;
}

export function DeviceDiscoveryPanel(props: DeviceDiscoveryPanelProps) {
  return (
    <View>
      <Text>Device Discovery Panel</Text>
    </View>
  );
}