import React, { useEffect, useState } from 'react';
import { Text, Pressable, Linking, StyleSheet, View, Platform } from 'react-native';
import Constants from 'expo-constants';
import { checkVersion } from 'react-native-check-version';
import i18n from '@/i18n';

const UpdateChecker = () => {
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);

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

        if (versionInfo.needsUpdate) {
          setUpdateUrl(versionInfo.url);
        }
      } catch (error) {
        console.warn('Error checking app version:', error);
      }
    };

    checkForUpdate();
  }, []);

  if (!updateUrl) return null;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => Linking.openURL(updateUrl)}>
        <Text style={styles.text}>
            {i18n.t('updateAvailable')}
        </Text>
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
});

export default UpdateChecker;
