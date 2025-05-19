import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../src/navigationTypes'; // update path if needed
import { useNavigation } from '@react-navigation/native';
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
};

const RateMyProfessorsScreen = ({ universityId, universityName }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fetchProfessors = async () => {
    setLoading(true);
    const profRef = collection(db, 'universities', universityId, 'professors');
    const q = query(profRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));

    const querySnapshot = await getDocs(q);
    const list: Professor[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Professor, 'id'>) });
    });
    setProfessors(list);
    setLoading(false);
  };

  useEffect(() => {
    if (searchTerm.length > 1) {
      fetchProfessors();
    } else {
      setProfessors([]);
    }
  }, [searchTerm]);

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
        data={professors}
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
});

export default RateMyProfessorsScreen;