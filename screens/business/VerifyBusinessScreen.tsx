import React from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { useCameraPermission, useCameraDevice, Camera } from 'react-native-vision-camera';
import { useCodeScanner } from 'react-native-vision-camera';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import i18n from '@/i18n';
import { useNavigation } from '@react-navigation/native';

export default function VerifyBusinessScreen() {
    const { user, refreshUser } = useUser();
    const { hasPermission, requestPermission } = useCameraPermission()
    const device = useCameraDevice('back')
    const [scannedType, setScannedType] = React.useState<string | null>(null);
    const [scanned, setScanned] = React.useState(false);
    const navigation = useNavigation();

    React.useEffect(() => {
        if (!hasPermission) requestPermission();
    }, []);

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: async (codes) => {
          if (scanned) return;
          setScanned(true);
      
          let codeValue = codes[0]?.value;
          if (!codeValue) {
            console.warn('⚠️ No code value found in scanned QR.');
            return;
          }
      
          console.log('📦 Raw scanned code:', codeValue);
      
          // 🧼 Clean full URL if necessary
          let rawCode = codeValue;
          if (rawCode.startsWith('https://interzone.app/claim/')) {
            rawCode = rawCode.replace('https://interzone.app/claim/', '');
          }
          console.log('🔍 Cleaned raw code:', rawCode);
      
          try {
            const ref = doc(db, 'verifications', rawCode);
            const snap = await getDoc(ref);
      
            if (!snap.exists()) {
              console.warn('❌ Code not found in Firestore.');
              Alert.alert(i18n.t('qr.invalidTitle'), i18n.t('qr.invalidMessage'));
              return;
            }
      
            const data = snap.data() as {
              type?: 'business' | 'musician' | 'tutor';
              used: boolean;
              expiresAt: FirebaseFirestore.Timestamp;
            };
      
            if (!data.type) {
              console.warn('⚠️ QR code is missing a valid type.');
              Alert.alert(i18n.t('qr.invalidTitle'), i18n.t('qr.noTypeAssigned'));
              return;
            }
      
            const now = new Date();
            const expiresAt = data.expiresAt?.toDate();
            const expired = !expiresAt || expiresAt < now;
            if (data.used || expired) {
              console.warn(`⚠️ Code expired (${expired}) or already used (${data.used}).`);
              Alert.alert(i18n.t('qr.expiredOrUsed'), i18n.t('qr.codeAlreadyUsed'));
              return;
            }
      
            const type = data.type;
            setScannedType(type);
      
            if (!user) {
              console.warn('❌ No logged in user found.');
              Alert.alert(i18n.t('error'), i18n.t('qr.userNotFound'));
              return;
            }
      
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userData = userDocSnap.exists() ? userDocSnap.data() : {};
            const alreadyVerified = userData?.verifications?.[type];
      
            if (alreadyVerified) {
              console.warn('⚠️ User already verified for this type:', type);
              Alert.alert(i18n.t('qr.alreadyVerifiedTitle'), i18n.t(`qr.alreadyVerifiedMessage.${type}`));
              return;
            }
      
            // ✅ Mark code as used + update user
            await updateDoc(ref, {
              used: true,
              usedAt: Timestamp.now(),
              usedBy: user.uid,
            });
      
            await updateDoc(userDocRef, {
              [`verifications.${type}`]: true,
            });
      
            console.log('✅ Verification successful for type:', type);
            refreshUser();
            Alert.alert(
                i18n.t('qr.verifiedTitle'), 
                i18n.t(`qr.verifiedMessage.${type}`),
                [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
            );
          } catch (e) {
            console.error('🔥 Error during verification:', e);
            Alert.alert(i18n.t('error'), i18n.t('qr.verificationError'));
          } finally {
            setTimeout(() => {
              setScanned(false);
              setScannedType(null);
            }, 3000);
          }
        },
    });      
          
    if (!hasPermission) return <Text style={styles.centered}>{i18n.t('qr.requestingCamera')}</Text>;
    if (!device) return <Text style={styles.centered}>{i18n.t('qr.noCamera')}</Text>;

return (
    <View style={styles.container}>
    <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
    />
    <Text style={styles.instructions}>
    {scannedType
        ? `${i18n.t(`qr.verifiedBanner.${scannedType}`)} ✅`
        : i18n.t('qr.scanInstruction')}
    </Text>
    </View>
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
});
