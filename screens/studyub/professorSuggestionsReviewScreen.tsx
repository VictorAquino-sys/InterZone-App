import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { db } from '@/config/firebase';
import { collection, getDocs, deleteDoc, addDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useUser } from '@/contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';
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
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);


  const fetchSuggestions = async () => {
    setLoading(true);
    const universities = ['upc', 'villareal']; // Expand this list if needed
    const allSuggestions: Suggestion[] = [];
    try {
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
    } catch (err) {
      Alert.alert("Error", "unable to fetch suggestions.");
    }
      setLoading(false);
  };

  const handleApprove = async (suggestion: Suggestion) => {
    setProcessingId(suggestion.id);
    try {
      const ref = doc(db, 'universities', suggestion.universityId, 'professors', suggestion.id);
      await setDoc(
          doc(db, 'universities', suggestion.universityId, 'professors', suggestion.id),
          {
            name: suggestion.name,
            nameLower: suggestion.name.toLowerCase(),
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
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (suggestion: Suggestion) => {
    setProcessingId(suggestion.id);
    try {
      await deleteDoc(
        doc(db, 'universities', suggestion.universityId, 'professorSuggestions', suggestion.id)
      );
      await fetchSuggestions();
      Alert.alert(i18n.t('professorReview.rejectedTitle'), i18n.t('professorReview.rejectedMsg'));
    } catch (err) {
      Alert.alert("Error", "unable to reject suggestion.");
    } finally {
      setProcessingId(null);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user?.claims?.admin) fetchSuggestions();
    }, [user?.claims?.admin])
  );

  if (!user?.claims?.admin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('professorReview.accessDenied')}</Text>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!loading && suggestions.length === 0) return (
    <View style={styles.container}>
      <Text>No hay sugerencias pendientes.</Text>
    </View>
  );

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

              <TouchableOpacity
                disabled={processingId === item.id}
                onPress={() => handleApprove(item)}
              >
                <Text style={styles.approve}>✅ {i18n.t('professorReview.approve')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={processingId === item.id}
                onPress={() => handleReject(item)}
              >
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
