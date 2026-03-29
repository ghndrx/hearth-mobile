# Firebase Configuration Files

## Important Notice

The Firebase configuration files in this project (`google-services.json` and `ios/GoogleService-Info.plist`) are **placeholder files** for development purposes.

### For Production Setup

1. **Create a Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Create a new project or use existing one
   - Enable Firebase Cloud Messaging (FCM)

2. **Add Android App:**
   - Add Android app with package name: `io.hearth.mobile`
   - Download the `google-services.json` file
   - Replace the placeholder file with the downloaded one

3. **Add iOS App:**
   - Add iOS app with bundle ID: `io.hearth.mobile`
   - Download the `GoogleService-Info.plist` file
   - Replace the placeholder file in `ios/` directory

4. **Configure APNs (iOS):**
   - Upload your APNs certificates or keys to Firebase console
   - Configure iOS app settings in Firebase

### Development

The placeholder files allow the app to build and run without real Firebase credentials. Push notifications will not work until real configuration files are provided.

### Security

- **Never commit real Firebase configuration files to version control**
- Add real config files to `.gitignore` if needed
- Use environment-specific configurations for different stages