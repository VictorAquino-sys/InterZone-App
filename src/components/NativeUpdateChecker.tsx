import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

const inAppUpdates = new SpInAppUpdates(__DEV__); // isDebug

export const NativeUpdateChecker = () => {
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const result = await inAppUpdates.checkNeedsUpdate({});
        if (result.shouldUpdate) {
          await inAppUpdates.startUpdate({
            updateType: Platform.OS === 'android' ? IAUUpdateKind.FLEXIBLE : undefined,
          });
        }
      } catch (error) {
        console.warn('Update check failed:', error);
      }
    };
    checkUpdate();
  }, []);

  return null; // invisible component
};