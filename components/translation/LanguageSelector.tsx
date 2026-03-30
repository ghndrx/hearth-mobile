/**
 * Language Selector Component for TRL-001
 * Allows users to select languages for translation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSupportedLanguages } from '../../lib/hooks/useTranslation';
import type { LanguageInfo } from '../../lib/types';

interface LanguageSelectorProps {
  selectedLanguage?: string;
  onSelect: (language: string) => void;
  placeholder?: string;
  style?: any;
  disabled?: boolean;
  excludeLanguages?: string[];
  showSearch?: boolean;
}

export default function LanguageSelector({
  selectedLanguage,
  onSelect,
  placeholder = 'Select Language',
  style,
  disabled = false,
  excludeLanguages = [],
  showSearch = true,
}: LanguageSelectorProps) {
  const { filteredLanguages, searchQuery, setSearchQuery, getLanguageByCode } = useSupportedLanguages();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedLanguageInfo = selectedLanguage ? getLanguageByCode(selectedLanguage) : null;

  const availableLanguages = filteredLanguages.filter(
    lang => !excludeLanguages.includes(lang.code)
  );

  const openModal = () => {
    if (!disabled) {
      setIsModalVisible(true);
    }
  };

  const selectLanguage = (language: LanguageInfo) => {
    onSelect(language.code);
    setIsModalVisible(false);
    setSearchQuery('');
  };

  const renderLanguageItem = ({ item }: { item: LanguageInfo }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        item.code === selectedLanguage && styles.selectedLanguageItem,
      ]}
      onPress={() => selectLanguage(item)}
    >
      <Text style={styles.languageFlag}>{item.flag}</Text>
      <View style={styles.languageNames}>
        <Text style={[
          styles.languageName,
          item.code === selectedLanguage && styles.selectedLanguageName,
        ]}>
          {item.name}
        </Text>
        <Text style={[
          styles.languageNativeName,
          item.code === selectedLanguage && styles.selectedLanguageNativeName,
        ]}>
          {item.nativeName}
        </Text>
      </View>
      <Text style={styles.languageCode}>{item.code.toUpperCase()}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled, style]}
        onPress={openModal}
        disabled={disabled}
        accessibilityLabel={selectedLanguageInfo ?
          `Selected language: ${selectedLanguageInfo.name}` :
          placeholder
        }
        accessibilityRole="button"
        accessibilityHint="Tap to select a language"
      >
        <View style={styles.selectorContent}>
          {selectedLanguageInfo ? (
            <>
              <Text style={styles.selectedFlag}>{selectedLanguageInfo.flag}</Text>
              <View style={styles.selectedLanguageInfo}>
                <Text style={styles.selectedName}>{selectedLanguageInfo.name}</Text>
                <Text style={styles.selectedNativeName}>{selectedLanguageInfo.nativeName}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}
          <Text style={styles.arrow}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Language</Text>
            <View style={styles.modalCloseButton} />
          </View>

          {showSearch && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
            </View>
          )}

          <FlatList
            data={availableLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            style={styles.languageList}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No languages found' : 'No languages available'}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
  },

  disabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },

  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  selectedFlag: {
    fontSize: 20,
    marginRight: 8,
  },

  selectedLanguageInfo: {
    flex: 1,
  },

  selectedName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  selectedNativeName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  placeholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },

  arrow: {
    fontSize: 12,
    color: '#666',
  },

  modal: {
    flex: 1,
    backgroundColor: '#fff',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  modalCloseButton: {
    minWidth: 60,
  },

  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },

  languageList: {
    flex: 1,
  },

  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },

  selectedLanguageItem: {
    backgroundColor: '#e3f2fd',
  },

  languageFlag: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },

  languageNames: {
    flex: 1,
  },

  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  selectedLanguageName: {
    color: '#007AFF',
  },

  languageNativeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  selectedLanguageNativeName: {
    color: '#0066CC',
  },

  languageCode: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});