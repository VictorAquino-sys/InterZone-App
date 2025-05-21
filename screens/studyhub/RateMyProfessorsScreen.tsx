import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView, } from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit, increment, doc } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootStackParamList } from '../../src/navigationTypes'; // update path if needed
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { db } from '@/config/firebase';
import i18n from '@/i18n';

type Props = {
  universityId: string;
  universityName: string;
};

type Professor = {
  id: string;
  name: string;
  department: string;
  reviewsCount?: number; // <--- NEW
};

const RateMyProfessorsScreen = ({ universityId, universityName }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [topProfessors, setTopProfessors] = useState<Professor[]>([]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fetchProfessors = async () => {
    setLoading(true);
    const profRef = collection(db, 'universities', universityId, 'professors');
    const searchLower = searchTerm.toLowerCase();
    const q = query(
      profRef,
      where('nameLower', '>=', searchLower),
      where('nameLower', '<=', searchLower + '\uf8ff')
    );

    const querySnapshot = await getDocs(q);
    const list: Professor[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Professor, 'id'>) });
    });
    setProfessors(list);
    setLoading(false);
  };

  const fetchTopProfessors = async () => {
    try {
      const profRef = collection(db, 'universities', universityId, 'professors');
      const q = query(profRef, 
        where('reviewsCount', '>', 0), // Only those with at least one review
        orderBy('reviewsCount', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const list: Professor[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Professor, 'id'>) });
      });
      setTopProfessors(list);
    } catch (err) {
      // Optionally handle error
    }
  };

  useEffect(() => {
    if (searchTerm.length > 1) {
      fetchProfessors();
    } else {
      setProfessors([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchTopProfessors();
  }, [universityId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchTopProfessors();
      // Only fetch all professors if there’s a search term
      if (searchTerm.length > 1) {
        fetchProfessors();
      } else {
        setProfessors([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [universityId, searchTerm])
  );

  const renderProfessorItem = ({ item }: { item: Professor }) => (
    <TouchableOpacity
      style={styles.professorItem}
      onPress={() => {
        navigation.navigate('ProfessorDetail', {
          universityId,
          professorId: item.id,
          professorName: item.name
        });
      }}
    >
      <Text style={styles.professorName}>{item.name}</Text>
      <Text style={styles.professorDept}>{item.department}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {topProfessors.length > 0 && (
        <View>
          <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 15 }}>
            {i18n.t('rateProfessors.topProfessors')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {topProfessors.map(prof => (
              <TouchableOpacity
                key={prof.id}
                style={styles.professorCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ProfessorDetail', {
                  universityId,
                  professorId: prof.id,
                  professorName: prof.name,
                })}
              >
                <Text style={styles.topProfName}>{prof.name}</Text>
                <Text style={styles.topProfDept}>{prof.department}</Text>
                <View style={styles.reviewsRow}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text style={styles.reviewsCount}>{prof.reviewsCount ?? 0}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.header}>{i18n.t('rateProfessors.header')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('rateProfessors.placeholder')}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {professors.length === 0 && searchTerm.length >= 3 && !loading && (
        <TouchableOpacity
          style={styles.suggestButton}
          onPress={() => navigation.navigate('SuggestProfessor', { universityId })}
        >
          <Text style={styles.suggestButtonText}>➕ {i18n.t('rateProfessors.suggest')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={professors.filter(
          (prof) => !topProfessors.some((top) => top.id === prof.id)
        )}
        keyExtractor={(item) => item.id}
        renderItem={renderProfessorItem}
        contentContainerStyle={{ paddingBottom: 60 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderColor: '#ccc', borderWidth: 1, borderRadius: 6,
    padding: 10, marginBottom: 10
  },
  professorItem: {
    padding: 12, borderBottomWidth: 0.5, borderColor: '#ddd',
  },
  professorName: { fontSize: 16 },
  professorCard: {
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginRight: 14,
    marginTop: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  professorDept: { fontSize: 13, color: 'gray' },
  addButton: {
    backgroundColor: '#007AFF', padding: 12, borderRadius: 6, alignItems: 'center', marginBottom: 10
  },
  addButtonText: { color: '#fff', fontSize: 16 },
  suggestButton: {
    backgroundColor: '#26c6da',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 10,
  },
  suggestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  topProfName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#262626',
    marginBottom: 2,
  },
  topProfDept: {
    fontSize: 13,
    color: '#40A3FF',
    marginBottom: 10,
  },
  reviewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewsCount: {
    fontSize: 15,
    marginLeft: 4,
    color: '#333',
    fontWeight: '600',
  },
});

export default RateMyProfessorsScreen;