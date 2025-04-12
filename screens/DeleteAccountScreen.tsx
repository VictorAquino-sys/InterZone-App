import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { deleteDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../src/config/firebase';
import { auth } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import i18n from '@/i18n';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigationTypes';

type DeleteAccountNav = NativeStackNavigationProp<RootStackParamList, 'DeleteAccount'>;

export default function DeleteAccountScreen() {
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useUser();
  const navigation = useNavigation<DeleteAccountNav>();

  const confirmDelete = () => {
    Alert.alert(
      i18n.t('deleteAccount.confirmTitle'),
      i18n.t('deleteAccount.confirmMessage'),
      [
        {
          text: i18n.t('cancel'),
          style: 'cancel'
        },
        {
          text: i18n.t('deleteAccount.confirmButton'),
          onPress: handleDeleteAccount,
          style: 'destructive'
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid || !auth.currentUser) return;
    setLoading(true);

    try {
      // 1. Delete user data from Firestore
      await deleteDoc(doc(db, 'users', user.uid));

      // 2. Delete all their posts (optional)
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('user.uid', '==', user.uid));
      const snapshot = await getDocs(q);
      await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));

      // 3. Delete Firebase Auth account
      await deleteUser(auth.currentUser);

      // 4. Clear app state and redirect
      setUser(null);
      Alert.alert(i18n.t('deleteAccount.success'));  
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });

    } catch (error) {
      console.error('Account deletion failed:', error);
      Alert.alert(
        i18n.t('deleteAccount.error'),
        error instanceof Error ? error.message : i18n.t('unknownError')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.warning}>{i18n.t('deleteAccount.warning')}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDelete}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.deleteText}>{i18n.t('deleteAccount.button')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  warning: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 30,
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
