import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

export interface RotationToolProps {
  rotation: number;
  onRotate90: () => void;
  onRotate270: () => void;
  onFreeRotate: (degrees: number) => void;
  onFlipH: () => void;
  onFlipV: () => void;
}

export const RotationTool: React.FC<RotationToolProps> = ({
  rotation,
  onRotate90,
  onRotate270,
  onFreeRotate,
  onFlipH,
  onFlipV,
}) => {
  return (
    <View style={styles.container}>
      {/* Quick rotation buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onRotate270}>
          <Text style={styles.actionIcon}>↺</Text>
          <Text style={styles.actionLabel}>-90°</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onRotate90}>
          <Text style={styles.actionIcon}>↻</Text>
          <Text style={styles.actionLabel}>+90°</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onFlipH}>
          <Text style={styles.actionIcon}>⇔</Text>
          <Text style={styles.actionLabel}>Flip H</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onFlipV}>
          <Text style={styles.actionIcon}>⇕</Text>
          <Text style={styles.actionLabel}>Flip V</Text>
        </TouchableOpacity>
      </View>

      {/* Free rotation slider */}
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Free Rotation</Text>
          <Text style={styles.sliderValue}>{rotation % 360}°</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={-180}
          maximumValue={180}
          step={1}
          value={0}
          onSlidingComplete={onFreeRotate}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#3A3A3C"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.labelText}>-180°</Text>
          <Text style={styles.labelText}>0°</Text>
          <Text style={styles.labelText}>180°</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 64,
  },
  actionIcon: {
    color: '#FFF',
    fontSize: 20,
    marginBottom: 2,
  },
  actionLabel: {
    color: '#999',
    fontSize: 11,
    fontWeight: '500',
  },
  sliderSection: {
    gap: 4,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelText: {
    color: '#666',
    fontSize: 11,
  },
});

export default RotationTool;
