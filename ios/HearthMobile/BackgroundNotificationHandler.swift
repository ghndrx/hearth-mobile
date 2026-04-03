//
//  BackgroundNotificationHandler.swift
//  HearthMobile
//
//  PN-006: Background notification processing for iOS.
//  Handles background fetch, remote-notification wakeups,
//  and background processing tasks.
//

import Foundation
import UIKit
import UserNotifications
import BackgroundTasks

@objc(BackgroundNotificationHandler)
class BackgroundNotificationHandler: NSObject {

    /// Background task identifier for notification delivery processing
    static let deliveryTaskIdentifier = "com.hearth.mobile.notification-delivery"

    // MARK: - AppDelegate Integration

    /**
     * Handle background remote notification.
     * Called from AppDelegate when a silent/background push arrives.
     */
    @objc
    static func didReceiveRemoteNotification(
        _ userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("[BackgroundNotificationHandler] Received background notification")

        // Track delivery receipt
        if let notificationId = userInfo["notificationId"] as? String {
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "delivery_\(notificationId)")
            print("[BackgroundNotificationHandler] Tracked delivery for \(notificationId)")
        }

        // Post to React Native bridge
        NotificationCenter.default.post(
            name: NSNotification.Name("BackgroundNotificationReceived"),
            object: nil,
            userInfo: userInfo
        )

        completionHandler(.newData)
    }

    /**
     * Handle background fetch event.
     * Called by the system periodically to allow the app to fetch new data.
     */
    @objc
    static func performBackgroundFetch(
        completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("[BackgroundNotificationHandler] Background fetch started")

        // Post to React Native bridge so JS-side retry queue can process
        NotificationCenter.default.post(
            name: NSNotification.Name("BackgroundFetchTriggered"),
            object: nil
        )

        // Give JS side time to process, then complete
        DispatchQueue.main.asyncAfter(deadline: .now() + 25) {
            completionHandler(.newData)
        }
    }

    // MARK: - BGTaskScheduler (iOS 13+)

    /**
     * Register background tasks with BGTaskScheduler.
     * Call this from application(_:didFinishLaunchingWithOptions:).
     */
    @objc
    static func registerBackgroundTasks() {
        if #available(iOS 13.0, *) {
            BGTaskScheduler.shared.register(
                forTaskWithIdentifier: deliveryTaskIdentifier,
                using: nil
            ) { task in
                handleBackgroundDeliveryTask(task as! BGProcessingTask)
            }
            print("[BackgroundNotificationHandler] Background tasks registered")
        }
    }

    /**
     * Schedule the next background delivery processing task.
     */
    @objc
    static func scheduleBackgroundDelivery() {
        if #available(iOS 13.0, *) {
            let request = BGProcessingTaskRequest(identifier: deliveryTaskIdentifier)
            request.requiresNetworkConnectivity = true
            request.requiresExternalPower = false
            request.earliestBeginDate = Date(timeIntervalSinceNow: 5 * 60) // 5 minutes

            do {
                try BGTaskScheduler.shared.submit(request)
                print("[BackgroundNotificationHandler] Background delivery scheduled")
            } catch {
                print("[BackgroundNotificationHandler] Failed to schedule: \(error)")
            }
        }
    }

    // MARK: - Private

    @available(iOS 13.0, *)
    private static func handleBackgroundDeliveryTask(_ task: BGProcessingTask) {
        print("[BackgroundNotificationHandler] Processing background delivery task")

        // Set expiration handler
        task.expirationHandler = {
            print("[BackgroundNotificationHandler] Task expired")
            task.setTaskCompleted(success: false)
        }

        // Notify React Native bridge
        NotificationCenter.default.post(
            name: NSNotification.Name("BackgroundDeliveryTaskTriggered"),
            object: nil
        )

        // Allow processing time then mark complete
        DispatchQueue.main.asyncAfter(deadline: .now() + 25) {
            task.setTaskCompleted(success: true)
            // Schedule next run
            scheduleBackgroundDelivery()
        }
    }
}
