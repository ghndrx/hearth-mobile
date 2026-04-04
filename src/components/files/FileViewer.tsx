import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Share,
  Alert,
  useColorScheme,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
// import * as Sharing from 'expo-sharing';
import { FileAttachment, FileAttachmentService } from '../../services/files';

interface FileViewerProps {
  visible: boolean;
  file: FileAttachment | null;
  onClose: () => void;
  onDelete?: () => void;
  onSave?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const FileViewer: React.FC<FileViewerProps> = ({
  visible,
  file,
  onClose,
  onDelete,
  onSave,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const fileService = FileAttachmentService.getInstance();

  // Animation values for image zoom/pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetTransform = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        runOnJS(resetTransform)();
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Exclusive(doubleTapGesture, panGesture)
  );

  useEffect(() => {
    if (!visible) {
      resetTransform();
    }
  }, [visible]);

  const handleSave = async () => {
    if (!file || file.type !== 'image') return;

    try {
      setLoading(true);

      if (Platform.OS === 'ios') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to save photos to your library.');
          return;
        }

        await MediaLibrary.saveToLibraryAsync(file.uri);
        Alert.alert('Success', 'Image saved to your photo library');
      } else {
        // Android - copy to Downloads folder
        const downloadDir = `${FileSystem.documentDirectory}Download/`;
        const dirInfo = await FileSystem.getInfoAsync(downloadDir);

        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
        }

        const fileName = file.name || `image_${Date.now()}.jpg`;
        const localUri = `${downloadDir}${fileName}`;
        await FileSystem.copyAsync({ from: file.uri, to: localUri });

        Alert.alert('Success', `File saved to Downloads/${fileName}`);
      }

      onSave?.();
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!file) return;

    try {
      setLoading(true);

      // Use React Native Share
      await Share.share({
        url: file.uri,
        title: file.name,
      });
    } catch (error) {
      console.error('Error sharing file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete ${file?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  const renderImageViewer = () => (
    <GestureDetector gesture={composedGesture}>
      <Animated.View className="flex-1 items-center justify-center">
        <Animated.Image
          source={{ uri: file!.uri }}
          style={[
            {
              width: screenWidth,
              height: screenHeight * 0.7,
            },
            animatedStyle,
          ]}
          resizeMode="contain"
          onLoad={(e) => {
            setImageSize({
              width: e.nativeEvent.source.width,
              height: e.nativeEvent.source.height,
            });
          }}
        />
      </Animated.View>
    </GestureDetector>
  );

  const renderDocumentViewer = () => (
    <View className="flex-1 items-center justify-center p-8">
      <View
        className={`p-6 rounded-xl ${
          isDark ? 'bg-gray-800' : 'bg-gray-100'
        } items-center`}
      >
        <View
          className="w-16 h-16 rounded-xl items-center justify-center mb-4"
          style={{ backgroundColor: fileService.getFileColor(file!) + '20' }}
        >
          <Ionicons
            name={fileService.getFileIcon(file!) as keyof typeof Ionicons.glyphMap}
            size={32}
            color={fileService.getFileColor(file!)}
          />
        </View>

        <Text
          className={`text-lg font-semibold text-center mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {file!.name}
        </Text>

        <Text
          className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          } text-center mb-4`}
        >
          {fileService.getCategoryDisplayName(file!.category)} • {fileService.formatFileSize(file!.size)}
        </Text>

        <TouchableOpacity
          onPress={handleShare}
          className="bg-blue-500 px-6 py-3 rounded-lg"
          disabled={loading}
        >
          <Text className="text-white font-medium">Open with External App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (!file) return null;

    switch (file.type) {
      case 'image':
        return renderImageViewer();
      case 'video':
        // In a full implementation, you would use react-native-video or expo-av
        return renderDocumentViewer();
      case 'audio':
        // In a full implementation, you would use expo-av for audio playback
        return renderDocumentViewer();
      default:
        return renderDocumentViewer();
    }
  };

  if (!file) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-1 mx-4">
              <Text
                className="text-white text-sm font-medium text-center"
                numberOfLines={1}
              >
                {file.name}
              </Text>
              <Text className="text-white/60 text-xs text-center">
                {fileService.formatFileSize(file.size)}
                {imageSize.width > 0 && (
                  <>
                    {' • '}
                    {imageSize.width} × {imageSize.height}
                  </>
                )}
              </Text>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                onPress={handleShare}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-2"
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size={20} color="white" />
                ) : (
                  <Ionicons name="share-outline" size={22} color="white" />
                )}
              </TouchableOpacity>

              {file.type === 'image' && (
                <TouchableOpacity
                  onPress={handleSave}
                  className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                  disabled={loading}
                >
                  <Ionicons name="download-outline" size={22} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <View className="flex-1">
            {renderContent()}
          </View>

          {/* Footer Actions */}
          <View className="flex-row items-center justify-center py-4 space-x-6">
            <TouchableOpacity
              onPress={handleShare}
              className="w-12 h-12 rounded-full bg-white/10 items-center justify-center"
              disabled={loading}
            >
              <Ionicons name="open-outline" size={22} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {/* Bookmark functionality */}}
              className="w-12 h-12 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="bookmark-outline" size={22} color="white" />
            </TouchableOpacity>

            {onDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                className="w-12 h-12 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};