import { Platform } from 'react-native';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

const inAppUpdates = new SpInAppUpdates(__DEV__);

export const checkNativeUpdate = async (): Promise<boolean> => {
  try {
    const result = await inAppUpdates.checkNeedsUpdate({});
    if (result.shouldUpdate) {
      await inAppUpdates.startUpdate({
        updateType: Platform.OS === 'android' ? IAUUpdateKind.FLEXIBLE : undefined,
      });
      return true;
    }
    return false;
  } catch (error: any) {
    const errorMsg = error?.message || '';

    if (
      __DEV__ &&
      errorMsg.includes('Install Error(-10)') &&
      errorMsg.includes('app is not owned')
    ) {
      console.log('[NativeUpdateChecker] Skipping update check in dev mode (app not from Play)');
    } else {
      console.warn('[NativeUpdateChecker] Update check failed:', error);
    }

    return false;
  }
};
