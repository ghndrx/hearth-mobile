package com.hearth.mobile

import android.app.Application
import android.util.Log

/**
 * PN-006: Application class with background delivery initialization.
 */
class MainApplication : Application() {

    companion object {
        private const val TAG = "HearthMobile"
    }

    override fun onCreate() {
        super.onCreate()

        // Schedule periodic background delivery processing (PN-006)
        try {
            BackgroundDeliveryWorker.schedule(this)
            Log.d(TAG, "Background delivery worker scheduled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule background delivery worker", e)
        }
    }
}
