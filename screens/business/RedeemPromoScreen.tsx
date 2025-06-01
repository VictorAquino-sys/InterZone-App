import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform, Modal
} from 'react-native';
import {
  useCameraPermission,
  useCameraDevice,
  Camera,
} from 'react-native-vision-camera';
import { useCodeScanner } from 'react-native-vision-camera';
import { useUser } from '@/contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import i18n from '@/i18n';

export default function RedeemPromoScreen() {
  const { user } = useUser();
  const navigation = useNavigation();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [debug, setDebug] = useState<string[]>([]);

  function appendDebug(msg: string) {
    setDebug(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8)); // keep last 8 lines
    console.log(msg);
  }

  useEffect(() => {
    appendDebug(`Component mounted. hasPermission: ${hasPermission}, device: ${!!device}`);
    if (!hasPermission) requestPermission();
  }, [hasPermission, device]);

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessInfo(null);
        setManualCode('');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const handleRedeem = async ({ qrCodeData, shortCode }: { qrCodeData?: string, shortCode?: string }) => {
    appendDebug(`handleRedeem called. qrCodeData: ${qrCodeData}, shortCode: ${shortCode}`);

    try {
      const redeemFn = httpsCallable(functions, 'redeemPromoClaim');
      const res: any = await redeemFn({ qrCodeData, shortCode });

      const { userId, postId } = res.data;
      setSuccessInfo(
        i18n.t('promo.redeemedSuccess', {
          user: userId.slice(0, 6) + '…',
          post: postId.slice(0, 6) + '…',
        })
      );
      setShowSuccessModal(true); // show modal
    } catch (err: any) {
      console.error("🔥 Redeem failed:", err);
      appendDebug(`🔥 Redeem failed: ${err?.message || err}`);
      Alert.alert(
        i18n.t('promo.redemptionFailedTitle'),
        err.message || i18n.t('promo.redemptionFailed')
      );
    } finally {
      setScanned(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: async (codes) => {
      appendDebug(`onCodeScanned called. scanned: ${scanned}, codes: ${JSON.stringify(codes)}`);
      if (scanned) return;
      const value = codes[0]?.value;
      appendDebug(`QR value: ${value}`);
      if (!value) {
        appendDebug('QR value is empty.');
        return;
      }
      setScanned(true);
      await handleRedeem({ qrCodeData: value });
    },
  });

  if (!hasPermission) {
    appendDebug('No camera permission');
    return <Text style={styles.centered}>{i18n.t('promo.requestingCameraPermission')}</Text>;
  }
  if (!device && mode === 'scan') {
    appendDebug('No camera device found');
    return <Text style={styles.centered}>{i18n.t('promo.noCamera')}</Text>;
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={{
          flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)'
        }}>
          <View style={{
            backgroundColor: '#fff', padding: 28, borderRadius: 16, alignItems: 'center', minWidth: 260
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>{i18n.t('promo.redemptionSuccessTitle')}</Text>
            <Text style={{ fontSize: 16, marginBottom: 18 }}>{successInfo}</Text>
            <TouchableOpacity onPress={() => {
              setShowSuccessModal(false);
              setSuccessInfo(null);
              setManualCode('');
            }}>
              <Text style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: 16 }}>{i18n.t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {mode === 'scan' ? (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device!}
            isActive={true}
            codeScanner={codeScanner}
          />
          <Text style={styles.instructions}>
            {successInfo ? successInfo : i18n.t('promo.scanQr')}
          </Text>
        </>
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.manualLabel}>{i18n.t('promo.enterCodeLabel')}</Text>
          <TextInput
            placeholder="e.g. B8L2QF"
            value={manualCode}
            onChangeText={setManualCode}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            onSubmitEditing={() => {
              if (manualCode) handleRedeem({ shortCode: manualCode.trim().toUpperCase() });
            }}
          />
          <TouchableOpacity
            style={[styles.verifyButton, !manualCode && { opacity: 0.5 }]}
            disabled={!manualCode}
            onPress={() => handleRedeem({ shortCode: manualCode.trim().toUpperCase() })}
          >
            <Text style={styles.verifyText}>{i18n.t('promo.redeem')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setMode((prev) => (prev === 'scan' ? 'manual' : 'scan'))}
      >
        <Text style={styles.toggleText}>
          {mode === 'scan'
            ? i18n.t('promo.enterCodeManually')
            : i18n.t('promo.useQrScanner')}
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
    backgroundColor: '#2e7d32',
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
