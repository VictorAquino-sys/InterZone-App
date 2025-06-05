import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '@/contexts/UserContext';
import { doc, updateDoc } from 'firebase/firestore';
import i18n from '@/i18n';
import Toast from 'react-native-toast-message';
import { db } from '@/config/firebase';

const ApplyBusinessScreen = () => {
  const navigation = useNavigation();
  const { user, setUser } = useUser();

  const [location, setLocation] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!businessName.trim() || !description.trim() || !category.trim() || !location.trim()) {
        Alert.alert(i18n.t('applyBusiness.missingFieldsTitle'), i18n.t('applyBusiness.missingFieldsMessage'))
        return;
    }

    try {
      setSubmitting(true);
      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        accountType: 'business',
        businessVerified: false,
        pendingBusinessApplication: true,
        businessProfile: {
          name: businessName.trim(),
          ownerUid: user!.uid,
          description: description.trim(),
          avatar: '',
          category: category.trim(),
          location: location.trim(),          // ✅ Include location
          email: email.trim(),                // ✅ Include email
        },
      });

      setUser(prev => prev ? {
        ...prev,
        accountType: 'business',
        businessVerified: false,
        businessProfile: {
          name: businessName.trim(),
          ownerUid: user!.uid,
          description: description.trim(),
          avatar: '',
          category: category.trim(),
        }
      } : null);

      Alert.alert(i18n.t('applyBusiness.successTitle'), i18n.t('applyBusiness.successMessage'))
      navigation.goBack();
    } catch (error) {
      console.error('Business application failed:', error);
      Alert.alert(i18n.t('applyBusiness.errorTitle'), i18n.t('applyBusiness.errorMessage'))
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{i18n.t('applyBusiness.title')}</Text>

      <TextInput
        style={styles.input}
        placeholder={i18n.t('applyBusiness.businessName')}
        autoCapitalize="words"
        value={businessName}
        onChangeText={setBusinessName}
      />

      <TextInput
        style={styles.input}
        placeholder={i18n.t('applyBusiness.category')}
        autoCapitalize="words"
        value={category}
        onChangeText={setCategory}
      />

      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder={i18n.t('applyBusiness.description')}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          Toast.show({
            type: 'info',
            text1: i18n.t('applyBusiness.emailInfoTitle'),
            text2: i18n.t('applyBusiness.emailInfoMessage'),
            position: 'bottom',
            visibilityTime: 4000,
          })
        }
      >
        <TextInput
          style={[styles.input, { backgroundColor: '#eee', color: '#555' }]}
          placeholder={i18n.t('applyBusiness.email')}
          value={email}
          editable={false}
          pointerEvents="none" // Prevent cursor blinking
        />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder={i18n.t('applyBusiness.location')}
        autoCapitalize="words"
        value={location}
        onChangeText={setLocation}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
            <Text style={styles.submitButtonText}>{i18n.t('applyBusiness.submitButton')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ApplyBusinessScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    flexGrow: 0,
    justifyContent: 'center',
  },
  title: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#007aff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});