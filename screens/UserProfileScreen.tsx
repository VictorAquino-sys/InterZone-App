import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert, Modal, TouchableOpacity, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import { useUser } from '../src/contexts/UserContext';
import Avatar from '../src/components/Avatar';
import { sendFriendRequest, unfriendUser, areUsersFriends, hasSentFriendRequest } from '../services/friendService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../src/navigationTypes'; // update path if needed
import i18n from '@/i18n';

type RouteParams = {
  userId: string;
};

const UserProfileScreen = () => {
  const { user } = useUser();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = route.params as RouteParams;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [alreadyFriends, setAlreadyFriends] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            setProfile({
                id: userSnap.id,
                ...data,
                description: data.description || '',
          });
        }

        if (user?.uid && userId) {
          const [isFriend, hasRequested] = await Promise.all([
            areUsersFriends(user.uid, userId),
            hasSentFriendRequest(user.uid, userId),
          ]);
          setAlreadyFriends(isFriend);
          setAlreadyRequested(hasRequested);
        }

      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      loadUserProfile();
    }
  }, [user?.uid]);

  const handleSendRequest = async () => {
    if (!user?.uid) {
      console.error("No user ID found.");
      Alert.alert("❌ You must be logged in to send a friend request.");
      return;
    }
  
    try {
      const status = await sendFriendRequest(user.uid, userId);
  
      switch (status) {
        case 'already_friends':
          Alert.alert("✅ You're already friends.");
          break;
        case 'request_already_sent':
          Alert.alert("📨 Friend request already sent.");
          break;
        case 'reverse_request_exists':
          Alert.alert("👀 This user already sent you a request.");
          break;
        case 'self_request_not_allowed':
          Alert.alert("⚠️ You can't send a request to yourself.");
          break;
        case 'success':
          setAlreadyRequested(true);
          Alert.alert("✅ Friend request sent!");
          break;
        default:
          Alert.alert("❌ Could not send friend request.");
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      Alert.alert("❌ Could not send friend request.");
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isOwnProfile = user?.uid === userId;

  return (
    <View style={styles.container}>
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
            <Avatar imageUri={profile.avatar} name={profile.name} size={100} />
        </TouchableOpacity>

        <Text style={styles.name}>{profile.name || 'User'}</Text>
        <Text style={styles.detail}>📍 {profile.city || 'Somewhere'}</Text>

        {profile.description ? (
            <Text style={styles.description}>{profile.description}</Text>
        ) : null}

        {!isOwnProfile && (
          alreadyFriends ? (
            <>
              <Button
                title="Message"
                onPress={() => navigation.navigate('Chat', { otherUserId: profile.id })}
              />
              <View style={{ marginTop: 10 }}>
                <Button
                  title="Unfriend"
                  color="red"
                  onPress={() => {
                    Alert.alert(
                      "Unfriend",
                      `Are you sure you want to remove ${profile.name || 'this user'} from your friends list?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Unfriend",
                          style: "destructive",
                          onPress: async () => {
                              if (!user?.uid) {
                                Alert.alert("❌ You must be logged in to unfriend someone.");
                                return;
                              }
                              const status = await unfriendUser(user.uid, userId);                            
                              if (status === 'success') {
                                setAlreadyFriends(false);
                                Alert.alert("✅ User unfriended.");
                            } else {
                              Alert.alert("❌ Failed to unfriend user.");
                            }
                          }
                        }
                      ]
                    );
                  }}
                />
              </View>
            </>
          ) : alreadyRequested ? (
                <Text style={styles.status}>⏳ Request already sent</Text>
            ) : (
                <Button title="Add Friend" onPress={handleSendRequest} />
            )
        )}

        {/* Full-Screen Avatar Modal */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => setIsModalVisible(false)}
        >
            <TouchableOpacity
                style={styles.fullScreenModal}
                onPress={() => setIsModalVisible(false)}
                activeOpacity={1}
            >
              {profile.avatar ? (
                <Image
                  source={{ uri: profile.avatar }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ color: 'white', fontSize: 16 }}>{i18n.t('NoPhoto')}</Text>
              )}
            </TouchableOpacity>
        </Modal>
    </View>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 16,
    },
    detail: {
        fontSize: 14,
        color: 'gray',
        marginBottom: 20,
    },
    description: {
        fontSize: 14,
        color: '#444',
        paddingHorizontal: 20,
        textAlign: 'center',
        marginBottom: 20,
    },
    status: {
        fontSize: 14,
        color: '#888',
        marginTop: 10,
    },
    fullScreenModal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '90%',
        height: '90%',
    },
});
