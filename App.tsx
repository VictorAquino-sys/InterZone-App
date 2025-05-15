import React, { createContext, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, Text, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '@/i18n';
import { NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import homeIcon from './assets/home_icon_transparent.png';
import magicIcon from './assets/magic_icon_transparent.png';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
// import Ionicons from '@expo/vector-icons/Ionicons';
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
import PostDetailScreen from 'screens/posts/PostDetailScreen';
import Toast from 'react-native-toast-message';
import { logScreen } from '@/utils/analytics';
import DistributeQrScreen from 'screens/admin/DistributeQrScreen';
import VerifyBusinessScreen from 'screens/business/VerifyBusinessScreen';
import Animated, { BounceIn} from 'react-native-reanimated';
import AdminApprovalScreen from 'screens/admin/AdminApprovalScreen';
import BusinessChannelScreen from 'screens/business/BusinessChannelScreen';
import ApplyBusinessScreen from 'screens/business/ApplyBusinessScreen';
import EditBusinessProfileScreen from './screens/business/EditBusinessProfileScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // <- ✅ necessary for iOS
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

    </Stack.Navigator>
  )
}

function BottomTabs() {
  const windowWidth = Dimensions.get('window').width;
  const postIconLeft = windowWidth - 120; // tune this value
  const iconSpacing = windowWidth * 0.15;
  const insets = useSafeAreaInsets(); // grabs bottom padding (e.g., iPhone notch)

  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          height: 35,
          backgroundColor: '#e8f5e9',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ 
          title: '',
          tabBarButton: (props) => (
            <Animated.View entering={BounceIn.delay(100)}>
              <TouchableOpacity
                {...props}
                style={{
                  position: 'absolute',
                  bottom: insets.bottom - 40,
                  left: iconSpacing,
                  backgroundColor: 'white',
                  borderRadius: 20,
                  padding: 6,
                  shadowColor: '#4F46E5',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <Image
                  source={homeIcon}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>
          ),
        }} 
      />

      <Tab.Screen 
        name="PostScreen" 
        component={PostScreen}
        options={{ 
          title: '',
          tabBarButton: (props) => (
            <Animated.View entering={BounceIn.delay(100)}>
              <TouchableOpacity
                {...props}
                style={{
                  position: 'absolute',
                  bottom: insets.bottom - 40,
                  left: postIconLeft,
                  backgroundColor: 'white',
                  borderRadius: 20,
                  padding: 6,
                  shadowColor: '#4F46E5',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <Image
                  source={magicIcon}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>
          ),
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
      const { type, conversationId, postId } = notification.request.content.data;

      // Suppress notification if already in that chat
      if (type === 'message' && conversationId && activeConversationId === conversationId) {
        console.log('🔕 Suppressing chat notification: already viewing this conversation.');
        return;
      }

      if (type === 'post') {
        console.log(`📰 New post notification for post ID: ${postId}`);
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
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} />

          <Stack.Screen name="DistributeQr" component={DistributeQrScreen} options={{ title: 'QR Distribution' }} />

          <Stack.Screen name="VerifyBusiness" component={VerifyBusinessScreen} options={{ title: 'Verify Account' }} />

          <Stack.Screen name="BusinessChannel" component={BusinessChannelScreen} options={{ title: 'Business Channel' }} />

          <Stack.Screen name="ApplyBusiness" component={ApplyBusinessScreen} options={{ title: 'Apply for Business' }} />

          <Stack.Screen
            name="EditBusinessProfile"
            component={EditBusinessProfileScreen}
            options={({ navigation }) => ({
              title: "Edit Business",
              presentation: 'modal', // ✅ Modal behavior
              animation: 'slide_from_bottom', // ✅ Smooth transition
              headerLeft: () => (
                <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 16 }}>
                  <Ionicons name="chevron-down" size={26} color="black" />
                </Pressable>
              ),
            })}
          />

          {user?.isQrDistributor && (
            <Stack.Screen
              name="AdminApproval"
              component={AdminApprovalScreen}
              options={{ title: 'Review Business Applications' }}
            />
          )}

        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <UserProvider> 
      <PostsProvider>
        <TriviaProvider>
          <HistoryTriviaProvider>
            <ChatProvider>
              <NavigationContainer 
                ref={navigationRef}
                linking={linking}
                onReady={() => {
                  const route = navigationRef.getCurrentRoute();
                  if (route) logScreen(route.name);
                }}
                onStateChange={() => {
                  const route = navigationRef.getCurrentRoute();
                  if (route) logScreen(route.name);
                }}
              >
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