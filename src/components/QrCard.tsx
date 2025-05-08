import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import i18n from '@/i18n';
import QRCode from 'react-native-qrcode-svg';

interface Props {
  code: string;
  expiresAt: Date;
  onShare: (url: string) => void;
}

export default function QrCard({ code, expiresAt, onShare }: Props) {
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const link = `https://interzone.app/claim/${code}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link);
    Alert.alert(i18n.t('qr.copied'), i18n.t('qr.copiedMessage'));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.codeLabel}>{i18n.t('qr.code')}: {code}</Text>
      <Text>{i18n.t('qr.expires')}: {new Date(expiresAt).toLocaleDateString()}</Text>

        <View style={styles.qrImageWrapper}>
            <QRCode
            value={code}
            size={120}
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
    card: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
    codeLabel: { fontWeight: 'bold', marginBottom: 4 },
    qrImageWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
      height: 120,
      marginTop: 8,
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
        color: 'blue',
        marginTop: 8,
        textDecorationLine: 'underline',
    },
});