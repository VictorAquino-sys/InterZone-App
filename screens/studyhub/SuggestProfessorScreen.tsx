import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../src/navigationTypes'; // update path if needed
import { useNavigation,  RouteProp, useRoute  } from '@react-navigation/native';
import i18n from '@/i18n';
import normalizeString from '@/utils/normalizeString';

type SuggestProfessorRouteProp = RouteProp<RootStackParamList, 'SuggestProfessor'>;

const SuggestProfessorScreen = () => {
    const route = useRoute<SuggestProfessorRouteProp>();
    const { universityId } = route.params;  const { user } = useUser();
    const [name, setName] = useState('');
    const [department, setDepartment] = useState('');
    const [course, setCourse] = useState('');
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const isFormValid = Boolean(name.trim() && department.trim() && course.trim());
    const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.uid || name.trim().length < 2 || department.trim().length < 2 || course.trim().length < 2) {
        Alert.alert(
          i18n.t('suggest.incompleteTitle'),
          i18n.t('suggest.completeAllFields')
        );
        return;
      }

    setSubmitting(true);
    try{
      const suggestion = {
        name: name.trim(),
        nameSearch: normalizeString(name.trim()),
        department: department.trim(),
        course: course.trim(),
        universityId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(
        collection(db, 'universities', universityId, 'professorSuggestions'),
        suggestion
      );
      Alert.alert(i18n.t('suggest.successTitle'), i18n.t('suggest.successMsg'), [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      setName('');
      setDepartment('');
      setCourse('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('suggest.title')}</Text>

      <TextInput
        placeholder={i18n.t('suggest.namePlaceholder')}
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder={i18n.t('suggest.departmentPlaceholder')}
        style={styles.input}
        value={department}
        onChangeText={setDepartment}
      />

      <TextInput
        placeholder={i18n.t('suggest.coursePlaceholder')}
        style={styles.input}
        value={course}
        onChangeText={setCourse}
      />

      <TouchableOpacity 
          style={[styles.button, (!isFormValid || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!isFormValid || submitting}
      >
        { submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{i18n.t('suggest.submit')}</Text>
        )}
      </TouchableOpacity>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderColor: '#ccc', borderWidth: 1, borderRadius: 6,
    padding: 10, marginBottom: 10
  },
  button: {
    backgroundColor: '#007AFF', padding: 12,
    borderRadius: 6, alignItems: 'center'
  },
  buttonText: { color: 'white', fontSize: 16 },
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
    fontWeight: 'bold',
  },
});

export default SuggestProfessorScreen;