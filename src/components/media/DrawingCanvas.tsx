import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { DrawingPath, DrawingPoint } from '../../services/media/ImageEditingService';

export interface DrawingCanvasProps {
  width: number;
  height: number;
  paths: DrawingPath[];
  onPathComplete: (path: DrawingPath) => void;
  onClear: () => void;
}

const COLORS = ['#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#000000'];
const STROKE_WIDTHS = [2, 4, 6, 8];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  paths,
  onPathComplete,
  onClear,
}) => {
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(4);
  const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([]);

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      setCurrentPoints([{ x: e.x, y: e.y }]);
    })
    .onUpdate((e) => {
      setCurrentPoints(prev => [...prev, { x: e.x, y: e.y }]);
    })
    .onEnd(() => {
      if (currentPoints.length > 1) {
        onPathComplete({
          points: currentPoints,
          color: currentColor,
          strokeWidth: currentStrokeWidth,
        });
      }
      setCurrentPoints([]);
    })
    .minDistance(0);

  const pointsToSvgPath = useCallback((points: DrawingPoint[]): string => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;
    for (const point of rest) {
      d += ` L ${point.x} ${point.y}`;
    }
    return d;
  }, []);

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={styles.canvasWrapper}>
        <GestureDetector gesture={panGesture}>
          <View style={[styles.canvas, { width, height }]}>
            <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
              {paths.map((path, index) => (
                <Path
                  key={index}
                  d={pointsToSvgPath(path.points)}
                  stroke={path.color}
                  strokeWidth={path.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPoints.length > 0 && (
                <Path
                  d={pointsToSvgPath(currentPoints)}
                  stroke={currentColor}
                  strokeWidth={currentStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Color picker */}
      <View style={styles.toolbar}>
        <View style={styles.colorRow}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                currentColor === color && styles.activeColorSwatch,
              ]}
              onPress={() => setCurrentColor(color)}
            />
          ))}
        </View>

        <View style={styles.strokeRow}>
          {STROKE_WIDTHS.map((sw) => (
            <TouchableOpacity
              key={sw}
              style={[
                styles.strokeButton,
                currentStrokeWidth === sw && styles.activeStrokeButton,
              ]}
              onPress={() => setCurrentStrokeWidth(sw)}
            >
              <View style={[styles.strokePreview, { height: sw, backgroundColor: currentColor }]} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  canvasWrapper: {
    overflow: 'hidden',
  },
  canvas: {
    backgroundColor: 'transparent',
  },
  toolbar: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  activeColorSwatch: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  strokeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  strokeButton: {
    width: 40,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStrokeButton: {
    backgroundColor: '#3A3A5E',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  strokePreview: {
    width: 24,
    borderRadius: 2,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default DrawingCanvas;
