import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useUser } from '../src/contexts/UserContext';
import { db } from '../src/config/firebase';
import { doc, getDoc, getDocs, updateDoc, collection, query, where, arrayRemove } from 'firebase/firestore';
import Avatar from '../src/components/Avatar';
import i18n from '@/i18n';

interface BlockedUser {
  uid: string;
  name?: string;
  avatar?: string;
  country?: string;
}

export default function BlockedUsersScreen() {
  const { user, setUser } = useUser();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unblockedUserIds, setUnblockedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.blocked?.length) {
      setLoading(false);
      return;
    }

    const fetchBlockedUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', user.blocked));
        const snapshot = await getDocs(q);

        const users = snapshot.docs.map(doc => doc.data() as BlockedUser);
        setBlockedUsers(users);
      } catch (error) {
        console.error('Error fetching blocked users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [user?.blocked]);

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return;
    try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            blocked: arrayRemove(blockedUserId)
        });

        // Update context locally
        setUser(prev => prev ? {
            ...prev,
            blocked: prev.blocked?.filter(uid => uid !== blockedUserId) || []
        } : prev);

        setUnblockedUserIds(prev => [...prev, blockedUserId]);
        // ✅ Remove from local blockedUsers list
        setBlockedUsers(prev => prev.filter(u => u.uid !== blockedUserId));

        Alert.alert(i18n.t('block.unblocked'), i18n.t('block.unblockedMessage'));
    } catch (error) {
      console.error('Unblock error:', error);
      Alert.alert(i18n.t('block.error'), i18n.t('block.errorMessage'));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{i18n.t('block.none')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={blockedUsers}
        keyExtractor={item => item.uid}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <Avatar name={item.name || ''} imageUri={item.avatar} size={40} />
            <View style={styles.infoColumn}>
              <Text style={styles.nameText}>{item.name}</Text>
              {item.country && <Text style={styles.metaText}>{item.country}</Text>}
            </View>
            <TouchableOpacity 
                onPress={() => handleUnblock(item.uid)} 
                style={[
                    styles.unblockButton,
                    unblockedUserIds.includes(item.uid) && styles.unblockButtonDisabled   
                ]}
                disabled={unblockedUserIds.includes(item.uid)}
            >
                <Text style={[
                    styles.unblockText,
                    unblockedUserIds.includes(item.uid) && styles.unblockTextDisabled
                    ]}>
                    {unblockedUserIds.includes(item.uid)
                    ? i18n.t('block.unblocked') 
                    : i18n.t('block.unblock')}
                </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    backgroundColor: '#fff'
  },
  infoColumn: { flex: 1, marginLeft: 12 },
  nameText: { fontWeight: '600', fontSize: 16 },
  metaText: { color: '#888', fontSize: 13 },
  unblockButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ddd', borderRadius: 8 },
  unblockText: { color: '#444' },
  unblockButtonDisabled: {
    backgroundColor: '#ccc'
  },
  unblockTextDisabled: {
    color: '#777'
  }
});