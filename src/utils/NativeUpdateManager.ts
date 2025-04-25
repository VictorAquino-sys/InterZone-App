import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';
import { Platform, Alert } from 'react-native';

const inAppUpdates = new SpInAppUpdates(false); // false = not verbose logging

export async function checkNativeUpdate() {
  try {
    const result = await inAppUpdates.checkNeedsUpdate({});

    if (result.shouldUpdate) {
      console.log('🛠 Update available:', result.storeVersion);

      if (Platform.OS === 'android') {
        await inAppUpdates.startUpdate({ updateType: IAUUpdateKind.FLEXIBLE });
      } else if (Platform.OS === 'ios') {
        await inAppUpdates.startUpdate({
          title: 'Update Available',
          message: 'There is a new version of the app available on the App Store. Do you want to update it?',
          buttonUpgradeText: 'Update',
          buttonCancelText: 'Later',
        });
      }
    } else {
      console.log('✅ App is up to date.');
    }
  } catch (error) {
    console.warn('❌ Error checking native update:', error);
  }
}
