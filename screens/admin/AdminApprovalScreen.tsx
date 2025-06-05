import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { collection, getDocs, updateDoc, doc, where, query, onSnapshot, deleteField, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface BusinessApplicant {
    uid: string;
    businessProfile?: {
      name?: string;
      description?: string;
      category?: string;
      location?: string;
      email?: string;
      avatar?: string;
    };
    pendingBusinessApplication?: boolean;
    businessVerified?: boolean;
  }

const AdminApprovalScreen = () => {
  const [applicants, setApplicants] = useState<BusinessApplicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('pendingBusinessApplication', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as BusinessApplicant[];
      setApplicants(list);
      setLoading(false);
    }, (error) => {
      console.error('Real-time update failed:', error);
      setLoading(false);
    });
  
    return () => unsubscribe(); // cleanup on unmount
  }, []);

  const handleDecision = async (uid: string, approve: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
  
      if (approve) {
        // Fetch the current user document
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
  
        let updatePayload: any = {
          businessVerified: true,
          pendingBusinessApplication: false,
        };

        // Add verifications.business = true if missing or false
        const hasBusinessVerification =
          !!userData?.verifications && userData.verifications.business === true;
  
        if (!hasBusinessVerification) {
          updatePayload['verifications'] = {
            ...(userData?.verifications || {}),
            business: true,
          };
        }

        // After fetching userData
        const needsOwnerUid =
        userData?.businessProfile && !userData.businessProfile.ownerUid;

        if (needsOwnerUid) {
          updatePayload['businessProfile'] = {
            ...userData.businessProfile,
            ownerUid: userData.uid, // fallback, should match user's own UID
          };
        }
  
        await updateDoc(userRef, updatePayload);
      } else {
        await updateDoc(userRef, {
          accountType: 'individual',
          businessVerified: false,
          pendingBusinessApplication: false,
          businessProfile: deleteField(),
          category: deleteField(),
        });
      }
  
      setApplicants(prev => prev.filter(applicant => applicant.uid !== uid));
  
      Alert.alert(
        approve ? '✅ Approved' : '🚫 Rejected',
        `Business has been ${approve ? 'approved' : 'rejected'}.`
      );
    } catch (error: any) {
      console.error('Firestore update error:', error.message || error);
      Alert.alert('Error', error.message || 'Could not process the request.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#007aff" /></View>
    );
  }

  if (applicants.length === 0) {
    return (
      <View style={styles.centered}><Text>No pending applications.</Text></View>
    );
  }

  return (
    <FlatList
      data={applicants}
      keyExtractor={(item) => item.uid}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <View style={styles.card}>
            <Text style={styles.name}>{item.businessProfile?.name || 'Unnamed Business'}</Text>
            <Text style={styles.category}>{item.businessProfile?.category || 'N/A'}</Text>
            <Text style={styles.description}>{item.businessProfile?.description || 'No description provided'}</Text>
            <Text style={styles.location}>
              📍 {item.businessProfile?.location || 'No location'}
            </Text>
            <Text style={styles.email}>
              ✉️ {item.businessProfile?.email || 'No email'}
            </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.approveButton} onPress={() => handleDecision(item.uid, true)}>
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rejectButton} onPress={() => handleDecision(item.uid, false)}>
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
};

export default AdminApprovalScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 8,
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  location: {
    fontSize: 13,
    color: '#009688',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: '#1976D2',
    marginBottom: 10,
  },
});
