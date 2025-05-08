import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Share, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '@/contexts/UserContext';
import { httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';

import { functions } from '@/config/firebase';


type QrCodeData = {
    id: string;
    code: string;
    qrUrl: string;
    expiresAt: Timestamp;
    used: boolean;
    generatedBy: string;
};

export default function DistributeQrScreen() {
    const [qrCodes, setQrCodes] = useState<QrCodeData[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();
    const { user } = useUser();
    const [selectedType, setSelectedType] = useState<'business' | 'musician' | 'tutor'>('business');


    const refreshQrCodes = async () => {
        setLoading(true);
        try {
        const q = query(
            collection(db, 'verifications'),
            where('used', '==', false),
            orderBy('expiresAt', 'asc')
        );
        const snapshot = await getDocs(q);
        const results: QrCodeData[] = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<QrCodeData, 'id' | 'code'>;
            return {
              id: doc.id,
              ...data,
              code: doc.id,
            };
          });
          
        setQrCodes(results);
        } catch (error) {
        console.error('Failed to fetch QR codes:', error);
        Alert.alert('Error', 'Could not load QR codes.');
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.isQrDistributor) {
        Alert.alert('Access Denied', 'You do not have permission to view this screen.');
        navigation.goBack();
        return;
        }

        refreshQrCodes();
    }, []);

    const generateQrCode = async () => {
        try {
          const callable = httpsCallable(functions, 'generateVerificationCode');
          const response: any = await callable({ type: selectedType }); // pass type
      
          Alert.alert('Success', `QR Code created!\n\n${response.data.qrUrl}`);
          refreshQrCodes();
        } catch (error: any) {
          console.error('QR generation failed:', error);
          Alert.alert('Error', error.message || 'Could not generate QR code.');
        }
    };
      

    const handleCopy = async (url: string) => {
        await Clipboard.setStringAsync(url);
        Alert.alert('Copied', 'QR code link copied to clipboard.');
    };

    const handleShare = async (url: string) => {
        try {
          await Share.share({
            message: `Here's your InterZone Business Verification QR Code: ${url}`,
          });
        } catch (error) {
          console.error('Sharing failed:', error);
          Alert.alert('Error', 'Unable to share the QR code.');
        }
      };      
    

    if (loading) {
        return <ActivityIndicator style={styles.centered} size="large" />;
    }

  return (
    <View style={styles.container}>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
        {['business', 'musician', 'tutor'].map(type => (
            <TouchableOpacity
            key={type}
            style={{
                padding: 10,
                borderWidth: selectedType === type ? 2 : 1,
                borderColor: selectedType === type ? '#4CAF50' : '#ccc',
                borderRadius: 8,
            }}
            onPress={() => setSelectedType(type as any)}
            >
            <Text style={{ color: selectedType === type ? '#4CAF50' : 'black' }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
            </TouchableOpacity>
        ))}
        </View>


      <Text style={styles.title}>Unclaimed Business QR Codes</Text>
      <Button title="Generate New QR Code" onPress={generateQrCode} />
      <FlatList
        data={qrCodes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            <View style={styles.card}>
                <Text style={styles.codeLabel}>Code: {item.code}</Text>
                <Text>Expires: {new Date(item.expiresAt.toDate()).toLocaleDateString()}</Text>

            {/* QR Code Image */}
            <Image source={{ uri: item.qrUrl }} style={styles.qrImage} resizeMode="contain" />

            <TouchableOpacity onPress={() => handleCopy(item.qrUrl)}>
                <Text style={styles.link}>Copy QR Link</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleShare(item.qrUrl)}>
                <Text style={styles.link}>Share QR Link</Text>
            </TouchableOpacity>

            </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
  codeLabel: { fontWeight: 'bold', marginBottom: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrImage: {
    width: 120,
    height: 120,
    marginTop: 8,
    alignSelf: 'center',
  },
  link: {
    color: 'blue',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  
});