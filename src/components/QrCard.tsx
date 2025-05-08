import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import i18n from '@/i18n';
import QRCode from 'react-native-qrcode-svg';

interface Props {
  code: string;
  expiresAt: Date;
  type: 'business' | 'musician' | 'tutor';
  onShare: (url: string) => void;
}

export default function QrCard({ code, expiresAt, type, onShare }: Props) {
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const link = code;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link);
    Alert.alert(i18n.t('qr.copied'), i18n.t('qr.copiedMessage'));
  };

  return (
    <View style={styles.card}>
        <Text style={styles.typeLabel}>{i18n.t(`qr.types.${type}`)}</Text>
        <Text style={styles.codeLabel}>{i18n.t('qr.code')}: {code}</Text>
        <Text>{i18n.t('qr.expires')}: {new Date(expiresAt).toLocaleDateString()}</Text>

        <View style={styles.qrImageWrapper}>
            <QRCode
            value={code}
            size={180}
            backgroundColor="white"
            />
        </View>

        <TouchableOpacity onPress={handleCopy}>
            <Text style={styles.link}>{i18n.t('qr.copyLink')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onShare(link)}>
            <Text style={styles.link}>{i18n.t('qr.shareLink')}</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    card: { 
        backgroundColor: '#f9f9f9',
        padding: 16, 
        borderWidth: 1, 
        borderRadius: 16, 
        marginBottom: 16,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 4,
    },
    codeLabel: { 
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
        color: '#333',
    },
    qrImageWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30,
    },
    qrImage: {
        width: 120,
        height: 120,
        alignSelf: 'center',
    },
    spinner: {
        position: 'absolute',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        fontSize: 12,
        marginTop: 8,
    },
    link: {
        color: '#007BFF',
        marginTop: 8,
        textDecorationLine: 'underline',
        textAlign: 'center',
    },
    typeLabel: {
        fontSize: 20,
        fontWeight: '800',
        color: '#666',
        marginBottom: 4,
        textTransform: 'capitalize',
    },
});