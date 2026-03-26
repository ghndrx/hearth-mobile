/**
 * User Device Card Component (Stub)
 * CDH-001: Real-time device discovery and registration
 */

import React from "react";
import { View, Text } from "react-native";
import type { UserDevice } from "../../lib/types/callHandoff";

interface UserDeviceCardProps {
  device: UserDevice;
  onPress?: (device: UserDevice) => void;
  onHandoff?: (device: UserDevice) => void;
  showHandoffButton?: boolean;
  compact?: boolean;
}

export function UserDeviceCard({ device }: UserDeviceCardProps) {
  return (
    <View>
      <Text>{device.name}</Text>
    </View>
  );
}