import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import i18n from '@/i18n';

interface Props {
  type: 'business' | 'musician' | 'tutor';
  onPress: () => void;
}

const typeColors: Record<'business' | 'musician' | 'tutor', string> = {
    business: '#4CAF50',
    musician: '#3F51B5',
    tutor: '#FF9800',
  };

export default function VerifyBusinessButton({ 
    type, 
    onPress 
}: Props) {

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 10 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10 });
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: typeColors[type] }, animatedStyle]}>
    <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.button}
    >
        <Text style={styles.text}>
            {i18n.t(`profile.becomeVerified.${type}`)}
        </Text>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  button: {
    // backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});