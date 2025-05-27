import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { useVerifiedSchool } from '@/contexts/verifiedSchoolContext';
import Toast from 'react-native-toast-message';
import { User } from '@/contexts/UserContext';
import * as Linking from 'expo-linking';
import { sendSignInLinkToEmail, signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth';

type Props = {
  visible: boolean;
  onClose: () => void;
  schoolId: 'upc' | 'villareal' | "sanMarcos" | "cesarVallejo" | "catolica" ;
  onSuccess: (email: string) => void;
  user: User | null;
};

const SchoolEmailVerificationModal: React.FC<Props> = ({ visible, onClose, schoolId, onSuccess, user }) => {
  const [email, setEmail] = useState('');
  const [Localloading, LocalsetLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  // const { setSchool, loading, LocalsetLoading } = useVerifiedSchool();
  const { loading, setLoading, setSchool } = useVerifiedSchool();
  const hasVerifiedRef = useRef(false); // ⬅️ top of component

  const allowedDomains: string[] =
  schoolId === 'upc' ? ['upc.edu.pe'] :
  schoolId === 'villareal' ? ['unfv.edu.pe'] :
  schoolId === 'sanMarcos' ? ['unmsm.edu.pe'] :
  schoolId === 'cesarVallejo' ? ['ucv.edu.pe'] :
  schoolId === 'catolica' ? ['pucp.edu.pe'] :
  [];

  const getUniversityName = (id: string): string => {
    switch (id) {
      case 'upc': return 'UPC';
      case 'villareal': return 'UNFV';
      case 'sanMarcos': return 'UNMSM';
      case 'cesarVallejo' : return "UCV";
      case 'catolica': return 'PUCP';
      default: return 'Unknown';
    }
  };

  useEffect(() => {
    if (visible && user?.claims?.admin) {
      onSuccess(`${schoolId}-admin-bypass`);
      onClose();
    }
  }, [visible, user, schoolId]);

  useEffect(() => {
    if (visible) {
      setLinkSent(false);
      setEmail('');
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  useEffect(() => {
    const checkVerificationAndCooldown = async () => {
      if (!user?.uid) return;
  
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const data = snap.data();
  
      if (data?.verifiedSchools?.includes(schoolId)) {
        // onSuccess(data?.verifiedEmails?.find((e: string) => e.endsWith(`@${allowedDomains }`)) || '');
        onSuccess(
          data?.verifiedEmails?.find((e: string) =>
            allowedDomains.some(domain => e.endsWith(`@${domain}`))
          ) || ''
        );

        onClose();
        return;
      }
  
      const lastSent = await AsyncStorage.getItem('schoolEmailCooldown');
      if (lastSent) {
        const elapsed = Math.floor((Date.now() - parseInt(lastSent)) / 1000);
        const remaining = 50 - elapsed;
        if (remaining > 0) {
          setCooldown(remaining);
          startCooldown(remaining);
        }
      }
    };
  
    if (visible) {
      setEmail('');
      setLinkSent(false);
      checkVerificationAndCooldown();
    }
  }, [visible]);

  useEffect(() => {
    if (!linkSent || !user || hasVerifiedRef.current) return;
  
    const interval = setInterval(async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const data = snap.data();
  
      if (data?.verifiedSchools?.includes(schoolId)) {
        hasVerifiedRef.current = true; // ✅ prevent repeat
        clearInterval(interval);
        onSuccess(
          data?.verifiedEmails?.find((e: string) =>
            allowedDomains.some(domain => e.endsWith(`@${domain}`))
          ) || ''
        );

        onClose();
      }
    }, 3000);
  
    return () => clearInterval(interval);
  }, [linkSent, user]);

  useEffect(() => {
    const handleLink = async ({ url }: { url: string }) => {
      console.log('🔗 Received link while app is open:', url);
  
      // ✅ Proceed only for custom interzone://verify link
      if (url !== 'interzone://verify') return;
  
      const storedEmail = await AsyncStorage.getItem('emailForSchoolSignIn');
      const storedSchoolId = await AsyncStorage.getItem('schoolIdForSignIn');
  
      if (!storedEmail || !storedSchoolId) {
        Alert.alert('Verification Error', 'Missing stored email or school ID.');
        return;
      }
  
      try {
        // await signInWithEmailLink(auth, storedEmail, url);
  
        // Wait for auth.currentUser
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout waiting for Firebase user')), 5000);
          const interval = setInterval(() => {
            if (auth.currentUser) {
              clearTimeout(timeout);
              clearInterval(interval);
              resolve(auth.currentUser);
            }
          }, 300);
        });
  
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('User not signed in after email link');
  
        await setDoc(doc(db, 'schoolEmailIndex', storedEmail), {
          uid,
          schoolId: storedSchoolId,
          verifiedAt: new Date().toISOString(),
        });
  
        await setDoc(doc(db, 'users', uid), {
          verifiedSchools: arrayUnion(storedSchoolId),
          verifiedEmails: arrayUnion(storedEmail),
        }, { merge: true });

        await AsyncStorage.setItem(
          'verifiedSchool',
          JSON.stringify({
            universityId: storedSchoolId,
            universityName: getUniversityName(storedSchoolId),
          })
        );
  
        // setLoading(false); // ✅ Add this


        await AsyncStorage.multiRemove([
          'emailForSchoolSignIn',
          'schoolIdForSignIn',
          'schoolEmailCooldown',
        ]);

  
        Toast.show({
          type: 'success',
          text1: i18n.t('verify.verifiedTitle'),
          text2: i18n.t('verify.verifiedMessage'),
        });
  
        onSuccess(storedEmail);
        onClose();
      } catch (error) {
        console.error('❌ Dynamic deep link verification failed:', error);
        Alert.alert('Verification Failed', 'Something went wrong verifying your school email.');
      }
    };
  
    const subscription = Linking.addEventListener('url', handleLink);
    return () => subscription.remove();
  }, []);

  const actionCodeSettings = {
    // url: 'https://interzone-production.web.app/schoolverify', // ✅ Your deployed Firebase hosting
    url: 'https://interzone-production.web.app', // ✅ Must be root domain
    handleCodeInApp: true,
  };

  const startCooldown = (duration = 50) => {
    setCooldown(duration);
    const id = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setIntervalId(id);
  };

  const resetVerificationTestState = async () => {
    try {
      await AsyncStorage.multiRemove([
        'emailForSchoolSignIn',
        'schoolIdForSignIn',
        'schoolEmailCooldown',
      ]);
  
      if (user?.uid) {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const data = snap.data();
  
        if (data?.verifiedSchools?.includes(schoolId)) {
          const updatedSchools = data.verifiedSchools.filter((id: string) => id !== schoolId);
          await setDoc(userRef, {
            verifiedSchools: updatedSchools,
          }, { merge: true });
        }
      }
  
      Alert.alert('✅ Reset Complete', 'Test data cleared. You can now simulate a fresh verification.');
    } catch (err) {
      console.error('❌ Reset error:', err);
      Alert.alert('Reset Failed', 'An error occurred while resetting verification state.');
    }
  };
  
  const handleSendVerificationEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();

    const indexRef = doc(db, 'schoolEmailIndex', cleanEmail);
    const indexSnap = await getDoc(indexRef);

    if (indexSnap.exists()) {
      Alert.alert(
        'Already Verified',
        'This school email is already associated with another InterZone account.'
      );
      return;
    }
  
    // if (!cleanEmail.endsWith(`@${domain}`)) {
    //   Alert.alert(i18n.t('verify.invalidTitle'), i18n.t('verify.invalidEmail', { domain }));
    //   return;
    // }

    const emailDomain = cleanEmail.split('@')[1];

    if (!allowedDomains.includes(emailDomain)) {
      Alert.alert(
        i18n.t('verify.invalidTitle'),
        `${i18n.t('verify.invalidEmail', { domain: allowedDomains.join(' or ') })}`
      );
      return;
    }
  
    try {
      LocalsetLoading(true);

      await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);

      const now = Date.now();
      await AsyncStorage.setItem('schoolEmailCooldown', now.toString());
  
      await AsyncStorage.setItem('emailForSchoolSignIn', cleanEmail);
      await AsyncStorage.setItem('schoolIdForSignIn', schoolId);
  
      setLinkSent(true);
      startCooldown(); // ⬅️ start timer

      Alert.alert(i18n.t('verify.linkSentTitle'), i18n.t('verify.linkSentMsg'));
      // onClose();
    } catch (error: any) {
      console.error('Failed to send sign-in link:', error);
      Alert.alert(i18n.t('verify.errorTitle'), error.message || i18n.t('verify.errorGeneric'));
    } finally {
      LocalsetLoading(false);
    }
  };

  if (user?.claims?.admin) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{i18n.t('verify.title')}</Text>

          {!linkSent ? (
            <>
              <TextInput
                placeholder={`you@${allowedDomains[0] || 'school.edu'}`}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={cooldown === 0 && !Localloading}
              />

              <TouchableOpacity
                style={[styles.button, cooldown > 0 && styles.disabledButton]}
                onPress={handleSendVerificationEmail}
                disabled={Localloading || cooldown > 0}
              >
                {Localloading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {cooldown > 0
                      ? `${i18n.t('verify.pleaseWait')} ${cooldown}s`
                      : i18n.t('verify.sendLink')}
                  </Text>
                )}
              </TouchableOpacity>

            </>
          ) : (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#26c6da" />
              <Text style={{ marginTop: 10, fontSize: 14, color: '#666', textAlign: 'center' }}>
                {i18n.t('verify.waitingVerification')}
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} disabled={Localloading}>
            <Text style={[styles.cancel, Localloading && { color: '#ccc' }]}>{i18n.t('verify.cancel')}</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity onLongPress={resetVerificationTestState}>
              <Text style={{ fontSize: 10, color: '#bbb', marginTop: 8 }}>
                Long press here to reset test state
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </Modal>
  );
};

export default SchoolEmailVerificationModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0006',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    width: '85%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
    borderRadius: 6,
  },
  button: {
    backgroundColor: '#26c6da',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 6,
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancel: {
    marginTop: 12,
    color: '#999',
  },
});
