import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, Alert } from 'react-native';
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

// type TermsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Terms'>;

export default function TermsScreen() {
    // const navigation = useNavigation<TermsScreenNavigationProp>();
    const [agreed, setAgreed] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const { user, updateUserProfile } = useUser();

    const handleContinue = async () => {
      if (!agreed) {
        Alert.alert('Please agree to the terms to continue.');
        return;
      }
    
      if (!user?.uid) {
        Alert.alert("User data missing. Please try again.");
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
        Alert.alert("Failed to proceed", "There was a problem accepting the terms.");
      }
    };

    return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <Text style={styles.title}>{i18n.t('terms.title')}</Text>
      
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
      checkboxRow: {
        marginBottom: 20,
      },
});