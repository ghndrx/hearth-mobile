import ResourceMonitorService, { ResourceMetrics, OptimizationSuggestion } from '../resourceMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active',
  },
  DeviceEventEmitter: {
    emit: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage');

describe('ResourceMonitorService', () => {
  let service: ResourceMonitorService;
  const mockMetrics: ResourceMetrics = {
    cpu: { usage: 45, temperature: 35, throttling: false },
    memory: { used: 1500, total: 4000, available: 2500, pressure: 'normal' },
    thermal: { state: 'nominal', temperature: 35, throttling: false },
    network: { bytesReceived: 1000, bytesSent: 500, packetsReceived: 100, packetsSent: 50, connectionType: 'wifi' },
    storage: { used: 30000, total: 64000, available: 34000, pressure: 'normal' },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    // Reset singleton
    (ResourceMonitorService as any).instance = null;
    service = ResourceMonitorService.getInstance();

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    service.destroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = ResourceMonitorService.getInstance();
      const instance2 = ResourceMonitorService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should start monitoring with default interval', () => {
      service.startMonitoring();
      expect(service['isMonitoring']).toBe(true);
    });

    it('should not start monitoring if already started', () => {
      service.startMonitoring();
      const firstInterval = service['monitoringInterval'];

      service.startMonitoring();
      expect(service['monitoringInterval']).toBe(firstInterval);
    });
  });

  describe('metrics collection', () => {
    beforeEach(() => {
      service.startMonitoring(1000); // 1 second for testing
    });

    it('should collect metrics periodically', async () => {
      const listener = jest.fn();
      service.addListener(listener);

      // Fast forward timer
      jest.advanceTimersByTime(1000);

      // Wait for async operations
      await Promise.resolve();

      expect(listener).toHaveBeenCalled();
    });

    it('should maintain metrics history within limits', async () => {
      // Simulate collecting many metrics
      for (let i = 0; i < 300; i++) {
        await (service as any).collectMetrics();
      }

      const history = service.getMetricsHistory(24);
      expect(history.length).toBeLessThanOrEqual(288); // MAX_METRICS_HISTORY
    });

    it('should filter metrics by time range', () => {
      const now = Date.now();
      const metrics = [
        { ...mockMetrics, timestamp: now - 1000 }, // 1 second ago
        { ...mockMetrics, timestamp: now - 3600000 }, // 1 hour ago
        { ...mockMetrics, timestamp: now - 7200000 }, // 2 hours ago
      ];

      (service as any).metrics = metrics;

      const recent = service.getMetricsHistory(1); // Last 1 hour
      expect(recent.length).toBe(2);
    });
  });

  describe('performance analysis', () => {
    it('should detect good performance correctly', () => {
      const goodMetrics: ResourceMetrics = {
        ...mockMetrics,
        cpu: { usage: 30, temperature: 30, throttling: false },
        memory: { ...mockMetrics.memory, pressure: 'normal' },
        thermal: { state: 'nominal', temperature: 30, throttling: false },
        storage: { ...mockMetrics.storage, pressure: 'normal' },
      };

      (service as any).metrics = [goodMetrics];
      expect(service.isPerformanceGood()).toBe(true);
    });

    it('should detect poor performance from high CPU usage', () => {
      const badMetrics: ResourceMetrics = {
        ...mockMetrics,
        cpu: { usage: 95, temperature: 30, throttling: false },
      };

      (service as any).metrics = [badMetrics];
      expect(service.isPerformanceGood()).toBe(false);
    });

    it('should detect poor performance from critical memory pressure', () => {
      const badMetrics: ResourceMetrics = {
        ...mockMetrics,
        memory: { ...mockMetrics.memory, pressure: 'critical' },
      };

      (service as any).metrics = [badMetrics];
      expect(service.isPerformanceGood()).toBe(false);
    });

    it('should detect poor performance from critical thermal state', () => {
      const badMetrics: ResourceMetrics = {
        ...mockMetrics,
        thermal: { state: 'critical', temperature: 55, throttling: true },
      };

      (service as any).metrics = [badMetrics];
      expect(service.isPerformanceGood()).toBe(false);
    });
  });

  describe('optimization suggestions', () => {
    it('should generate CPU optimization suggestions for high usage', () => {
      const highCpuMetrics: ResourceMetrics = {
        ...mockMetrics,
        cpu: { usage: 85, temperature: 35, throttling: false },
      };

      (service as any).metrics = [highCpuMetrics];
      const suggestions = service.getOptimizationSuggestions();

      const cpuSuggestion = suggestions.find(s => s.type === 'performance');
      expect(cpuSuggestion).toBeDefined();
      expect(cpuSuggestion?.title).toBe('Optimize CPU Usage');
      expect(cpuSuggestion?.severity).toBe('medium');
    });

    it('should generate critical CPU optimization suggestions', () => {
      const criticalCpuMetrics: ResourceMetrics = {
        ...mockMetrics,
        cpu: { usage: 95, temperature: 35, throttling: false },
      };

      (service as any).metrics = [criticalCpuMetrics];
      const suggestions = service.getOptimizationSuggestions();

      const cpuSuggestion = suggestions.find(s => s.type === 'performance');
      expect(cpuSuggestion?.severity).toBe('high');
    });

    it('should generate memory optimization suggestions', () => {
      const highMemoryMetrics: ResourceMetrics = {
        ...mockMetrics,
        memory: { ...mockMetrics.memory, pressure: 'warning' },
      };

      (service as any).metrics = [highMemoryMetrics];
      const suggestions = service.getOptimizationSuggestions();

      const memorySuggestion = suggestions.find(s => s.type === 'memory');
      expect(memorySuggestion).toBeDefined();
      expect(memorySuggestion?.title).toBe('Free Up Memory');
    });

    it('should generate thermal optimization suggestions', () => {
      const thermalMetrics: ResourceMetrics = {
        ...mockMetrics,
        thermal: { state: 'serious', temperature: 45, throttling: false },
      };

      (service as any).metrics = [thermalMetrics];
      const suggestions = service.getOptimizationSuggestions();

      const thermalSuggestion = suggestions.find(s => s.type === 'thermal');
      expect(thermalSuggestion).toBeDefined();
      expect(thermalSuggestion?.title).toBe('Reduce Thermal Load');
    });

    it('should generate no suggestions for good performance', () => {
      const goodMetrics: ResourceMetrics = {
        ...mockMetrics,
        cpu: { usage: 30, temperature: 30, throttling: false },
        memory: { ...mockMetrics.memory, pressure: 'normal' },
        thermal: { state: 'nominal', temperature: 30, throttling: false },
      };

      (service as any).metrics = [goodMetrics];
      const suggestions = service.getOptimizationSuggestions();

      expect(suggestions.length).toBe(0);
    });
  });

  describe('average metrics calculation', () => {
    it('should calculate average metrics correctly', () => {
      const metrics = [
        { ...mockMetrics, cpu: { usage: 20, temperature: 30, throttling: false } },
        { ...mockMetrics, cpu: { usage: 40, temperature: 35, throttling: false } },
        { ...mockMetrics, cpu: { usage: 60, temperature: 40, throttling: false } },
      ];

      (service as any).metrics = metrics;
      const average = service.getAverageMetrics(24);

      expect(average).not.toBeNull();
      expect(average!.cpu!.usage).toBe(40); // (20 + 40 + 60) / 3
    });

    it('should return null for no metrics', () => {
      (service as any).metrics = [];
      const average = service.getAverageMetrics(1);
      expect(average).toBeNull();
    });
  });

  describe('listeners', () => {
    it('should add and remove listeners correctly', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = service.addListener(listener1);
      const unsubscribe2 = service.addListener(listener2);

      // Trigger metrics update
      (service as any).notifyListeners(mockMetrics);

      expect(listener1).toHaveBeenCalledWith(mockMetrics);
      expect(listener2).toHaveBeenCalledWith(mockMetrics);

      // Remove first listener
      unsubscribe1();

      // Trigger another update
      (service as any).notifyListeners(mockMetrics);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);

      // Remove second listener
      unsubscribe2();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.addListener(errorListener);
      (service as any).notifyListeners(mockMetrics);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error notifying resource metrics listener:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('performance issues detection', () => {
    it('should emit performance issues for critical metrics', () => {
      const { DeviceEventEmitter } = require('react-native');

      const criticalMetrics: ResourceMetrics = {
        ...mockMetrics,
        cpu: { usage: 95, temperature: 35, throttling: false },
        memory: { ...mockMetrics.memory, pressure: 'critical' },
        thermal: { state: 'critical', temperature: 55, throttling: true },
        storage: { ...mockMetrics.storage, pressure: 'critical' },
      };

      (service as any).analyzePerformanceIssues(criticalMetrics);

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'PerformanceIssues',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'performance',
            severity: 'high',
            title: 'High CPU Usage',
          }),
          expect.objectContaining({
            type: 'memory',
            severity: 'high',
            title: 'Critical Memory Usage',
          }),
          expect.objectContaining({
            type: 'thermal',
            severity: 'high',
            title: 'Device Overheating',
          }),
          expect.objectContaining({
            type: 'storage',
            severity: 'high',
            title: 'Storage Nearly Full',
          }),
        ])
      );
    });
  });

  describe('data persistence', () => {
    it('should save metrics to AsyncStorage', async () => {
      const metrics = [mockMetrics];
      (service as any).metrics = metrics;

      await (service as any).saveMetricsHistory();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'resource_metrics_history',
        JSON.stringify(metrics)
      );
    });

    it('should load metrics from AsyncStorage', async () => {
      const metrics = [mockMetrics];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(metrics));

      await (service as any).loadMetricsHistory();

      expect((service as any).metrics).toEqual(metrics);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (service as any).saveMetricsHistory();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save metrics history:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('monitoring lifecycle', () => {
    it('should stop monitoring correctly', () => {
      service.startMonitoring();
      expect(service['isMonitoring']).toBe(true);

      service.stopMonitoring();
      expect(service['isMonitoring']).toBe(false);
      expect(service['monitoringInterval']).toBeNull();
    });

    it('should save metrics when stopping monitoring', async () => {
      const saveSpy = jest.spyOn(service as any, 'saveMetricsHistory');

      service.startMonitoring();
      service.stopMonitoring();

      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      service.startMonitoring();
      const listener = jest.fn();
      service.addListener(listener);

      service.destroy();

      expect(service['isMonitoring']).toBe(false);
      expect(service['listeners']).toEqual([]);
    });
  });
});