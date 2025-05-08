import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Share, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth, functions } from '@/config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '@/contexts/UserContext';
import { httpsCallable } from 'firebase/functions';
import { Timestamp, onSnapshot } from 'firebase/firestore';
import QrCard from '@/components/QrCard'; // adjust path if needed
import * as Clipboard from 'expo-clipboard';
import i18n from '@/i18n';


type QrCodeData = {
    id: string;
    code: string;
    qrUrl: string;
    expiresAt: Timestamp;
    used: boolean;
    generatedBy: string;
    type: 'business' | 'musician' | 'tutor';
};

export default function DistributeQrScreen() {
    const [qrCodes, setQrCodes] = useState<QrCodeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const navigation = useNavigation();
    const [generating, setGenerating] = useState(false);
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
        Alert.alert(i18n.t('qr.error'), i18n.t('qr.loadFail'));
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.isQrDistributor) {
          Alert.alert(i18n.t('qr.accessDenied'), i18n.t('qr.noPermission'));
          navigation.goBack();
          return;
        }
      
        setLoading(true);
      
        const q = query(
          collection(db, 'verifications'),
          where('used', '==', false),
          orderBy('expiresAt', 'asc')
        );
      
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const results: QrCodeData[] = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<QrCodeData, 'id' | 'code'>;
            return {
              id: doc.id,
              ...data,
              code: doc.id,
            };
          });
          setQrCodes(results);
          setLoading(false);
        }, (error: any) => {
          console.error('Real-time QR listener failed:', error);
          Alert.alert(i18n.t('qr.error'), i18n.t('qr.loadFail'));
          setLoading(false);
        });
      
        return () => unsubscribe(); // Clean up on unmount
      }, []);

    const generateQrCode = async () => {
        try {
            setGenerating(true); // 🟢 Start loading
            const user = auth.currentUser;
            if (!user) throw new Error("User not signed in");
        
            console.log('🔐 Current user UID:', user.uid);
        
            // 🔄 Force refresh the ID token to ensure custom claims are up-to-date
            const idToken = await user.getIdToken(true);
            console.log("🔑 Fresh ID token:", idToken);
        
            const idTokenResult = await user.getIdTokenResult();
            console.log('📋 Token claims:', idTokenResult.claims);
        
            // ✅ Call the Cloud Function with user's context
            const callable = httpsCallable(functions, 'generateVerificationCode');
            console.log(`🚀 Calling function generateVerificationCode with type: ${selectedType}`);
        
            const response: any = await callable({ type: selectedType });
            console.log('✅ Cloud Function response:', response);
        
            Alert.alert(i18n.t('qr.success'), `${i18n.t('qr.created')}\n\n${response.data.qrUrl}`);
            refreshQrCodes();
        } catch (error: any) {
            console.error('❌ QR generation failed:', error);
            Alert.alert(i18n.t('qr.error'), error.message || i18n.t('qr.generationFail'));
        } finally {
            setGenerating(false);
        }
    };
      

    const handleShare = async (url: string) => {
        try {
          await Share.share({
            message: `${i18n.t('qr.shareMessage')} ${url}`,
        });
        } catch (error) {
          console.error('Sharing failed:', error);
          Alert.alert(i18n.t('qr.error'), i18n.t('qr.shareFail'));
        }
      };      
    

    if (loading) {
        return <ActivityIndicator style={styles.centered} size="large" />;
    }

  return (
    <View style={styles.container}>
        <View style={styles.selectorWrapper}>
        {['business', 'musician', 'tutor'].map(type => (
            <TouchableOpacity
            key={type}
            style={[styles.selectorButton, selectedType === type && styles.selectorSelected]}
            onPress={() => setSelectedType(type as any)}
            >
            <Text style={selectedType === type ? styles.selectorTextSelected : styles.selectorText}>
                {i18n.t(`qr.types.${type}`)}
            </Text>
            </TouchableOpacity>
        ))}
        </View>


        <Text style={styles.title}>{i18n.t('qr.unclaimedTitle')}</Text>
        <View style={styles.buttonWrapper}>
            <TouchableOpacity
                style={[
                styles.generateButton,
                generating && { opacity: 0.6 },
                ]}
                onPress={generateQrCode}
                disabled={generating}
            >
                {generating ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text style={styles.generateButtonText}>
                    {i18n.t('qr.generateButton')}
                </Text>
                )}
            </TouchableOpacity>
        </View>

        <FlatList
            data={qrCodes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
                <QrCard
                code={item.code}
                expiresAt={item.expiresAt.toDate()}
                type={item.type}
                onShare={handleShare}
                />
            )}
        />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fafafa',
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectorWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    selectorButton: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 90,
        alignItems: 'center',
        borderColor: '#ccc',
        backgroundColor: '#fff',
    },
    selectorSelected: {
        borderColor: '#4CAF50',
        backgroundColor: '#eaffea',
    },
    selectorText: {
        color: '#333',
    },
    selectorTextSelected: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    buttonWrapper: {
        marginBottom: 60,
        alignSelf: 'center',
        width: '100%',
    },
    generateButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
      },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});