/**
 * Loading Spinner Component
 * Enterprise-grade loading indicator with customizable styles
 * Optimized for accessibility and theme support
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useThemeStore } from '../../stores/themeStore';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  overlay?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  text,
  variant = 'spinner',
  overlay = false,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Get spinner size
  const getSpinnerSize = (): number => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 24;
      case 'large': return 32;
      case 'xlarge': return 48;
      default: return 24;
    }
  };

  // Get spinner color
  const getSpinnerColor = (): string => {
    if (color) return color;
    return isDark ? '#60A5FA' : '#3B82F6';
  };

  // Get text size
  const getTextSize = (): number => {
    switch (size) {
      case 'small': return 12;
      case 'medium': return 14;
      case 'large': return 16;
      case 'xlarge': return 18;
      default: return 14;
    }
  };

  // Animated dots component
  const AnimatedDots = () => {
    const dot1 = useSharedValue(0);
    const dot2 = useSharedValue(0);
    const dot3 = useSharedValue(0);

    React.useEffect(() => {
      const duration = 600;
      const delay = 200;

      dot1.value = withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      
      setTimeout(() => {
        dot2.value = withRepeat(
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }, delay);
      
      setTimeout(() => {
        dot3.value = withRepeat(
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }, delay * 2);
    }, []);

    const dot1Style = useAnimatedStyle(() => ({
      opacity: 0.3 + (dot1.value * 0.7),
      transform: [{ scale: 0.8 + (dot1.value * 0.4) }],
    }));

    const dot2Style = useAnimatedStyle(() => ({
      opacity: 0.3 + (dot2.value * 0.7),
      transform: [{ scale: 0.8 + (dot2.value * 0.4) }],
    }));

    const dot3Style = useAnimatedStyle(() => ({
      opacity: 0.3 + (dot3.value * 0.7),
      transform: [{ scale: 0.8 + (dot3.value * 0.4) }],
    }));

    const dotSize = getSpinnerSize() / 3;
    const dotColor = getSpinnerColor();

    return (
      <View style={styles.dotsContainer}>
        <Animated.View 
          style={[
            styles.dot, 
            { width: dotSize, height: dotSize, backgroundColor: dotColor },
            dot1Style
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { width: dotSize, height: dotSize, backgroundColor: dotColor },
            dot2Style
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { width: dotSize, height: dotSize, backgroundColor: dotColor },
            dot3Style
          ]} 
        />
      </View>
    );
  };

  // Animated pulse component
  const AnimatedPulse = () => {
    const pulseAnimation = useSharedValue(0);

    React.useEffect(() => {
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }, []);

    const pulseStyle = useAnimatedStyle(() => {
      const scale = 0.8 + (pulseAnimation.value * 0.4);
      const opacity = 0.4 + (pulseAnimation.value * 0.6);

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    const pulseSize = getSpinnerSize();
    const pulseColor = getSpinnerColor();

    return (
      <Animated.View
        style={[
          styles.pulse,
          {
            width: pulseSize,
            height: pulseSize,
            backgroundColor: pulseColor,
            borderRadius: pulseSize / 2,
          },
          pulseStyle,
        ]}
      />
    );
  };

  // Render spinner based on variant
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return <AnimatedDots />;
      case 'pulse':
        return <AnimatedPulse />;
      case 'spinner':
      default:
        return (
          <ActivityIndicator
            size={getSpinnerSize()}
            color={getSpinnerColor()}
            accessibilityLabel={accessibilityLabel || 'Loading'}
          />
        );
    }
  };

  // Container styles
  const containerStyles = StyleSheet.flatten([
    styles.container,
    overlay && styles.overlay,
    overlay && (isDark ? styles.overlayDark : styles.overlayLight),
    style,
  ]);

  // Text styles
  const textStyles = StyleSheet.flatten([
    styles.text,
    {
      fontSize: getTextSize(),
      color: isDark ? '#D1D5DB' : '#6B7280',
    },
    textStyle,
  ]);

  return (
    <View 
      style={containerStyles}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel || text || 'Loading'}
    >
      {renderSpinner()}
      
      {text && (
        <Text style={textStyles} accessibilityLabel={text}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  overlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  
  text: {
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Dots animation
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    borderRadius: 50,
  },
  
  // Pulse animation
  pulse: {
    // Styles applied dynamically
  },
});