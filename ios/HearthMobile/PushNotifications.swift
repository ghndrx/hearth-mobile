//
//  PushNotifications.swift
//  HearthMobile
//
//  APNs (Apple Push Notifications) integration for iOS
//

import Foundation
import UserNotifications
import UIKit

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