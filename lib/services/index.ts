export * from "./api";
export { registerDevice, unregisterDevice } from "./api";
export * from "./auth";
export * from "./biometric";
export {
  type NotificationType,
  type NotificationPayload,
  type NotificationSettings as PushNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  saveNotificationSettings,
  registerForPushNotifications,
  getStoredPushToken,
  getStoredDeviceRegistration,
  clearPushToken,
  getPermissionStatus,
  setBadgeCount,
  clearBadgeCount,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  dismissAllNotifications,
  NOTIFICATION_CHANNELS,
} from "./notifications";
// Notification batching service (PN-004)
export {
  type GroupingKeyType,
  type NotificationGroup,
  type QueuedNotification,
  type BatchingConfig,
  type NotificationGroupingSettings,
  getBatchingConfig,
  saveBatchingConfig,
  getGroupingSettings,
  saveGroupingSettings,
  queueNotification,
  flushGroup,
  flushAllGroups,
  getPendingGroupCount,
  getPendingNotificationCount,
  clearPendingNotifications,
  initializeBatchingService,
} from "./notificationBatching";
export * from "./messageQueue";
export * from "./websocket";
export * from "./media";
export * from "./settings";
export * from "./haptics";
export * from "./accessibility";
export * from "./deepLinking";
export * from "./quickActions";
export * from "./spotlight";
export * as deviceService from "./devices";
export * from "./CameraService";
export {
  type UploadOptions,
  type CaptureUploadSession,
  type UploadState,
  cameraCaptureUploadService,
} from "./CameraCaptureUploadService";
export {
  type VideoCompressionOptions,
  type VideoCompressionResult,
  type CompressionProgress,
  videoCompressionService,
} from "./VideoCompressionService";
