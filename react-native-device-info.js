import Constants from "expo-constants";
import { Platform } from 'react-native';

export const getBundleId = () => {
  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.ios?.bundleIdentifier || Constants.manifest2?.extra?.eas?.projectId || '';
  } else {
    return Constants.expoConfig?.android?.package || Constants.manifest2?.extra?.eas?.projectId || '';
  }
};

export const getVersion = () =>
  Constants.expoConfig?.version || Constants.nativeAppVersion || '0.0.0';

export default {
  getBundleId,
  getVersion,
};
