import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import i18n from '../src/i18n';

const FriendsHomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
        <Text style={styles.title}>👥 {i18n.t('friendsTitle')}</Text>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('People')}
        >
          <Ionicons name="person-add-outline" size={28} color="#007bff" />
          <Text style={styles.cardText}>{i18n.t('findPeople')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Requests')}
        >
          <Ionicons name="mail-outline" size={28} color="#007bff" />
          <Text style={styles.cardText}>{i18n.t('friendRequests')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('FriendsList')}
        >
          <Ionicons name="people-outline" size={28} color="#007bff" />
          <Text style={styles.cardText}>{i18n.t('myFriends')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    alignSelf: 'center',
    color: '#333',
  },
  cardContainer: {
    gap: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    flexDirection: 'row',
    gap: 16,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007bff',
  },
});

export default FriendsHomeScreen;
