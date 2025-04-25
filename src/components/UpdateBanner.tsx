import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Updates from 'expo-updates';

const UpdateBanner = () => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        if (Platform.OS !== 'web') { // Skip on web
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            setIsUpdateAvailable(true);
          }
        }
      } catch (error) {
        console.warn('❌ Failed to check for updates:', error);
      }
    };

    checkForUpdate();
  }, []);

  const handleUpdate = async () => {
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.warn('❌ Failed to apply update:', error);
    }
  };

  if (!isUpdateAvailable) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>🚀 {Platform.OS === 'ios' ? 'New Version Available!' : 'Update Ready!'}</Text>
      <TouchableOpacity onPress={handleUpdate} style={styles.button}>
        <Text style={styles.buttonText}>Update Now</Text>
      </TouchableOpacity>
    </View>
  );
};

export default UpdateBanner;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d47a1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  text: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonText: {
    color: '#0d47a1',
    fontWeight: '700',
    fontSize: 12,
  },
});
