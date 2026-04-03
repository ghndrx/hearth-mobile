package com.hearth.mobile

import android.content.Context
import android.util.Log
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * PN-006: WorkManager worker for reliable background notification delivery.
 *
 * Executes periodic background processing to retry failed notification
 * deliveries. Runs even when the app is killed or device is restarted.
 */
class BackgroundDeliveryWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "BackgroundDeliveryWorker"
        private const val UNIQUE_WORK_NAME = "hearth_notification_delivery"

        /**
         * Schedule periodic background delivery work.
         * Uses a 15-minute interval (WorkManager minimum).
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<BackgroundDeliveryWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )

            Log.d(TAG, "Background delivery work scheduled")
        }

        /**
         * Schedule a one-time immediate delivery attempt.
         */
        fun scheduleImmediate(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<BackgroundDeliveryWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(workRequest)
            Log.d(TAG, "Immediate delivery work scheduled")
        }

        /**
         * Cancel all scheduled delivery work.
         */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME)
            Log.d(TAG, "Background delivery work cancelled")
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Background delivery work started")

        return try {
            // Send broadcast to React Native to trigger JS-side retry queue processing
            val intent = android.content.Intent("com.hearth.mobile.BACKGROUND_DELIVERY")
            applicationContext.sendBroadcast(intent)

            Log.d(TAG, "Background delivery work completed")
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Background delivery work failed", e)
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
