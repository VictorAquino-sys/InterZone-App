import React, { createContext, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, Text } from 'react-native';
import { getLocales } from 'expo-localization';
import i18n from '@/i18n';
import { NavigationContainer} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import LoginScreen from './screens/auth/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import PostScreen from './screens/posts/PostScreen';
import TermsScreen from 'screens/TermsScreen';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import NameInputScreen from './screens/NameInputScreen';
import { PostsProvider } from './src/contexts/PostsContext';
import { UserProvider, useUser } from './src/contexts/UserContext';
import { TriviaProvider } from '@/contexts/TriviaContext';
import { RootStackParamList } from '@/navigationTypes';
import { TabParamList } from '@/navigationTypes';
import CategoryScreen from './screens/CategoryScreen';
import { HistoryTriviaProvider } from '@/contexts/HistoryTriviaContext';
import FriendsHomeScreen from './screens/FriendsHomeScreen';
import PeopleScreen from './screens/PeopleScreen';
import FriendRequestsScreen from './screens/FriendRequestsScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import FriendsScreen from 'screens/FriendsScreen';
import ChatScreen from 'screens/ChatScreen';
import MessagesScreen from 'screens/MessagesScreen';
import BlockedUsersScreen from 'screens/BlockedUsersScreen';
import DeleteAccountScreen from 'screens/DeleteAccountScreen';
import { registerForPushNotificationsAsync, setupNotificationChannelAsync } from './services/notifications';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase'; // adjust path if needed
import * as Linking from 'expo-linking';
import { ChatProvider, useChatContext } from '@/contexts/chatContext';

const linking = {
  prefixes: ['interzone://'],
  config: {
    screens: {
      ChatScreen: 'chat/:conversationId',
      PostDetail: 'post/:postId',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) return url;

    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification.request.content.data.url;
  },
  subscribe(listener: (url: string) => void) {
    const onReceiveURL = ({ url }: { url: string }) => listener(url);

    const linkingSubscription = Linking.addEventListener('url', onReceiveURL);

    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener(response => {
        const url = response.notification.request.content.data.url;
        if (url) listener(url);
      });

    return () => {
      linkingSubscription.remove();
      notificationSubscription.remove();
    };
  },
};

// Create the native stack navigator with type annotations
const Stack = createNativeStackNavigator<RootStackParamList>();
// Create the bottom tab navigator normally, no type needed unless passing specific props
const Tab = createBottomTabNavigator<TabParamList>();

function HomeStack(){
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="CategoryScreen" component={CategoryScreen} options={({ route }) => ({ title: route.params.title })}/>

      <Stack.Screen name="FriendsHome" component={FriendsHomeScreen}   
        options={{ 
          title: i18n.t('friendshome'), 
          headerShown: true  // ✅ ensure this is not false
        }} />
      <Stack.Screen name="People" component={PeopleScreen}
        options={{ 
          title: i18n.t('peopleNearby'), 
          headerShown: true  // ✅ ensure this is not false
        }} />
      <Stack.Screen name="Requests" component={FriendRequestsScreen}
        options={{ 
          title: i18n.t('incomingRequests'), 
          headerShown: true  // ✅ ensure this is not false
        }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="FriendsList" component={FriendsScreen} options={{ title: i18n.t('myFriends') }} />

      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: i18n.t('deleteAccount.title') }}
      />
      {/* <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} /> */}

    </Stack.Navigator>
  )
}

function BottomTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ 
          title: i18n.t('home'), // Localized title for the tab
          tabBarIcon: ({ color, size }) => 
            <Ionicons name="home-outline" color={color} size={size} />, 
        }} 
      />
      <Tab.Screen 
        name="PostScreen" 
        component={PostScreen}
        options={{ 
          title: i18n.t('post'), // Localized title for the tab
          tabBarIcon: ({ color, size }) => 
            <Ionicons name="add-circle-outline" color={color} size={size} />, 
        }} 
      />
    </Tab.Navigator>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useUser();
  const { activeConversationId } = useChatContext();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '239395273948-bkj4h2vkfu6l4e5khs9u9kink87g168l.apps.googleusercontent.com',
      offlineAccess: true,
    });

    (i18n as any).locale = getLocales()[0].languageCode;

    const setupNotifications = async () => {
      await setupNotificationChannelAsync();
      const token = await registerForPushNotificationsAsync();
    
      if (token && user?.uid) {
        console.log('📲 Expo Push Token:', token);
    
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            expoPushToken: token,
          });
          console.log('✅ Push token saved to Firestore');
        } catch (error) {
          console.error('❌ Failed to save push token:', error);
        }
      }
    };
  
    setupNotifications();
  
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const { type, conversationId } = notification.request.content.data;

      // Suppress notification if already in that chat
      if (type === 'message' && conversationId && activeConversationId === conversationId) {
        console.log('🔕 Suppressing chat notification: already viewing this conversation.');
        return;
      }

      // Otherwise, display it
      console.log('Notification received:', notification);
    });
  
    return () => subscription.remove();

  }, [user?.uid, activeConversationId]); // Depend on activeConversationId

  if (loading) {
    console.log("🔄 Waiting for Firebase and User data...");
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
      ) : !user?.termsAccepted ? (
        <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
      ) : user.name === '' || user.name === 'Default Name' ? (
        <Stack.Screen name="NameInputScreen" component={NameInputScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="BottomTabs" component={BottomTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="ChatScreen"
            component={ChatScreen}
            options={({ route }) => ({
              title: (route.params as any)?.friendName || 'Chat',
              headerShown: true,
            })}
          />
          <Stack.Screen name="MessagesScreen" component={MessagesScreen} />
          <Stack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={{ title: i18n.t('block.manage'), headerShown: true }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <UserProvider> 
      <PostsProvider>
        <TriviaProvider>
          <HistoryTriviaProvider>
            <ChatProvider>
              <NavigationContainer linking={linking}>
                <AuthenticatedApp />
              </NavigationContainer>
            </ChatProvider>
          </HistoryTriviaProvider>
        </TriviaProvider>
      </PostsProvider>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
  },
});
