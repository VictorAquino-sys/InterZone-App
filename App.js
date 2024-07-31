import React, { createContext, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, Button, Text, View } from 'react-native';
import { NavigationContainer, useNavigation} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons'

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import PostScreen from './screens/PostScreen';
import NameInputScreen from './screens/NameInputScreen';
import { auth } from './screens/firebase';
import { PostsProvider } from './screens/PostsContext';
import { UserProvider } from './screens/UserContext';

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
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ), 
        }} />
      <Tab.Screen 
        name="Post" 
        component={PostScreen} 
        options={{ 
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
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
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

  return (
    <UserProvider> 
      <PostsProvider>
        <NavigationContainer>
          <Stack.Navigator>
            {!user ? (
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            ) : (
              <>
                <Stack.Screen name="BottomTabs" component={BottomTabs} options={{ headerShown: false }} />
                <Stack.Screen name="NameInputScreen" component={NameInputScreen} options={{ headerShown: false }} />
              </>
            )}
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