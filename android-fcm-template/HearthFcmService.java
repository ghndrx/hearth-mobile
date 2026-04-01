package io.hearth.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * FCM Service for Hearth Mobile
 * 
 * Handles Firebase Cloud Messaging for Android push notifications.
 * This service is registered in AndroidManifest.xml and receives
 * push notifications when the app is in the background or closed.
 * 
 * For Expo managed workflow, expo-notifications handles foreground notifications,
 * but this service handles background FCM messages.
 */
class HearthFcmService : FirebaseMessagingService() {

    companion object {
        const val TAG = "HearthFcmService"
        
        // Notification channel IDs
        const val CHANNEL_HIGH_PRIORITY = "fcm-high-priority"
        const val CHANNEL_DEFAULT = "fcm-default"
        const val CHANNEL_MESSAGES = "fcm-messages"
        const val CHANNEL_SOCIAL = "fcm-social"
        const val CHANNEL_URGENT = "fcm-urgent"
        
        // Notification IDs
        const val NOTIFICATION_ID_BASE = 1000
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    /**
     * Handle new FCM token generation
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        android.util.Log.d(TAG, "New FCM token received: ${token.substring(0, minOf(20, token.length))}...")
        
        // Send token to React Native via broadcast
        sendTokenToReactNative(token)
    }

    /**
     * Handle incoming FCM messages
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        android.util.Log.d(TAG, "FCM message received from: ${remoteMessage.from}")
        
        // Check if message contains data payload
        if (remoteMessage.data.isNotEmpty()) {
            android.util.Log.d(TAG, "Message data payload: ${remoteMessage.data}")
            handleDataMessage(remoteMessage.data)
        }
        
        // Check if message contains notification payload
        remoteMessage.notification?.let { notification ->
            android.util.Log.d(TAG, "Message notification body: ${notification.body}")
            showNotification(
                title = notification.title ?: "Hearth",
                body = notification.body ?: "",
                data = remoteMessage.data
            )
        }
    }

    /**
     * Create notification channels for Android 8+
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // High priority channel for DMs and mentions
            val highPriorityChannel = NotificationChannel(
                CHANNEL_HIGH_PRIORITY,
                "High Priority",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Direct messages and mentions"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                lightColor = android.graphics.Color.parseColor("#5865F2")
                enableLights(true)
            }
            
            // Default channel
            val defaultChannel = NotificationChannel(
                CHANNEL_DEFAULT,
                "Default",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General notifications"
                enableVibration(true)
                lightColor = android.graphics.Color.parseColor("#5865F2")
            }
            
            // Messages channel
            val messagesChannel = NotificationChannel(
                CHANNEL_MESSAGES,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Channel and direct messages"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                lightColor = android.graphics.Color.parseColor("#5865F2")
            }
            
            // Social channel
            val socialChannel = NotificationChannel(
                CHANNEL_SOCIAL,
                "Social",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Friend requests and social updates"
                lightColor = android.graphics.Color.parseColor("#57F287")
            }
            
            // Urgent channel for calls
            val urgentChannel = NotificationChannel(
                CHANNEL_URGENT,
                "Urgent",
                NotificationManager.IMPORTANCE_MAX
            ).apply {
                description = "Calls and critical notifications"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
                lightColor = android.graphics.Color.parseColor("#ED4245")
                setBypassDnd(true)
            }
            
            notificationManager.createNotificationChannels(
                listOf(highPriorityChannel, defaultChannel, messagesChannel, socialChannel, urgentChannel)
            )
        }
    }

    /**
     * Handle data-only messages
     */
    private fun handleDataMessage(data: Map<String, String>) {
        val type = data["type"] ?: "default"
        
        when (type) {
            "message", "dm", "mention", "reply" -> {
                // Show notification with message content
                showNotification(
                    title = data["title"] ?: "New message",
                    body = data["body"] ?: "",
                    data = data,
                    channelId = CHANNEL_HIGH_PRIORITY
                )
            }
            "friend_request" -> {
                showNotification(
                    title = data["title"] ?: "Friend request",
                    body = data["body"] ?: "",
                    data = data,
                    channelId = CHANNEL_SOCIAL
                )
            }
            "call" -> {
                showNotification(
                    title = data["title"] ?: "Incoming call",
                    body = data["body"] ?: "",
                    data = data,
                    channelId = CHANNEL_URGENT
                )
            }
            else -> {
                showNotification(
                    title = data["title"] ?: "Hearth",
                    body = data["body"] ?: "",
                    data = data,
                    channelId = CHANNEL_DEFAULT
                )
            }
        }
    }

    /**
     * Show notification
     */
    private fun showNotification(
        title: String,
        body: String,
        data: Map<String, String>,
        channelId: String = CHANNEL_DEFAULT
    ) {
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            data.forEach { (key, value) -> putExtra(key, value) }
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .apply {
                // Add vibration pattern for high priority
                if (channelId == CHANNEL_HIGH_PRIORITY || channelId == CHANNEL_URGENT) {
                    setVibrate(longArrayOf(0, 250, 250, 250))
                }
            }
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, notification)
    }

    /**
     * Send FCM token to React Native
     */
    private fun sendTokenToReactNative(token: String) {
        // Post notification for React Native to listen to
        android.support.v4.content.LocalBroadcastManager.getInstance(this).sendBroadcast(
            Intent("fcm_token_refresh").apply {
                putExtra("token", token)
                setPackage(packageName)
            }
        )
    }
}
