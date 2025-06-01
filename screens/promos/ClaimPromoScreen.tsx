import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigationTypes';
import i18n from '@/i18n';

type Props = RouteProp<RootStackParamList, 'ClaimPromoScreen'>;

const ClaimPromoScreen = () => {
  const { postId } = useRoute<Props>().params;
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<null | {
    shortCode: string;
    qrCodeData: string;
  }>(null);

  const [debug, setDebug] = useState<string[]>([]);

  function appendDebug(msg: string) {
    setDebug(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-10));
    console.log(msg);
  }

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const claimFn = httpsCallable(functions, 'createPromoClaim');
        const res: any = await claimFn({ postId });

        appendDebug(`Received: shortCode=${res.data?.shortCode}, qrCodeData=${res.data?.qrCodeData}`);
        setClaim({
          shortCode: res.data.shortCode,
          qrCodeData: res.data.qrCodeData
        });
      } catch (error: any) {
        appendDebug(`Promo claim error: ${error?.message || error}`);

        console.error("Promo claim error:", error);
        Alert.alert(i18n.t('promo.notAvailable'), error.message || i18n.t('promo.notAvailable'));
      } finally {
        setLoading(false);
      }
    };

    fetchClaim();
  }, [postId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text>{i18n.t('promo.claiming')}</Text>
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red' }}>{i18n.t('promo.notAvailable')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{i18n.t('promo.showQr')}</Text>
      <Text style={styles.code}>{claim.shortCode}</Text>
      <View style={{ marginTop: 20 }}>
        <QRCode value={claim.qrCodeData} size={300} backgroundColor="white"/>
      </View>
    </View>
  );
};

export default ClaimPromoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 10,
    color: '#2e7d32'
  }
});
