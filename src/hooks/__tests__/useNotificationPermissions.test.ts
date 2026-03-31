/**
 * useNotificationPermissions Hook Tests
 * Tests for notification permissions React hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  useNotificationPermissions,
  useNotificationPermissionStatus,
} from '../useNotificationPermissions';
import { NotificationPermissionStatus } from '../../services/pushNotifications/permissionService';

// Mock the permission service
jest.mock('../../services/pushNotifications/permissionService', () => ({
  NotificationPermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
    BLOCKED: 'blocked',
    UNKNOWN: 'unknown',
  },
  getPermissionStatus: jest.fn(),
  requestPermission: jest.fn(),
  openSettings: jest.fn(),
  areNotificationsEnabled: jest.fn(),
  getPermissionDescription: jest.fn(),
}));

// Import the mocked functions
import {
  getPermissionStatus,
  requestPermission,
  openSettings,
  areNotificationsEnabled,
  getPermissionDescription,
} from '../../services/pushNotifications/permissionService';

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('useNotificationPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPermissionStatus).mockResolvedValue(NotificationPermissionStatus.UNDETERMINED);
    jest.mocked(areNotificationsEnabled).mockResolvedValue(false);
    jest.mocked(getPermissionDescription).mockReturnValue('Test description');
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useNotificationPermissions());

      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.state.status).toBe(NotificationPermissionStatus.UNKNOWN);
      expect(result.current.state.isEnabled).toBe(false);
      expect(result.current.state.error).toBe(null);
    });

    it('should check permission status on mount', async () => {
      jest.mocked(getPermissionStatus).mockResolvedValue(NotificationPermissionStatus.GRANTED);
      jest.mocked(areNotificationsEnabled).mockResolvedValue(true);
      jest.mocked(getPermissionDescription).mockReturnValue('Notifications enabled');

      const { result } = renderHook(() => useNotificationPermissions());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.status).toBe(NotificationPermissionStatus.GRANTED);
      expect(result.current.state.isEnabled).toBe(true);
      expect(result.current.state.description).toBe('Notifications enabled');
      expect(result.current.state.error).toBe(null);
    });

    it('should handle permission check error', async () => {
      jest.mocked(getPermissionStatus).mockRejectedValue(new Error('Permission check failed'));

      const { result } = renderHook(() => useNotificationPermissions());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.error).toBe('Permission check failed');
      expect(result.current.state.description).toBe('Unable to check notification status');
    });
  });

  describe('requestPermissions action', () => {
    it('should request permissions successfully', async () => {
      jest.mocked(requestPermission).mockResolvedValue(NotificationPermissionStatus.GRANTED);
      jest.mocked(areNotificationsEnabled).mockResolvedValue(true);
      jest.mocked(getPermissionDescription).mockReturnValue('Permissions granted');

      const { result } = renderHook(() => useNotificationPermissions());

      let permissionStatus: NotificationPermissionStatus;
      await act(async () => {
        permissionStatus = await result.current.actions.requestPermissions();
      });

      expect(permissionStatus!).toBe(NotificationPermissionStatus.GRANTED);
      expect(result.current.state.status).toBe(NotificationPermissionStatus.GRANTED);
      expect(result.current.state.isEnabled).toBe(true);
      expect(result.current.state.description).toBe('Permissions granted');
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should handle permission request error', async () => {
      jest.mocked(requestPermission).mockRejectedValue(new Error('Request failed'));

      const { result } = renderHook(() => useNotificationPermissions());

      await expect(
        act(async () => {
          await result.current.actions.requestPermissions();
        })
      ).rejects.toThrow('Request failed');

      expect(result.current.state.error).toBe('Request failed');
      expect(result.current.state.description).toBe('Failed to request notification permissions');
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should handle generic error message', async () => {
      jest.mocked(requestPermission).mockRejectedValue('String error');

      const { result } = renderHook(() => useNotificationPermissions());

      await expect(
        act(async () => {
          await result.current.actions.requestPermissions();
        })
      ).rejects.toEqual('String error');

      expect(result.current.state.error).toBe('Failed to request permissions');
    });
  });

  describe('openDeviceSettings action', () => {
    it('should open settings successfully', async () => {
      jest.mocked(openSettings).mockResolvedValue();
      jest.mocked(getPermissionStatus).mockResolvedValue(NotificationPermissionStatus.GRANTED);
      jest.mocked(areNotificationsEnabled).mockResolvedValue(true);

      const { result } = renderHook(() => useNotificationPermissions());

      await act(async () => {
        await result.current.actions.openDeviceSettings();
      });

      expect(openSettings).toHaveBeenCalled();
      expect(result.current.state.error).toBe(null);

      // Wait for the delayed status check
      await waitFor(() => {
        expect(getPermissionStatus).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should handle settings open error', async () => {
      jest.mocked(openSettings).mockRejectedValue(new Error('Settings failed'));

      const { result } = renderHook(() => useNotificationPermissions());

      await expect(
        act(async () => {
          await result.current.actions.openDeviceSettings();
        })
      ).rejects.toThrow('Settings failed');

      expect(result.current.state.error).toBe('Settings failed');
    });

    it('should handle generic settings error', async () => {
      jest.mocked(openSettings).mockRejectedValue('String error');

      const { result } = renderHook(() => useNotificationPermissions());

      await expect(
        act(async () => {
          await result.current.actions.openDeviceSettings();
        })
      ).rejects.toEqual('String error');

      expect(result.current.state.error).toBe('Failed to open settings');
    });
  });

  describe('checkStatus action', () => {
    it('should refresh status successfully', async () => {
      jest.mocked(getPermissionStatus).mockResolvedValue(NotificationPermissionStatus.GRANTED);
      jest.mocked(areNotificationsEnabled).mockResolvedValue(true);
      jest.mocked(getPermissionDescription).mockReturnValue('Status refreshed');

      const { result } = renderHook(() => useNotificationPermissions());

      await act(async () => {
        await result.current.actions.checkStatus();
      });

      expect(result.current.state.status).toBe(NotificationPermissionStatus.GRANTED);
      expect(result.current.state.isEnabled).toBe(true);
      expect(result.current.state.description).toBe('Status refreshed');
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should handle status check error', async () => {
      jest.mocked(getPermissionStatus).mockRejectedValue(new Error('Status check failed'));

      const { result } = renderHook(() => useNotificationPermissions());

      await act(async () => {
        await result.current.actions.checkStatus();
      });

      expect(result.current.state.error).toBe('Status check failed');
      expect(result.current.state.description).toBe('Unable to check notification status');
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('clearError action', () => {
    it('should clear error state', async () => {
      // First set an error
      jest.mocked(getPermissionStatus).mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useNotificationPermissions());

      await waitFor(() => {
        expect(result.current.state.error).toBe('Test error');
      });

      // Then clear it
      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBe(null);
    });
  });
});

describe('useNotificationPermissionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return permission status and loading state', async () => {
    jest.mocked(getPermissionStatus).mockResolvedValue(NotificationPermissionStatus.GRANTED);

    const { result } = renderHook(() => useNotificationPermissionStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe(NotificationPermissionStatus.UNKNOWN);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe(NotificationPermissionStatus.GRANTED);
  });

  it('should handle permission status error', async () => {
    jest.mocked(getPermissionStatus).mockRejectedValue(new Error('Status failed'));

    const { result } = renderHook(() => useNotificationPermissionStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe(NotificationPermissionStatus.UNKNOWN);
  });

  it('should cleanup properly on unmount', async () => {
    jest.mocked(getPermissionStatus).mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve(NotificationPermissionStatus.GRANTED), 100)
      )
    );

    const { unmount } = renderHook(() => useNotificationPermissionStatus());

    // Unmount before the async operation completes
    unmount();

    // Wait to ensure the async operation would have completed
    await new Promise(resolve => setTimeout(resolve, 150));

    // No state updates should occur after unmount
    // This test mainly ensures no React warnings about state updates on unmounted components
  });
});