# Android FCM Template Files

This directory contains native Android files required for Firebase Cloud Messaging (FCM) integration.

## Files

### 1. `AndroidManifest.xml`
Android manifest with FCM service registration and required permissions.

**Required permissions:**
- `android.permission.INTERNET` - Network access
- `android.permission.VIBRATE` - Vibration for notifications
- `android.permission.RECEIVE_BOOT_COMPLETED` - Reschedule notifications after reboot
- `android.permission.POST_NOTIFICATIONS` - Android 13+ notification permission
- `android.permission.WAKE_LOCK` - Keep device awake for notification handling

**FCM Service registration:**
- `HearthFcmService` - Handles FCM token refresh and background push notifications

### 2. `HearthFcmService.java`
Native Android Firebase Cloud Messaging service implementation.

**Features:**
- Handles FCM token generation and refresh
- Processes incoming push notifications
- Creates notification channels for Android 8+
- Supports different notification priorities (high, default, urgent)
- Deep links to appropriate screens based on notification data

## Installation

After running `npx expo prebuild`, copy these files to the Android project:

1. Copy `AndroidManifest.xml` to `android/app/src/main/`
2. Copy `HearthFcmService.java` to `android/app/src/main/java/io/hearth/mobile/`
3. Create notification icon resource at `android/app/src/main/res/drawable/notification_icon.xml`
4. Create notification color resource at `android/app/src/main/res/values/colors.xml`

## google-services.json

You must obtain a valid `google-services.json` from the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select your project
3. Go to Project Settings > Your apps > Android app
4. Add your Android package name: `io.hearth.mobile`
5. Download `google-services.json`
6. Place it in the project root directory (same level as `app.json`)

## expo-notifications Plugin Configuration

The `app.json` already includes the `expo-notifications` plugin with FCM configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#5865f2",
          "sounds": [
            "./assets/sounds/notification-default.wav"
          ]
        }
      ]
    ]
  }
}
```

## Testing

After prebuild and configuration:

1. Build the Android APK: `npx expo run:android`
2. Install on device
3. Check Logcat for FCM registration: `adb logcat | grep HearthFcmService`
4. Verify push token is logged

## Troubleshooting

### FCM service not receiving notifications
1. Verify `google-services.json` is valid and placed correctly
2. Check that package name matches: `io.hearth.mobile`
3. Ensure FCM is properly configured in Firebase Console
4. Check AndroidManifest.xml service registration

### Token not being sent to backend
1. Verify `registerDevice` API endpoint exists and is accessible
2. Check network permissions in AndroidManifest
3. Check Expo push token is being obtained via `Notifications.getExpoPushTokenAsync()`

### Notifications not showing
1. Check notification channel creation in `HearthFcmService`
2. Verify Android version - Android 8+ requires notification channels
3. Check if app is in "Don't disturb" mode
