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
// import PostDetailScreen from 'screens/posts/PostDetailScreen';

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

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '239395273948-bkj4h2vkfu6l4e5khs9u9kink87g168l.apps.googleusercontent.com',
      offlineAccess: true,
    });

    (i18n as any).locale = getLocales()[0].languageCode;

  }, []);

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
            <NavigationContainer>
              <AuthenticatedApp />
            </NavigationContainer>
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
