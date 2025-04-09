import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { acceptFriendRequest, declineFriendRequest } from '../services/friendService';
import { useUser } from '../src/contexts/UserContext';
import { Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigationTypes';
import i18n from '../src/i18n';

type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  timestamp?: Timestamp; // You can refine this if you want to use Firestore's Timestamp
};

type FriendRequestWithSender = FriendRequest & {
  senderName: string;
  senderAvatar?: string;
};

const FriendRequestsScreen = () => {
  const [requests, setRequests] = useState<FriendRequestWithSender[]>([]);
  const { user } = useUser();
  const currentUserId = user?.uid;

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUserId) return;

      const q = query(
        collection(db, 'friend_requests'),
        where('toUserId', '==', currentUserId)
      );

      const snapshot = await getDocs(q);

      const requestList: FriendRequestWithSender[] = await Promise.all(
        snapshot.docs.map(async docSnap => {
          const data = docSnap.data() as Omit<FriendRequest, 'id'>;
          const userRef = doc(db, 'users', data.fromUserId);
          const userSnap = await getDoc(userRef);

          let senderName = 'Unknown';
          let senderAvatar = '';

          if (userSnap.exists()) {
            const userData = userSnap.data();
            senderName = userData.name || 'Unknown';
            senderAvatar = userData.avatar || '';
          }

          return {
            id: docSnap.id,
            ...data,
            senderName,
            senderAvatar,
          };
        })
      );

      setRequests(requestList);
    };

    fetchRequests();
  }, [currentUserId]);

  const handleAccept = async (requestId: string) => {
    await acceptFriendRequest(requestId);
    setRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const handleDecline = async (requestId: string) => {
    await declineFriendRequest(requestId);
    setRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const goToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('incomingRequests')}</Text>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.requestItem}>
            <TouchableOpacity style={styles.userInfo} onPress={() => goToUserProfile(item.fromUserId)}>
              <Image
                source={item.senderAvatar ? { uri: item.senderAvatar } : require('../assets/unknownuser.png')}
                style={styles.avatar}
              />
              <Text style={styles.senderName}>{item.senderName}</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <Button title={i18n.t('accept')} onPress={() => handleAccept(item.id)} />
              <Button title={i18n.t('decline')} onPress={() => handleDecline(item.id)} />
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: 'white' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  requestItem: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: '#ddd',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default FriendRequestsScreen;
