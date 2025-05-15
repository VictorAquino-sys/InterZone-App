import { Dimensions, ViewStyle } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export const containerStyle: ViewStyle = {
  flex: 1,
  paddingHorizontal: screenWidth > 768 ? 40 : 20,
  paddingVertical: 20,
  alignSelf: 'center', // ✅ Valid value
  width: '100%',
  maxWidth: 768,
};
