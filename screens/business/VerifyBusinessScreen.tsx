import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useCameraPermission,
  useCameraDevice,
  Camera,
} from 'react-native-vision-camera';
import { useCodeScanner } from 'react-native-vision-camera';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import i18n from '@/i18n';
import { useNavigation } from '@react-navigation/native';

export default function VerifyBusinessScreen() {
  const { user, refreshUser } = useUser();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [scannedType, setScannedType] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const navigation = useNavigation();

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  const handleCode = async (rawCode: string) => {
    try {
      if (!rawCode) return;

      let code = rawCode;
      if (code.startsWith('https://interzone.app/claim/')) {
        code = code.replace('https://interzone.app/claim/', '');
      }

      const ref = doc(db, 'verifications', code);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        Alert.alert(i18n.t('qr.invalidTitle'), i18n.t('qr.invalidMessage'));
        return;
      }

      const data = snap.data();
      const type = data?.type;
      const now = new Date();
      const expired = !data.expiresAt || data.expiresAt.toDate() < now;

      if (!type || data.used || expired) {
        Alert.alert(i18n.t('qr.expiredOrUsed'), i18n.t('qr.codeAlreadyUsed'));
        return;
      }
      
      if (!user) {
        console.warn('❌ No logged in user found.');
        Alert.alert(i18n.t('error'), i18n.t('qr.userNotFound'));
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      if (userData?.verifications?.[type]) {
        Alert.alert(i18n.t('qr.alreadyVerifiedTitle'), i18n.t(`qr.alreadyVerifiedMessage.${type}`));
        return;
      }

      await updateDoc(ref, {
        used: true,
        usedAt: Timestamp.now(),
        usedBy: user.uid,
      });

      await updateDoc(userRef, {
        [`verifications.${type}`]: true,
      });

      setScannedType(type);
      refreshUser();
      Alert.alert(i18n.t('qr.verifiedTitle'), i18n.t(`qr.verifiedMessage.${type}`), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error('🔥 Verification error:', e);
      Alert.alert(i18n.t('error'), i18n.t('qr.verificationError'));
    } finally {
      setTimeout(() => {
        setScanned(false);
        setScannedType(null);
      }, 3000);
    }
  };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: async (codes) => {
        if (scanned) return;
        const value = codes[0]?.value;
    
        if (!value) {
            setScanned(false); // unlock scanner again
            return;
        }
    
        setScanned(true);
        await handleCode(value);
        },
    });

  if (!hasPermission) return <Text style={styles.centered}>{i18n.t('qr.requestingCamera')}</Text>;
  if (!device && mode === 'scan') return <Text style={styles.centered}>{i18n.t('qr.noCamera')}</Text>;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {mode === 'scan' ? (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device!}
            isActive={true}
            codeScanner={codeScanner}
          />
          <Text style={styles.instructions}>
            {scannedType
              ? `${i18n.t(`qr.verifiedBanner.${scannedType}`)} ✅`
              : i18n.t('qr.scanInstruction')}
          </Text>
        </>
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.manualLabel}>{i18n.t('qr.enterCodeLabel')}</Text>
          <TextInput
            placeholder="e.g. a485517c42"
            value={manualCode}
            onChangeText={setManualCode}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => handleCode(manualCode.trim())}
          >
            <Text style={styles.verifyText}>{i18n.t('qr.verifyCode')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setMode((prev) => (prev === 'scan' ? 'manual' : 'scan'))}
      >
        <Text style={styles.toggleText}>
          {mode === 'scan' ? i18n.t('qr.enterManually') : i18n.t('qr.useQrScanner')}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  instructions: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  manualLabel: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 6,
  },
  toggleText: {
    color: 'white',
    fontSize: 14,
  },
});
