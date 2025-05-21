import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { User } from '@/contexts/UserContext';
import { sendSignInLinkToEmail } from 'firebase/auth';

type Props = {
  visible: boolean;
  onClose: () => void;
  schoolId: 'upc' | 'villareal';
  onSuccess: (email: string) => void;
  user: User | null;
};

const SchoolEmailVerificationModal: React.FC<Props> = ({ visible, onClose, schoolId, onSuccess, user }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const domain = schoolId === 'upc' ? 'upc.edu.pe' : 'unfv.edu.pe';

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
    const checkCooldown = async () => {
      const lastSent = await AsyncStorage.getItem('schoolEmailCooldown');
      if (lastSent) {
        const elapsed = Math.floor((Date.now() - parseInt(lastSent)) / 1000);
        const remaining = 300 - elapsed;
        if (remaining > 0) {
          setCooldown(remaining);
          startCooldown(remaining);
        }
      }
    };
  
    if (visible) {
      setEmail('');
      // ⛔ Don't reset cooldown if it’s already active
      if (!linkSent) {
        setCooldown(0);
      }
      setLinkSent(false);
      checkCooldown();
    }
  }, [visible]);

  const actionCodeSettings = {
    url: 'https://interzone-production.web.app/schoolverify', // ✅ Your deployed Firebase hosting
    handleCodeInApp: true,
  };

  const startCooldown = (duration = 300) => {
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
  
    if (!cleanEmail.endsWith(`@${domain}`)) {
      Alert.alert(i18n.t('verify.invalidTitle'), i18n.t('verify.invalidEmail', { domain }));
      return;
    }
  
    try {
      setLoading(true);

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
      setLoading(false);
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
                placeholder={`you@${domain}`}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={cooldown === 0 && !loading}
              />

              <TouchableOpacity
                style={[styles.button, cooldown > 0 && styles.disabledButton]}
                onPress={handleSendVerificationEmail}
                disabled={loading || cooldown > 0}
              >
                {loading ? (
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

          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={[styles.cancel, loading && { color: '#ccc' }]}>{i18n.t('verify.cancel')}</Text>
          </TouchableOpacity>
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