import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MediaPickerModal } from '../../components/camera';
import { useFileUpload } from '../../lib/hooks';
import { LocalFile } from '../../lib/types';

export default function DMsScreen() {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<LocalFile[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    selectedFiles,
    uploadJobs,
    isUploading,
    overallProgress,
    startUpload,
    removeFile,
    clearCompleted,
    formatSize,
  } = useFileUpload({
    onUploadComplete: (uploadId, response) => {
      Alert.alert('Upload Complete', `File uploaded successfully: ${response.filename}`);
    },
    onUploadError: (uploadId, error) => {
      Alert.alert('Upload Error', error);
    },
  });

  const handleMediaSelect = (files: LocalFile[]) => {
    setCapturedMedia(prev => [...prev, ...files]);
    setShowMediaPicker(false);

    // Show success message
    Alert.alert(
      'Media Selected',
      `${files.length} file(s) selected. You can now upload them.`
    );
  };

  const handleUploadAll = async () => {
    try {
      await startUpload();
      Alert.alert('Upload Started', 'Your files are being uploaded...');
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to start upload');
    }
  };

  const handleRemoveMedia = (localId: string) => {
    setCapturedMedia(prev => prev.filter(file => file.localId !== localId));
    removeFile(localId);
  };

  const colors = {
    background: isDark ? '#1e1f22' : '#ffffff',
    surface: isDark ? '#2b2d31' : '#f3f4f6',
    border: isDark ? '#404249' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#949ba4' : '#6b7280',
    primary: '#5865f2',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8
          }}>
            MS-002 Camera Demo
          </Text>
          <Text style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22
          }}>
            Test camera integration and photo capture functionality
          </Text>
        </View>

        {/* Camera Button */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginBottom: 24,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
          onPress={() => setShowMediaPicker(true)}
        >
          <Ionicons name="camera" size={24} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
            Take Photo or Select Media
          </Text>
        </TouchableOpacity>

        {/* Selected Media */}
        {capturedMedia.length > 0 && (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}>
              Selected Media ({capturedMedia.length})
            </Text>

            {capturedMedia.map((file) => (
              <View
                key={file.localId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                {file.fileType === 'image' ? (
                  <Image
                    source={{ uri: file.uri }}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 8,
                      backgroundColor: colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="videocam" size={24} color="white" />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: colors.text
                  }}>
                    {file.name}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: colors.textSecondary
                  }}>
                    {formatSize(file.size)} • {file.fileType}
                  </Text>
                  {file.width && file.height && (
                    <Text style={{
                      fontSize: 12,
                      color: colors.textSecondary
                    }}>
                      {file.width} × {file.height}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleRemoveMedia(file.localId)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#ff4757',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}

            {capturedMedia.length > 0 && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#10b981',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  marginTop: 12,
                }}
                onPress={handleUploadAll}
                disabled={isUploading}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  {isUploading ? `Uploading... ${overallProgress}%` : 'Upload All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Upload Status */}
        {uploadJobs.length > 0 && (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}>
                Upload Status
              </Text>
              <TouchableOpacity onPress={clearCompleted}>
                <Text style={{ color: colors.primary, fontSize: 14 }}>
                  Clear Completed
                </Text>
              </TouchableOpacity>
            </View>

            {uploadJobs.map((job) => (
              <View
                key={job.uploadId}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: colors.text,
                    flex: 1,
                  }}>
                    {job.localFile.name}
                  </Text>
                  <View style={{
                    backgroundColor:
                      job.status === 'completed' ? '#10b981' :
                      job.status === 'failed' ? '#ff4757' :
                      job.status === 'uploading' ? '#3b82f6' :
                      colors.textSecondary,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{ color: 'white', fontSize: 12 }}>
                      {job.status} {job.status === 'uploading' ? `${job.progress}%` : ''}
                    </Text>
                  </View>
                </View>
                {job.error && (
                  <Text style={{
                    fontSize: 12,
                    color: '#ff4757',
                    marginTop: 4
                  }}>
                    {job.error}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Info */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
          }}>
            Features Demonstrated
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
          }}>
            • Camera photo capture{'\n'}
            • Gallery media selection{'\n'}
            • File upload queue management{'\n'}
            • Real-time upload progress{'\n'}
            • Error handling and retry logic{'\n'}
            • File compression and thumbnails
          </Text>
        </View>
      </ScrollView>

      {/* Media Picker Modal */}
      <MediaPickerModal
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onMediaSelect={handleMediaSelect}
        allowMultiple={true}
        enableVideo={true}
        title="Select Media"
      />
    </SafeAreaView>
  );
}
