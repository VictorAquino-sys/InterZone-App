import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { sendFriendRequest } from '../services/friendService';
import { useUser } from '../src/contexts/UserContext';
import i18n from '../src/i18n';
import { useNavigation } from '@react-navigation/native';

const PeopleScreen = () => {
  const [users, setUsers] = useState([]);
  const { user } = useUser();
  const currentUserId = user?.uid;
  const [requestsSent, setRequestsSent] = useState({});
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const userList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUserId); // exclude self
      setUsers(userList);
    };

    fetchUsers();
  }, [currentUserId]);

  const handleAddFriend = async (toUserId) => {
    await sendFriendRequest(currentUserId, toUserId);
    setRequestsSent(prev => ({ ...prev, [toUserId]: true }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('peopleNearby')}</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isSent = requestsSent[item.id];
  
          return (
            <View style={styles.userItem}>
              <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {item.name || item.id}
                </Text>
              </TouchableOpacity>
              <Button
                title={isSent ? i18n.t('requestSent') : i18n.t('addFriend')}
                onPress={() => handleAddFriend(item.id)}
                color={isSent ? 'gray' : '#007AFF'}
                disabled={isSent}
              />
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  userName: {
    flex: 1,
    marginRight: 8, // spacing between name and button
    fontSize: 16,
  },
});

export default PeopleScreen;
