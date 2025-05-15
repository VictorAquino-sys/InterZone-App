import React, { ReactNode } from 'react';
import { useWindowDimensions, View, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
};

const ResponsiveContainer: React.FC<Props> = ({ children, style }) => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: isTablet ? 48 : 20,
          maxWidth: isTablet ? 550 : '100%',
          justifyContent: 'center', // 💡 centers vertically
          minHeight: height - 100,   // 💡 prevents cramping on iPad
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default ResponsiveContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center',
    paddingVertical: 20,
    width: '100%',
  },
});
