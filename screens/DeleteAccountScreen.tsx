import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { deleteDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, deleteUser, GoogleAuthProvider, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import i18n from '@/i18n';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigationTypes';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type DeleteAccountNav = NativeStackNavigationProp<RootStackParamList, 'DeleteAccount'>;

export default function DeleteAccountScreen() {
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useUser();
  const navigation = useNavigation<DeleteAccountNav>();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const auth = getAuth();
  const providerId = auth.currentUser?.providerData[0]?.providerId;
  const isGoogleUser = providerId === 'google.com';

  const confirmDelete = () => {
    Alert.alert(
      i18n.t('deleteAccount.confirmTitle'),
      i18n.t('deleteAccount.confirmMessage'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        { text: i18n.t('deleteAccount.confirmButton'), 
          onPress: () => {
            if (isGoogleUser) {
              handleDeleteConfirmed();
            } else {
                setShowModal(true);
            }
            console.log("🧾 Auth Provider:", providerId);
          }
        }  
      ]
    );
  };

  const reauthenticateGoogleUser = async () => {
    const googleUser = await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();
    const googleCredential = GoogleAuthProvider.credential(idToken);
    await reauthenticateWithCredential(auth.currentUser!, googleCredential);
  };

  const reauthenticateEmailUser = async () => {
    const credential = EmailAuthProvider.credential(auth.currentUser!.email!, password.trim());
    await reauthenticateWithCredential(auth.currentUser!, credential);
  };

  const handleDeleteConfirmed = async () => {
    if (!user?.uid || !auth.currentUser) return;
    setLoading(true);

    try {
      const providerId = auth.currentUser.providerData[0]?.providerId;

      if (providerId === 'google.com') {
        await reauthenticateGoogleUser();
      } else {
        if (!password.trim()) {
          Alert.alert(i18n.t('error'), i18n.t('enterPassword'));
          return;
        }
        await reauthenticateEmailUser();
      }

        // Delete Firestore user data
        await deleteDoc(doc(db, 'users', user.uid));

        // Delete all user posts
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('user.uid', '==', user.uid));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));

        // Delete Auth account
        await deleteUser(auth.currentUser);

        // Reset app state
        setUser(null);
        setShowModal(false);
        setPassword('');
        Alert.alert(i18n.t('deleteAccount.success'));
        navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });

    } catch (error: any) {
      console.error('❌ Deletion failed:', error);

      let message = i18n.t('unknownError');
    
      if (error.code === 'auth/invalid-credential') {
        message = i18n.t('deleteAccount.invalidPassword'); // You can add this to your translations
      } else if (error.code === 'auth/user-mismatch') {
        message = i18n.t('deleteAccount.userMismatch');
      } else if (error.code === 'auth/network-request-failed') {
        message = i18n.t('networkError');
      }
    
      Alert.alert(i18n.t('deleteAccount.errorDelete'), message);

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

      {/* 🔐 Modal for password re-auth */}
      <Modal transparent animationType="slide" visible={showModal}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{i18n.t('deleteAccount.reauthTitle')}</Text>
            <Text style={styles.modalText}>{i18n.t('deleteAccount.reauthPrompt')}</Text>
            <TextInput
              placeholder={i18n.t('enterPassword')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.cancel}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteConfirmed}>
                <Text style={styles.confirm}>{i18n.t('deleteAccount.confirmButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    height: 45,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cancel: {
    fontSize: 16,
    color: 'gray'
  },
  confirm: {
    fontSize: 16,
    color: 'red',
    fontWeight: 'bold'
  }
});
