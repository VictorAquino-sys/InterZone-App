import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, StyleSheet, Button, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, limit, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';
import i18n from '@/i18n';

type Comment = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  currentUser: {
    uid: string;
    name: string;
    avatar: string;
  };
  setCommentCount: (count: number) => void;
};

const MAX_COMMENTS = 10;
const MAX_COMMENT_LENGTH = 200;

const CommentsModal: React.FC<Props> = ({ visible, onClose, postId, currentUser, setCommentCount }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [localCommentCount, setLocalCommentCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) fetchComments();
  }, [visible]);

  const fetchComments = async () => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('timestamp', 'asc'),
      limit(MAX_COMMENTS)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[];

    setComments(data);
    setLocalCommentCount(data.length);        // ✅ for local modal use
    setCommentCount(data.length); // ✅ Sync back to PostCard

  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (comments.length >= MAX_COMMENTS) return;

    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'posts', postId, 'comments'), {
            userId: currentUser.uid,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            content: newComment.trim(),
            timestamp: serverTimestamp()
        });

        await updateDoc(doc(db, 'posts', postId), {
        commentCount: increment(1)
        });

        setNewComment('');
        await fetchComments();
    }catch (error) {
        console.error('Failed to post comment:', error);
        Alert.alert("Something went wrong", "Couldn't post your comment. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    await updateDoc(doc(db, 'posts', postId), {
        commentCount: increment(-1)
    });

    fetchComments();
  };

  const handleUpdate = async () => {
    if (!editedText.trim()) return;
  
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'posts', postId, 'comments', editingId!), {
        content: editedText
      });
      setEditingId(null);
      setEditedText('');
      await fetchComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
            <View style={styles.container}>
                <Text style={styles.header}>{i18n.t('comments.title')}</Text>

                <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 150 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.commentItemRow}>
                    <View style={styles.avatarPlaceholder}>
                        {/* You can use <Avatar /> if available */}
                        <Text style={styles.avatarLetter}>{item.userName?.[0]}</Text>
                    </View>
                
                    <View style={styles.commentBubble}>
                        <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{item.userName}</Text>
                        </View>
                
                        {editingId === item.id ? (
                        <>
                            <TextInput
                            value={editedText}
                            onChangeText={text => setEditedText(text.slice(0, MAX_COMMENT_LENGTH))}
                            style={styles.editInput}
                            />
                            <Text style={styles.charCount}>
                                {editedText.length} / {MAX_COMMENT_LENGTH}
                            </Text>
                            <View style={styles.editActions}>
                                <Button
                                    title={isSubmitting ? i18n.t("comments.updating") : i18n.t("comments.update")}
                                    onPress={handleUpdate}
                                    disabled={isSubmitting}
                                />
                                <Button
                                    title="Cancel"
                                    color="gray"
                                    onPress={() => {
                                    if (!isSubmitting) {
                                        setEditingId(null);
                                        setEditedText('');
                                    }
                                    }}
                                    disabled={isSubmitting}
                                />
                            </View>

                        </>
                        ) : (
                        <Text style={styles.commentText}>{item.content}</Text>
                        )}
                
                        {item.userId === currentUser.uid && (
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => {
                            setEditingId(item.id);
                            setEditedText(item.content);
                            }}>
                            <Text style={styles.editText}>{i18n.t('comments.edit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                            <Text style={styles.deleteText}>{i18n.t('comments.delete')}</Text>
                            </TouchableOpacity>
                        </View>
                        )}
                    </View>
                    </View>
                )}
                />

                <View style={styles.inputContainer}>
                <TextInput
                    placeholder={
                        localCommentCount >= MAX_COMMENTS
                        ? i18n.t('comments.maxReached')
                        : i18n.t('comments.writePlaceholder')
                    }            
                    value={newComment}
                    onChangeText={text => setNewComment(text.slice(0, MAX_COMMENT_LENGTH))}
                    style={styles.input}
                    editable={localCommentCount < MAX_COMMENTS && !isSubmitting}
                />
                    <Text style={styles.charCount}>
                        {newComment.length} / {MAX_COMMENT_LENGTH}
                    </Text>
                    <Button
                    title={isSubmitting ? i18n.t("comments.posting") : i18n.t("comments.post")}
                    onPress={handleAddComment}
                    disabled={
                        isSubmitting ||
                        !newComment.trim() ||
                        localCommentCount >= MAX_COMMENTS
                    }
                    />        
                </View>

                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={{ color: '#007aff' }}>{i18n.t('comments.close')}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    </Modal>
  );
};

export default CommentsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 16
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  commentItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarLetter: {
    fontWeight: 'bold',
    color: '#fff',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 10,
  },
  commentHeader: {
    marginBottom: 2,
  },
  commentAuthor: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 16,
  },
  editText: {
    fontSize: 13,
    color: '#007aff',
  },
  deleteText: {
    fontSize: 13,
    color: 'red',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 6,
    marginTop: 4,
    marginBottom: 4
  },
  inputContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 16
  },
  warningText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginBottom: 8,
  }  
});
