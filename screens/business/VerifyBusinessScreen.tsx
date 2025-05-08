import React from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { useCameraPermission, useCameraDevice, Camera } from 'react-native-vision-camera';
import { useCodeScanner } from 'react-native-vision-camera';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import i18n from '@/i18n';

export default function VerifyBusinessScreen() {
    const { user, refreshUser } = useUser();
    const { hasPermission, requestPermission } = useCameraPermission()
    const device = useCameraDevice('back')
    const [scannedType, setScannedType] = React.useState<string | null>(null);
    const [scanned, setScanned] = React.useState(false);

    React.useEffect(() => {
        if (!hasPermission) requestPermission();
    }, []);

    const codeScanner = useCodeScanner({
        codeTypes:['qr'],
        onCodeScanned: async (codes) => {
            if (scanned) return;
            setScanned(true);

            const codeValue = codes[0]?.value;
            if (!codeValue) return;

            try {
                const ref = doc(db, 'verifications', codeValue);
                const snap = await getDoc(ref);

                if(!snap.exists()) {
                    Alert.alert(i18n.t('qr.invalidTitle'), i18n.t('qr.invalidMessage'));
                    return;
                }

                const data = snap.data() as {
                    type?: 'business' | 'musician' | 'tutor';
                    used: boolean;
                    expiresAt: FirebaseFirestore.Timestamp;
                  };

                if (!data.type) {
                    Alert.alert(i18n.t('qr.invalidTitle'), i18n.t('qr.noTypeAssigned'));
                    return;
                }
                  
                const type = data.type || 'business'; // fallback to business
                setScannedType(type);

                if (data.used || data.expiresAt.toDate() < new Date()) {
                    Alert.alert(i18n.t('qr.expiredOrUsed'), i18n.t('qr.codeAlreadyUsed'));
                    return;
                }

                if (!user) {
                    Alert.alert(i18n.t('error'), i18n.t('qr.userNotFound'));
                    return;
                }                  

                await updateDoc(ref, {
                    used: true,
                    usedAt: new Date(),
                    usedBy: user.uid,
                  });
          
                  await updateDoc(doc(db, 'users', user.uid), {
                    [`verifications.${type}`]: true,
                  });
          
                  refreshUser();
                  Alert.alert(i18n.t('qr.verifiedTitle'), i18n.t(`qr.verifiedMessage.${type}`));
                } catch (e) {
                  console.error(e);
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
          ? i18n.t(`qr.verifiedBanner.${scannedType}`)
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