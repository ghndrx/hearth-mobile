import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface SelectItemProps {
  title: string;
  subtitle?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SelectItem({
  title,
  subtitle,
  value,
  options,
  onValueChange,
  disabled = false,
  placeholder = 'Select an option...',
}: SelectItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        className={`p-4 ${disabled ? 'opacity-50' : ''}`}
        disabled={disabled}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </Text>
            {subtitle && (
              <Text className={`text-sm mt-0.5 ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                {subtitle}
              </Text>
            )}
          </View>
          <View className="flex-row items-center">
            <Text className={`mr-2 ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
              {selectedOption?.label || placeholder}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDark ? '#80848e' : '#6b7280'}
            />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-4"
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            className={`w-full max-w-sm rounded-2xl overflow-hidden ${
              isDark ? 'bg-dark-800' : 'bg-white'
            }`}
            onPress={() => {}} // Prevent modal dismiss when touching content
          >
            {/* Header */}
            <View className={`p-4 border-b ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
              <View className="flex-row items-center justify-between">
                <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  className="p-1"
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? '#80848e' : '#6b7280'}
                  />
                </TouchableOpacity>
              </View>
              {subtitle && (
                <Text className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-gray-500'}`}>
                  {subtitle}
                </Text>
              )}
            </View>

            {/* Options */}
            <View className="max-h-80">
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  className={`p-4 flex-row items-center justify-between ${
                    index < options.length - 1
                      ? `border-b ${isDark ? 'border-dark-700' : 'border-gray-100'}`
                      : ''
                  } ${
                    option.value === value
                      ? (isDark ? 'bg-blue-600/20' : 'bg-blue-50')
                      : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    {option.icon && (
                      <View className="mr-3">
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={option.value === value ? '#3b82f6' : (isDark ? '#80848e' : '#6b7280')}
                        />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className={`font-medium ${
                        option.value === value
                          ? 'text-blue-500'
                          : (isDark ? 'text-white' : 'text-gray-900')
                      }`}>
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text className={`text-sm mt-0.5 ${
                          isDark ? 'text-dark-400' : 'text-gray-500'
                        }`}>
                          {option.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  {option.value === value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#3b82f6"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default SelectItem;