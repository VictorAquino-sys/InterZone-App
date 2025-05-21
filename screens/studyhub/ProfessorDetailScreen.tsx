import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { collection, getDocs, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../src/navigationTypes'; // update path if needed
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { db } from '@/config/firebase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUser } from '@/contexts/UserContext';

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
  upvotedBy?: string[];
};

type ProfessorInfo = {
  name: string;
  department?: string;
  course?: string;
  nameLower?: string;
  createdAt?: any;
  createdBy?: string;
  // add more as you add fields!
};

const ProfessorDetailScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'ProfessorDetail'>>();
  const { universityId, professorId, professorName } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [professorInfo, setProfessorInfo] = useState<ProfessorInfo | null>(null);
  const { user } = useUser(); // user?.uid
  const [reviews, setReviews] = useState<Review[]>([]);
  const hasReviewed = user?.uid && reviews.some(r => r.userId === user.uid);


  const fetchReviews = async () => {
    const reviewRef = collection(db, 'universities', universityId, 'professors', professorId, 'reviews');
    const snapshot = await getDocs(reviewRef);
    const items: Review[] = [];
    snapshot.forEach(docSnap => {
      items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Review, 'id'>) });
    });
    setReviews(items);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfessorInfo();
      fetchReviews();
    }, [])
  );

  useEffect(() => {
    fetchProfessorInfo();
    fetchReviews();
  }, []);

  const handleUpvote = async (reviewId: string, upvotedBy: string[] = []) => {
    if (!user?.uid) return;
    if (upvotedBy.includes(user.uid)) {
      Alert.alert('Ya votaste', 'Solo puedes votar una vez.');
      return;
    }

    try {
      const reviewDoc = doc(db, 'universities', universityId, 'professors', professorId, 'reviews', reviewId);
      await updateDoc(reviewDoc, {
        upvotes: increment(1),
        upvotedBy: [...(upvotedBy || []), user.uid],
      });
      fetchReviews();
    } catch (err) {
      Alert.alert('Error', 'Could not upvote. Try again later.');
    }
  };

  const fetchProfessorInfo = async () => {
    const profRef = doc(db, 'universities', universityId, 'professors', professorId);
    const snap = await getDoc(profRef);
    if (snap.exists()) {
      setProfessorInfo(snap.data() as ProfessorInfo);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    // Firestore Timestamp
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: Review }) => {
    const disabled = item.upvotedBy?.includes(user?.uid ?? '');
    return (
      <View style={styles.reviewCard}>
        <Text style={styles.rating}>⭐ {item.rating}/5</Text>
        <Text style={styles.comment}>{item.comment}</Text>
        <TouchableOpacity
          onPress={() => handleUpvote(item.id, item.upvotedBy || [])}
          style={styles.upvote}
          disabled={disabled}
        >
          <Ionicons name="arrow-up" size={20} color={disabled ? "#aaa" : "#007AFF"} />
          <Text style={[styles.voteText, disabled && { color: "#aaa" }]}>{item.upvotes}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {professorInfo && (
        <View style={styles.profHeader}>
          <Text style={styles.title}>{professorInfo.name}</Text>
          {professorInfo.department ? (
            <Text style={styles.subInfo}>
              Departamento: {professorInfo.department}
            </Text>
          ) : null}
          {professorInfo.course ? (
            <Text style={styles.subInfo}>
              Curso: {professorInfo.course}
            </Text>
          ) : null}
          {professorInfo.createdAt && (
            <Text style={styles.subInfo}>
              {`Agregado el ${formatDate(professorInfo.createdAt)}`}
            </Text>
          )}
        </View>
      )}

      {!hasReviewed && (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => navigation.navigate('RateProfessor', {
            universityId,
            professorId,
            professorName,
          })}
        >
          <Text style={styles.reviewBtnText}>Dejar Reseña</Text>
        </TouchableOpacity>
      )}


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
  profHeader: { marginBottom: 10 },
  subInfo: { color: '#888', fontSize: 15, marginBottom: 2 },
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
  reviewBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 10,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  reviewBtnText: { color: '#fff', fontWeight: 'bold' },
});

export default ProfessorDetailScreen;