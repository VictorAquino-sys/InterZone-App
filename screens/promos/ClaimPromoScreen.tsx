import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigationTypes';

type Props = RouteProp<RootStackParamList, 'ClaimPromoScreen'>;

const ClaimPromoScreen = () => {
  const { postId } = useRoute<Props>().params;
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<null | {
    shortCode: string;
    qrCodeData: string;
  }>(null);

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const claimFn = httpsCallable(functions, 'createPromoClaim');
        const res: any = await claimFn({ postId });

        setClaim({
          shortCode: res.data.shortCode,
          qrCodeData: res.data.qrCodeData
        });
      } catch (error: any) {
        console.error("Promo claim error:", error);
        Alert.alert("Claim Failed", error.message || "Unable to claim this promo.");
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
        <Text>Claiming your promo...</Text>
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red' }}>Promo not available or already claimed.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎉 Show this at the business!</Text>
      <Text style={styles.code}>{claim.shortCode}</Text>
      <View style={{ marginTop: 20 }}>
        <QRCode value={claim.qrCodeData} size={200} />
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