import React, { useEffect, useState, useCallback  } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, getDocs, serverTimestamp, orderBy, query, updateDoc, doc, increment, where, Timestamp, limit, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useUser } from '@/contexts/UserContext';
import i18n from '@/i18n';
import DiscussionCommentsModal from './DiscussionCommentsModal';

type Props = {
  universityId: string;
  universityName: string;
};

type DiscussionPost = {
  id: string;
  content: string;
  createdAt: any;
  createdBy: string;
  upvotes: number;
};

const SchoolDiscussionScreen = ({ universityId, universityName }: Props) => {
    const { user } = useUser();
    const [posts, setPosts] = useState<DiscussionPost[]>([]);
    const [newPost, setNewPost] = useState('');
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    const fetchPosts = useCallback(async () => {
        const ref = collection(db, 'universities', universityId, 'discussions');
        const q = query(ref, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const result: DiscussionPost[] = [];
        snap.forEach(docSnap => {
          result.push({ id: docSnap.id, ...(docSnap.data() as Omit<DiscussionPost, 'id'>) });
        });
        setPosts(result);
      }, [universityId]);

  const openComments = (postId: string) => {
    setSelectedPostId(postId);
    setModalVisible(true);
  };

  const handleReport = async (postId: string) => {
    if (!user?.uid) return;
  
    await addDoc(collection(db, 'reports'), {
      type: 'discussion_post',
      postId: postId,
      reportedBy: user.uid,
      createdAt: serverTimestamp(),
    });
  
    Alert.alert(i18n.t('discussion.reportedTitle'), i18n.t('discussion.reportedMsg'));
  };

  const handleEditPost = (post: DiscussionPost) => {
    setEditingPostId(post.id);
    setEditingText(post.content);
  };

  const handleDeletePost = async (postId: string) => {
    await deleteDoc(doc(db, 'universities', universityId, 'discussions', postId));
    fetchPosts();
  };
  

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePost = async () => {
    if (!user?.uid || newPost.trim().length < 3) {
        Alert.alert(i18n.t('discussion.tooShortTitle'), i18n.t('discussion.tooShortPost'));
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'universities', universityId, 'discussions'),
      where('createdBy', '==', user.uid),
      where('createdAt', '>=', Timestamp.fromDate(today)),
      limit(1)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
        Alert.alert(i18n.t('discussion.limitTitle'), i18n.t('discussion.limitMsg'));
        return;
    }

    const newDoc = {
      content: newPost.trim(),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      upvotes: 0,
      comments: 0,
    };

    await addDoc(collection(db, 'universities', universityId, 'discussions'), newDoc);
    setNewPost('');
    fetchPosts();
  };

  const handleUpvote = async (postId: string) => {
    // Optimistically update UI
    setPosts(prev =>
        prev.map(p =>
        p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p
        )
    );

    const postRef = doc(db, 'universities', universityId, 'discussions', postId);
    await updateDoc(postRef, { upvotes: increment(1) });
    fetchPosts();
  };

  const renderItem = ({ item }: { item: DiscussionPost }) => (
    <View style={styles.post}>
      <Text style={styles.postText}>{item.content}</Text>
      <View style={styles.postActions}>
        <TouchableOpacity onPress={() => handleUpvote(item.id)}>
            <Text style={styles.upvote}>⬆️ {item.upvotes}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => openComments(item.id)}>
            <Text style={{ color: '#007AFF' }}>💬 {i18n.t('discussion.comment')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleReport(item.id)}>
            <Text style={{ color: 'red' }}>🚩 {i18n.t('discussion.report')}</Text>
        </TouchableOpacity>

        {user?.uid === item.createdBy && (
            <>
                <TouchableOpacity onPress={() => handleEditPost(item)}>
                <Text style={{ color: '#555' }}>✏️ {i18n.t('discussion.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
                <Text style={{ color: 'red' }}>🗑️ {i18n.t('discussion.delete')}</Text>
                </TouchableOpacity>
            </>
        )}

      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{i18n.t('discussion.header', { name: universityName })}</Text>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 60 }}
      />

        {modalVisible && selectedPostId && (
        <DiscussionCommentsModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            universityId={universityId}
            postId={selectedPostId}
        />
        )}

        {editingPostId ? (
        <>
            <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 4 }}>
                {i18n.t('discussion.editing')}
            </Text>
            <TextInput
            placeholder={i18n.t('discussion.editPlaceholder')}
            style={styles.input}
            value={editingText}
            onChangeText={setEditingText}
            multiline
            />
            <TouchableOpacity
            style={styles.postButton}
            onPress={async () => {
                if (editingText.trim().length < 3) {
                    Alert.alert(i18n.t('discussion.tooShortTitle'), i18n.t('discussion.tooShortEdit'));
                    return;
                }
                await updateDoc(doc(db, 'universities', universityId, 'discussions', editingPostId!), {
                content: editingText.trim(),
                });
                setEditingPostId(null);
                setEditingText('');
                fetchPosts();
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
            <TextInput
            placeholder={i18n.t('discussion.placeholder')}
            style={styles.input}
            value={newPost}
            onChangeText={setNewPost}
            multiline
            />
            <TouchableOpacity 
                style={[styles.postButton, editingPostId ? { opacity: 0.5 } : undefined]}
                onPress={handlePost}
                disabled={!!editingPostId}
            >
                <Text style={styles.postButtonText}>{i18n.t('discussion.post')}</Text>
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
  post: {
    borderWidth: 1, borderColor: '#ddd',
    padding: 12, borderRadius: 6, marginBottom: 10
  },
  postText: { fontSize: 14 },
  postActions: { marginTop: 6 },
  upvote: { color: '#007AFF' },
});

export default SchoolDiscussionScreen;