import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { collection, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Ionicons from '@expo/vector-icons/Ionicons';

type RouteParams = {
  ProfessorDetail: {
    universityId: string;
    professorId: string;
    professorName: string;
  };
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  upvotes: number;
  userId: string;
};

const ProfessorDetailScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'ProfessorDetail'>>();
  const { universityId, professorId, professorName } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);

  const fetchReviews = async () => {
    const reviewRef = collection(db, 'universities', universityId, 'professors', professorId, 'reviews');
    const snapshot = await getDocs(reviewRef);
    const items: Review[] = [];
    snapshot.forEach(docSnap => {
      items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Review, 'id'>) });
    });
    setReviews(items);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpvote = async (reviewId: string) => {
    try {
      const reviewDoc = doc(db, 'universities', universityId, 'professors', professorId, 'reviews', reviewId);
      await updateDoc(reviewDoc, { upvotes: increment(1) });
      fetchReviews();
    } catch (err) {
      Alert.alert('Error', 'Could not upvote. Try again later.');
    }
  };

  const renderItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <Text style={styles.rating}>⭐ {item.rating}/5</Text>
      <Text style={styles.comment}>{item.comment}</Text>
      <TouchableOpacity onPress={() => handleUpvote(item.id)} style={styles.upvote}>
        <Ionicons name="arrow-up" size={20} color="#007AFF" />
        <Text style={styles.voteText}>{item.upvotes}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{professorName}</Text>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  reviewCard: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginBottom: 10,
  },
  rating: { fontSize: 16, fontWeight: '600' },
  comment: { fontSize: 14, marginVertical: 6 },
  upvote: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
  },
  voteText: { marginLeft: 6, color: '#007AFF' },
});

export default ProfessorDetailScreen;
