import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { User } from '@/contexts/UserContext';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/config/firebase';
import i18n from '@/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  schoolId: 'upc' | 'villareal';
  onSuccess: (verifiedEmail: string) => void;
  user: User | null; // ✅ Add this line
};

const SchoolEmailVerificationModal: React.FC<Props> = ({ visible, onClose, schoolId, onSuccess, user }) => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const domain = schoolId === 'upc' ? 'upc.edu.pe' : 'unfv.edu.pe';

    useEffect(() => {
        if (visible && user?.claims?.admin) {
            onSuccess(`${schoolId}-admin-bypass`);
            onClose();
        }
    }, [visible, user, schoolId]);

    const handleSendCode = async () => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.endsWith(`@${domain}`)) {
          Alert.alert(i18n.t('verify.invalidTitle'), i18n.t('verify.invalidEmail', { domain }));
          return;
        }
    
        try {
            setLoading(true);
            await auth.currentUser?.getIdToken(true); // force refresh
            const sendCode = httpsCallable(functions, 'sendSchoolVerificationCode');
            await sendCode({ email: cleanEmail, schoolId });
            setCodeSent(true);
            Alert.alert(i18n.t('verify.codeSentTitle'), i18n.t('verify.codeSentMsg'));
        } catch (err: any) {
            console.error(err);
            Alert.alert(i18n.t('verify.errorTitle'), err.message || i18n.t('verify.errorGeneric'));
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        try {
            setLoading(true);
            const verifyCode = httpsCallable(functions, 'verifySchoolCode');
            await verifyCode({ code });
        
            onSuccess(email.trim().toLowerCase());
            onClose();
        } catch (err: any) {
          console.error(err);
          Alert.alert(i18n.t('verify.failedTitle'), err.message || i18n.t('verify.failedMsg'));
        } finally {
            setLoading(false);
        }
    };

    if (user?.claims?.admin) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
            <View style={styles.modal}>
            <Text style={styles.title}>{i18n.t('verify.title')}</Text>

            <TextInput
                placeholder={`you@${domain}`}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!codeSent && !loading}
            />

            {codeSent && (
                <TextInput
                    placeholder={i18n.t('verify.codePlaceholder')}
                    value={code}
                    onChangeText={setCode}
                    style={styles.input}
                    keyboardType="number-pad"
                    editable={!loading}
                />
            )}

            {!codeSent ? (
            <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{i18n.t('verify.send')}</Text>}
            </TouchableOpacity>
            ) : (
            <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{i18n.t('verify.verify')}</Text>}
            </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} disabled={loading}>
                <Text style={[styles.cancel, loading && { color: '#ccc' }]}>{i18n.t('verify.cancel')}</Text>
            </TouchableOpacity>
            </View>
        </View>
        </Modal>
    );
};

export default SchoolEmailVerificationModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0006',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    width: '85%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
    borderRadius: 6,
  },
  button: {
    backgroundColor: '#26c6da',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 6,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancel: {
    marginTop: 12,
    color: '#999',
  },
});
