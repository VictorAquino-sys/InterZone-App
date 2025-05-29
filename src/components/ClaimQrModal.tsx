// components/ClaimQrModal.tsx
import React from 'react';
import { View, Text, Button, Modal, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import i18n from '@/i18n'; // If you use i18n

interface ClaimQrModalProps {
    visible: boolean;
    qrCodeValue: string;
    shortCode?: string;        // <--- NEW
    onClose: () => void;
}

const ClaimQrModal: React.FC<ClaimQrModalProps> = ({
  visible,
  qrCodeValue,
  shortCode,
  onClose
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.qrModalContent}>
        <Text style={styles.title}>
          {i18n.t('promo.showQr')}
        </Text>

        <View style={styles.screenshotTipBox}>
        <Text style={styles.screenshotTipText}>
          {i18n.t('promo.screenshotTip')}
        </Text>
        </View>

        {/* Only render QRCode if qrCodeValue is non-empty */}
        {qrCodeValue ? (
          <QRCode value={qrCodeValue} size={200} />
        ) : (
          <Text style={{ color: '#fff', marginBottom: 20 }}>
            {i18n.t('promo.loadingCode')}
          </Text>
        )}
        {shortCode && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>
              {i18n.t('promo.shortCodeLabel')}
            </Text>
            <Text selectable style={styles.shortCode}>{shortCode}</Text>
            <Text style={styles.tip}>
              {i18n.t('promo.manualEntryHint')}
            </Text>
          </View>
        )}
        <Button title={i18n.t('common.close')} onPress={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  qrModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  codeBox: {
    marginTop: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
  },
  codeLabel: {
    color: '#FFD600',
    fontWeight: 'bold',
    fontSize: 16,
  },
  shortCode: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 2,
    marginVertical: 6,
  },
  tip: {
    color: '#eee',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  screenshotTipBox: {
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD600',
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
  screenshotTipText: {
    color: '#E65100',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default ClaimQrModal;
