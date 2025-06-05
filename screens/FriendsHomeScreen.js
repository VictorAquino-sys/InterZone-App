import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import i18n from '../src/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { themeColors } from '@/theme/themeColors';
import ThemedStatusBar from '@/components/ThemedStatusBar';

const FriendsHomeScreen = ({ navigation }) => {
  const { resolvedTheme } = useTheme();
  const colors = themeColors[resolvedTheme];

  return (
    <>
      <ThemedStatusBar/>

        <View style={[styles.container, { backgroundColor: colors.backgroundprofile}]}>
            <Text style={[styles.title, { color: colors.text }]}>👥 {i18n.t('friendsTitle')}</Text>

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

            <TouchableOpacity
              style={styles.blockedUsersButton}
              onPress={() => navigation.navigate('BlockedUsers')}
            >
              <Text style={styles.blockedUsersText}>{i18n.t('block.manage')}</Text>
            </TouchableOpacity>

          </View>
        </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 60,
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
  blockedUsersButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  blockedUsersText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default FriendsHomeScreen;