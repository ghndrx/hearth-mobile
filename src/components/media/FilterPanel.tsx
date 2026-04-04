import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { FilterSettings, ImageFilter } from '../../services/media/ImageEditingService';

export { FilterSettings } from '../../services/media/ImageEditingService';

export interface FilterPanelProps {
  onFilterChange: (filters: Partial<FilterSettings>) => void;
  currentFilters: FilterSettings;
  presetFilters: ImageFilter[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onFilterChange,
  currentFilters,
  presetFilters,
}) => {
  const [activeFilter, setActiveFilter] = useState<keyof FilterSettings>('brightness');

  const filterOptions = [
    { key: 'brightness' as const, label: 'Brightness', min: -100, max: 100, step: 1 },
    { key: 'contrast' as const, label: 'Contrast', min: -100, max: 100, step: 1 },
    { key: 'saturation' as const, label: 'Saturation', min: -100, max: 100, step: 1 },
    { key: 'warmth' as const, label: 'Warmth', min: -100, max: 100, step: 1 },
  ];

  const handleSliderChange = (value: number) => {
    onFilterChange({ [activeFilter]: Math.round(value) });
  };

  const handlePresetSelect = (preset: ImageFilter) => {
    onFilterChange(preset.adjustments);
  };

  const handleReset = () => {
    onFilterChange({ brightness: 0, contrast: 0, saturation: 0, warmth: 0 });
  };

  const currentFilterOption = filterOptions.find(f => f.key === activeFilter)!;

  return (
    <View style={styles.container}>
      {/* Preset Filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Presets</Text>
        <View style={styles.presetsContainer}>
          {presetFilters.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              style={styles.presetButton}
              onPress={() => handlePresetSelect(preset)}
            >
              <Text style={styles.presetText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Manual Adjustments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adjustments</Text>

        <View style={styles.filterTypeContainer}>
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTypeButton,
                activeFilter === filter.key && styles.activeFilterTypeButton,
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterTypeText,
                  activeFilter === filter.key && styles.activeFilterTypeText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>{currentFilterOption.label}</Text>
            <Text style={styles.sliderValue}>{currentFilters[activeFilter]}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={currentFilterOption.min}
            maximumValue={currentFilterOption.max}
            step={currentFilterOption.step}
            value={currentFilters[activeFilter]}
            onValueChange={handleSliderChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#3A3A3C"
          />
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  presetText: {
    color: '#FFF',
    fontSize: 14,
  },
  filterTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 4,
  },
  filterTypeButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeFilterTypeButton: {
    backgroundColor: '#007AFF',
  },
  filterTypeText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterTypeText: {
    color: '#FFF',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  sliderValue: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FilterPanel;
