# Voice Messages Feature

## Overview

Hearth Mobile now includes a comprehensive voice messaging system with recording, playback, and waveform visualization capabilities.

## Components

### 1. VoiceRecorder

Full-featured voice message recorder with real-time waveform visualization and preview playback.

**Features:**
- Audio recording with permissions handling
- Real-time waveform visualization (30 animated bars)
- Pause/resume recording
- Preview playback before sending
- Slide-to-cancel gesture (swipe left > 120px)
- Maximum duration limit (default: 5 minutes)
- Platform-specific audio formats (M4A on iOS, MP4 on Android)
- Haptic feedback support

**Usage:**
```tsx
import { VoiceRecorder, type VoiceRecording } from '@/components/chat';

function MyComponent() {
  const handleRecordingComplete = (recording: VoiceRecording) => {
    console.log('Recording:', recording);
    // recording.uri - file URI
    // recording.duration - duration in seconds
    // recording.size - file size in bytes
    // recording.mimeType - audio/x-m4a or audio/mp4
  };

  const handleCancel = () => {
    console.log('Recording cancelled');
  };

  return (
    <VoiceRecorder
      onRecordingComplete={handleRecordingComplete}
      onCancel={handleCancel}
      maxDuration={300} // 5 minutes
      showCancelHint={true}
      hapticsEnabled={true}
    />
  );
}
```

### 2. VoiceMessageBubble

Displays voice message attachments with playback controls and waveform visualization.

**Features:**
- Waveform visualization (30 bars, pre-generated)
- Play/pause controls
- Progress tracking and seeking
- Duration display
- File size display
- "Listened" status indicator
- Different styling for sent vs received messages
- Loading state during audio load

**Usage:**
```tsx
import { VoiceMessageBubble } from '@/components/chat';

function MessageList() {
  return (
    <VoiceMessageBubble
      uri="file:///path/to/audio.m4a"
      duration={45} // seconds
      size={125000} // bytes
      isCurrentUser={false}
      isListened={false}
      onPlay={() => console.log('Started playing')}
      onComplete={() => console.log('Finished playing')}
    />
  );
}
```

### 3. VoiceRecordButton

Simple microphone button that triggers the voice recorder.

**Features:**
- Tap to start recording
- Automatically shows VoiceRecorder when pressed
- Configurable size (sm, md, lg)
- Disabled state support
- Branded amber background

**Usage:**
```tsx
import { VoiceRecordButton } from '@/components/chat';

function ComposeBar() {
  const handleRecordingComplete = (recording: VoiceRecording) => {
    // Send the voice message
    sendVoiceMessage(recording);
  };

  return (
    <VoiceRecordButton
      onRecordingComplete={handleRecordingComplete}
      size="md"
      hapticsEnabled={true}
      maxDuration={300}
      disabled={false}
    />
  );
}
```

## Integration with MessageComposer

The `MessageComposer` component already includes voice recording support:

```tsx
import { MessageComposer } from '@/components/chat';

function ChatScreen() {
  const handleSendVoice = (recording: VoiceRecording) => {
    // Upload and send voice message
    uploadVoiceMessage(recording);
  };

  return (
    <MessageComposer
      onSend={(message, attachments) => {
        // Handle text/attachment messages
      }}
      onSendVoice={handleSendVoice}
      voiceEnabled={true} // Enable voice button
      hapticsEnabled={true}
      // ... other props
    />
  );
}
```

When `voiceEnabled={true}` and there's no text or attachments, a voice recorder button appears in place of the send button.

## Permissions

### iOS
Add to `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app needs access to your microphone to record voice messages."
      }
    }
  }
}
```

### Android
Add to `app.json`:
```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
}
```

## Audio Configuration

The voice recorder uses `expo-av` with high-quality recording presets:

- **iOS**: `.m4a` format (AAC encoding)
- **Android**: `.mp4` format (AAC encoding)
- **Sample Rate**: 44.1 kHz
- **Bitrate**: 128 kbps
- **Channels**: Mono

## File Storage

Voice recordings are stored temporarily in the app's cache directory. When sent, they should be:

1. Uploaded to your server/CDN
2. The local temporary file deleted
3. The server URL stored with the message

Example:
```tsx
const handleRecordingComplete = async (recording: VoiceRecording) => {
  try {
    // Upload to server
    const uploadedUrl = await uploadFile(recording.uri, {
      mimeType: recording.mimeType,
      fileName: `voice_${Date.now()}.m4a`,
    });

    // Send message with voice attachment
    await sendMessage({
      type: 'voice',
      url: uploadedUrl,
      duration: recording.duration,
      size: recording.size,
    });

    // Clean up local file
    await FileSystem.deleteAsync(recording.uri, { idempotent: true });
  } catch (error) {
    console.error('Failed to send voice message:', error);
  }
};
```

## Best Practices

### 1. File Size Limits
- Recommend max 5 minutes (default)
- Typical size: ~1MB per minute
- Show file size in UI

### 2. Network Handling
- Upload before marking as "sent"
- Show upload progress
- Retry failed uploads
- Cache failed uploads in offline queue

### 3. Playback Management
- Only one voice message plays at a time
- Pause when app backgrounded
- Handle audio interruptions (calls, other apps)
- Update "listened" status on server

### 4. UI/UX
- Show waveform for visual feedback
- Display duration prominently
- Indicate "unlistened" messages
- Allow seeking through playback
- Provide cancel option during recording

### 5. Accessibility
- Add VoiceOver/TalkBack labels
- Announce playback state changes
- Keyboard navigation support (if applicable)

## Troubleshooting

### "Recording failed" error
- Check microphone permissions
- Verify `expo-av` is installed
- Ensure audio session is configured correctly

### No waveform showing
- Waveform is generated randomly for visualization
- In production, analyze actual audio data
- Use libraries like `react-native-audio-waveform` for real analysis

### Playback issues
- Ensure file exists at URI
- Check audio format compatibility
- Verify audio session allows playback

### High file sizes
- Reduce recording quality if needed
- Use compression before upload
- Consider server-side transcoding

## Dependencies

- `expo-av`: Audio recording and playback
- `expo-file-system`: File management
- `expo-haptics`: Haptic feedback
- `@expo/vector-icons`: Icons

## Future Enhancements

- [ ] Real-time waveform analysis during recording
- [ ] Audio filters (noise reduction, etc.)
- [ ] Playback speed control (1.5x, 2x)
- [ ] Waveform seeking by tapping
- [ ] Voice message transcription
- [ ] Forward voice messages
- [ ] Multiple voice message queue playback
