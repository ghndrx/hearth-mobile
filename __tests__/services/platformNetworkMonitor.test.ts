/**
 * Platform Network Monitor Tests - NET-001
 * Tests for iOS and Android specific network monitoring implementations
 */

import {
  createPlatformNetworkMonitor,
  getPlatformNetworkMonitor,
  type PlatformNetworkMonitor,
} from '../../lib/services/platformNetworkMonitor';

// Mock react-native dependencies
let mockPlatform = 'ios';
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatform;
    },
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

const mockNetInfo = require('@react-native-community/netinfo');

// Mock global fetch for latency measurements
global.fetch = jest.fn();

describe('PlatformNetworkMonitor', () => {
  let monitor: PlatformNetworkMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('iOS Platform Monitor', () => {
    beforeEach(() => {
      mockPlatform = 'ios';
      monitor = createPlatformNetworkMonitor();
    });

    describe('getCellularInfo', () => {
      it('should return cellular info for 4G connection', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            cellularGeneration: '4G',
            carrierName: 'Verizon',
            isRoaming: false,
            signalBars: 3,
          },
        });

        const cellularInfo = await monitor.getCellularInfo();

        expect(cellularInfo).toEqual({
          generation: '4G',
          technology: '4G',
          signalStrength: 75, // (3/4) * 100
          signalBars: 3,
          isRoaming: false,
          networkOperator: 'Verizon',
        });
      });

      it('should return cellular info for 5G connection', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            cellularGeneration: '5G',
            carrierName: 'AT&T',
            isRoaming: true,
            signalBars: 5,
          },
        });

        const cellularInfo = await monitor.getCellularInfo();

        expect(cellularInfo?.generation).toBe('5G');
        expect(cellularInfo?.networkOperator).toBe('AT&T');
        expect(cellularInfo?.isRoaming).toBe(true);
        expect(cellularInfo?.signalBars).toBe(5);
      });

      it('should return null for non-cellular connections', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
        });

        const cellularInfo = await monitor.getCellularInfo();
        expect(cellularInfo).toBeNull();
      });

      it('should handle missing cellular details gracefully', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: null,
        });

        const cellularInfo = await monitor.getCellularInfo();
        expect(cellularInfo).toBeNull();
      });

      it('should handle network fetch errors', async () => {
        mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));

        const cellularInfo = await monitor.getCellularInfo();
        expect(cellularInfo).toBeNull();
      });

      it('should map various cellular generations correctly', async () => {
        const testCases = [
          { input: 'LTE', expected: '4G' },
          { input: 'UMTS', expected: '3G' },
          { input: 'GSM', expected: '2G' },
          { input: 'NR', expected: '5G' },
          { input: 'unknown', expected: 'unknown' },
        ];

        for (const testCase of testCases) {
          mockNetInfo.fetch.mockResolvedValue({
            type: 'cellular',
            isConnected: true,
            details: {
              cellularGeneration: testCase.input,
              carrierName: 'TestCarrier',
            },
          });

          const cellularInfo = await monitor.getCellularInfo();
          expect(cellularInfo?.generation).toBe(testCase.expected);
        }
      });
    });

    describe('getWiFiInfo', () => {
      it('should return WiFi info for connected network', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
          details: {
            ssid: 'HomeNetwork',
            strength: -45,
            frequency: 5000,
            ipAddress: '192.168.1.100',
          },
        });

        const wifiInfo = await monitor.getWiFiInfo();

        expect(wifiInfo).toEqual({
          ssid: 'HomeNetwork',
          rssi: -45,
          frequency: 5000,
          ipAddress: '192.168.1.100',
        });
      });

      it('should return null for non-WiFi connections', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
        });

        const wifiInfo = await monitor.getWiFiInfo();
        expect(wifiInfo).toBeNull();
      });

      it('should handle missing WiFi details', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
          details: null,
        });

        const wifiInfo = await monitor.getWiFiInfo();
        expect(wifiInfo).toBeNull();
      });

      it('should provide default values for missing WiFi properties', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
          details: {
            ssid: 'TestNetwork',
            // Missing strength, frequency, ipAddress
          },
        });

        const wifiInfo = await monitor.getWiFiInfo();

        expect(wifiInfo?.ssid).toBe('TestNetwork');
        expect(wifiInfo?.rssi).toBe(-50); // Default value
      });
    });

    describe('measureLatency', () => {
      it('should measure latency successfully', async () => {
        const startTime = Date.now();
        jest.spyOn(Date, 'now')
          .mockReturnValueOnce(startTime)
          .mockReturnValueOnce(startTime + 75);

        const latency = await monitor.measureLatency();

        expect(latency).toBe(75);
        expect(global.fetch).toHaveBeenCalledWith(
          'https://apple.com',
          expect.objectContaining({
            method: 'HEAD',
            cache: 'no-cache',
          })
        );
      });

      it('should use custom target URL', async () => {
        const customTarget = 'https://example.com';

        await monitor.measureLatency(customTarget);

        expect(global.fetch).toHaveBeenCalledWith(
          customTarget,
          expect.any(Object)
        );
      });

      it('should return high latency on fetch failure', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const latency = await monitor.measureLatency();

        expect(latency).toBe(999);
      });

      it('should return high latency on timeout', async () => {
        (global.fetch as jest.Mock).mockImplementation(() => new Promise(resolve => {
          setTimeout(resolve, 10000); // 10 second delay
        }));

        // Start the latency measurement
        const latencyPromise = monitor.measureLatency();

        // Advance timers to trigger timeout
        jest.advanceTimersByTime(5000);

        const latency = await latencyPromise;
        expect(latency).toBe(999);
      });

      it('should return high latency on non-OK response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

        const latency = await monitor.measureLatency();

        expect(latency).toBe(999);
      });
    });

    describe('estimateBandwidth', () => {
      it('should estimate WiFi bandwidth', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
          details: {
            linkSpeed: 100, // 100 Mbps
          },
        });

        const bandwidth = await monitor.estimateBandwidth();

        expect(bandwidth.down).toBe(100000); // 100 Mbps in kbps
        expect(bandwidth.up).toBe(50000);    // 50% of down
      });

      it('should use default WiFi estimates when linkSpeed unavailable', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
          details: {},
        });

        const bandwidth = await monitor.estimateBandwidth();

        expect(bandwidth.up).toBe(50000);
        expect(bandwidth.down).toBe(100000);
      });

      it('should estimate cellular bandwidth by generation', async () => {
        const testCases = [
          { generation: '5G', expectedDown: 1000000, expectedUp: 100000 },
          { generation: '4G', expectedDown: 100000, expectedUp: 20000 },
          { generation: '3G', expectedDown: 7000, expectedUp: 2000 },
          { generation: '2G', expectedDown: 256, expectedUp: 128 },
        ];

        for (const testCase of testCases) {
          mockNetInfo.fetch.mockResolvedValue({
            type: 'cellular',
            isConnected: true,
            details: {
              cellularGeneration: testCase.generation,
            },
          });

          const bandwidth = await monitor.estimateBandwidth();

          expect(bandwidth.down).toBe(testCase.expectedDown);
          expect(bandwidth.up).toBe(testCase.expectedUp);
        }
      });

      it('should handle ethernet connections', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'ethernet',
          isConnected: true,
        });

        const bandwidth = await monitor.estimateBandwidth();

        expect(bandwidth.up).toBe(100000);
        expect(bandwidth.down).toBe(100000);
      });

      it('should provide fallback for unknown connection types', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'unknown',
          isConnected: true,
        });

        const bandwidth = await monitor.estimateBandwidth();

        expect(bandwidth.up).toBe(1000);
        expect(bandwidth.down).toBe(2000);
      });
    });

    describe('getCarrierInfo', () => {
      it('should return carrier info for cellular connection', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            carrierName: 'T-Mobile',
          },
        });

        const carrierInfo = await monitor.getCarrierInfo();

        expect(carrierInfo?.name).toBe('T-Mobile');
      });

      it('should return null for non-cellular connections', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
        });

        const carrierInfo = await monitor.getCarrierInfo();
        expect(carrierInfo).toBeNull();
      });

      it('should provide default carrier name when unavailable', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {},
        });

        const carrierInfo = await monitor.getCarrierInfo();

        expect(carrierInfo?.name).toBe('Unknown');
      });
    });

    describe('getNetworkCapabilities', () => {
      it('should detect iOS network capabilities', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            cellularGeneration: '5G',
          },
        });

        const capabilities = await monitor.getNetworkCapabilities();

        expect(capabilities.supports5G).toBe(true);
        expect(capabilities.supportsWiFi6).toBe(true);
        expect(capabilities.supportsVoLTE).toBe(true);
        expect(capabilities.supportsCarrierAggregation).toBe(true);
        expect(capabilities.maxCellularBandwidth).toBe(1000000); // 5G bandwidth
        expect(capabilities.maxWiFiBandwidth).toBe(1000000);
      });

      it('should detect 4G capabilities', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            cellularGeneration: '4G',
          },
        });

        const capabilities = await monitor.getNetworkCapabilities();

        expect(capabilities.supports5G).toBe(false);
        expect(capabilities.maxCellularBandwidth).toBe(100000); // 4G bandwidth
      });
    });
  });

  describe('Android Platform Monitor', () => {
    beforeEach(() => {
      mockPlatform = 'android';
      monitor = createPlatformNetworkMonitor();
    });

    describe('getCellularInfo', () => {
      it('should return cellular info for Android', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            cellularGeneration: 'LTE',
            carrierName: 'Google Fi',
            isRoaming: false,
            strength: 80,
          },
        });

        const cellularInfo = await monitor.getCellularInfo();

        expect(cellularInfo).toEqual({
          generation: '4G', // LTE maps to 4G
          technology: 'LTE',
          signalStrength: 80,
          signalBars: 4, // Calculated from strength
          isRoaming: false,
          networkOperator: 'Google Fi',
        });
      });

      it('should calculate signal bars from strength percentage', async () => {
        const testCases = [
          { strength: 95, expectedBars: 5 },
          { strength: 80, expectedBars: 4 },
          { strength: 60, expectedBars: 3 },
          { strength: 40, expectedBars: 2 },
          { strength: 15, expectedBars: 1 },
        ];

        for (const testCase of testCases) {
          mockNetInfo.fetch.mockResolvedValue({
            type: 'cellular',
            isConnected: true,
            details: {
              cellularGeneration: '4G',
              strength: testCase.strength,
            },
          });

          const cellularInfo = await monitor.getCellularInfo();
          expect(cellularInfo?.signalBars).toBe(testCase.expectedBars);
        }
      });

      it('should handle missing strength value', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            cellularGeneration: '4G',
            // Missing strength
          },
        });

        const cellularInfo = await monitor.getCellularInfo();

        expect(cellularInfo?.signalStrength).toBe(50); // Default value
      });
    });

    describe('getWiFiInfo', () => {
      it('should return WiFi info for Android', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'wifi',
          isConnected: true,
          details: {
            ssid: 'AndroidWiFi',
            strength: -55,
            frequency: 2400,
            ipAddress: '10.0.0.100',
          },
        });

        const wifiInfo = await monitor.getWiFiInfo();

        expect(wifiInfo).toEqual({
          ssid: 'AndroidWiFi',
          rssi: -55,
          frequency: 2400,
          ipAddress: '10.0.0.100',
        });
      });
    });

    describe('measureLatency', () => {
      it('should use Google as default target for Android', async () => {
        await monitor.measureLatency();

        expect(global.fetch).toHaveBeenCalledWith(
          'https://google.com',
          expect.any(Object)
        );
      });
    });

    describe('getNetworkCapabilities', () => {
      it('should detect Android network capabilities', async () => {
        mockNetInfo.fetch.mockResolvedValue({
          type: 'cellular',
          isConnected: true,
          details: {
            cellularGeneration: '5G',
          },
        });

        const capabilities = await monitor.getNetworkCapabilities();

        expect(capabilities.supports5G).toBe(true);
        expect(capabilities.supportsWiFi6).toBe(true);
        expect(capabilities.supportsVoLTE).toBe(true);
        expect(capabilities.supportsCarrierAggregation).toBe(true);
        expect(capabilities.maxCellularBandwidth).toBe(1000000);
        expect(capabilities.maxWiFiBandwidth).toBe(1000000);
      });
    });
  });

  describe('Unsupported Platform', () => {
    beforeEach(() => {
      mockPlatform = 'web'; // Unsupported platform
      monitor = createPlatformNetworkMonitor();
    });

    it('should fall back to iOS implementation for unsupported platforms', async () => {
      // Should default to Apple target URL (iOS behavior)
      await monitor.measureLatency();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://apple.com',
        expect.any(Object)
      );
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getPlatformNetworkMonitor', () => {
      const instance1 = getPlatformNetworkMonitor();
      const instance2 = getPlatformNetworkMonitor();

      expect(instance1).toBe(instance2);
    });

    it('should create platform-specific instances', () => {
      mockPlatform = 'ios';
      const iosInstance = createPlatformNetworkMonitor();

      mockPlatform = 'android';
      const androidInstance = createPlatformNetworkMonitor();

      // Both should work, but behavior might be different
      expect(iosInstance).toBeDefined();
      expect(androidInstance).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    beforeEach(() => {
      mockPlatform = 'ios';
      monitor = createPlatformNetworkMonitor();
    });

    it('should handle all methods gracefully when NetInfo fails', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('NetInfo unavailable'));

      const [cellularInfo, wifiInfo, bandwidth, carrierInfo, capabilities] = await Promise.all([
        monitor.getCellularInfo(),
        monitor.getWiFiInfo(),
        monitor.estimateBandwidth(),
        monitor.getCarrierInfo(),
        monitor.getNetworkCapabilities(),
      ]);

      expect(cellularInfo).toBeNull();
      expect(wifiInfo).toBeNull();
      expect(bandwidth).toEqual({ up: 1000, down: 2000 }); // Fallback values
      expect(carrierInfo).toBeNull();
      expect(capabilities).toBeDefined(); // Should provide default capabilities
    });

    it('should provide sensible defaults for all measurements', async () => {
      // Test with completely empty NetInfo response
      mockNetInfo.fetch.mockResolvedValue({
        type: null,
        isConnected: false,
        details: null,
      });

      const bandwidth = await monitor.estimateBandwidth();
      const capabilities = await monitor.getNetworkCapabilities();

      expect(bandwidth.up).toBeGreaterThan(0);
      expect(bandwidth.down).toBeGreaterThan(0);
      expect(capabilities.maxCellularBandwidth).toBeGreaterThan(0);
      expect(capabilities.maxWiFiBandwidth).toBeGreaterThan(0);
    });
  });
});