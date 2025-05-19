import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { db } from '@/config/firebase';
import { collection, getDocs, deleteDoc, addDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useUser } from '@/contexts/UserContext';
import i18n from '@/i18n';

type Suggestion = {
  id: string;
  name: string;
  department?: string;
  course?: string;
  createdBy: string;
  universityId: string;
};

const ProfessorSuggestionsReviewScreen = () => {
    const { user } = useUser();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const fetchSuggestions = async () => {
        const universities = ['upc', 'villareal']; // Expand this list if needed
        const allSuggestions: Suggestion[] = [];
    
        for (const universityId of universities) {
        const snap = await getDocs(
            collection(db, 'universities', universityId, 'professorSuggestions')
        );
    
        snap.forEach(docSnap => {
            const data = docSnap.data();
            allSuggestions.push({
            id: docSnap.id,
            name: data.name,
            department: data.department,
            course: data.course,
            createdBy: data.createdBy,
            universityId: universityId,
            });
        });
        }
    
        setSuggestions(allSuggestions);
    };

  const handleApprove = async (suggestion: Suggestion) => {
    const ref = doc(db, 'universities', suggestion.universityId, 'professors', suggestion.id);
    await setDoc(
        doc(db, 'universities', suggestion.universityId, 'professors', suggestion.id),
        {
          name: suggestion.name,
          department: suggestion.department || '',
          course: suggestion.course || '',
          createdBy: suggestion.createdBy,
          createdAt: serverTimestamp(),
        }
    );

    await deleteDoc(
        doc(db, 'universities', suggestion.universityId, 'professorSuggestions', suggestion.id)
      );

    fetchSuggestions();
    Alert.alert(i18n.t('professorReview.approvedTitle'), i18n.t('professorReview.approvedMsg', { name: suggestion.name }));
  };

    const handleReject = async (suggestion: Suggestion) => {
    await deleteDoc(
        doc(db, 'universities', suggestion.universityId, 'professorSuggestions', suggestion.id)
    );
    fetchSuggestions();
    Alert.alert(i18n.t('professorReview.rejectedTitle'), i18n.t('professorReview.rejectedMsg'));
    };

  useEffect(() => {
    if (user?.claims?.admin) fetchSuggestions();
  }, [user?.uid]);

  if (!user?.claims?.admin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('professorReview.accessDenied')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('professorReview.title')}</Text>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.profName}>{item.name}</Text>
            {item.department ? <Text>{i18n.t('professorReview.department', { department: item.department })}</Text> : null}
            {item.course ? <Text>{i18n.t('professorReview.course', { course: item.course })}</Text> : null}
            <Text style={styles.submittedBy}>{i18n.t('professorReview.submittedBy', { uid: item.createdBy })}</Text>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleApprove(item)}>
                <Text style={styles.approve}>✅ {i18n.t('professorReview.approve')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReject(item)}>
                <Text style={styles.reject}>❌ {i18n.t('professorReview.reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#f9f9f9'
  },
  profName: { fontSize: 16, fontWeight: 'bold' },
  submittedBy: { fontSize: 12, color: '#888', marginTop: 4 },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between'
  },
  approve: { color: 'green', fontWeight: 'bold' },
  reject: { color: 'red', fontWeight: 'bold' },
});

export default ProfessorSuggestionsReviewScreen;
