/**
 * Call Handoff Button Component (Stub)
 * CDH-001: Real-time device discovery and registration
 */

import React from "react";
import { TouchableOpacity, Text } from "react-native";
import type { UserDevice, CallState, DeviceCapabilities } from "../../lib/types/callHandoff";

interface CallHandoffButtonProps {
  callState: CallState;
  requiredCapabilities?: Partial<DeviceCapabilities>;
  variant?: "floating" | "inline" | "compact";
  onHandoffStarted?: (device: UserDevice) => void;
  onHandoffCompleted?: (device: UserDevice) => void;
  hideWhenUnavailable?: boolean;
  className?: string;
}

export function CallHandoffButton({ variant = "floating", onHandoffStarted }: CallHandoffButtonProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        // Stub implementation
        const mockDevice = { id: "mock", name: "Mock Device" } as UserDevice;
        onHandoffStarted?.(mockDevice);
      }}
    >
      <Text>Handoff ({variant})</Text>
    </TouchableOpacity>
  );
}

export function QuickHandoffButton({ onHandoff }: { callState: CallState; onHandoff?: (device: UserDevice) => void }) {
  return (
    <TouchableOpacity
      onPress={() => {
        const mockDevice = { id: "mock", name: "Mock Device" } as UserDevice;
        onHandoff?.(mockDevice);
      }}
    >
      <Text>Quick Handoff</Text>
    </TouchableOpacity>
  );
}