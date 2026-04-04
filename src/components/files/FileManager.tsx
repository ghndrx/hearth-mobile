import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  useColorScheme,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { FileAttachment, FileAttachmentService } from '../../services/files';
import { FilePreview } from './FilePreview';
import { FileViewer } from './FileViewer';

interface FileManagerProps {
  files: FileAttachment[];
  onFileSelect?: (file: FileAttachment) => void;
  onFileDelete?: (file: FileAttachment) => void;
  onRefresh?: () => void;
  allowMultiSelect?: boolean;
  selectedFiles?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

type SortOption = 'name' | 'date' | 'size' | 'type';
type FilterOption = 'all' | 'image' | 'video' | 'document' | 'audio' | 'archive';

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  onFileSelect,
  onFileDelete,
  onRefresh,
  allowMultiSelect = false,
  selectedFiles = [],
  onSelectionChange,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortAscending, setSortAscending] = useState(false);
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fileService = FileAttachmentService.getInstance();

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  const filteredAndSortedFiles = React.useMemo(() => {
    let filtered = files;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(file => file.type === filterBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          const aDate = a.metadata?.createdAt ? new Date(a.metadata.createdAt).getTime() : 0;
          const bDate = b.metadata?.createdAt ? new Date(b.metadata.createdAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortAscending ? comparison : -comparison;
    });

    return filtered;
  }, [files, searchQuery, filterBy, sortBy, sortAscending]);

  const handleFilePress = (file: FileAttachment) => {
    if (allowMultiSelect) {
      const newSelection = selectedFiles.includes(file.id)
        ? selectedFiles.filter(id => id !== file.id)
        : [...selectedFiles, file.id];
      onSelectionChange?.(newSelection);
    } else if (fileService.supportsPreview(file)) {
      setSelectedFile(file);
    } else {
      onFileSelect?.(file);
    }
  };

  const handleFileLongPress = (file: FileAttachment) => {
    Alert.alert(
      file.name,
      `${fileService.getCategoryDisplayName(file.category)} • ${fileService.formatFileSize(file.size)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => onFileSelect?.(file) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete File',
              `Are you sure you want to delete ${file.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onFileDelete?.(file),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderFileItem = ({ item, index }: { item: FileAttachment; index: number }) => {
    const isSelected = selectedFiles.includes(item.id);

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(200)}>
        <View className={`${viewMode === 'list' ? 'mx-4' : ''} mb-2`}>
          <TouchableOpacity
            onPress={() => handleFilePress(item)}
            onLongPress={() => handleFileLongPress(item)}
            className={`${
              viewMode === 'list' ? 'flex-row items-center p-3 rounded-lg' : ''
            } ${
              isSelected ? 'bg-blue-100 dark:bg-blue-900' : isDark ? 'bg-gray-800' : 'bg-white'
            }`}
            activeOpacity={0.7}
          >
            {allowMultiSelect && (
              <View className="absolute top-2 left-2 z-10">
                <View
                  className={`w-6 h-6 rounded-full border-2 ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : isDark
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-300 bg-white'
                  } items-center justify-center`}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
              </View>
            )}

            <FilePreview
              file={item}
              compact={viewMode === 'list'}
              showSize={viewMode === 'list'}
              style={viewMode === 'grid' ? { width: '100%' } : { flex: 1 }}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View className={`px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Search Bar */}
      <View
        className={`flex-row items-center px-3 py-2 rounded-lg mb-3 ${
          isDark ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        <Ionicons
          name="search"
          size={16}
          color={isDark ? '#9ca3af' : '#6b7280'}
        />
        <TextInput
          className={`flex-1 ml-2 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
          placeholder="Search files..."
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons
              name="close-circle"
              size={16}
              color={isDark ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            className={`px-3 py-1.5 rounded-lg border ${
              filterBy !== 'all'
                ? 'bg-blue-500 border-blue-500'
                : isDark
                  ? 'border-gray-600'
                  : 'border-gray-300'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filterBy !== 'all'
                  ? 'text-white'
                  : isDark
                    ? 'text-gray-300'
                    : 'text-gray-700'
              }`}
            >
              Filter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSortModal(true)}
            className={`px-3 py-1.5 rounded-lg border ${
              isDark ? 'border-gray-600' : 'border-gray-300'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Sort
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center space-x-2">
          <Text
            className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {filteredAndSortedFiles.length} files
          </Text>

          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className={`p-1 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
          >
            <Ionicons
              name={viewMode === 'grid' ? 'list' : 'grid'}
              size={16}
              color={isDark ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <FlatList
        data={filteredAndSortedFiles}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          padding: viewMode === 'grid' ? 8 : 0,
          gap: viewMode === 'grid' ? 8 : 0,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#8b5cf6' : '#7c3aed'}
            colors={['#8b5cf6', '#a78bfa']}
          />
        }
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <Ionicons
              name="folder-open-outline"
              size={64}
              color={isDark ? '#4b5563' : '#d1d5db'}
            />
            <Text
              className={`mt-4 text-lg font-medium ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              No files found
            </Text>
            <Text
              className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
            >
              {searchQuery ? 'Try adjusting your search' : 'Upload some files to get started'}
            </Text>
          </View>
        )}
      />

      {/* File Viewer Modal */}
      <FileViewer
        visible={!!selectedFile}
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onDelete={() => {
          if (selectedFile) {
            onFileDelete?.(selectedFile);
            setSelectedFile(null);
          }
        }}
        onSave={() => {
          // Handle save functionality
        }}
      />

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-end">
          <Animated.View
            entering={SlideInRight}
            className={`p-4 rounded-t-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          >
            <Text
              className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Sort by
            </Text>
            {(['name', 'date', 'size', 'type'] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  if (sortBy === option) {
                    setSortAscending(!sortAscending);
                  } else {
                    setSortBy(option);
                    setSortAscending(option === 'name');
                  }
                  setShowSortModal(false);
                }}
                className="flex-row items-center justify-between py-3"
              >
                <Text
                  className={`text-base ${
                    sortBy === option
                      ? 'text-blue-500 font-medium'
                      : isDark
                        ? 'text-gray-300'
                        : 'text-gray-700'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
                {sortBy === option && (
                  <Ionicons
                    name={sortAscending ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#3b82f6"
                  />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowSortModal(false)}
              className="mt-4 py-3 bg-gray-500 rounded-lg items-center"
            >
              <Text className="text-white font-medium">Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-end">
          <Animated.View
            entering={SlideInRight}
            className={`p-4 rounded-t-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          >
            <Text
              className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Filter by type
            </Text>
            {(['all', 'image', 'video', 'document', 'audio', 'archive'] as FilterOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  setFilterBy(option);
                  setShowFilterModal(false);
                }}
                className="flex-row items-center justify-between py-3"
              >
                <Text
                  className={`text-base ${
                    filterBy === option
                      ? 'text-blue-500 font-medium'
                      : isDark
                        ? 'text-gray-300'
                        : 'text-gray-700'
                  }`}
                >
                  {option === 'all' ? 'All Files' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
                {filterBy === option && (
                  <Ionicons name="checkmark" size={16} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              className="mt-4 py-3 bg-gray-500 rounded-lg items-center"
            >
              <Text className="text-white font-medium">Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};