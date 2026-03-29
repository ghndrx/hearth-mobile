/**
 * Platform-Specific Network Monitoring - NET-001
 * iOS and Android native network monitoring integration
 * Provides platform-optimized network condition detection
 */

import { Platform } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import type { NetworkConditions, CellularGeneration } from '../types/networkIntelligence';

/** Platform-specific network monitoring interface */
export interface PlatformNetworkMonitor {
  /** Get detailed cellular information */
  getCellularInfo(): Promise<CellularInfo | null>;
  /** Get Wi-Fi specific information */
  getWiFiInfo(): Promise<WiFiInfo | null>;
  /** Measure network latency with platform optimization */
  measureLatency(target?: string): Promise<number>;
  /** Estimate bandwidth using platform-specific methods */
  estimateBandwidth(): Promise<{ up: number; down: number }>;
  /** Get carrier/operator information */
  getCarrierInfo(): Promise<CarrierInfo | null>;
  /** Check if device supports specific network features */
  getNetworkCapabilities(): Promise<NetworkCapabilities>;
}

/** Cellular network information */
export interface CellularInfo {
  generation: CellularGeneration;
  technology: string; // LTE, NR, UMTS, etc.
  signalStrength: number; // 0-100
  signalBars: number; // 1-5
  isRoaming: boolean;
  networkOperator?: string;
  mcc?: string; // Mobile Country Code
  mnc?: string; // Mobile Network Code
}

/** Wi-Fi network information */
export interface WiFiInfo {
  ssid?: string;
  bssid?: string;
  rssi: number; // Signal strength in dBm
  frequency?: number; // 2.4GHz or 5GHz
  linkSpeed?: number; // Mbps
  ipAddress?: string;
  securityType?: string;
}

/** Carrier/operator information */
export interface CarrierInfo {
  name: string;
  country?: string;
  mcc?: string;
  mnc?: string;
  isoCountryCode?: string;
}

/** Network capabilities */
export interface NetworkCapabilities {
  supports5G: boolean;
  supportsWiFi6: boolean;
  supportsVoLTE: boolean;
  supportsCarrierAggregation: boolean;
  maxCellularBandwidth: number;
  maxWiFiBandwidth: number;
}

/**
 * iOS-specific network monitoring implementation
 */
class iOSNetworkMonitor implements PlatformNetworkMonitor {
  async getCellularInfo(): Promise<CellularInfo | null> {
    try {
      // In a full implementation, this would use iOS CoreTelephony
      // For now, we'll extract what we can from NetInfo
      const state = await NetInfo.fetch();

      if (state.type !== 'cellular' || !state.details) {
        return null;
      }

      const details = state.details as any;

      return {
        generation: this.mapCellularGeneration(details.cellularGeneration),
        technology: details.cellularGeneration || 'unknown',
        signalStrength: this.calculateSignalStrength(details),
        signalBars: this.calculateSignalBars(details),
        isRoaming: details.isRoaming || false,
        networkOperator: details.carrierName,
        // MCC/MNC would require native iOS implementation
      };
    } catch (error) {
      console.error('[iOSNetworkMonitor] Failed to get cellular info:', error);
      return null;
    }
  }

  async getWiFiInfo(): Promise<WiFiInfo | null> {
    try {
      const state = await NetInfo.fetch();

      if (state.type !== 'wifi' || !state.details) {
        return null;
      }

      const details = state.details as any;

      return {
        ssid: details.ssid,
        rssi: details.strength || -50,
        frequency: details.frequency,
        ipAddress: details.ipAddress,
        // Additional Wi-Fi details would require native iOS implementation
      };
    } catch (error) {
      console.error('[iOSNetworkMonitor] Failed to get Wi-Fi info:', error);
      return null;
    }
  }

  async measureLatency(target = 'https://apple.com'): Promise<number> {
    try {
      const startTime = Date.now();

      // Use fetch with HEAD request for minimal data transfer
      const response = await Promise.race([
        fetch(target, {
          method: 'HEAD',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as Response;

      const latency = Date.now() - startTime;
      return response.ok ? latency : 999;
    } catch (error) {
      console.warn('[iOSNetworkMonitor] Latency measurement failed:', error);
      return 999;
    }
  }

  async estimateBandwidth(): Promise<{ up: number; down: number }> {
    try {
      const state = await NetInfo.fetch();
      const details = state.details as any;

      // iOS-specific bandwidth estimation based on connection type
      switch (state.type) {
        case 'wifi':
          return this.estimateWiFiBandwidth(details);

        case 'cellular':
          return this.estimateCellularBandwidth(details);

        default:
          return { up: 1000, down: 2000 };
      }
    } catch (error) {
      console.error('[iOSNetworkMonitor] Bandwidth estimation failed:', error);
      return { up: 1000, down: 2000 };
    }
  }

  async getCarrierInfo(): Promise<CarrierInfo | null> {
    try {
      const state = await NetInfo.fetch();

      if (state.type !== 'cellular' || !state.details) {
        return null;
      }

      const details = state.details as any;

      return {
        name: details.carrierName || 'Unknown',
        // Additional carrier info would require CoreTelephony
      };
    } catch (error) {
      console.error('[iOSNetworkMonitor] Failed to get carrier info:', error);
      return null;
    }
  }

  async getNetworkCapabilities(): Promise<NetworkCapabilities> {
    const state = await NetInfo.fetch();
    const details = state.details as any;

    // iOS capability detection based on device and iOS version
    return {
      supports5G: this.detectiOS5GSupport(details),
      supportsWiFi6: this.detectWiFi6Support(),
      supportsVoLTE: true, // Most modern iOS devices support VoLTE
      supportsCarrierAggregation: true,
      maxCellularBandwidth: this.getMaxCellularBandwidth(details),
      maxWiFiBandwidth: 1000000, // 1 Gbps theoretical max for Wi-Fi 6
    };
  }

  private mapCellularGeneration(generation: string): CellularGeneration {
    const gen = generation?.toLowerCase() || '';

    if (gen.includes('nr') || gen.includes('5g')) return '5G';
    if (gen.includes('lte') || gen.includes('4g')) return '4G';
    if (gen.includes('umts') || gen.includes('3g')) return '3G';
    if (gen.includes('gsm') || gen.includes('2g')) return '2G';

    return 'unknown';
  }

  private calculateSignalStrength(details: any): number {
    // iOS signal strength calculation
    const bars = details.signalBars || 3;
    return Math.min(100, Math.max(0, (bars / 4) * 100));
  }

  private calculateSignalBars(details: any): number {
    return Math.min(5, Math.max(1, details.signalBars || 3));
  }

  private estimateWiFiBandwidth(details: any): { up: number; down: number } {
    const linkSpeed = details.linkSpeed;

    if (linkSpeed) {
      // Convert Mbps to kbps and estimate up/down based on typical ratios
      const downKbps = linkSpeed * 1000;
      const upKbps = downKbps * 0.5; // Assume 50% upload ratio
      return { up: upKbps, down: downKbps };
    }

    // Default Wi-Fi estimates for iOS
    return { up: 50000, down: 100000 }; // 50/100 Mbps
  }

  private estimateCellularBandwidth(details: any): { up: number; down: number } {
    const generation = this.mapCellularGeneration(details.cellularGeneration);

    switch (generation) {
      case '5G':
        return { up: 100000, down: 1000000 }; // Up to 100/1000 Mbps
      case '4G':
        return { up: 20000, down: 100000 }; // Up to 20/100 Mbps
      case '3G':
        return { up: 2000, down: 7000 }; // Up to 2/7 Mbps
      case '2G':
        return { up: 128, down: 256 }; // Up to 128/256 kbps
      default:
        return { up: 10000, down: 50000 };
    }
  }

  private detectiOS5GSupport(details: any): boolean {
    // Check if device supports 5G based on cellular generation
    const generation = details?.cellularGeneration?.toLowerCase() || '';
    return generation.includes('nr') || generation.includes('5g');
  }

  private detectWiFi6Support(): boolean {
    // iOS devices from iPhone 11 onwards support Wi-Fi 6
    // This is a simplified check - full implementation would check device model
    return true;
  }

  private getMaxCellularBandwidth(details: any): number {
    const generation = this.mapCellularGeneration(details?.cellularGeneration);

    switch (generation) {
      case '5G': return 1000000; // 1 Gbps
      case '4G': return 100000;  // 100 Mbps
      case '3G': return 7000;    // 7 Mbps
      case '2G': return 256;     // 256 kbps
      default: return 50000;     // 50 Mbps default
    }
  }
}

/**
 * Android-specific network monitoring implementation
 */
class AndroidNetworkMonitor implements PlatformNetworkMonitor {
  async getCellularInfo(): Promise<CellularInfo | null> {
    try {
      const state = await NetInfo.fetch();

      if (state.type !== 'cellular' || !state.details) {
        return null;
      }

      const details = state.details as any;

      return {
        generation: this.mapCellularGeneration(details.cellularGeneration),
        technology: details.cellularGeneration || 'unknown',
        signalStrength: this.calculateSignalStrength(details),
        signalBars: this.calculateSignalBars(details),
        isRoaming: details.isRoaming || false,
        networkOperator: details.carrierName,
      };
    } catch (error) {
      console.error('[AndroidNetworkMonitor] Failed to get cellular info:', error);
      return null;
    }
  }

  async getWiFiInfo(): Promise<WiFiInfo | null> {
    try {
      const state = await NetInfo.fetch();

      if (state.type !== 'wifi' || !state.details) {
        return null;
      }

      const details = state.details as any;

      return {
        ssid: details.ssid,
        rssi: details.strength || -50,
        frequency: details.frequency,
        ipAddress: details.ipAddress,
      };
    } catch (error) {
      console.error('[AndroidNetworkMonitor] Failed to get Wi-Fi info:', error);
      return null;
    }
  }

  async measureLatency(target = 'https://google.com'): Promise<number> {
    try {
      const startTime = Date.now();

      const response = await Promise.race([
        fetch(target, {
          method: 'HEAD',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as Response;

      const latency = Date.now() - startTime;
      return response.ok ? latency : 999;
    } catch (error) {
      console.warn('[AndroidNetworkMonitor] Latency measurement failed:', error);
      return 999;
    }
  }

  async estimateBandwidth(): Promise<{ up: number; down: number }> {
    try {
      const state = await NetInfo.fetch();
      const details = state.details as any;

      switch (state.type) {
        case 'wifi':
          return this.estimateWiFiBandwidth(details);

        case 'cellular':
          return this.estimateCellularBandwidth(details);

        default:
          return { up: 1000, down: 2000 };
      }
    } catch (error) {
      console.error('[AndroidNetworkMonitor] Bandwidth estimation failed:', error);
      return { up: 1000, down: 2000 };
    }
  }

  async getCarrierInfo(): Promise<CarrierInfo | null> {
    try {
      const state = await NetInfo.fetch();

      if (state.type !== 'cellular' || !state.details) {
        return null;
      }

      const details = state.details as any;

      return {
        name: details.carrierName || 'Unknown',
      };
    } catch (error) {
      console.error('[AndroidNetworkMonitor] Failed to get carrier info:', error);
      return null;
    }
  }

  async getNetworkCapabilities(): Promise<NetworkCapabilities> {
    const state = await NetInfo.fetch();
    const details = state.details as any;

    return {
      supports5G: this.detectAndroid5GSupport(details),
      supportsWiFi6: this.detectWiFi6Support(),
      supportsVoLTE: true,
      supportsCarrierAggregation: true,
      maxCellularBandwidth: this.getMaxCellularBandwidth(details),
      maxWiFiBandwidth: 1000000,
    };
  }

  private mapCellularGeneration(generation: string): CellularGeneration {
    const gen = generation?.toLowerCase() || '';

    if (gen.includes('nr') || gen.includes('5g')) return '5G';
    if (gen.includes('lte') || gen.includes('4g')) return '4G';
    if (gen.includes('umts') || gen.includes('3g')) return '3G';
    if (gen.includes('gsm') || gen.includes('2g')) return '2G';

    return 'unknown';
  }

  private calculateSignalStrength(details: any): number {
    // Android signal strength calculation
    if (details.strength !== undefined) {
      return Math.min(100, Math.max(0, details.strength));
    }
    return 50; // Default middle value
  }

  private calculateSignalBars(details: any): number {
    const strength = this.calculateSignalStrength(details);
    return Math.min(5, Math.max(1, Math.ceil(strength / 20)));
  }

  private estimateWiFiBandwidth(details: any): { up: number; down: number } {
    // Android Wi-Fi bandwidth estimation
    return { up: 50000, down: 100000 };
  }

  private estimateCellularBandwidth(details: any): { up: number; down: number } {
    const generation = this.mapCellularGeneration(details.cellularGeneration);

    switch (generation) {
      case '5G':
        return { up: 100000, down: 1000000 };
      case '4G':
        return { up: 20000, down: 100000 };
      case '3G':
        return { up: 2000, down: 7000 };
      case '2G':
        return { up: 128, down: 256 };
      default:
        return { up: 10000, down: 50000 };
    }
  }

  private detectAndroid5GSupport(details: any): boolean {
    const generation = details?.cellularGeneration?.toLowerCase() || '';
    return generation.includes('nr') || generation.includes('5g');
  }

  private detectWiFi6Support(): boolean {
    // Android 10+ devices generally support Wi-Fi 6
    return true;
  }

  private getMaxCellularBandwidth(details: any): number {
    const generation = this.mapCellularGeneration(details?.cellularGeneration);

    switch (generation) {
      case '5G': return 1000000;
      case '4G': return 100000;
      case '3G': return 7000;
      case '2G': return 256;
      default: return 50000;
    }
  }
}

/**
 * Factory function to create platform-specific network monitor
 */
export function createPlatformNetworkMonitor(): PlatformNetworkMonitor {
  switch (Platform.OS) {
    case 'ios':
      return new iOSNetworkMonitor();
    case 'android':
      return new AndroidNetworkMonitor();
    default:
      console.warn('[PlatformNetworkMonitor] Unsupported platform, using iOS implementation');
      return new iOSNetworkMonitor();
  }
}

/**
 * Get platform-specific network monitor singleton
 */
let platformMonitorInstance: PlatformNetworkMonitor | null = null;

export function getPlatformNetworkMonitor(): PlatformNetworkMonitor {
  if (!platformMonitorInstance) {
    platformMonitorInstance = createPlatformNetworkMonitor();
  }
  return platformMonitorInstance;
}

export default createPlatformNetworkMonitor;