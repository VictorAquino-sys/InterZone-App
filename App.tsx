import React, { createContext, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, Text } from 'react-native';
import { getLocales } from 'expo-localization';
import i18n from './src/i18n';
import { NavigationContainer} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import LoginScreen from './screens/auth/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import PostScreen from './screens/posts/PostScreen';
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

      <Stack.Screen name="FriendsHome" component={FriendsHomeScreen} />
      <Stack.Screen name="People" component={PeopleScreen} />
      <Stack.Screen name="Requests" component={FriendRequestsScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="FriendsList" component={FriendsScreen} options={{ title: 'My Friends' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
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
  type AuthStatus = 'uninitialized' | 'authenticated' | 'unauthenticated';
  const [authStatus, setAuthStatus] = useState<AuthStatus>('uninitialized');

  const { user } = useUser();  // Now safely within UserProvider

  useEffect(() => {
    // Set up Google Sign-In
    GoogleSignin.configure({
      webClientId: '239395273948-bkj4h2vkfu6l4e5khs9u9kink87g168l.apps.googleusercontent.com', // Use the correct client ID
      offlineAccess: true // True if you need to call Google APIs on behalf of the user when they are offline
    });

    i18n.locale = getLocales()[0].languageCode; // Setup the locale at app start
    console.log("User state:", user);  // Log the user state on each effect execution

    // Set a timeout to handle cases where authentication status remains unresolved.
    const timeoutId = setTimeout(() => {
      if (authStatus === 'uninitialized') {
        console.log("Authentication timeout reached, setting as unauthenticated.");
        setAuthStatus('unauthenticated'); // Set status to unauthenticated after timeout
      }
    }, 5000); // Set timeout for 5 seconds

    if (user) {
      setAuthStatus('authenticated');
    } else if (!user && authStatus !== 'uninitialized') {
      setAuthStatus('unauthenticated');
    }

    // Cleanup timeout on component unmount or when authStatus changes
    return () => clearTimeout(timeoutId);
  }, [user, authStatus]);

  if (authStatus === 'uninitialized') { // Show loading screen while auth status is uninitialized
    console.log("initializing App..");
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="NameInputScreen" component={NameInputScreen} options={{ headerShown: false }} />
          <Stack.Screen name="BottomTabs" component={BottomTabs} options={{ headerShown: false }} />
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
