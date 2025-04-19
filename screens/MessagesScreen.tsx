// screens/MessagesScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import Avatar from '@/components/Avatar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigationTypes';
import i18n from '@/i18n';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);
const currentLang = i18n.language || 'en';
dayjs.locale(currentLang === 'es' ? 'es' : 'en');

type MessagesScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'MessagesScreen'>;

dayjs.extend(relativeTime);
dayjs.locale(i18n.language); // ⬅️ set to current i18n language

type ConversationPreview = {
  id: string;
  lastMsg: { text: string; timestamp: Timestamp } | null;
  friend: {
    uid: string;
    name?: string;
    avatar?: string;
  };
  updatedAt?: Timestamp;
};

const MessagesScreen = () => {
  const { user } = useUser();
  const navigation = useNavigation<MessagesScreenNavProp>();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'conversations'),
      where('users', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const friendId = data.users.find((uid: string) => uid !== user.uid);

          const messagesRef = collection(db, 'conversations', docSnap.id, 'messages');
          const lastMsgQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
          const lastMsgSnap = await getDocs(lastMsgQuery);
          const lastMsg = lastMsgSnap.docs[0]?.data() || null;

          const friendRef = doc(db, 'users', friendId);
          const friendSnap = await getDoc(friendRef);
          const friendData = friendSnap.exists() ? friendSnap.data() : {};

          return {
            id: docSnap.id,
            lastMsg,
            friend: { uid: friendId, ...friendData },
            updatedAt: data.updatedAt,
          } as ConversationPreview;
        })
      );

      const sorted = convs.sort((a, b) => {
        if (!a.updatedAt || !b.updatedAt) return 0;
        return b.updatedAt.seconds - a.updatedAt.seconds;
      });

      setConversations(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  if (!conversations.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
            {i18n.t('messages.noConversations')} {/* 💬 No conversations */}
         </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('People')}
        >
        <Text style={styles.buttonText}>
            {i18n.t('messages.findFriends')} {/* 🔍 Find Friends */}
        </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            navigation.navigate('ChatScreen', { friendId: item.friend.uid, friendName: item.friend.name || '' })
          }
        >
          <Avatar name={item.friend.name || 'Unknown'} imageUri={item.friend.avatar} />
          <View style={styles.textContainer}>
            <Text style={styles.name}>{item.friend.name || 'Unknown'}</Text>
            <Text numberOfLines={1} style={styles.preview}>
                {item.lastMsg?.text || i18n.t('messages.startChatting')}
            </Text>
          </View>
          <Text style={styles.time}>
            {item.lastMsg?.timestamp ? dayjs(item.lastMsg.timestamp.toDate()).fromNow() : ''}
        </Text>

        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      marginHorizontal: 10,
      marginVertical: 6,
      padding: 12,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    textContainer: {
      flex: 1,
      marginLeft: 12,
    },
    name: {
      fontWeight: '600',
      fontSize: 16,
      marginBottom: 2,
      color: '#111',
    },
    preview: {
      color: '#444',
      fontSize: 14,
    },
    time: {
      fontSize: 12,
      color: '#999',
      marginLeft: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      color: '#777',
      marginBottom: 20,
    },
    button: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

export default MessagesScreen;