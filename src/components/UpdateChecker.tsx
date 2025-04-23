import React, { useEffect, useState } from 'react';
import { Text, Pressable, Linking, StyleSheet, View, Platform } from 'react-native';
import Constants from 'expo-constants';
import { checkVersion } from 'react-native-check-version';
import i18n from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from '@/utils/analytics';

const STORAGE_KEY = 'updateCheckerDismissed';

const UpdateChecker = () => {
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkDismissStatus = async () => {
      const flag = await AsyncStorage.getItem(STORAGE_KEY);
      if (flag == 'true') {
        setDismissed(true);
      }
    };
    
    checkDismissStatus();
  }, []);

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version || '0.0.0';
        const bundleId =
          Platform.OS === 'ios'
            ? Constants.expoConfig?.ios?.bundleIdentifier
            : Constants.expoConfig?.android?.package;

        if (!bundleId) {
          console.warn('Bundle ID is missing');
          return;
        }

        const versionInfo = await checkVersion({
          currentVersion,
          bundleId,
          platform: Platform.OS,
        });

        if (versionInfo.needsUpdate && !dismissed) {
          setUpdateUrl(versionInfo.url);
          await logEvent('update_banner_shown', { currentVersion });
        }
      } catch (error) {
        console.warn('Error checking app version:', error);
      }
    };

    checkForUpdate();
  }, [dismissed]);

  const handleDismiss = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  if (!updateUrl) return null;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => Linking.openURL(updateUrl)}>
        <Text style={styles.text}>{i18n.t('updateAvailable')}</Text>
      </Pressable>
      <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
        <Text style={styles.dismissText}>{i18n.t('dismiss')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffeaa7',
    padding: 10,
    borderRadius: 10,
    margin: 12,
  },
  text: {
    color: '#2d3436',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dismissBtn: {
    marginTop: 6,
    padding: 6,
  },
  dismissText: {
    color: '#636e72',
    fontSize: 12,
  },
});

export default UpdateChecker;
