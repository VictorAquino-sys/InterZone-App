import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
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

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userList = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUserId);
      setUsers(userList);

      const friendsSnapshot = await getDocs(collection(db, `users/${currentUserId}/friends`));
      const friendsSet = new Set(friendsSnapshot.docs.map(doc => doc.id));
      setFriendIds(friendsSet);

      const sentQuery = query(collection(db, 'friend_requests'), where('fromUserId', '==', currentUserId));
      const receivedQuery = query(collection(db, 'friend_requests'), where('toUserId', '==', currentUserId));

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

  const renderItem = ({ item }) => {
    const isFriend = friendIds.has(item.id);
    const isPending = pendingIds.has(item.id);
    const avatarUri = item.avatar || null;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{(item.name || item.id).slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {item.name || item.id}
          </Text>
        </TouchableOpacity>

        {!isFriend && !isPending && (
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item.id)}>
            <Text style={styles.addButtonText}>{i18n.t('addFriend')}</Text>
          </TouchableOpacity>
        )}
        {isPending && (
          <TouchableOpacity style={styles.pendingButton} disabled>
            <Text style={styles.pendingButtonText}>{i18n.t('requestSent')}</Text>
          </TouchableOpacity>
        )}
        {isFriend && (
          <TouchableOpacity style={styles.friendButton} disabled>
            <Text style={styles.friendButtonText}>{i18n.t('friends')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={users}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    backgroundColor: '#f2f2f2',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#444',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    maxWidth: '65%',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pendingButton: {
    backgroundColor: '#ccc',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  pendingButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  friendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  friendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PeopleScreen;
