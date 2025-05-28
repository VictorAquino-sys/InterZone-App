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

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  const handleRedeem = async ({ qrCodeData, shortCode }: { qrCodeData?: string, shortCode?: string }) => {
    try {
      const redeemFn = httpsCallable(functions, 'redeemPromoClaim');
      const res: any = await redeemFn({ qrCodeData, shortCode });

      const { userId, postId } = res.data;
      setSuccessInfo(`✅ Promo redeemed!\nUser: ${userId.slice(0, 6)}…\nPost: ${postId.slice(0, 6)}…`);
    } catch (err: any) {
      console.error("🔥 Redeem failed:", err);
      Alert.alert("❌ Redemption Failed", err.message || "Invalid or expired promo.");
    } finally {
      setScanned(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: async (codes) => {
      if (scanned) return;
      const value = codes[0]?.value;
      if (!value) return;

      setScanned(true);
      await handleRedeem({ qrCodeData: value });
    },
  });

  if (!hasPermission) return <Text style={styles.centered}>Requesting camera permission...</Text>;
  if (!device && mode === 'scan') return <Text style={styles.centered}>No camera available</Text>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      {mode === 'scan' ? (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device!}
            isActive={true}
            codeScanner={codeScanner}
          />
          <Text style={styles.instructions}>
            {successInfo ? successInfo : 'Scan a promo QR code'}
          </Text>
        </>
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.manualLabel}>Enter 6-digit promo code</Text>
          <TextInput
            placeholder="e.g. B8L2QF"
            value={manualCode}
            onChangeText={setManualCode}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => handleRedeem({ shortCode: manualCode.trim().toUpperCase() })}
          >
            <Text style={styles.verifyText}>Redeem</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setMode((prev) => (prev === 'scan' ? 'manual' : 'scan'))}
      >
        <Text style={styles.toggleText}>
          {mode === 'scan' ? 'Enter code manually' : 'Use QR scanner'}
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
