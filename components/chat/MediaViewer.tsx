/**
 * Full-Screen Media Viewer Component
 * Displays images and videos with zoom, pan, swipe navigation,
 * sharing, and downloading capabilities
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Share,
  Alert,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;

export interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
  width?: number;
  height?: number;
  size?: number;
  senderName?: string;
  timestamp?: Date;
  thumbnailUri?: string;
}

interface MediaViewerProps {
  /** Whether the viewer is visible */
  visible: boolean;
  /** Array of media items to display */
  media: MediaItem[];
  /** Initial index to display */
  initialIndex?: number;
  /** Callback when viewer is closed */
  onClose: () => void;
  /** Callback when index changes */
  onIndexChange?: (index: number) => void;
  /** Show sender info overlay */
  showSenderInfo?: boolean;
}

interface ZoomableImageProps {
  source: string;
  onSingleTap: () => void;
  isActive: boolean;
}

function ZoomableImage({ source, onSingleTap, isActive }: ZoomableImageProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const isZoomed = useRef(false);

  // Reset when becoming inactive
  useEffect(() => {
    if (!isActive) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      lastScale.current = 1;
      lastTranslateX.current = 0;
      lastTranslateY.current = 0;
      isZoomed.current = false;
    }
  }, [isActive, scale, translateX, translateY]);

  const handleDoubleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isZoomed.current) {
      // Zoom out
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      lastScale.current = 1;
      lastTranslateX.current = 0;
      lastTranslateY.current = 0;
      isZoomed.current = false;
    } else {
      // Zoom in
      Animated.spring(scale, { toValue: 2, useNativeDriver: true }).start();
      lastScale.current = 2;
      isZoomed.current = true;
    }
  }, [scale, translateX, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only allow panning when zoomed
        return isZoomed.current && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
      },
      onPanResponderGrant: () => {
        translateX.setOffset(lastTranslateX.current);
        translateY.setOffset(lastTranslateY.current);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (isZoomed.current) {
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        translateX.flattenOffset();
        translateY.flattenOffset();
        
        if (isZoomed.current) {
          lastTranslateX.current += gestureState.dx;
          lastTranslateY.current += gestureState.dy;
          
          // Bound the pan values
          const maxTranslateX = (SCREEN_WIDTH * (lastScale.current - 1)) / 2;
          const maxTranslateY = (SCREEN_HEIGHT * (lastScale.current - 1)) / 2;
          
          let finalX = lastTranslateX.current;
          let finalY = lastTranslateY.current;
          
          if (Math.abs(finalX) > maxTranslateX) {
            finalX = finalX > 0 ? maxTranslateX : -maxTranslateX;
          }
          if (Math.abs(finalY) > maxTranslateY) {
            finalY = finalY > 0 ? maxTranslateY : -maxTranslateY;
          }
          
          if (finalX !== lastTranslateX.current || finalY !== lastTranslateY.current) {
            Animated.spring(translateX, { toValue: finalX, useNativeDriver: true }).start();
            Animated.spring(translateY, { toValue: finalY, useNativeDriver: true }).start();
            lastTranslateX.current = finalX;
            lastTranslateY.current = finalY;
          }
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      handleDoubleTap();
    } else {
      // Single tap after delay
      setTimeout(() => {
        if (Date.now() - lastTap.current >= DOUBLE_TAP_DELAY) {
          onSingleTap();
        }
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current = now;
  }, [handleDoubleTap, onSingleTap]);

  return (
    <Animated.View
      style={[
        styles.zoomableContainer,
        {
          transform: [
            { scale },
            { translateX },
            { translateY },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        style={styles.imageContainer}
      >
        <Image
          source={source}
          style={styles.fullImage}
          contentFit="contain"
          transition={200}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

function VideoPlayer({
  source,
  onSingleTap,
  isActive,
  thumbnailUri,
}: {
  source: string;
  onSingleTap: () => void;
  isActive: boolean;
  thumbnailUri?: string;
}) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isPlaying = status?.isLoaded && status.isPlaying;

  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isActive]);

  const togglePlayPause = useCallback(async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  }, [isPlaying]);

  const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = status?.isLoaded
    ? (status.positionMillis / (status.durationMillis || 1)) * 100
    : 0;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onSingleTap}
      style={styles.videoContainer}
    >
      <Video
        ref={videoRef}
        source={{ uri: source }}
        posterSource={thumbnailUri ? { uri: thumbnailUri } : undefined}
        usePoster={!!thumbnailUri}
        posterStyle={styles.videoPoster}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping
        onPlaybackStatusUpdate={setStatus}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.videoOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {/* Play/Pause button */}
      {!isLoading && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayPause}
          activeOpacity={0.8}
        >
          <View style={styles.playButtonInner}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={40}
              color="#ffffff"
              style={isPlaying ? {} : { marginLeft: 4 }}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Progress bar */}
      {status?.isLoaded && (
        <View style={styles.videoProgress}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.durationText}>
            {formatDuration(status.positionMillis)} / {formatDuration(status.durationMillis || 0)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MediaViewer({
  visible,
  media,
  initialIndex = 0,
  onClose,
  onIndexChange,
  showSenderInfo = true,
}: MediaViewerProps) {
  const colorScheme = useColorScheme();
  const _isDark = colorScheme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const scrollX = useRef(new Animated.Value(initialIndex * SCREEN_WIDTH)).current;
  const flatListRef = useRef<Animated.FlatList<MediaItem>>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMedia = media[currentIndex];

  // Reset to initial index when media changes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      scrollX.setValue(initialIndex * SCREEN_WIDTH);
      flatListRef.current?.scrollToOffset({
        offset: initialIndex * SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [visible, initialIndex, scrollX]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      hideControlsTimer.current = setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }, 3000);
    }

    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [showControls, controlsOpacity]);

  const toggleControls = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }

    if (showControls) {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      setShowControls(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showControls, controlsOpacity]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < media.length) {
        setCurrentIndex(newIndex);
        onIndexChange?.(newIndex);
      }
    },
    [currentIndex, media.length, onIndexChange]
  );

  const handleShare = useCallback(async () => {
    if (!currentMedia) return;

    try {
      await Share.share({
        url: currentMedia.uri,
        message: currentMedia.fileName || 'Shared from Hearth',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [currentMedia]);

  const handleSave = useCallback(async () => {
    if (!currentMedia || isSaving) return;

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to save media to your device.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Download to local if remote
      let localUri = currentMedia.uri;
      if (currentMedia.uri.startsWith('http')) {
        const fileName = currentMedia.fileName || `hearth_${Date.now()}.${currentMedia.type === 'video' ? 'mp4' : 'jpg'}`;
        const downloadPath = FileSystem.documentDirectory + fileName;
        
        const downloadResult = await FileSystem.downloadAsync(
          currentMedia.uri,
          downloadPath
        );
        localUri = downloadResult.uri;
      }

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(localUri);

      Alert.alert('Saved', 'Media saved to your library!', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save media. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSaving(false);
    }
  }, [currentMedia, isSaving]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      const isActive = index === currentIndex;

      if (item.type === 'video') {
        return (
          <View style={styles.mediaItem}>
            <VideoPlayer
              source={item.uri}
              onSingleTap={toggleControls}
              isActive={isActive}
              thumbnailUri={item.thumbnailUri}
            />
          </View>
        );
      }

      return (
        <View style={styles.mediaItem}>
          <ZoomableImage
            source={item.uri}
            onSingleTap={toggleControls}
            isActive={isActive}
          />
        </View>
      );
    },
    [currentIndex, toggleControls]
  );

  if (!visible || media.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.container}>
        {/* Media content */}
        <Animated.FlatList
          ref={flatListRef}
          data={media}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialScrollIndex={initialIndex}
          scrollEventThrottle={16}
        />

        {/* Controls overlay */}
        {showControls && (
          <Animated.View
            style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
            pointerEvents="box-none"
          >
            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                {media.length > 1 && (
                  <Text style={styles.counterText}>
                    {currentIndex + 1} / {media.length}
                  </Text>
                )}
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="share-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="download-outline" size={24} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Footer */}
            {showSenderInfo && currentMedia && (
              <SafeAreaView edges={['bottom']} style={styles.footer}>
                <View style={styles.footerContent}>
                  {currentMedia.senderName && (
                    <Text style={styles.senderName}>{currentMedia.senderName}</Text>
                  )}
                  <View style={styles.footerMeta}>
                    {currentMedia.timestamp && (
                      <Text style={styles.metaText}>
                        {formatTimestamp(currentMedia.timestamp)}
                      </Text>
                    )}
                    {currentMedia.size && (
                      <Text style={styles.metaText}>
                        {' • '}{formatFileSize(currentMedia.size)}
                      </Text>
                    )}
                    {currentMedia.width && currentMedia.height && (
                      <Text style={styles.metaText}>
                        {' • '}{currentMedia.width}×{currentMedia.height}
                      </Text>
                    )}
                  </View>
                  {currentMedia.fileName && (
                    <Text style={styles.fileName} numberOfLines={1}>
                      {currentMedia.fileName}
                    </Text>
                  )}
                </View>
              </SafeAreaView>
            )}
          </Animated.View>
        )}

        {/* Page indicators for multiple items */}
        {media.length > 1 && (
          <View style={styles.pagination}>
            {media.map((_, index) => {
              const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
              ];
              
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 16, 8],
                extrapolate: 'clamp',
              });
              
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });
              
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.paginationDot,
                    { width: dotWidth, opacity },
                  ]}
                />
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomableContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoPoster: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'contain',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoProgress: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  durationText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 8,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  counterText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  footerContent: {
    alignItems: 'center',
  },
  senderName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  fileName: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
    maxWidth: SCREEN_WIDTH - 40,
  },
  pagination: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
  },
});

export default MediaViewer;
