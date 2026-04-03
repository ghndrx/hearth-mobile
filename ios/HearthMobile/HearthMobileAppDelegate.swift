//
//  HearthMobileAppDelegate.swift
//  HearthMobile
//
//  PN-006: AppDelegate with background notification processing support.
//

import Foundation
import UIKit
import UserNotifications

@objc(HearthMobileAppDelegate)
class HearthMobileAppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Set up push notification delegate
        PushNotifications.setupForegroundHandler()

        // Register background tasks (PN-006)
        BackgroundNotificationHandler.registerBackgroundTasks()

        // Enable background fetch
        application.setMinimumBackgroundFetchInterval(
            UIApplication.backgroundFetchIntervalMinimum
        )

        // Schedule initial background delivery task
        BackgroundNotificationHandler.scheduleBackgroundDelivery()

        return true
    }

    // MARK: - Remote Notification Registration

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        PushNotifications.didRegisterForRemoteNotificationsWithDeviceToken(deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        PushNotifications.didFailToRegisterForRemoteNotificationsWithError(error)
    }

    // MARK: - Background Notification Processing (PN-006)

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        BackgroundNotificationHandler.didReceiveRemoteNotification(
            userInfo,
            fetchCompletionHandler: completionHandler
        )
    }

    // MARK: - Background Fetch (PN-006)

    func application(
        _ application: UIApplication,
        performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        BackgroundNotificationHandler.performBackgroundFetch(
            completionHandler: completionHandler
        )
    }
}
