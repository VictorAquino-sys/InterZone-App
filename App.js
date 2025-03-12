import React, { createContext, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, Text } from 'react-native';
import { getLocales } from 'expo-localization';
import i18n from './src/i18n';
import { NavigationContainer} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import firestore from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

import LoginScreen from './screens/auth/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import PostScreen from './screens/posts/PostScreen';
import NameInputScreen from './screens/NameInputScreen';
import { auth } from './src/config/firebase';
import { PostsProvider } from './src/contexts/PostsContext';
import { UserProvider } from './src/contexts/UserContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
export const PostsContext = createContext();

function HomeStack(){
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen} options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
      />
      <Stack.Screen
        name="Post"
        component={PostScreen}
      />
    </Stack.Navigator>
  )
}

function BottomTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ 
          title: i18n.t('home'), // Localized title for the tab
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ), 
        }} />
      <Tab.Screen 
        name="Post" 
        component={PostScreen} 
        options={{ 
          title: i18n.t('post'), // Localized title for the tab
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" color={color} size={size} />
          ), 
        }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    i18n.locale = getLocales()[0].languageCode; // Setup the locale at app start
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      console.log("Auth state changed, user:", authUser);
      if (authUser) {
        console.log("Logged in user UID:", authUser.uid); // This should log the UID to confirm it's being received
      } else {
        console.log("No user is logged in.");
      }
      setUser(authUser);
      if (initializing) {
        setInitializing(false);
      }
    });

    return unsubscribe; // Unsubscribe from the listener when unmounting
  }, [initializing]);

  if (initializing) { // Show nothing or loading screen while initializing
    return <ActivityIndicator size="large" color="#0000ff" />; // Ensure you import ActivityIndicator from 'react-native'
  }

  const renderScreens = () => {
    if (!user) {
      return <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />;
    }
    return (
      <>
        <Stack.Screen name="NameInputScreen" component={NameInputScreen} options={{ headerShown: false }} />  
        <Stack.Screen name="BottomTabs" component={BottomTabs} options={{ headerShown: false }} />
      </>
    );
  };
  
  return (
    <UserProvider> 
      <PostsProvider>
        <NavigationContainer>
          <Stack.Navigator>
            {renderScreens()}
          </Stack.Navigator>
        </NavigationContainer>
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
