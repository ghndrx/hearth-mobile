package com.hearth.mobile

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * PN-006: FCM background message service.
 *
 * Handles messages received when the app is in the background or killed.
 * Tracks delivery receipts and triggers WorkManager for retry processing.
 */
class HearthFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "HearthFCMService"
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Message received from: ${remoteMessage.from}")

        // Track delivery receipt
        val notificationId = remoteMessage.data["notificationId"]
        if (notificationId != null) {
            val prefs = getSharedPreferences("hearth_delivery", MODE_PRIVATE)
            prefs.edit()
                .putLong("delivery_$notificationId", System.currentTimeMillis())
                .apply()
            Log.d(TAG, "Tracked delivery for $notificationId")
        }

        // If the message contains a data payload, broadcast to React Native
        if (remoteMessage.data.isNotEmpty()) {
            val intent = android.content.Intent("com.hearth.mobile.FCM_MESSAGE")
            for ((key, value) in remoteMessage.data) {
                intent.putExtra(key, value)
            }
            sendBroadcast(intent)
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")

        // Broadcast token refresh to React Native
        val intent = android.content.Intent("com.hearth.mobile.FCM_TOKEN_REFRESH")
        intent.putExtra("token", token)
        sendBroadcast(intent)
    }

    override fun onDeletedMessages() {
        super.onDeletedMessages()
        Log.d(TAG, "FCM messages deleted on server, scheduling immediate sync")

        // Trigger immediate background delivery to catch up
        BackgroundDeliveryWorker.scheduleImmediate(applicationContext)
    }
}
