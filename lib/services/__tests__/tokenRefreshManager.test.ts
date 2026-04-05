import TokenRefreshManager from '../tokenRefreshManager';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-notifications', () => ({
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test-token-123]' }),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    sessionId: 'test-session-id',
    expoConfig: {
      version: '1.0.0',
      extra: { eas: { projectId: 'test-project-id' } },
    },
  },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone 15',
  deviceName: 'Test iPhone',
  osVersion: '17.0',
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0' },
}));

jest.mock('../api', () => ({
  registerDevice: jest.fn().mockResolvedValue({
    id: 'reg-123',
    registeredAt: Date.now(),
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { registerDevice } from '../api';

describe('TokenRefreshManager', () => {
  let manager: TokenRefreshManager;

  beforeEach(() => {
    (TokenRefreshManager as any).instance = null;
    manager = TokenRefreshManager.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = TokenRefreshManager.getInstance();
      const b = TokenRefreshManager.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('initialization', () => {
    it('should initialize and set up token refresh listener', async () => {
      await manager.initialize();
      expect(Notifications.addPushTokenListener).toHaveBeenCalled();
    });

    it('should load persisted token metadata', async () => {
      const mockMetadata = {
        token: 'old-token',
        obtainedAt: Date.now() - 3600000,
        lastValidatedAt: Date.now() - 3600000,
        refreshCount: 2,
        platform: 'ios',
        registeredWithBackend: true,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockMetadata)
      );

      await manager.initialize();
      const metadata = manager.getTokenMetadata();
      expect(metadata?.token).toBe('old-token');
      expect(metadata?.refreshCount).toBe(2);
    });
  });

  describe('token validation', () => {
    it('should validate token and update metadata', async () => {
      await manager.initialize();
      const result = await manager.validateToken();
      expect(result).toBe(true);

      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    });

    it('should detect token change and re-register', async () => {
      // Set initial token
      const mockMetadata = {
        token: 'old-token-different',
        obtainedAt: Date.now(),
        lastValidatedAt: Date.now(),
        refreshCount: 0,
        platform: 'ios',
        registeredWithBackend: true,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockMetadata)
      );

      await manager.initialize();

      // validateToken will get a different token from getExpoPushTokenAsync
      await manager.validateToken();

      // Should have registered the new token
      expect(registerDevice).toHaveBeenCalled();
    });
  });

  describe('force refresh', () => {
    it('should force a token refresh', async () => {
      await manager.initialize();
      const token = await manager.forceRefresh();
      expect(token).toBe('ExponentPushToken[test-token-123]');
      expect(registerDevice).toHaveBeenCalled();
    });
  });

  describe('token refresh callbacks', () => {
    it('should notify callbacks on token refresh', async () => {
      const callback = jest.fn();
      manager.onTokenRefresh(callback);

      await manager.initialize();
      await manager.forceRefresh();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          newToken: 'ExponentPushToken[test-token-123]',
          reason: 'manual',
        })
      );
    });

    it('should unsubscribe callbacks', async () => {
      const callback = jest.fn();
      const unsubscribe = manager.onTokenRefresh(callback);
      unsubscribe();

      await manager.initialize();
      await manager.forceRefresh();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('registration status', () => {
    it('should report token registration status', async () => {
      expect(manager.isTokenRegistered()).toBe(false);

      await manager.initialize();
      await manager.forceRefresh();

      expect(manager.isTokenRegistered()).toBe(true);
    });

    it('should return current token', async () => {
      expect(manager.getCurrentToken()).toBeNull();

      await manager.initialize();
      await manager.forceRefresh();

      expect(manager.getCurrentToken()).toBe('ExponentPushToken[test-token-123]');
    });
  });

  describe('cleanup', () => {
    it('should clean up on destroy', () => {
      manager.destroy();
      expect(manager.getCurrentToken()).toBeNull();
      expect(manager.getTokenMetadata()).toBeNull();
    });
  });
});
