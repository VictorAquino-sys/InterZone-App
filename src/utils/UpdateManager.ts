import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

// Native updater setup
const inAppUpdates = new SpInAppUpdates(false); // false = not verbose logging

export async function checkForAppUpdates() {
  try {
    console.log('🔍 Checking for Expo hot updates...');

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      console.log('🚀 Hot update available, fetching...');
      await Updates.fetchUpdateAsync();
      console.log('✅ Update fetched, reloading app...');
      await Updates.reloadAsync();
      return;
    }

    console.log('✅ No Expo hot update. Checking native update next...');
    await checkNativeUpdate();
  } catch (error) {
    console.warn('❌ Error checking updates:', error);
  }
}

async function checkNativeUpdate() {
  try {
    const result = await inAppUpdates.checkNeedsUpdate({});

    if (result.shouldUpdate) {
      console.log('🛠 Native store update available:', result.storeVersion);

      if (Platform.OS === 'android') {
        await inAppUpdates.startUpdate({ updateType: IAUUpdateKind.FLEXIBLE });
      } else if (Platform.OS === 'ios') {
        await inAppUpdates.startUpdate({
          title: 'Update Available',
          message: 'There is a new version available on the App Store. Would you like to update it?',
          buttonUpgradeText: 'Update',
          buttonCancelText: 'Later',
        });
      }
    } else {
      console.log('✅ Native app is up to date.');
    }
  } catch (error) {
    console.warn('❌ Error checking native update:', error);
  }
}
