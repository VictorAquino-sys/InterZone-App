import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Image, Button, Alert
} from 'react-native';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigationTypes';
import i18n from '@/i18n';

type Friend = {
  uid: string;
  name: string;
  avatar?: string;
};

const FriendsScreen = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.uid) return;

      try {
        const friendsRef = collection(db, `users/${user.uid}/friends`);
        const friendDocs = await getDocs(friendsRef);

        const friendData: Friend[] = await Promise.all(
          friendDocs.docs.map(async (docSnap) => {
            const friendId = docSnap.id;
            const friendRef = doc(db, 'users', friendId);
            const friendSnap = await getDoc(friendRef);

            if (friendSnap.exists()) {
              const data = friendSnap.data();
              return {
                uid: friendId,
                name: data.name || 'Unknown',
                avatar: data.avatar || '',
              };
            } else {
              return {
                uid: friendId,
                name: 'Unknown',
              };
            }
          })
        );

        setFriends(friendData);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user?.uid]);

  const confirmUnfriend = (friendId: string) => {
    Alert.alert(
        i18n.t('removeFriendTitle'),
        i18n.t('removeFriendMessage'),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: i18n.t('unfriend'), style: "destructive",
          onPress: () => handleUnfriend(friendId)
        }
      ]
    );
  };

  const handleUnfriend = async (friendId: string) => {
    if (!user?.uid) return;

    try {
      // Remove friend from both users
      await deleteDoc(doc(db, `users/${user.uid}/friends/${friendId}`));
      await deleteDoc(doc(db, `users/${friendId}/friends/${user.uid}`));

      // Update UI
      setFriends(prev => prev.filter(friend => friend.uid !== friendId));
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noFriendsText}>{i18n.t('noFriends')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <View style={styles.friendItem}>
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}>
              <Image
                source={item.avatar ? { uri: item.avatar } : require('../assets/unknownuser.png')}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <TouchableOpacity style={styles.unfriendButton} onPress={() => confirmUnfriend(item.uid)}>
                    <Text style={styles.unfriendText}>{i18n.t('unfriend')}</Text>
                </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default FriendsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noFriendsText: { fontSize: 16, color: 'gray' },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#ddd',
  },
  nameAndActions: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  unfriendButton: {
    marginTop: 4,
    backgroundColor: '#ff4d4d',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start', // keeps it compact under the name
  },
  unfriendText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  }
});
