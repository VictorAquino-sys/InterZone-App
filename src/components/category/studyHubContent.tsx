import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Platform, Pressable, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigationTypes';
import { useUser } from '@/contexts/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import i18n from '@/i18n';
import villarealLogo from '@/../assets/federico_logo.png';
import sanMarcosLogo from '@/../assets/sanmarcos_logo.png';
import catolicaLogo from '@/../assets/catolica_logo.png';
import upcLogo from '@/../assets/upc_logo.png';
import ucvLogo from ' @/../assets/ucv_logo.png';
import SchoolEmailVerificationModal from '@/components/SchoolEmailVerificationModal';

  type StudyHubContentProps = {
    toggleHistoryTrivia: () => void;
  };

  const StudyHubContent: React.FC<StudyHubContentProps> = ({ toggleHistoryTrivia }) => {
    const { user } = useUser();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [selectedSchoolId, setSelectedSchoolId] = useState<'villareal' | 'upc' | 'catolica' | 'sanMarcos' | 'cesarVallejo' | null>(null);
    const [loadingSchoolId, setLoadingSchoolId] = useState<'villareal' | 'upc' | 'catolica' | 'sanMarcos' | 'cesarVallejo' | null>(null);
    const [fadeAnimVilla] = useState(new Animated.Value(1));
    const [fadeAnimUPC] = useState(new Animated.Value(1));

    const handleUniversityTap = async (universityId: 'villareal' | 'upc' | 'catolica' | 'sanMarcos' | 'cesarVallejo', universityName: string) => {
        if (!user?.uid) {
            Alert.alert('Error', 'You must be signed in to access this feature.');
            return;
        }

        // Trigger fade animation
        const fadeTarget = universityId === 'villareal' ? fadeAnimVilla : fadeAnimUPC;
        Animated.timing(fadeTarget, {
            toValue: 0.4,
            duration: 200,
            useNativeDriver: true,
        }).start();

        setLoadingSchoolId(universityId);

        try {
          const userRef = doc(db, 'users', user?.uid);
          const userSnap = await getDoc(userRef);
      
          const verifiedSchools: string[] = userSnap.exists()
            ? userSnap.data().verifiedSchools || []
            : [];
      
          if (verifiedSchools.includes(universityId)) {
            navigation.navigate('UniversityScreen', { universityId, universityName });
          } else {
            if (universityId === 'upc' || universityId === 'villareal' || universityId === 'sanMarcos' || universityId === 'catolica' || universityId === 'cesarVallejo') {
                setSelectedSchoolId(universityId);
                setShowVerificationModal(true);
              } else {
                Alert.alert('Invalid School', 'This school is not currently supported for verification.');
              }
          }
        } catch (error) {
          console.error('Error checking school verification:', error);
          Alert.alert('Error', 'Unable to check your school access.');
        } finally {
            // Restore opacity
            Animated.timing(fadeTarget, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            setLoadingSchoolId(null);
        }
    };

  return (
    <>
      <View style={styles.studyHubContent}>
        <Pressable
            android_ripple={{ color: '#e0e0e0', borderless: false }}
            style={({ pressed }) => [styles.logoCard, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
            onPress={() => handleUniversityTap('villareal', 'Villareal')}
            disabled={loadingSchoolId !== null}
        >
        <View style={styles.logoWrapper}>
            <Animated.View style={[styles.logoImageWrapper, { opacity: fadeAnimVilla }]}>
            <Image source={villarealLogo} style={styles.logoImageVilla} resizeMode="contain" />
            </Animated.View>

            {loadingSchoolId === 'villareal' && (
            <View style={styles.activityOverlay}>
                <ActivityIndicator size="large" color="#26c6da" />
            </View>
            )}
        </View>
        </Pressable>

        <Pressable
            android_ripple={{ color: '#e0e0e0', borderless: false }}
            style={({ pressed }) => [styles.logoCard, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
            onPress={() => handleUniversityTap('upc', 'UPC')}
            disabled={loadingSchoolId !== null}
        >
        <View style={styles.logoWrapper}>
            <Animated.View style={[styles.logoImageWrapper, { opacity: fadeAnimUPC }]}>
            <Image source={upcLogo} style={styles.logoImageUPC} resizeMode="contain" />
            </Animated.View>

            {loadingSchoolId === 'upc' && (
            <View style={styles.activityOverlay}>
                <ActivityIndicator size="large" color="#26c6da" />
            </View>
            )}
        </View>
        </Pressable>

        <Pressable
            android_ripple={{ color: '#e0e0e0', borderless: false }}
            style={({ pressed }) => [styles.logoCard, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
            onPress={() => handleUniversityTap('catolica', 'Catolica')}
            disabled={loadingSchoolId !== null}
        >
        <View style={styles.logoWrapper}>
            <Animated.View style={[styles.logoImageWrapper, { opacity: fadeAnimUPC }]}>
            <Image source={catolicaLogo} style={styles.logoImageUPC} resizeMode="contain" />
            </Animated.View>

            {loadingSchoolId === 'catolica' && (
            <View style={styles.activityOverlay}>
                <ActivityIndicator size="large" color="#26c6da" />
            </View>
            )}
        </View>
        </Pressable>

        <Pressable
            android_ripple={{ color: '#e0e0e0', borderless: false }}
            style={({ pressed }) => [styles.logoCard, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
            onPress={() => handleUniversityTap('sanMarcos', 'sanMarcos')}
            disabled={loadingSchoolId !== null}
        >
        <View style={styles.logoWrapper}>
            <Animated.View style={[styles.logoImageWrapper, { opacity: fadeAnimUPC }]}>
            <Image source={sanMarcosLogo} style={styles.logoImageUPC} resizeMode="contain" />
            </Animated.View>

            {loadingSchoolId === 'sanMarcos' && (
            <View style={styles.activityOverlay}>
                <ActivityIndicator size="large" color="#26c6da" />
            </View>
            )}
        </View>
        </Pressable>

        <Pressable
            android_ripple={{ color: '#e0e0e0', borderless: false }}
            style={({ pressed }) => [styles.logoCard, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
            onPress={() => handleUniversityTap('cesarVallejo', 'cesarVallejo')}
            disabled={loadingSchoolId !== null}
        >
        <View style={styles.logoWrapper}>
            <Animated.View style={[styles.logoImageWrapper, { opacity: fadeAnimUPC }]}>
            <Image source={ucvLogo} style={styles.logoImageUPC} resizeMode="contain" />
            </Animated.View>

            {loadingSchoolId === 'cesarVallejo' && (
            <View style={styles.activityOverlay}>
                <ActivityIndicator size="large" color="#26c6da" />
            </View>
            )}
        </View>
        </Pressable>

        <View style={styles.testTitleContainer}>
            <Text style={styles.testTitle}>🧠 {i18n.t('testYourKnowledge')}</Text>
            <TouchableOpacity style={styles.triviaButton} onPress={toggleHistoryTrivia}>
                <Text style={styles.triviaButtonText}>Villareal - Historia Universal</Text>
            </TouchableOpacity>
        </View>
      </View>

      {showVerificationModal && selectedSchoolId && (
        <SchoolEmailVerificationModal
          visible={showVerificationModal}
          user={user}
          schoolId={selectedSchoolId}
          onClose={() => {
            setShowVerificationModal(false);
            setSelectedSchoolId(null);
          }}
          onSuccess={() => {
            if (!selectedSchoolId) {
              Alert.alert('Error', 'No university selected.');
              return;
            }

            setShowVerificationModal(false);

            const universityName =
              selectedSchoolId === 'upc'
                ? 'UPC'
                : selectedSchoolId === 'villareal'
                ? 'Villareal'
                : selectedSchoolId === 'catolica'
                ? 'PUCP'
                : selectedSchoolId === 'sanMarcos'
                ? 'San Marcos'
                : 'Universidad';
          
            navigation.navigate('UniversityScreen', {
              universityId: selectedSchoolId,
              universityName,
            });
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  studyHubContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 28,
  },
  logoCard: {
    width: 280,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  logoImageVilla: {
    width: 270,
    height: 140,
  },
  logoImageUPC: {
    width: 220,
    height: 160,
  },
  testTitleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
},
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
},
  triviaButton: {
    marginTop: 16,
    backgroundColor: '#26c6da',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  triviaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  logoWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  logoImageWrapper: {
    zIndex: 1,
  },
  
  activityOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});

export default StudyHubContent;