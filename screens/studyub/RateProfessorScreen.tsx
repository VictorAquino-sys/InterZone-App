import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { addDoc, collection, serverTimestamp, getDocs, orderBy, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../src/navigationTypes'; // update path if needed
import i18n from '@/i18n';

type RouteParams = {
  RateProfessor: {
    universityId: string;
    professorId: string;
    professorName: string;
  };
};

const RateProfessorScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'RateProfessor'>>();
  const { universityId, professorId, professorName } = route.params;
  const { user } = useUser();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (!user?.uid) return;
  
    if (rating === 0 || comment.trim().length < 3) {
        Alert.alert(
            i18n.t('rateOne.incompleteTitle'),
            i18n.t('rateOne.incompleteMsg')
        );
        return;
    }
  
    const reviewsRef = collection(
      db,
      'universities',
      universityId,
      'professors',
      professorId,
      'reviews'
    );
  
    // 🔍 Check if user already reviewed this professor
    const existingReviewQuery = query(reviewsRef, where('userId', '==', user.uid));
    const existingSnap = await getDocs(existingReviewQuery);
  
    if (!existingSnap.empty) {
      Alert.alert(
        i18n.t('rateOne.duplicateTitle'),
        i18n.t('rateOne.duplicateMsg')
      );
      return;
    }
  
    // ✅ Add the new review
    const reviewData = {
      userId: user.uid,
      rating,
      comment: comment.trim(),
      createdAt: serverTimestamp(),
      upvotes: 0,
    };
  
    await addDoc(reviewsRef, reviewData);
  
    // ⏳ FIFO limit: keep only 20 reviews
    const snapshot = await getDocs(query(reviewsRef, orderBy('createdAt', 'asc')));
    const reviewDocs = snapshot.docs;
  
    if (reviewDocs.length > 20) {
      const oldest = reviewDocs[0];
      await deleteDoc(oldest.ref);
    }
  
    Alert.alert(i18n.t('rateOne.successTitle'), i18n.t('rateOne.successMsg'));
    navigation.goBack();
  };

  const renderStars = () => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity key={num} onPress={() => setRating(num)}>
            <Ionicons
              name={num <= rating ? 'star' : 'star-outline'}
              size={32}
              color="#FFD700"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
        <Text style={styles.header}>
            {i18n.t('rateOne.header', { name: professorName })}
        </Text>

      {renderStars()}

      <TextInput
        style={styles.textInput}
        multiline
        placeholder={i18n.t('rateOne.placeholder')}
        value={comment}
        onChangeText={setComment}
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>{i18n.t('rateOne.submit')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  starsRow: { flexDirection: 'row', marginBottom: 20 },
  textInput: {
    borderColor: '#ccc', borderWidth: 1,
    padding: 12, borderRadius: 6, minHeight: 100,
    textAlignVertical: 'top', marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#007AFF', padding: 14,
    borderRadius: 6, alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16 },
});

export default RateProfessorScreen;
