import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useUser } from '../src/contexts/UserContext';
import { fetchMessages, sendMessage, getOrCreateConversation } from '../services/chatService';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import i18n from '../src/i18n';

type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
};

type RouteParams = {
  otherUserId: string;
};

const ChatScreen = () => {
  const { user } = useUser();
  const route = useRoute();
  const { otherUserId } = route.params as RouteParams;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
  
    const init = async () => {
      if (!user?.uid || !otherUserId) return;
  
      const convo = await getOrCreateConversation(user.uid, otherUserId);
      setConversationId(convo.id);
  
      const msgRef = collection(db, `conversations/${convo.id}/messages`);
      const q = query(msgRef, orderBy('timestamp', 'asc'));
  
      unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(loaded);
  
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
    };
  
    init();
  
    return () => {
      if (unsubscribe) {
        unsubscribe(); // ✅ Safely unsubscribe when unmounting or logging out
      }
    };
  }, [user?.uid, otherUserId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    await sendMessage(conversationId, user!.uid, newMessage.trim());
    setNewMessage('');
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.uid;

    return (
      <View style={[styles.messageBubble, isCurrentUser ? styles.myMessage : styles.theirMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder={i18n.t('typeMessage')}
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{i18n.t('send')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 6,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea',
  },
  messageText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
});
