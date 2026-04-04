import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CropRegion } from '../../services/media/ImageEditingService';

export interface CropToolProps {
  imageWidth: number;
  imageHeight: number;
  onCropRegionChange: (region: CropRegion) => void;
  currentCropRegion?: CropRegion;
}

export const CropTool: React.FC<CropToolProps> = ({
  imageWidth,
  imageHeight,
  onCropRegionChange,
  currentCropRegion,
}) => {
  const [aspectRatio, setAspectRatio] = useState<string>('free');

  const aspectRatios = [
    { label: 'Free', value: 'free', ratio: null },
    { label: '1:1', value: '1:1', ratio: 1 },
    { label: '4:3', value: '4:3', ratio: 4 / 3 },
    { label: '16:9', value: '16:9', ratio: 16 / 9 },
    { label: '3:4', value: '3:4', ratio: 3 / 4 },
    { label: '9:16', value: '9:16', ratio: 9 / 16 },
  ];

  const applyCropRatio = (ratio: number | null) => {
    let cropRegion: CropRegion;

    if (ratio === null) {
      // Free form - default to 80% of image
      cropRegion = {
        originX: imageWidth * 0.1,
        originY: imageHeight * 0.1,
        width: imageWidth * 0.8,
        height: imageHeight * 0.8,
      };
    } else {
      // Calculate crop region based on aspect ratio
      const imageRatio = imageWidth / imageHeight;

      if (ratio > imageRatio) {
        // Crop is wider than image - fit to width
        const cropWidth = imageWidth * 0.8;
        const cropHeight = cropWidth / ratio;
        cropRegion = {
          originX: imageWidth * 0.1,
          originY: (imageHeight - cropHeight) / 2,
          width: cropWidth,
          height: cropHeight,
        };
      } else {
        // Crop is taller than image - fit to height
        const cropHeight = imageHeight * 0.8;
        const cropWidth = cropHeight * ratio;
        cropRegion = {
          originX: (imageWidth - cropWidth) / 2,
          originY: imageHeight * 0.1,
          width: cropWidth,
          height: cropHeight,
        };
      }
    }

    onCropRegionChange(cropRegion);
  };

  const handleAspectRatioSelect = (ratioValue: string, ratio: number | null) => {
    setAspectRatio(ratioValue);
    applyCropRatio(ratio);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crop Aspect Ratio</Text>
      <View style={styles.aspectRatioContainer}>
        {aspectRatios.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.aspectRatioButton,
              aspectRatio === item.value && styles.activeAspectRatioButton,
            ]}
            onPress={() => handleAspectRatioSelect(item.value, item.ratio)}
          >
            <Text
              style={[
                styles.aspectRatioText,
                aspectRatio === item.value && styles.activeAspectRatioText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentCropRegion && (
        <View style={styles.cropInfo}>
          <Text style={styles.cropInfoText}>
            Crop: {Math.round(currentCropRegion.width)}×{Math.round(currentCropRegion.height)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  aspectRatioContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aspectRatioButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  activeAspectRatioButton: {
    backgroundColor: '#007AFF',
  },
  aspectRatioText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  activeAspectRatioText: {
    color: '#FFF',
  },
  cropInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  cropInfoText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CropTool;