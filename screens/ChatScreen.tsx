import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useUser } from '../src/contexts/UserContext';
import { fetchMessages, sendMessage, getOrCreateConversation } from '../services/chatService';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import i18n from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatContext } from '@/contexts/chatContext';

type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
};

type RouteParams = {
  friendId?: string;
  friendName?: string;
  conversationId?: string;

};


const ChatScreen = () => {
  const { user } = useUser();
  const route = useRoute();
  const { friendId, friendName, conversationId: convoIdFromParams } = route.params as RouteParams;
  const { setActiveConversationId } = useChatContext();
  const [loading, setLoading] = useState(true);
  
  if (!friendId && !convoIdFromParams) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>🚫 No chat information provided.</Text>
      </SafeAreaView>
    );
  }
    
  const insets = useSafeAreaInsets(); // 👈 grab safe area insets

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setLoading(true);
    let unsubscribe: (() => void) | null = null;
  
    const init = async () => {
      if (!user?.uid || (!friendId && !convoIdFromParams)) return;
  
      let convoId = convoIdFromParams;

      if (!convoId && friendId) {
        const convo = await getOrCreateConversation(user.uid, friendId);
        convoId = convo.id;
      }      
      
      setConversationId(convoId ?? null);
      setActiveConversationId(convoId ?? null);
  
      const msgRef = collection(db, `conversations/${convoId}/messages`);
      const q = query(msgRef, orderBy('timestamp', 'asc'));
  
      console.log("👤 Current user:", user?.uid);
      console.log("💬 Trying to open convo:", convoId);

      unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(loaded);
        setLoading(false);

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
      setActiveConversationId(null); // reset on unmount
    };


  }, [user?.uid, friendId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    await sendMessage(conversationId, user!.uid, newMessage.trim(), user?.name);
    setNewMessage('');
  };

  const handleInputChange = (text: string) => {
    if (text.length > 100) {
      setNewMessage(text.slice(0, 100));
    } else {
      setNewMessage(text);
    }
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
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" />
      ) : (

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
        />
      )}

        {conversationId && (
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                value={newMessage}
                onChangeText={handleInputChange}
                placeholder={i18n.t('typeMessage')}
                style={styles.input}
                multiline
                maxLength={100} 
                placeholderTextColor="#888"
              />
              <Text style={styles.counter}>
                {newMessage.length}/100
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendButton,
                !newMessage.trim() && { backgroundColor: '#b0b0b0', opacity: 0.6 }
              ]}
              disabled={!newMessage.trim()}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{i18n.t('send')}</Text>
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },  
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  counter: {
    position: 'absolute',
    right: 16,
    bottom: 8,
    fontSize: 13,
    color: '#bbb',
  },
  
  inputWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f6f6f6',
    borderRadius: 20,
    paddingRight: 45, // space for counter!
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
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
    paddingLeft: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    maxHeight: 120,
    color: '#222',
    borderRadius: 20,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007aff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 60,
  },
});