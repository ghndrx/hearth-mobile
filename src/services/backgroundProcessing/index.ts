/**
 * Background Processing Services
 *
 * PN-006: Background processing and delivery optimization
 */

export { default as backgroundProcessingService } from './BackgroundProcessingService';
export { default as notificationDeliveryService } from './NotificationDeliveryService';
export { default as deliveryOptimizationService } from './DeliveryOptimizationService';
export { default as platformBackgroundManager } from './PlatformBackgroundManager';

// Re-export types from BackgroundProcessingService
export type {
  ProcessingTask,
  TaskResult,
  ResourceMetrics,
  ProcessingConfig,
  ProcessingStats,
  TaskPriority,
  TaskType,
} from './BackgroundProcessingService';

// Re-export types from NotificationDeliveryService
export type {
  DeliveryReceipt,
  PendingDelivery,
  DeliveryStats,
  DeliveryConfig,
  DeliveryStatus,
} from './NotificationDeliveryService';

// Re-export types from DeliveryOptimizationService
export type {
  DeliveryMetrics,
  DeliveryOptimizationConfig,
} from './DeliveryOptimizationService';

// Re-export types from PlatformBackgroundManager
export type {
  BackgroundTaskType,
  BackgroundTaskConfig,
  PlatformBackgroundConfig,
} from './PlatformBackgroundManager';
