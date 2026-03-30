//
//  AppDelegate.swift
//  HearthMobile
//
//  Push notification delegate setup for iOS (PN-002)
//  Configures UNUserNotificationCenter delegate and APNs registration
//

import UIKit
import UserNotifications
import ExpoModulesCore

@UIApplicationMain
class AppDelegate: ExpoAppDelegate {

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Set up notification delegate before super call
        UNUserNotificationCenter.current().delegate = PushNotificationDelegate.shared

        // Check if app was launched from a notification
        if let remoteNotification = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
            print("App launched from remote notification: \(remoteNotification)")
            NotificationCenter.default.post(
                name: NSNotification.Name("APNsNotificationTapped"),
                object: nil,
                userInfo: remoteNotification
            )
        }

        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    // MARK: - Remote Notification Registration

    override func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        PushNotifications.didRegisterForRemoteNotificationsWithDeviceToken(deviceToken)
        super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    }

    override func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        PushNotifications.didFailToRegisterForRemoteNotificationsWithError(error)
        super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    }

    // MARK: - Background Notification Handling

    override func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("Background remote notification received: \(userInfo)")

        // Post for React Native bridge to handle
        NotificationCenter.default.post(
            name: NSNotification.Name("APNsNotificationReceived"),
            object: nil,
            userInfo: userInfo
        )

        // Let Expo handle the notification as well
        super.application(
            application,
            didReceiveRemoteNotification: userInfo,
            fetchCompletionHandler: completionHandler
        )
    }
}
