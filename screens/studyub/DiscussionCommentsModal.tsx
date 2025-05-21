import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { db } from '@/config/firebase';
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useUser } from '@/contexts/UserContext';
import { onSnapshot } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import i18n from '@/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  universityId: string;
  postId: string;
};

type Comment = {
  id: string;
  text: string;
  createdBy: string;
  createdAt: any;
};

const DiscussionCommentsModal = ({ visible, onClose, universityId, postId }: Props) => {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const submitComment = async () => {
    if (!user?.uid || input.trim().length < 2) {
        Alert.alert(i18n.t('discussion.tooShortTitle'), i18n.t('discussion.tooShortMessage'));
        return;
    }

    const newComment = {
      text: input.trim(),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'universities', universityId, 'discussions', postId, 'comments'), newComment);
    setInput('');
    // fetchComments();
  };

  useFocusEffect(
    React.useCallback(() => {
      let unsubscribe: (() => void) | undefined;
      if (visible) {
        const ref = collection(db, 'universities', universityId, 'discussions', postId, 'comments');
        const q = query(ref, orderBy('createdAt', 'asc'));
        unsubscribe = onSnapshot(q, (snap) => {
          const data: Comment[] = [];
          snap.forEach(docSnap => {
            const raw = docSnap.data();
            data.push({
              id: docSnap.id,
              text: raw.text,
              createdBy: raw.createdBy,
              createdAt: raw.createdAt,
            });
          });
          setComments(data);
        });
      }
      return () => {
        setInput('');
        setEditingId(null);
        setEditingContent('');
        if (unsubscribe) unsubscribe();
      };
    }, [visible, universityId, postId])
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>⬅ {i18n.t('discussion.back')}</Text>
        </TouchableOpacity>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => 
            <View style={styles.commentItem}>
            <Text style={styles.commentText}>{item.text}</Text>

            {user?.uid === item.createdBy && (
                <View style={styles.commentActions}>
                <TouchableOpacity onPress={() => {
                    setEditingId(item.id);
                    setEditingContent(item.text);
                }}>
                    <Text style={{ color: '#555' }}>✏️</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={async () => {
                    await deleteDoc(doc(db, 'universities', universityId, 'discussions', postId, 'comments', item.id));
                    // fetchComments();
                }}>
                    <Text style={{ color: 'red' }}>🗑️</Text>
                </TouchableOpacity>
                </View>
            )}
            </View>
          }
        />

        {editingId && (
        <>
            <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 4 }}>
                {i18n.t('discussion.editing')}
            </Text>
            <TextInput
                placeholder={i18n.t('discussion.editPlaceholder')}
                style={styles.input}
                value={editingContent}
                onChangeText={setEditingContent}
            />
            <TouchableOpacity
            style={styles.button}
            onPress={async () => {
                if (editingContent.trim().length < 2) {
                    Alert.alert(i18n.t('discussion.tooShortTitle'), i18n.t('discussion.tooShortSaveMessage'));
                    return;
                }

                await updateDoc(doc(db, 'universities', universityId, 'discussions', postId, 'comments', editingId), {
                text: editingContent.trim(),
                });
                setEditingId(null);
                setEditingContent('');
                // fetchComments();
            }}
            >
                <Text style={styles.buttonText}>{i18n.t('discussion.save')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={[styles.button, { backgroundColor: '#ccc' }]}
            onPress={() => {
                setEditingId(null);
                setEditingContent('');
            }}
            >
                <Text style={[styles.buttonText, { color: '#333' }]}>{i18n.t('discussion.cancel')}</Text>
            </TouchableOpacity>
        </>
        )}

        <TextInput
          placeholder={i18n.t('discussion.placeholder')}
          value={input}
          onChangeText={setInput}
          style={styles.input}
        />

        <TouchableOpacity onPress={submitComment} style={styles.button}>
            <Text style={styles.buttonText}>{i18n.t('discussion.send')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, padding: 16 },
  close: { fontSize: 16, color: '#007AFF', marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc',
    padding: 10, borderRadius: 6, marginTop: 10
  },
  button: {
    backgroundColor: '#007AFF', padding: 10,
    alignItems: 'center', borderRadius: 6, marginTop: 8
  },
  buttonText: { color: 'white' },
  comment: {
    padding: 8, borderBottomWidth: 1, borderColor: '#eee'
  },
  commentItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 4,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  
  commentActions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 16, // if gap isn't supported, fallback to marginRight on children
  },
});

export default DiscussionCommentsModal;
