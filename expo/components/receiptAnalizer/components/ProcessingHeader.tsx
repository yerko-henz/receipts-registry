import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProcessingHeaderProps {
  total: number;
  completed: number;
}

export const ProcessingHeader: React.FC<ProcessingHeaderProps> = ({ total, completed }) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const remaining = total - completed;
  const progress = total > 0 ? completed / total : 0;
  
  // Circular progress config
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const targetOffset = circumference - (progress * circumference);

  const animatedOffset = useSharedValue(circumference);

  React.useEffect(() => {
    animatedOffset.value = withTiming(targetOffset, {
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [targetOffset, animatedOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            stroke="#f1f5f9"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Progress Circle */}
          <AnimatedCircle
            stroke={colors.tint}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.centerTextContainer}>
            <Text style={[styles.centerCount, { color: colors.tint }]}>{remaining}</Text>
            <Text style={[styles.centerLabel, { color: colors.icon }]}>{t('scanner.left')}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        {t('scanner.processingReceipts', { total })}
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.icon }]}>
        {t('scanner.aiExtracting')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  progressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  centerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCount: {
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 56,
  },
  centerLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    maxWidth: '80%',
  },
  estimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
});
