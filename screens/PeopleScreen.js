import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { sendFriendRequest } from '../services/friendService';
import { useUser } from '../src/contexts/UserContext';
import i18n from '../src/i18n';
import { useNavigation } from '@react-navigation/native';

const PeopleScreen = () => {
  const [users, setUsers] = useState([]);
  const [friendIds, setFriendIds] = useState(new Set());
  const [pendingIds, setPendingIds] = useState(new Set());
  const { user } = useUser();
  const currentUserId = user?.uid;
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUserId) return;

      // Fetch all users except self
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userList = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUserId);
      setUsers(userList);

      // Fetch current user's friends
      const friendsSnapshot = await getDocs(collection(db, `users/${currentUserId}/friends`));
      const friendsSet = new Set(friendsSnapshot.docs.map(doc => doc.id));
      setFriendIds(friendsSet);

      // Fetch friend requests where currentUser is either sender or receiver
      const sentQuery = query(
        collection(db, 'friend_requests'),
        where('fromUserId', '==', currentUserId)
      );
      const receivedQuery = query(
        collection(db, 'friend_requests'),
        where('toUserId', '==', currentUserId)
      );

      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery),
      ]);

      const pendingSet = new Set();
      sentSnap.forEach(doc => pendingSet.add(doc.data().toUserId));
      receivedSnap.forEach(doc => pendingSet.add(doc.data().fromUserId));
      setPendingIds(pendingSet);
    };

    fetchData();
  }, [currentUserId]);

  const handleAddFriend = async (toUserId) => {
    const status = await sendFriendRequest(currentUserId, toUserId);
    if (status === 'success') {
      setPendingIds(prev => new Set(prev.add(toUserId)));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('peopleNearby')}</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isFriend = friendIds.has(item.id);
          const isPending = pendingIds.has(item.id);

          return (
            <View style={styles.userItem}>
              <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {item.name || item.id}
                </Text>
              </TouchableOpacity>

              {!isFriend && !isPending && (
                <Button
                  title={i18n.t('addFriend')}
                  onPress={() => handleAddFriend(item.id)}
                  color="#007AFF"
                />
              )}
              {isPending && (
                <Button
                  title={i18n.t('requestSent')}
                  disabled
                  color="gray"
                />
              )}
              {isFriend && (
                <Button
                  title={i18n.t('friends')}
                  disabled
                  color="green"
                />
              )}
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
    marginRight: 8,
    fontSize: 16,
  },
});

export default PeopleScreen;
