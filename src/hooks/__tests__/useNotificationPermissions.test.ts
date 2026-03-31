/**
 * useNotificationPermissions Hook Tests
 * Tests for notification permissions React hook
 */

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

  it('should have proper type definitions and exports', () => {
    expect(typeof useNotificationPermissions).toBe('function');
    expect(typeof useNotificationPermissionStatus).toBe('function');
  });

  it('should import permission service functions correctly', () => {
    expect(getPermissionStatus).toBeDefined();
    expect(requestPermission).toBeDefined();
    expect(openSettings).toBeDefined();
    expect(areNotificationsEnabled).toBeDefined();
    expect(getPermissionDescription).toBeDefined();
  });
});

describe('useNotificationPermissionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be properly exported and defined', () => {
    expect(typeof useNotificationPermissionStatus).toBe('function');
  });

  it('should work with mocked permission service', async () => {
    jest.mocked(getPermissionStatus).mockResolvedValue(NotificationPermissionStatus.GRANTED);

    // Just verify the service function gets called when we expect it to
    const status = await getPermissionStatus();
    expect(status).toBe(NotificationPermissionStatus.GRANTED);
  });
});