//
//  PushNotifications.swift
//  HearthMobile
//
//  APNs (Apple Push Notifications) integration for iOS
//  Includes notification grouping support for PN-004
//

import Foundation
import UserNotifications
import UIKit

// MARK: - Notification Grouping Constants
struct NotificationGrouping {
    static let defaultCategory = "MESSAGE"
    static let dmCategory = "DIRECT_MESSAGE"
    static let mentionCategory = "MENTION"
    static let threadCategory = "THREAD"
    
    // Threading identifiers for notification grouping
    struct Threading {
        static let messageChannel = "channel-"
        static let conversation = "conv-"
        static let sender = "sender-"
        static let timeWindow = "window-"
    }
}

@objc(PushNotifications)
class PushNotifications: NSObject {

    // MARK: - Public Methods

    /**
     * Request push notification permissions from user
     */
    @objc
    static func requestPermission() -> Void {
        let center = UNUserNotificationCenter.current()

        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    print("Push notification permission granted")
                    self.registerForRemoteNotifications()
                } else {
                    print("Push notification permission denied")
                    if let error = error {
                        print("Permission error: \(error.localizedDescription)")
                    }
                }
            }
        }
    }

    /**
     * Register for remote notifications with APNs
     */
    @objc
    static func registerForRemoteNotifications() -> Void {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    /**
     * Set up foreground notification handler
     */
    @objc
    static func setupForegroundHandler() -> Void {
        let center = UNUserNotificationCenter.current()
        center.delegate = PushNotificationDelegate.shared
        
        // Set up notification categories for grouping
        setupNotificationCategories()
    }
    
    // MARK: - Notification Grouping (PN-004)
    
    /**
     * Set up UNNotificationCategory instances for message grouping
     * This enables iOS to group notifications by conversation/channel
     */
    private static func setupNotificationCategories() -> Void {
        let center = UNUserNotificationCenter.current()
        
        // Message category - for channel messages
        let messageCategory = UNNotificationCategory(
            identifier: NotificationGrouping.defaultCategory,
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )
        
        // Direct message category
        let dmCategory = UNNotificationCategory(
            identifier: NotificationGrouping.dmCategory,
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )
        
        // Mention category
        let mentionCategory = UNNotificationCategory(
            identifier: NotificationGrouping.mentionCategory,
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )
        
        // Thread message category
        let threadCategory = UNNotificationCategory(
            identifier: NotificationGrouping.threadCategory,
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )
        
        center.setNotificationCategories([
            messageCategory,
            dmCategory,
            mentionCategory,
            threadCategory
        ])
        
        print("Notification categories configured for grouping")
    }
    
    /**
     * Create a thread identifier for grouping notifications
     * @param channelId The channel ID
     * @param serverId Optional server ID for server channels
     * @return Thread identifier string
     */
    @objc
    static func createThreadIdentifier(channelId: String, serverId: String?) -> String {
        if let serverId = serverId {
            return "\(NotificationGrouping.Threading.messageChannel)\(serverId):\(channelId)"
        }
        return "\(NotificationGrouping.Threading.conversation)\(channelId)"
    }
    
    /**
     * Create a sender-based thread identifier
     * @param senderId The sender's user ID
     * @param channelId The channel ID
     * @return Thread identifier string
     */
    @objc
    static func createSenderThreadIdentifier(senderId: String, channelId: String) -> String {
        return "\(NotificationGrouping.Threading.sender)\(senderId):\(channelId)"
    }
    
    /**
     * Create a time-window based thread identifier
     * @param channelId The channel ID
     * @param windowStart Unix timestamp for window start
     * @return Thread identifier string
     */
    @objc
    static func createTimeWindowThreadIdentifier(channelId: String, windowStart: Int64) -> String {
        return "\(NotificationGrouping.Threading.timeWindow)\(channelId):\(windowStart)"
    }

    // MARK: - Device Token Handlers

    /**
     * Handle successful device token registration
     * Called from AppDelegate
     */
    @objc
    static func didRegisterForRemoteNotificationsWithDeviceToken(_ deviceToken: Data) -> Void {
        let tokenParts = deviceToken.map { data in
            return String(format: "%02.2hhx", data)
        }
        let token = tokenParts.joined()

        print("APNs device token: \(token)")

        // Store token for React Native to access
        UserDefaults.standard.set(token, forKey: "APNsDeviceToken")
        UserDefaults.standard.synchronize()

        // Post notification for React Native bridge
        NotificationCenter.default.post(
            name: NSNotification.Name("APNsTokenReceived"),
            object: nil,
            userInfo: ["token": token]
        )
    }

    /**
     * Handle device token registration failure
     * Called from AppDelegate
     */
    @objc
    static func didFailToRegisterForRemoteNotificationsWithError(_ error: Error) -> Void {
        print("Failed to register for remote notifications: \(error.localizedDescription)")

        // Post notification for React Native bridge
        NotificationCenter.default.post(
            name: NSNotification.Name("APNsTokenError"),
            object: nil,
            userInfo: ["error": error.localizedDescription]
        )
    }

    /**
     * Create grouped notification content for batch display
     * @param notifications Array of notification data dictionaries
     * @return Dictionary with grouped title and body
     */
    @objc
    static func createGroupedContent(notifications: [[String: Any]]) -> [String: Any] {
        let count = notifications.count
        
        guard count > 0 else {
            return ["title": "Notification", "body": "You have a new notification"]
        }
        
        if count == 1 {
            let notif = notifications[0]
            return [
                "title": notif["title"] as? String ?? "Notification",
                "body": notif["body"] as? String ?? "You have a new message"
            ]
        }
        
        // Multiple notifications - create summary
        let firstNotif = notifications[0]
        let senderName = firstNotif["senderName"] as? String ?? "Someone"
        
        // Check if all from same sender
        let uniqueSenders = Set(notifications.compactMap { $0["senderName"] as? String })
        
        var title: String
        var body: String
        
        if uniqueSenders.count == 1 {
            // All from same sender
            title = firstNotif["title"] as? String ?? "Messages"
            if count == 2 {
                let firstBody = (firstNotif["body"] as? String ?? "").prefix(40)
                let secondBody = ((notifications[1]["body"] as? String) ?? "").prefix(40)
                body = "\(senderName): \(firstBody)... and \(senderName): \(secondBody)..."
            } else {
                let firstBody = (firstNotif["body"] as? String ?? "").prefix(30)
                body = "\(senderName): \(firstBody)... and \(count - 1) more"
            }
        } else {
            // Multiple senders
            title = firstNotif["title"] as? String ?? "Messages"
            let senderList = Array(uniqueSenders).prefix(2).joined(separator: ", ")
            body = "\(senderList) and \(count - uniqueSenders.count) more sent messages"
        }
        
        return ["title": title, "body": body]
    }
    
    // MARK: - Utility Methods

    /**
     * Get stored device token
     */
    @objc
    static func getStoredDeviceToken() -> String? {
        return UserDefaults.standard.string(forKey: "APNsDeviceToken")
    }

    /**
     * Clear stored device token
     */
    @objc
    static func clearStoredDeviceToken() -> Void {
        UserDefaults.standard.removeObject(forKey: "APNsDeviceToken")
        UserDefaults.standard.synchronize()
    }
}

// MARK: - UNUserNotificationCenterDelegate

class PushNotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PushNotificationDelegate()

    private override init() {
        super.init()
    }

    /**
     * Handle notification received while app is in foreground
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo

        print("APNs foreground notification received: \(userInfo)")

        // Post notification for React Native bridge
        NotificationCenter.default.post(
            name: NSNotification.Name("APNsNotificationReceived"),
            object: nil,
            userInfo: userInfo
        )

        // Show notification even when app is in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .badge, .sound])
        } else {
            completionHandler([.alert, .badge, .sound])
        }
        
        // Post notification for React Native bridge
        NotificationCenter.default.post(
            name: NSNotification.Name("APNsGroupedNotificationReceived"),
            object: nil,
            userInfo: [
                "userInfo": userInfo,
                "threadIdentifier": notification.request.content.threadIdentifier,
                "categoryIdentifier": notification.request.content.categoryIdentifier
            ]
        )
    }

    /**
     * Handle notification tap/interaction
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        print("APNs notification tapped: \(userInfo)")

        // Post notification for React Native bridge
        NotificationCenter.default.post(
            name: NSNotification.Name("APNsNotificationTapped"),
            object: nil,
            userInfo: userInfo
        )

        completionHandler()
    }
}

// MARK: - React Native Bridge Extension

extension PushNotifications {

    /**
     * Bridge method for React Native to request permissions
     */
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }

    /**
     * Export module constants to React Native
     */
    @objc
    func constantsToExport() -> [AnyHashable : Any]! {
        return [
            "APNsSupported": true,
            "bundleId": Bundle.main.bundleIdentifier ?? "",
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        ]
    }
}