/**
 * Tests for Enhanced VoiceContext with Network Intelligence (NET-001)
 *
 * Tests the VoiceContext integration with NetworkIntelligenceEngine
 * for adaptive voice optimization functionality.
 */

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

jest.mock('../../lib/hooks/useNetworkStatus', () => ({
  useNetworkIntelligence: jest.fn(),
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { VoiceProvider, useVoice } from '../../lib/contexts/VoiceContext';
import { useNetworkIntelligence } from '../../lib/hooks/useNetworkStatus';
import { VoiceProfiles } from '../../lib/types/network';
import type { User, Channel } from '../../lib/types';

const mockUseNetworkIntelligence = jest.mocked(useNetworkIntelligence);

// Mock user and channel data
const mockUser: User = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  status: 'online',
};

const mockChannel: Channel = {
  id: 'channel-1',
  name: 'General',
  type: 'voice',
  serverId: 'server-1',
  position: 0,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockNetworkConditions = {
  type: 'wifi' as const,
  strength: 85,
  latency: 45,
  bandwidth: { up: 1000, down: 5000 },
  stability: 90,
  dataLimited: false,
  timestamp: Date.now(),
};

const mockNetworkQuality = {
  score: 90,
  category: 'excellent' as const,
  components: {
    bandwidth: 90,
    latency: 85,
    stability: 90,
    strength: 85,
  },
  recommendedProfile: 'PREMIUM' as keyof typeof VoiceProfiles,
};

describe('VoiceContext with Network Intelligence', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <VoiceProvider currentUser={mockUser}>{children}</VoiceProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default mock for network intelligence
    mockUseNetworkIntelligence.mockReturnValue({
      conditions: mockNetworkConditions,
      quality: mockNetworkQuality,
      voiceProfile: VoiceProfiles.PREMIUM,
      voiceProfileKey: 'PREMIUM',
      isActive: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('enhanced voice context initialization', () => {
    it('should provide enhanced voice context with network intelligence', () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      expect(result.current.networkConditions).toEqual(mockNetworkConditions);
      expect(result.current.networkQuality).toEqual(mockNetworkQuality);
      expect(result.current.voiceProfile).toEqual(VoiceProfiles.PREMIUM);
      expect(result.current.voiceProfileKey).toBe('PREMIUM');
      expect(result.current.isAdaptiveOptimizationEnabled).toBe(true);
    });

    it('should initialize with default voice quality metrics', () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      expect(result.current.voiceQualityMetrics).toEqual({
        bitrate: 64,
        codec: 'opus',
        packetLoss: 0,
        audioQuality: 85,
        isAdaptiveOptimizationActive: false,
        dataUsage: 0,
      });
    });
  });

  describe('voice channel operations with network optimization', () => {
    it('should apply optimal voice profile on channel join', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.currentChannel).toEqual({
        channel: mockChannel,
        serverName: 'Test Server',
        serverId: 'server-1',
      });

      // Should apply the premium profile based on network conditions
      expect(result.current.voiceQualityMetrics.bitrate).toBe(96); // Premium bitrate
      expect(result.current.voiceQualityMetrics.codec).toBe('opus');
    });

    it('should track data usage during voice session', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      // Simulate some time passing for data usage calculation
      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
      });

      expect(result.current.voiceQualityMetrics.dataUsage).toBeGreaterThan(0);
    });

    it('should reset metrics on channel leave', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      act(() => {
        jest.advanceTimersByTime(1000); // Let some data usage accumulate
      });

      act(() => {
        result.current.leaveChannel();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.voiceQualityMetrics.dataUsage).toBe(0);
      expect(result.current.connectionQuality).toBe('disconnected');
    });
  });

  describe('adaptive voice optimization', () => {
    it('should automatically apply profile changes based on network conditions', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      // Simulate network degradation
      mockUseNetworkIntelligence.mockReturnValue({
        conditions: {
          ...mockNetworkConditions,
          type: 'cellular',
          bandwidth: { up: 100, down: 500 },
        },
        quality: {
          ...mockNetworkQuality,
          score: 60,
          category: 'good',
          recommendedProfile: 'STANDARD',
        },
        voiceProfile: VoiceProfiles.STANDARD,
        voiceProfileKey: 'STANDARD',
        isActive: true,
      });

      // Force re-render with new network conditions
      const { rerender } = renderHook(() => useVoice(), { wrapper });
      rerender();

      expect(result.current.voiceProfile).toEqual(VoiceProfiles.STANDARD);
      expect(result.current.voiceProfileKey).toBe('STANDARD');
    });

    it('should allow manual voice profile override', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      act(() => {
        result.current.forceVoiceProfile('EFFICIENT');
      });

      expect(result.current.voiceProfileKey).toBe('EFFICIENT');
      expect(result.current.voiceProfile).toEqual(VoiceProfiles.EFFICIENT);
      expect(result.current.voiceQualityMetrics.bitrate).toBe(32); // Efficient bitrate
      expect(result.current.voiceQualityMetrics.codec).toBe('silk');
    });

    it('should respect forced profile over automatic optimization', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      // Force a specific profile
      act(() => {
        result.current.forceVoiceProfile('SURVIVAL');
      });

      // Even with excellent network conditions, should maintain forced profile
      expect(result.current.voiceProfileKey).toBe('SURVIVAL');
      expect(result.current.voiceProfile).toEqual(VoiceProfiles.SURVIVAL);
    });

    it('should enable and disable adaptive optimization', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      expect(result.current.isAdaptiveOptimizationEnabled).toBe(true);

      act(() => {
        result.current.disableAdaptiveOptimization();
      });

      expect(result.current.isAdaptiveOptimizationEnabled).toBe(false);

      act(() => {
        result.current.enableAdaptiveOptimization();
      });

      expect(result.current.isAdaptiveOptimizationEnabled).toBe(true);
    });

    it('should clear forced profile when enabling adaptive optimization', () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      // Force a profile
      act(() => {
        result.current.forceVoiceProfile('SURVIVAL');
      });

      expect(result.current.voiceProfileKey).toBe('SURVIVAL');

      // Enable adaptive optimization should clear forced profile
      act(() => {
        result.current.enableAdaptiveOptimization();
      });

      // Should return to automatic profile based on network conditions
      expect(result.current.voiceProfileKey).toBe('PREMIUM');
    });
  });

  describe('network condition responses', () => {
    it('should update connection quality based on network conditions', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      // Excellent network should give excellent quality
      expect(result.current.connectionQuality).toBe('excellent');

      // Simulate poor network conditions
      mockUseNetworkIntelligence.mockReturnValue({
        conditions: {
          ...mockNetworkConditions,
          bandwidth: { up: 50, down: 100 },
          latency: 250,
          stability: 30,
        },
        quality: {
          ...mockNetworkQuality,
          score: 30,
          category: 'poor',
        },
        voiceProfile: VoiceProfiles.SURVIVAL,
        voiceProfileKey: 'SURVIVAL',
        isActive: true,
      });

      // Force re-render
      const { rerender } = renderHook(() => useVoice(), { wrapper });
      rerender();

      // Connection quality should degrade
      expect(result.current.connectionQuality).toBe('poor');
    });

    it('should update latency based on network conditions', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      expect(result.current.latency).toBe(45); // From mock network conditions
    });

    it('should simulate packet loss based on network stability', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      // High stability should result in low packet loss
      expect(result.current.voiceQualityMetrics.packetLoss).toBeLessThan(10);

      // Simulate unstable network
      mockUseNetworkIntelligence.mockReturnValue({
        conditions: {
          ...mockNetworkConditions,
          stability: 20, // Very unstable
        },
        quality: mockNetworkQuality,
        voiceProfile: VoiceProfiles.PREMIUM,
        voiceProfileKey: 'PREMIUM',
        isActive: true,
      });

      // Force re-render
      const { rerender } = renderHook(() => useVoice(), { wrapper });
      rerender();

      expect(result.current.voiceQualityMetrics.packetLoss).toBeGreaterThan(5);
    });
  });

  describe('basic voice operations (legacy compatibility)', () => {
    it('should handle mute toggle', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      expect(result.current.voiceState.isMuted).toBe(false);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.voiceState.isMuted).toBe(true);
    });

    it('should handle deafen toggle', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      expect(result.current.voiceState.isDeafened).toBe(false);

      act(() => {
        result.current.toggleDeafen();
      });

      expect(result.current.voiceState.isDeafened).toBe(true);
      expect(result.current.voiceState.isMuted).toBe(true); // Should also mute
    });

    it('should handle participant volume control', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      act(() => {
        result.current.setParticipantVolume('participant-1', 0.5);
      });

      // Should not throw (internal state management)
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle participant mute control', async () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      await act(async () => {
        await result.current.joinChannel(mockChannel, 'Test Server', 'server-1');
      });

      act(() => {
        result.current.setParticipantLocalMute('participant-1', true);
      });

      // Should not throw (internal state management)
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle missing network intelligence gracefully', () => {
      mockUseNetworkIntelligence.mockReturnValue({
        conditions: null,
        quality: null,
        voiceProfile: null,
        voiceProfileKey: null,
        isActive: false,
      });

      const { result } = renderHook(() => useVoice(), { wrapper });

      expect(result.current.networkConditions).toBeNull();
      expect(result.current.networkQuality).toBeNull();
      expect(result.current.voiceProfile).toBeNull();
      expect(result.current.voiceProfileKey).toBeNull();
    });

    it('should not apply profiles when not connected to voice', () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      act(() => {
        result.current.forceVoiceProfile('PREMIUM');
      });

      // Since not connected, metrics should remain default
      expect(result.current.voiceQualityMetrics.bitrate).toBe(64); // Default bitrate
    });
  });

  describe('UI state management', () => {
    it('should handle minimize state', () => {
      const { result } = renderHook(() => useVoice(), { wrapper });

      expect(result.current.isMinimized).toBe(false);

      act(() => {
        result.current.setMinimized(true);
      });

      expect(result.current.isMinimized).toBe(true);
    });
  });
});