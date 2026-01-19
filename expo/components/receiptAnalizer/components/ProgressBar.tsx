import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing
} from 'react-native-reanimated';

interface ProgressBarProps {
  progress: number;
  color: string;
}

export const ProgressBar = ({ progress, color }: ProgressBarProps) => {
  const animatedWidth = useSharedValue(0);

  React.useEffect(() => {
    animatedWidth.value = withTiming(progress, {
      duration: 500,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [progress, animatedWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={styles.progressBarBg}>
      <Animated.View style={[styles.progressBarFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 32,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
