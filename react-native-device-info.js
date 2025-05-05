
import Constants from "expo-constants";
import { Platform } from 'react-native';
 
export const getBundleId = () =>
  Platform.OS === 'ios'
    ? Constants.expoConfig?.ios?.bundleIdentifier ?? ''
    : Constants.expoConfig?.android?.package ?? '';

export const getVersion = () =>
  Constants.expoConfig?.version ?? '0.0.0';

export default {
  getBundleId,
  getVersion,
};