import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, Alert, Linking } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigationTypes' // adjust this import if needed
import i18n from '@/i18n';
import { useUser } from '@/contexts/UserContext';
import { db } from '../src/config/firebase'; // Import Firestore
import { doc, updateDoc } from 'firebase/firestore';

export default function TermsScreen() {
    const [agreed, setAgreed] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const { user, updateUserProfile } = useUser();

    const handleContinue = async () => {
      if (!agreed) {
        Alert.alert(i18n.t('terms.alertAgree'));
        return;
      }
    
      if (!user?.uid) {
        Alert.alert(i18n.t('terms.alertNoUser'));
        return;
      }
    
      try {
        // Save the agreement to Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          termsAccepted: true
        });
    
        // Update in context (for immediate effect)
        updateUserProfile({ termsAccepted: true });
    
        console.log('✅ Terms accepted and saved in Firestore.');
      } catch (error) {
        console.error("❌ Failed to save terms acceptance in Firestore:", error);
        Alert.alert(i18n.t('terms.alertFailTitle'), i18n.t('terms.alertFailText'));
      }
    };

    const openLink = (url: string) => {
      Linking.openURL(url);
    };

    return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <Text style={styles.title}>{i18n.t('terms.title')}</Text>

            {/* Subscription Info Section */}
            <View style={styles.subsSection}>
              <Text style={styles.planName}>
                {i18n.t('terms.monthlyName')} <Text style={styles.planPrice}>{i18n.t('terms.monthlyPrice')}</Text>
              </Text>
              <Text style={styles.planDescription}>{i18n.t('terms.monthlyDescription')}</Text>
              <Text style={styles.planName}>
                {i18n.t('terms.yearlyName')} <Text style={styles.planPrice}>{i18n.t('terms.yearlyPrice')}</Text>
              </Text>
              <Text style={styles.planDescription}>{i18n.t('terms.yearlyDescription')}</Text>
            </View>
            <Text style={styles.renewalText}>{i18n.t('terms.autoRenewalDisclosure')}</Text>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.termsText}>
                {i18n.t('terms.text')}
              </Text>
            </ScrollView>
      
            <View style={{ marginBottom: 20 }}>
              <Checkbox.Item
                label={i18n.t('terms.agree')}
                status={agreed ? 'checked' : 'unchecked'}
                onPress={() => setAgreed(!agreed)}
                labelStyle={{ fontSize: 16 }}
                color='#007AFF'
                uncheckedColor='#ccc'
                theme={{ colors: { primary: '#007AFF' } }}
              />
      
              <Button title={i18n.t('terms.continue')} onPress={handleContinue} />
      
              {/* Add links to Privacy Policy and Terms of Use */}
              <View style={styles.linksContainer}>
                <Text style={styles.linkText} onPress={() => openLink('https://doc-hosting.flycricket.io/interzone-privacy-policy/27db818a-98c7-40d9-8363-26e92866ed5b/privacy')}>
                  {i18n.t('terms.privacyPolicy')}
                </Text>
                <Text style={styles.linkText} onPress={() => openLink('https://doc-hosting.flycricket.io/interzone-terms-of-use/939c3e2c-42a7-47e6-8d8f-59e7b9890735/terms')}>
                  {i18n.t('terms.termsOfUse')}
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    scroll: {
        flex: 1,
        marginBottom: 20,
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#f9f9f9',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 3,
    },
    termsText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    },
    linksContainer: {
        marginTop: 10,
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: '#007AFF',
        textDecorationLine: 'underline',
        marginVertical: 5,
    },
    subsSection: {
      marginBottom: 10,
      backgroundColor: '#f1f6fd',
      borderRadius: 8,
      padding: 12,
    },
    planName: {
      fontWeight: 'bold',
      fontSize: 16,
      color: '#222',
    },
    planPrice: {
      fontWeight: 'normal',
      fontSize: 15,
      color: '#007AFF',
    },
    planDescription: {
      fontSize: 15,
      color: '#555',
      marginLeft: 6,
      marginBottom: 2,
    },
    renewalText: {
      fontSize: 13,
      color: '#555',
      marginBottom: 7,
      fontStyle: 'italic',
    },
});