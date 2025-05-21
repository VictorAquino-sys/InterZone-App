import React, { createContext, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, Text, TouchableOpacity, Image, Dimensions, Platform, ImageBackground, StatusBar, Alert, Pressable } from 'react-native';
import { getLocales } from 'expo-localization';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '@/i18n';
import { auth, db } from '@/config/firebase';
import { NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import homeIcon from './assets/home_icon_transparent.png';
import limasunset from './assets/lima_sunset_image.png';
import magicIcon from './assets/magic_icon_transparent.png';
import { Ionicons } from '@expo/vector-icons';
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
import { doc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import * as Linking from 'expo-linking';
import { ChatProvider, useChatContext } from '@/contexts/chatContext';
import PostDetailScreen from 'screens/posts/PostDetailScreen';
import Toast from 'react-native-toast-message';
import { logScreen } from '@/utils/analytics';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import DistributeQrScreen from 'screens/admin/DistributeQrScreen';
import VerifyBusinessScreen from 'screens/business/VerifyBusinessScreen';
import Animated, { BounceIn} from 'react-native-reanimated';
import AdminApprovalScreen from 'screens/admin/AdminApprovalScreen';
import BusinessChannelScreen from 'screens/business/BusinessChannelScreen';
import ProfessorDetailScreen from 'screens/studyub/ProfessorDetailScreen';
import UniversityScreen from 'screens/studyub/UniversityScreen';
import RateProfessorScreen from 'screens/studyub/RateProfessorScreen';
import ApplyBusinessScreen from 'screens/business/ApplyBusinessScreen';
import EditBusinessProfileScreen from './screens/business/EditBusinessProfileScreen';
import SuggestProfessorScreen from 'screens/studyub/SuggestProfessorScreen';
import ProfessorSuggestionsReviewScreen from 'screens/studyub/professorSuggestionsReviewScreen';
import AdminDashboardScreen from 'screens/admin/AdminDashboardScreen';
import { createNavigationContainerRef } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
      UniversityScreen: 'verify',
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
                  bottom: insets.bottom + 12,
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
                  bottom: insets.bottom + 12,
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
    
    return (
      <>
      <StatusBar
        translucent
        backgroundColor={Platform.OS === 'android' ? 'rgba(0,0,0,0.2)' : 'transparent'}
        barStyle="light-content"
      />
          <ImageBackground
            source={limasunset}
            resizeMode="cover"
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#26c6da" />
          </ImageBackground>
      </>
    );
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
          <Stack.Screen name="ChatScreen" component={ChatScreen} options={({ route }) => ({
            title: (route.params as any)?.friendName || i18n.t('chat.title'),
            headerShown: true,
          })} />
          <Stack.Screen
            name="MessagesScreen"
            component={MessagesScreen}
            options={{ title: i18n.t('messages.title') }}
          />
          <Stack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={{ title: i18n.t('block.manage'), headerShown: true }}
          />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: i18n.t('post.detailTitle') }} />

          <Stack.Screen name="DistributeQr" component={DistributeQrScreen} options={{ title: i18n.t('qr.distributeTitle') }} />

          <Stack.Screen name="VerifyBusiness" component={VerifyBusinessScreen} options={{ title: i18n.t('business.verifyTitle') }} />

          <Stack.Screen name="BusinessChannel" component={BusinessChannelScreen} options={{ title: i18n.t('business.channelTitle') }} />

          <Stack.Screen name="ApplyBusiness" component={ApplyBusinessScreen} options={{ title: i18n.t('business.applyTitle') }} />

          <Stack.Screen
            name="EditBusinessProfile"
            component={EditBusinessProfileScreen}
            options={({ navigation }) => ({
              title: i18n.t('business.editTitle'),
              presentation: 'modal', // ✅ Modal behavior
              animation: 'slide_from_bottom', // ✅ Smooth transition
              headerLeft: () => (
                <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 16 }}>
                  <Ionicons name="chevron-down" size={26} color="black" />
                </Pressable>
              ),
            })}
          />

          <Stack.Screen name="RateProfessor" component={RateProfessorScreen} />
          <Stack.Screen name="ProfessorDetail" component={ProfessorDetailScreen} />
          <Stack.Screen name="UniversityScreen" component={UniversityScreen} />

          <Stack.Screen
            name="SuggestProfessor" component={SuggestProfessorScreen}
          />

          <Stack.Screen
            name="ProfessorSuggestionsReview"
            component={ProfessorSuggestionsReviewScreen}
          />

          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />


          {user?.isQrDistributor && (
            <Stack.Screen
              name="AdminApproval"
              component={AdminApprovalScreen}
              options={{ title: i18n.t('admin.reviewApplications') }}
              />
          )}

        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  // const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const checkEmailLink = async () => {
      const url = await Linking.getInitialURL();
      if (!url || !isSignInWithEmailLink(auth, url)) return;

      const email = await AsyncStorage.getItem('emailForSchoolSignIn');
      const schoolId = await AsyncStorage.getItem('schoolIdForSignIn');

      if (!email || !schoolId) {
        Alert.alert('Error', 'Missing stored school email or schoolId');
        return;
      }

      try {
        await signInWithEmailLink(auth, email, url);

        if (!auth.currentUser) {
          Alert.alert('Verification Error', 'No user is currently signed in.');
          return;
        }

        await setDoc(doc(db, 'schoolEmailIndex', email), {
          uid: auth.currentUser!.uid,
          schoolId,
          verifiedAt: new Date().toISOString()
        });

        const userRef = doc(db, 'users', auth.currentUser!.uid);
        await setDoc(userRef, {
          verifiedSchools: arrayUnion(schoolId),
          verifiedEmails: arrayUnion(email),
        }, { merge: true });

        await AsyncStorage.multiRemove(['emailForSchoolSignIn', 'schoolIdForSignIn']);

        // ✅ Add this toast before navigation
        Toast.show({
          type: 'success',
          text1: i18n.t('verify.verifiedTitle'),
          text2: i18n.t('verify.verifiedMessage'), // e.g. "You've been verified successfully!"
          position: 'bottom',
        });
        await AsyncStorage.removeItem('schoolEmailCooldown');
        navigationRef.current?.navigate('UniversityScreen', {
          universityId: schoolId,
          universityName: schoolId === 'upc' ? 'UPC' : 'Villareal',
        });

      } catch (error) {
        console.error('Error verifying email link:', error);
        Alert.alert('Verification Failed', 'Something went wrong verifying your email.');
      }
    };

    checkEmailLink();
  }, []);

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
              <Toast />
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
