/**
 * PN-006: Background Processing and Delivery Optimization Services
 *
 * Complete implementation for background processing, delivery optimization,
 * device performance monitoring, and power management.
 */

// Core PN-006 services
export {
  backgroundProcessingService,
  default as BackgroundProcessingService
} from './BackgroundProcessingService';

export {
  deliveryOptimizationService,
  default as DeliveryOptimizationService
} from './DeliveryOptimizationService';

export {
  devicePerformanceMonitor,
  default as DevicePerformanceMonitor
} from './DevicePerformanceMonitor';

// React hooks
// Note: usePowerManagement hook will be available once tests pass
// export {
//   usePowerManagement,
//   default as usePowerManagementHook
// } from '../../hooks/usePowerManagement';

// Enhanced push notification integration
export {
  enhancedPushNotificationService,
  useEnhancedPushNotifications,
  default as EnhancedPushNotificationService
} from '../pushNotifications/EnhancedPushNotificationService';

// Import services for the functions below
import { backgroundProcessingService, type ProcessingConfig } from './BackgroundProcessingService';
import { deliveryOptimizationService, type DeliveryOptimizationConfig } from './DeliveryOptimizationService';
import { devicePerformanceMonitor } from './DevicePerformanceMonitor';
import { enhancedPushNotificationService, type EnhancedNotificationConfig } from '../pushNotifications/EnhancedPushNotificationService';

// Types from BackgroundProcessingService
export type {
  ProcessingTask,
  TaskResult,
  ResourceMetrics,
  ProcessingConfig,
  ProcessingStats,
  TaskPriority,
  TaskType,
} from './BackgroundProcessingService';

// Types from DeliveryOptimizationService
export type {
  DeliveryStatus,
  DeliveryReceipt,
  DeliveryMetrics,
  DeliveryOptimizationConfig,
} from './DeliveryOptimizationService';

// Types from DevicePerformanceMonitor
export type {
  DeviceCapabilities,
  PowerState,
  ThermalState,
  MemoryState,
  StorageState,
  PerformanceProfile,
  DevicePerformanceState,
  PerformanceRecommendation,
} from './DevicePerformanceMonitor';

// Types from usePowerManagement hook
// Note: These types will be available once the hook is fully tested
// export type {
//   PowerManagementState,
//   PowerManagementActions,
//   UsePowerManagementOptions,
//   UsePowerManagementReturn,
// } from '../../hooks/usePowerManagement';

// Types from EnhancedPushNotificationService
export type {
  EnhancedNotificationConfig,
  NotificationDeliveryOptions,
  EnhancedNotificationMetrics,
} from '../pushNotifications/EnhancedPushNotificationService';

/**
 * Initialize all PN-006 background processing services
 */
export const initializeBackgroundProcessing = async (config?: {
  backgroundProcessing?: Partial<ProcessingConfig>;
  deliveryOptimization?: Partial<DeliveryOptimizationConfig>;
  enhancedNotifications?: EnhancedNotificationConfig;
}): Promise<boolean> => {
  try {
    console.log('🔄 Initializing PN-006 background processing services...');

    // Initialize core services in order
    await backgroundProcessingService.initialize(config?.backgroundProcessing);
    await deliveryOptimizationService.initialize(config?.deliveryOptimization);
    await devicePerformanceMonitor.initialize();

    // Initialize enhanced push notifications if config provided
    if (config?.enhancedNotifications) {
      await enhancedPushNotificationService.initialize(config.enhancedNotifications);
    }

    console.log('✅ PN-006: Background processing and delivery optimization services initialized');
    return true;
  } catch (error) {
    console.error('❌ PN-006: Failed to initialize background processing services:', error);
    return false;
  }
};

/**
 * Shutdown all PN-006 background processing services
 */
export const shutdownBackgroundProcessing = (): void => {
  console.log('🔄 Shutting down PN-006 background processing services...');

  try {
    enhancedPushNotificationService.shutdown();
    devicePerformanceMonitor.shutdown();
    deliveryOptimizationService.shutdown();
    backgroundProcessingService.shutdown();

    console.log('✅ PN-006: Background processing services shutdown complete');
  } catch (error) {
    console.error('❌ PN-006: Error during service shutdown:', error);
  }
};

/**
 * Get comprehensive metrics from all PN-006 services
 */
export const getComprehensiveMetrics = () => {
  try {
    return {
      backgroundProcessing: backgroundProcessingService.getStats(),
      deliveryOptimization: deliveryOptimizationService.getMetrics(),
      devicePerformance: devicePerformanceMonitor.getState(),
      resourceMetrics: backgroundProcessingService.getMetrics(),
      enhancedNotifications: enhancedPushNotificationService.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ PN-006: Error getting comprehensive metrics:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};
