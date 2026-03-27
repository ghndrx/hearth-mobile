import * as Device from 'expo-device';
import { Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BatteryOptimizationService from '../battery/BatteryOptimizationService';

export interface DeviceCapabilities {
  deviceType: Device.DeviceType;
  totalMemoryGB: number;
  isLowEndDevice: boolean;
  supportsHighRefreshRate: boolean;
  screenDensity: number;
  screenSize: { width: number; height: number };
  platformVersion: string;
  chipset?: string;
}

export interface PerformanceTier {
  tier: 'high' | 'medium' | 'low';
  maxConcurrentVoice: number;
  messageCache: number;
  imageQuality: 'high' | 'medium' | 'low';
  animationsEnabled: boolean;
  backgroundSyncInterval: number;
  voiceCodec: 'opus' | 'aac' | 'basic';
}

export interface AdaptiveSettings {
  autoOptimization: boolean;
  respectBatteryState: boolean;
  thermalThrottling: boolean;
  adaptiveImageLoading: boolean;
  dynamicCacheSize: boolean;
  performanceLogging: boolean;
}

export class DeviceAdaptiveService {
  private static instance: DeviceAdaptiveService;
  private capabilities: DeviceCapabilities | null = null;
  private performanceTier: PerformanceTier | null = null;
  private settings: AdaptiveSettings = {
    autoOptimization: true,
    respectBatteryState: true,
    thermalThrottling: true,
    adaptiveImageLoading: true,
    dynamicCacheSize: true,
    performanceLogging: false,
  };
  private batteryService!: typeof BatteryOptimizationService;

  static getInstance(): DeviceAdaptiveService {
    if (!DeviceAdaptiveService.instance) {
      DeviceAdaptiveService.instance = new DeviceAdaptiveService();
    }
    return DeviceAdaptiveService.instance;
  }

  async initialize(): Promise<void> {
    this.batteryService = BatteryOptimizationService;
    await this.loadSettings();
    await this.detectDeviceCapabilities();
    this.calculatePerformanceTier();
  }

  private async detectDeviceCapabilities(): Promise<void> {
    const { width, height } = Dimensions.get('screen');

    this.capabilities = {
      deviceType: Device.deviceType || Device.DeviceType.UNKNOWN,
      totalMemoryGB: await this.estimateRAM(),
      isLowEndDevice: await this.isLowEndDevice(),
      supportsHighRefreshRate: await this.detectHighRefreshRate(),
      screenDensity: await this.getScreenDensity(),
      screenSize: { width, height },
      platformVersion: Platform.Version.toString(),
      chipset: await this.detectChipset(),
    };

    // Log device capabilities for analytics
    if (this.settings.performanceLogging) {
      console.log('Device capabilities detected:', this.capabilities);
    }

    // Persist capabilities for future use
    await this.saveCapabilities();
  }

  private async estimateRAM(): Promise<number> {
    // Estimate RAM based on device characteristics
    // This is an approximation as React Native doesn't provide direct RAM access

    if (Platform.OS === 'ios') {
      // iOS device RAM estimation based on device type and year
      const deviceName = Device.deviceName || '';

      if (deviceName.includes('Pro Max')) return 6;
      if (deviceName.includes('Pro')) return 6;
      if (deviceName.includes('Plus')) return 3;
      if (deviceName.includes('iPad Pro')) return 8;
      if (deviceName.includes('iPad Air')) return 4;
      if (deviceName.includes('iPad')) return 3;

      return 4; // Default for modern iPhones
    } else {
      // Android RAM estimation - more variable
      const modelName = Device.modelName?.toLowerCase() || '';

      if (modelName.includes('pixel 7') || modelName.includes('galaxy s23')) return 8;
      if (modelName.includes('pixel 6') || modelName.includes('galaxy s22')) return 6;
      if (modelName.includes('pixel') || modelName.includes('galaxy s')) return 4;

      return 3; // Conservative default for Android
    }
  }

  private async isLowEndDevice(): Promise<boolean> {
    // Determine if device should be considered low-end
    const ram = await this.estimateRAM();
    const { width, height } = Dimensions.get('screen');
    const totalPixels = width * height;

    // Consider low-end if:
    // - Less than 3GB RAM
    // - Screen resolution below HD
    // - Android version below 8.0 or iOS below 13.0

    const lowRAM = ram < 3;
    const lowResolution = totalPixels < (1280 * 720);
    const oldOS = Platform.OS === 'android'
      ? parseInt(Platform.Version.toString()) < 26 // Android 8.0
      : parseFloat(Platform.Version.toString()) < 13.0; // iOS 13.0

    return lowRAM || lowResolution || oldOS;
  }

  private async detectHighRefreshRate(): Promise<boolean> {
    // Detect if device supports high refresh rate displays
    // This is challenging to detect programmatically, so we use heuristics

    if (Platform.OS === 'ios') {
      const deviceName = Device.deviceName || '';
      // iPhone 13 Pro and later, iPad Pro models support 120Hz
      return deviceName.includes('Pro') && !deviceName.includes('iPhone 12');
    } else {
      // Many Android flagships support high refresh rate
      const modelName = Device.modelName?.toLowerCase() || '';
      const supportedModels = ['pixel 6', 'pixel 7', 'galaxy s21', 'galaxy s22', 'galaxy s23', 'oneplus'];

      return supportedModels.some(model => modelName.includes(model));
    }
  }

  private async getScreenDensity(): Promise<number> {
    const { width, height } = Dimensions.get('screen');
    const diagonal = Math.sqrt(width * width + height * height);

    // Approximate screen density (pixels per inch)
    // This is a rough calculation
    if (Platform.OS === 'ios') {
      if (diagonal > 2000) return 458; // iPhone Pro Max
      if (diagonal > 1800) return 460; // iPhone Pro
      if (diagonal > 1600) return 326; // Standard iPhone
      return 264; // iPad
    } else {
      // Android devices vary widely
      if (diagonal > 2000) return 400;
      if (diagonal > 1500) return 350;
      return 300;
    }
  }

  private async detectChipset(): Promise<string | undefined> {
    // Limited chipset detection in React Native
    if (Platform.OS === 'ios') {
      const deviceName = Device.deviceName || '';
      if (deviceName.includes('15')) return 'A16 Bionic';
      if (deviceName.includes('14')) return 'A15 Bionic';
      if (deviceName.includes('13')) return 'A15 Bionic';
      return 'Apple Silicon';
    } else {
      // Android chipset detection is very limited
      return 'Unknown Android SoC';
    }
  }

  private calculatePerformanceTier(): void {
    if (!this.capabilities) return;

    const { totalMemoryGB, isLowEndDevice, supportsHighRefreshRate } = this.capabilities;

    let tier: 'high' | 'medium' | 'low';

    if (isLowEndDevice || totalMemoryGB < 3) {
      tier = 'low';
    } else if (totalMemoryGB >= 6 && supportsHighRefreshRate) {
      tier = 'high';
    } else {
      tier = 'medium';
    }

    // Define performance settings based on tier
    switch (tier) {
      case 'high':
        this.performanceTier = {
          tier: 'high',
          maxConcurrentVoice: 4,
          messageCache: 10000,
          imageQuality: 'high',
          animationsEnabled: true,
          backgroundSyncInterval: 5000,
          voiceCodec: 'opus',
        };
        break;

      case 'medium':
        this.performanceTier = {
          tier: 'medium',
          maxConcurrentVoice: 2,
          messageCache: 5000,
          imageQuality: 'medium',
          animationsEnabled: true,
          backgroundSyncInterval: 10000,
          voiceCodec: 'aac',
        };
        break;

      case 'low':
        this.performanceTier = {
          tier: 'low',
          maxConcurrentVoice: 1,
          messageCache: 2000,
          imageQuality: 'low',
          animationsEnabled: false,
          backgroundSyncInterval: 30000,
          voiceCodec: 'basic',
        };
        break;
    }
  }

  // Get optimized performance settings based on current conditions
  getOptimizedSettings(): PerformanceTier | null {
    if (!this.performanceTier) return null;

    const batteryProfile = this.batteryService.getPerformanceProfile();
    const baseSettings = { ...this.performanceTier };

    // Apply battery-based optimizations
    if (this.settings.respectBatteryState) {
      switch (batteryProfile) {
        case 'battery_saver':
          baseSettings.maxConcurrentVoice = Math.min(baseSettings.maxConcurrentVoice, 1);
          baseSettings.messageCache = Math.floor(baseSettings.messageCache * 0.5);
          baseSettings.imageQuality = 'low';
          baseSettings.animationsEnabled = false;
          baseSettings.backgroundSyncInterval *= 2;
          baseSettings.voiceCodec = 'basic';
          break;

        case 'thermal_throttled':
          baseSettings.maxConcurrentVoice = Math.min(baseSettings.maxConcurrentVoice, 1);
          baseSettings.imageQuality = baseSettings.imageQuality === 'high' ? 'medium' : 'low';
          baseSettings.backgroundSyncInterval *= 1.5;
          break;

        case 'balanced':
          // Minor optimizations for balanced mode
          if (baseSettings.tier === 'high') {
            baseSettings.maxConcurrentVoice = 3;
            baseSettings.backgroundSyncInterval *= 1.2;
          }
          break;
      }
    }

    return baseSettings;
  }

  // Dynamic cache size calculation
  getOptimalCacheSize(): { messages: number; images: number; audio: number } {
    const settings = this.getOptimizedSettings();
    if (!settings) {
      return { messages: 1000, images: 50, audio: 10 };
    }

    const baseMessages = settings.messageCache;
    const ramFactor = this.capabilities?.totalMemoryGB || 3;

    return {
      messages: baseMessages,
      images: Math.floor(ramFactor * 20), // ~20 images per GB of RAM
      audio: Math.floor(ramFactor * 5),   // ~5 audio files per GB of RAM
    };
  }

  // Image loading optimization
  getImageLoadingStrategy(): { maxConcurrent: number; quality: number; preloadDistance: number } {
    const settings = this.getOptimizedSettings();
    if (!settings) {
      return { maxConcurrent: 2, quality: 0.8, preloadDistance: 3 };
    }

    const quality = settings.imageQuality === 'high' ? 1.0 :
                   settings.imageQuality === 'medium' ? 0.8 : 0.6;

    return {
      maxConcurrent: settings.tier === 'high' ? 4 : settings.tier === 'medium' ? 2 : 1,
      quality,
      preloadDistance: settings.tier === 'high' ? 5 : settings.tier === 'medium' ? 3 : 1,
    };
  }

  // Voice optimization recommendations
  getVoiceOptimization(): { codec: string; bitrate: number; maxChannels: number } {
    const settings = this.getOptimizedSettings();
    if (!settings) {
      return { codec: 'aac', bitrate: 64000, maxChannels: 1 };
    }

    let bitrate: number;
    switch (settings.voiceCodec) {
      case 'opus':
        bitrate = 128000;
        break;
      case 'aac':
        bitrate = 96000;
        break;
      case 'basic':
        bitrate = 64000;
        break;
      default:
        bitrate = 96000;
    }

    return {
      codec: settings.voiceCodec,
      bitrate,
      maxChannels: settings.maxConcurrentVoice,
    };
  }

  // Storage optimization recommendations
  getStorageOptimization(): { maxCacheSize: number; cleanupThreshold: number; compressionLevel: number } {
    const ramGB = this.capabilities?.totalMemoryGB || 3;
    const settings = this.getOptimizedSettings();

    return {
      maxCacheSize: ramGB * 256, // MB of cache per GB of RAM
      cleanupThreshold: 0.85, // Clean up when 85% full
      compressionLevel: settings?.tier === 'high' ? 0.8 : 0.6, // Higher compression for lower-end devices
    };
  }

  // Public getters
  getCapabilities(): DeviceCapabilities | null {
    return this.capabilities;
  }

  getPerformanceTier(): PerformanceTier | null {
    return this.performanceTier;
  }

  getSettings(): AdaptiveSettings {
    return { ...this.settings };
  }

  // Settings management
  async updateSettings(newSettings: Partial<AdaptiveSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Recalculate performance tier if auto-optimization was toggled
    if (newSettings.autoOptimization !== undefined) {
      this.calculatePerformanceTier();
    }
  }

  // Device benchmark for performance validation
  async runPerformanceBenchmark(): Promise<{ score: number; tier: string; recommendations: string[] }> {
    const startTime = Date.now();

    // Simple computational benchmark
    let operations = 0;
    const endTime = startTime + 1000; // Run for 1 second

    while (Date.now() < endTime) {
      Math.sqrt(Math.random() * 1000000);
      operations++;
    }

    const score = operations / 1000; // Operations per millisecond
    const recommendations: string[] = [];

    // Generate recommendations based on benchmark
    if (score < 50) {
      recommendations.push('Consider enabling battery optimization mode');
      recommendations.push('Disable non-essential animations');
      recommendations.push('Reduce message cache size');
    } else if (score < 100) {
      recommendations.push('Balanced performance settings recommended');
      recommendations.push('Enable selective image preloading');
    } else {
      recommendations.push('High performance mode available');
      recommendations.push('Enable all visual enhancements');
      recommendations.push('Maximum cache sizes recommended');
    }

    const benchmarkTier = score < 50 ? 'low' : score < 100 ? 'medium' : 'high';

    return {
      score,
      tier: benchmarkTier,
      recommendations,
    };
  }

  // Persistence methods
  private async saveCapabilities(): Promise<void> {
    try {
      await AsyncStorage.setItem('device_capabilities', JSON.stringify(this.capabilities));
    } catch (error) {
      console.warn('Failed to save device capabilities:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('device_adaptive_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save device adaptive settings:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('device_adaptive_settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load device adaptive settings:', error);
    }
  }
}

export default DeviceAdaptiveService.getInstance();