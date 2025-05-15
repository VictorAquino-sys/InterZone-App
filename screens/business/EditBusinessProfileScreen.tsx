import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@/contexts/UserContext';
import { db, storage } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import i18n from '@/i18n'; 
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const EditBusinessProfileScreen = () => {
  const { user, refreshUser } = useUser();
  const [name, setName] = useState(user?.businessProfile?.name || '');
  const [description, setDescription] = useState(user?.businessProfile?.description || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.businessProfile?.avatar || null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string): Promise<string> => {
    const resized = await manipulateAsync(uri, [{ resize: { width: 512 } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
    });

    const blob = await (await fetch(resized.uri)).blob();
    const imageRef = ref(storage, `businessAvatars/${user?.uid}/${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    return getDownloadURL(imageRef);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
        Alert.alert(i18n.t('errorTitle'), i18n.t('businessNameRequired'))
        return;
    }

    setUploading(true);
    try {
      let avatarUrl = user.businessProfile?.avatar || '';
      if (avatarUri && !avatarUri.startsWith('https://')) {
        avatarUrl = await uploadAvatar(avatarUri);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        businessProfile: {
          name: name.trim(),
          description: description.trim(),
          avatar: avatarUrl,
        },
      });

      await refreshUser();
      Alert.alert(i18n.t('successTitle'), i18n.t('businessProfileUpdated'))
    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert(i18n.t('errorTitle'), i18n.t('updateBusinessProfileError'))
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('editBusinessProfileTitle')}</Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
                <Text>{i18n.t('selectLogo')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={name}
        placeholder={i18n.t('businessName')}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { height: 100 }]}
        value={description}
        placeholder={i18n.t('businessDescription')}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={uploading}>
        <Text style={styles.buttonText}>
            {uploading ? i18n.t('saving') : i18n.t('saveChanges')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default EditBusinessProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});