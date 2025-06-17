import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons'; // ✅ Fix: import this
import { useUser } from '../../src/contexts/UserContext'; // ✅ Fix: import your user context
import { RootStackParamList } from '../../src/navigationTypes';
import i18n from '@/i18n';

const AdminDashboardScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user } = useUser(); // ✅ Fix: get current user

    const isAdmin = user?.claims?.admin === true;
    const canReviewBusiness = user?.claims?.canReviewBusiness === true;
    const canReviewProfessors = user?.claims?.canReviewProfessors === true;
    const isQrDistributor = user?.claims?.isQrDistributor === true;

    return (
        <View style={styles.container}>
          <Text style={styles.title}>{i18n.t('adminDashboard.title')}</Text>

          {(isAdmin || canReviewBusiness) && (
              <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('AdminApproval')}
              >
              <Ionicons name="briefcase-outline" size={30} color="#333" />
              <Text style={styles.cardText}>{i18n.t('adminDashboard.reviewBusiness')}</Text>
              </TouchableOpacity>
          )}

          {(isAdmin || canReviewProfessors) && (
              <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('ProfessorSuggestionsReview')}
              >
                  <Text style={styles.buttonText}>👨‍🏫 {i18n.t('adminDashboard.reviewProfessors')}</Text>
              </TouchableOpacity>
          )}

          {(isAdmin || isQrDistributor) && (
              <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('DistributeQr')}
              >
                  <Text style={styles.buttonText}>🔗 {i18n.t('adminDashboard.distributeQr')}</Text>
              </TouchableOpacity>
          )}

          {(isAdmin || user?.claims?.canReviewMusic) && (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('MusicApproval')}
            >
              <Ionicons name="musical-notes-outline" size={30} color="#333" />
              <Text style={styles.cardText}>{i18n.t('adminDashboard.reviewMusic')}</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('AdminNotification')}
            >
            <Text style={styles.buttonText}>🔔 {i18n.t('adminDashboard.notifyEvents')}</Text>
            </TouchableOpacity>
          )}

        
        </View>
    );

};

export default AdminDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f4f9ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 28,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#e1f5fe',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    borderColor: '#b3b3b3',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});