import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, getDocs, serverTimestamp, orderBy, query, updateDoc, doc, where, Timestamp, limit, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { ActivityIndicator } from 'react-native';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import i18n from '@/i18n';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useVerifiedSchool } from '@/contexts/verifiedSchoolContext';

type Props = {
  universityId: string;
  universityName: string;
};

type DiscussionPost = {
  id: string;
  content: string;
  createdAt: any;
  createdBy: string;
  createdByName?: string;
  imageUrl?: string;
};

export const deleteImageByUrl = async (imageUrl: string) => {
  try {
    const storage = getStorage();
    const matches = imageUrl.match(/\/o\/(.+)\?/);
    if (!matches || matches.length < 2) {
      console.warn('❗ No storage path found in imageUrl:', imageUrl);
      return;
    }
    const filePath = decodeURIComponent(matches[1]);
    const imageRef = ref(storage, filePath);
    await deleteObject(imageRef);
    console.log('🗑️ Deleted image from Storage:', filePath);
  } catch (e) {
    console.warn('⚠️ Could not delete image from Storage:', e);
  }
};

const SchoolDiscussionScreen = ({ universityId, universityName }: Props) => {
  const { user } = useUser();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [firstLoad, setFirstLoad] = useState(true);
  // const [loading, setLoading] = useState(true);
  const { school, loading: schoolLoading } = useVerifiedSchool();

  const resolvedUniversityId = universityId || school?.universityId;
  const resolvedUniversityName = universityName || school?.universityName;

  useEffect(() => {
    if (!resolvedUniversityId ) return;

    // setLoading(true);
    const ref = collection(db, 'universities', resolvedUniversityId , 'discussions');
    const q = query(ref, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const result: DiscussionPost[] = [];
      snap.forEach(docSnap => {
        result.push({ id: docSnap.id, ...(docSnap.data() as Omit<DiscussionPost, 'id'>) });
      });
      setPosts(result);
      // setLoading(false);
    });
    return unsubscribe;
  }, [resolvedUniversityId ]);

  useEffect(() => {
    if (flatListRef.current && posts.length > 0) {
        flatListRef.current.scrollToEnd({ animated: !firstLoad });
      if (firstLoad)  { 
        setFirstLoad(false);
      }
    }
  }, [posts]);

  useEffect(() => {
    if (!editingPostId) {
      setEditingText('');
    }
  }, [editingPostId]);

  const resizeImage = async (uri: string): Promise<string> => {
    const resizedPhoto = await manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    return resizedPhoto.uri;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(i18n.t('discussion.noPermissionTitle'), i18n.t('discussion.noPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => setSelectedImage(null);

  const handlePost = async () => {
    if (!user?.uid || (newPost.trim().length < 2 && !selectedImage)) {
      Alert.alert(i18n.t('discussion.tooShortTitle'), i18n.t('discussion.tooShortPost'));
      return;
    }
  
    const collectionRef = collection(db, 'universities', resolvedUniversityId! , 'discussions');
  
    // Check current count
    const q = query(collectionRef, orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
  
    // If 30 or more, delete the oldest
    if (snap.size >= 30) {
      const oldestDoc = snap.docs[0];
      const oldestData = oldestDoc.data();
      if (oldestData?.imageUrl) {
        await deleteImageByUrl(oldestData.imageUrl);
      }
      await deleteDoc(oldestDoc.ref);
    }
  
    let imageUrl: string | null = null;

    if (selectedImage) {
      setUploading(true);
      let resizedUri: string | undefined = undefined; // Define here so it's visible in catch!

      try {
        // Compress and resize image
        resizedUri = await resizeImage(selectedImage);

        const storage = getStorage();
        const imageId = `${user.uid}_${Date.now()}`;
        const imageRef = ref(storage, `discussion_images/${resolvedUniversityId}/${imageId}.jpg`);

        // fetch the file as a blob
        const img = await fetch(resizedUri);
        const blob = await img.blob();

        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      } catch (err:any) {
        console.log("❌ Image upload failed:", err, resizedUri);
        Alert.alert(i18n.t('discussion.uploadFailedTitle'), i18n.t('discussion.uploadFailedMessage', { error: err?.message || err }));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const newDoc = {
      content: newPost.trim(),
      createdBy: user.uid,
      createdByName: user.name ?? 'Anonymous',
      createdAt: serverTimestamp(),
      ...(imageUrl ? { imageUrl } : {}),
    };
  
    await addDoc(collectionRef, newDoc);
    setNewPost('');
    setSelectedImage(null);

  };

  const handleDeletePost = async (postId: string) => {
    try {
      const postRef = doc(db, 'universities', resolvedUniversityId!, 'discussions', postId);
      const postDoc = await getDoc(postRef);
      const postData = postDoc.data();
  
      if (postData?.imageUrl) {
        await deleteImageByUrl(postData.imageUrl);
      }
      await deleteDoc(postRef);
    } catch (err: any) {
      Alert.alert(i18n.t('discussion.deleteFailedTitle'), i18n.t('discussion.deleteFailedMessage', { error: err?.message || String(err) }));
    }
  };

  const renderItem = ({ item }: { item: DiscussionPost }) => {
    const isCurrentUser = user?.uid === item.createdBy;
    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.chatBubble, isCurrentUser ? styles.myMessage : styles.otherMessage]}>
          <Text style={styles.username}>
            {isCurrentUser
              ? i18n.t('discussion.you')
              : item.createdByName && item.createdByName.trim()
                ? item.createdByName
                : item.createdBy}
          </Text>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timestampText}>
            {item.createdAt?.toDate &&
              new Date(item.createdAt.toDate()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
          </Text>

          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: 180, height: 180, borderRadius: 12, marginVertical: 6 }}
              resizeMode="cover"
            />
          )}

          {isCurrentUser && (
            <View style={styles.messageActions}>
              <TouchableOpacity onPress={() => {
                setEditingPostId(item.id);
                setEditingText(item.content);
              }}>
                <Text style={styles.action}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
                <Text style={[styles.action, { color: 'red' }]}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{i18n.t('discussion.header', { name: universityName })}</Text>

        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />

        {editingPostId ? (
          <>
            <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 4 }}>
              {i18n.t('discussion.editing')} ({user?.name || i18n.t('discussion.you')})
            </Text>
            
            <TouchableOpacity
              style={styles.postButton}
              onPress={async () => {
                if (editingText.trim().length < 2) {
                  Alert.alert(i18n.t('discussion.tooShortTitle'), i18n.t('discussion.tooShortEdit'));
                  return;
                }
                await updateDoc(doc(db, 'universities', resolvedUniversityId! , 'discussions', editingPostId!), {
                  content: editingText.trim(),
                });
                setEditingPostId(null);
                setEditingText('');
              }}
            >
              <Text style={styles.postButtonText}>{i18n.t('discussion.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postButton, { backgroundColor: '#ccc' }]}
              onPress={() => {
                setEditingPostId(null);
                setEditingText('');
              }}
            >
              <Text style={[styles.postButtonText, { color: '#333' }]}>{i18n.t('discussion.cancel')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={pickImage} style={{ marginRight: 10 }}>
              <Text style={{ fontSize: 22 }}>📎</Text>
            </TouchableOpacity>
            <TextInput
              value={newPost}
              onChangeText={setNewPost}
              placeholder={i18n.t('discussion.placeholder')}
              multiline
              maxLength={200}
              style={[styles.input, { paddingRight: 48, flex: 1 }]}
            />

            <Text
              style={{
                position: 'absolute',
                right: 14,
                bottom: 10,
                color: newPost.length > 190 ? '#d32f2f' : '#888',
                fontSize: 12,
                backgroundColor: 'white',
                paddingHorizontal: 2,
              }}
            >
              {newPost.length}/200
            </Text>

            {selectedImage && (
              <TouchableOpacity onPress={removeImage}>
                <Text style={{ fontSize: 22, color: 'red', marginLeft: 8 }}>✖️</Text>
              </TouchableOpacity>
            )}
          </View>



          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{ width: 100, height: 100, borderRadius: 8, marginBottom: 8 }}
            />
          )}
          {uploading && <ActivityIndicator size="small" color="#007AFF" style={{ marginBottom: 8 }} />}

          <TouchableOpacity
            style={[
              styles.postButton,
              (newPost.trim().length < 2 && !selectedImage) || uploading ? { backgroundColor: '#ccc' } : {}
            ]}
            onPress={handlePost}
            disabled={newPost.trim().length < 2 && !selectedImage || uploading}
          >
            <Text style={styles.postButtonText}>
              {uploading ? i18n.t('discussion.uploading') : i18n.t('discussion.send')}
            </Text>
          </TouchableOpacity>

          </>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderColor: '#ccc', borderWidth: 1, borderRadius: 6,
    padding: 10, marginBottom: 10, minHeight: 60
  },
  postButton: {
    backgroundColor: '#007AFF', padding: 12,
    alignItems: 'center', borderRadius: 6, marginBottom: 20
  },
  postButtonText: { color: '#fff', fontSize: 16 },
  chatBubble: {
    maxWidth: '80%',
    padding: 10,
    marginVertical: 6,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // default for other users
    marginVertical: 6,
    paddingHorizontal: 8,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 0,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    borderTopLeftRadius: 0,
  },
  username: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 15,
    color: '#000',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
  timestampText: {
    fontSize: 10,
    color: '#555',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  action: {
    fontSize: 12,
    color: '#007AFF',
  }
});

export default SchoolDiscussionScreen;