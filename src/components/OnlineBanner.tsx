import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import i18n from '@/i18n';

interface OnlineBannerProps {
  count: number;
}

const OnlineBanner: React.FC<OnlineBannerProps> = ({ count }) => {
  const translateX = useSharedValue(-220); // Start off-screen left

  useEffect(() => {
    if (!count) return;
    // Slide in
    translateX.value = withTiming(20, { duration: 400 });
    // Slide out after 3.5s
    const timeout = setTimeout(() => {
      translateX.value = withTiming(-220, { duration: 400 });
    }, 3500);
    return () => clearTimeout(timeout);
  }, [count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: translateX.value > -200 ? 1 : 0,
  }));

  if (!count) return null;

  // Use i18n pluralization
  const onlineText = i18n.t('onlineBanner', {
    count,
    defaultValue: count === 1
      ? "🟢 There is {{count}} person online"
      : "🟢 There are {{count}} people online"
  });

  return (
    <Animated.View style={[styles.banner, animatedStyle]}>
      <Text style={styles.bannerText}>
        {onlineText}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    bottom: Platform.OS === 'ios' ? 90 : 70, // adjust to be above nav bar/buttons
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 6,
    zIndex: 999,
  },
  bannerText: {
    color: '#6366f1',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default OnlineBanner;