import React, { useState, useEffect, FunctionComponent } from 'react'
import { GoogleAuthProvider, signInWithCredential, createUserWithEmailAndPassword,signInWithEmailAndPassword, sendPasswordResetEmail, OAuthProvider, sendEmailVerification } from "firebase/auth";
import { Image, ScrollView, ImageBackground, StyleSheet, View, Text, KeyboardAvoidingView, SafeAreaView, Platform, StatusBar, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import image from '../../assets/localbrands_1.png';
import BG_PE from '../../assets/peru_background_login.png';
import GoogleIcon from '../../assets/google_icon.png'; // TypeScript-compatible
import { auth, db } from '../../src/config/firebase'; // Import Firestore
import { Alert } from 'react-native';
import { GoogleSignin, isSuccessResponse, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { UserData } from '../../src/contexts/UserContext'; // Use useUser here
import { doc, setDoc, getDoc } from 'firebase/firestore';
import i18n from '@/i18n';
import { NativeStackScreenProps } from '@react-navigation/native-stack'; 
import { RootStackParamList } from '../../src/navigationTypes';
import * as RNLocalize from 'react-native-localize';
import { useUser } from '../../src/contexts/UserContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import { generateNonce, sha256 } from '@/utils/cryptoUtils';
import { recordHandledError } from '@/utils/crashlytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'LoginScreen'>;

const LoginScreen: FunctionComponent<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>(''); 
  const [show, setShow] = useState<boolean>(true);
  const { refreshUser } = useUser(); // ⬅️ grab from context
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const insets = useSafeAreaInsets();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // let alreadyNavigated = false;
    AppleAuthentication.isAvailableAsync().then(available => {
      console.log("🍎 Apple Sign-In available:", available);
      setIsAppleAvailable(available);
    });
    
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setShow(false));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setShow(true));

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleAppleSignIn = async () => {
    try {
      const rawNonce = generateNonce();
      const hashedNonce = await sha256(rawNonce);

      console.log("🔐 Nonce generated:", rawNonce);
      console.log("🔐 Hashed nonce:", hashedNonce);
  
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      console.log("🍏 isAvailableAsync:", isAvailable);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
  
      console.log("📥 Apple credential received:", JSON.stringify(credential, null, 2));

      const { identityToken, fullName, user } = credential;
  
      if (!identityToken) {
        throw new Error("Apple Sign-In failed: No identity token returned.");
      }
  
      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: identityToken,
        rawNonce,
      });
  
      const result = await signInWithCredential(auth, firebaseCredential);
      const authUser = result.user;

      console.log("✅ Firebase sign-in success:", authUser.uid);
  
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        const appleName = fullName?.givenName ?? 'User';
        const appleEmail = authUser.email ?? `${authUser.uid}@privaterelay.appleid.com`;
  
        await setDoc(userRef, {
          uid: authUser.uid,
          name: appleName,
          email: appleEmail,
          avatar: '',
          createdAt: new Date().toISOString(),
        });
      }
  
      await AsyncStorage.setItem('user', JSON.stringify(authUser));
      await AsyncStorage.setItem('userId', authUser.uid);
      await AsyncStorage.setItem('termsAccepted', 'false');
  
      await refreshUser();
  
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple Sign-In cancelled');
      } else {
        await recordHandledError(e);
        Alert.alert('Apple Sign-In Failed', e.message);
      }
    }
  };

  // Save new user details in Firestore after signup
  const handleSignUp = async () => {
    // Check if the password is too short
    if (password.length < 6) {
      Alert.alert(i18n.t('SignUpError'), i18n.t('passwordRequirement'));
      return;
    }
    
    try {
      const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
      const authUser = userCredentials.user;

      const country = RNLocalize.getCountry();
      const language = RNLocalize.getLocales()[0].languageCode;

      // Create Firestore user document
      await setDoc(doc(db, "users", authUser.uid), {
        uid: authUser.uid,
        email: authUser.email,
        name: "",
        avatar: "",
        country,
        language, // ✅ added
        createdAt: new Date().toISOString(),
        termsAccepted: false,
      });

      // ✅ Send email verification
      await sendEmailVerification(authUser);

      // ✅ Sign the user out to wait for email verification
      await auth.signOut();

      // ✅ Now show only 1 clean alert
      Alert.alert(
        i18n.t('verificationSentTitle'),
        i18n.t('verificationSentMessage'),
        [{ text: i18n.t('ok'), onPress: () => navigation.replace("LoginScreen") }]
      );

      console.log("User signed up:", authUser.email, "| Country:", country);

    } catch (error :any) {
      await recordHandledError(error);
      let errorMessage = i18n.t('genericError'); // Default error message

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = i18n.t('invalidEmail');
          break;
        case 'auth/email-already-in-use':
          errorMessage = i18n.t('emailAlreadyInUse');
          break;
        case 'auth/weak-password':
          errorMessage = i18n.t('weakPassword');
          break;
        case 'auth/operation-not-allowed':
          errorMessage = i18n.t('signUpDisabled');
          break;
        case 'auth/network-request-failed':
          errorMessage = i18n.t('networkError');
          break;
        case 'auth/internal-error':
          errorMessage = i18n.t('internalError');
          break;
        case 'auth/invalid-credential':
          errorMessage = i18n.t('invalidCredential');
          break;
        case 'auth/password-does-not-meet-requirements':
          errorMessage = i18n.t('passwordRequirementsNotMet');
          break;
        default:
          errorMessage = `${i18n.t('genericError')} (${error.code})`; // 👈 helpful debug
          console.log(error.code);
      }

      Alert.alert(i18n.t('SignUpError'), errorMessage);
    }
  };

  const handleResendVerificationEmail = async () => {
    try {
      if (!email) {
        Alert.alert(
          i18n.t('missingEmailTitle'),
          i18n.t('missingEmailMessage')
        );
        return;
      }
  
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;
  
      if (authUser.emailVerified) {
        Alert.alert(
          i18n.t('alreadyVerifiedTitle'),
          i18n.t('alreadyVerifiedMessage')
        );
        return;
      }
  
      await sendEmailVerification(authUser);
      Alert.alert(
        i18n.t('verificationSentTitle'),
        i18n.t('verificationSentMessage')
      );
    } catch (error: any) {
      await recordHandledError(error);
      Alert.alert(
        i18n.t('resendFailedTitle'),
        error.message || i18n.t('resendFailedMessage')
      );
    }
  };
  
  const handlePasswordReset = async () => {
    if (email.trim() === '') {
      Alert.alert(
        i18n.t('inputErrorTitle'),
        i18n.t('inputErrorMessage')
      );
      return;
    }
  
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        i18n.t('resetSentTitle'),
        i18n.t('resetSentMessage')
      );
    } catch (error: any) {
      await recordHandledError(error);
      Alert.alert(
        i18n.t('resetFailedTitle'),
        error.message || i18n.t('resetFailedMessage')
      );
    }
  };
  
  // Handle user login and ensure Firestore data is locked
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;

      // ❌ Block login if email not verified
      if (!authUser.emailVerified) {
        Alert.alert(
          i18n.t('emailNotVerifiedTitle'),
          i18n.t('emailNotVerifiedMessage')
        );
        await auth.signOut();  // ✅ Kill session before context loads
        navigation.replace("LoginScreen"); // ✅ Reset stack
        return;
      }
 
      // Fetch user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);
      let userData: UserData | undefined;

      if (userSnap.exists()) {
        userData = userSnap.data() as UserData;
      }

      // Optional local cache (safe to keep)
      // await AsyncStorage.setItem('user', JSON.stringify(authUser));
      await AsyncStorage.setItem('userName' + authUser.uid, userData?.name || ""); // Save name
      await AsyncStorage.setItem('userCountry' + authUser.uid, userData?.country || "Unknown"); // Save country

      console.log("User logged in:", authUser.email);
      console.log("Fetched name:", userData?.name); 


      await refreshUser(); // 👈 This triggers UserProvider to re-fetch Firestore + update `user`

    } catch (error: any) {
      await recordHandledError(error);

      let errorMessage = i18n.t('genericError'); // Default error message

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = i18n.t('invalidEmail');
          break;
        case 'auth/wrong-password':
          errorMessage = i18n.t('wrongPassword');
          break;
        case 'auth/user-not-found':
          errorMessage = i18n.t('userNotFound');
          break;
        case 'auth/too-many-requests':
          errorMessage = i18n.t('tooManyRequests');
          break;
        case 'auth/network-request-failed':
          errorMessage = i18n.t('networkError');
          break;
        case 'auth/internal-error':
          errorMessage = i18n.t('internalError');
          break;
        case 'auth/invalid-credential':
          errorMessage = i18n.t('invalidCredential');
          break;
        default:
          errorMessage = `${i18n.t('genericError')} (${error.code})`; // 👈 helpful debug
      }

      Alert.alert(i18n.t('loginError'), errorMessage);
    }
  };

  const signIn = async () => {
    try {
      setGoogleLoading(true); // ⏳ Start loading
      await checkPlayServices(); // Check for Google Play Services
      const userInfo = await handleGoogleSignIn(); // Handle the Google sign-in process
      if (!userInfo.idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const authUser = userCredential.user;

      console.log('User signed in with Google:', authUser.email);
    
      // await checkAndCreateFirestoreDocument(userCredential.user); 
      const userRef = doc(db, "users", authUser.uid);
      const docSnap = await getDoc(userRef);
    
      if (!docSnap.exists()) {
        const country = RNLocalize.getCountry(); // 🌍 Get country from device settings
        const language = RNLocalize.getLocales()[0].languageCode;

        await setDoc(userRef, {
          uid: authUser.uid,
          email: authUser.email,
          name: authUser.displayName || '',
          avatar: authUser.photoURL || '',
          country, // ✅ Store country at account creation
          language, // ✅ added
          createdAt: new Date().toISOString(),
        });

        console.log("📦 Created Firestore document for Google user with country:", country);
      } else {
        console.log("✅ Firestore user already exists for:", authUser.email);
      }

      // Save user data in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(authUser));
      await AsyncStorage.setItem('userId', authUser.uid);
      await AsyncStorage.setItem('termsAccepted', 'false'); // let App.tsx handle navigation
      await refreshUser(); // ⬅️ trigger re-fetch after user creation

    } catch (error: any) {
      await recordHandledError(error);
      Alert.alert('Login Failed', error.message || 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false); // ✅ End loading
    }
  };
  
  const checkPlayServices = async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  };
  
  const handleGoogleSignIn = async () => {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new Error('Sign-in cancelled or failed without error code.');
    }
    return response.data;
  };
  
  const checkAndCreateFirestoreDocument = async (authUser: any) => {
    const userRef = doc(db, "users", authUser.uid);
    const docSnap = await getDoc(userRef);
  
    if (!docSnap.exists()) {
      await setDoc(userRef, {
        uid: authUser.uid,
        email: authUser.email,
        name: authUser.displayName || '',
        avatar: authUser.photoURL || '',
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" // ⬅️ or "dark-content" depending on image brightness
      />
        <ImageBackground source={BG_PE} resizeMode="cover" style={[styles.rootContainer, { paddingBottom: insets.bottom }]}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView
              contentContainerStyle={[ styles.scrollContent, { paddingBottom: insets.bottom }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator= {false}
            >
              <View style={styles.headerContainer}>
                {show && (
                  <>
                    <Text style={styles.titleText}>{i18n.t('appTitle')}</Text>
                    <Text style={styles.phraseText}>{i18n.t('tagline')}</Text>
                  </>
                )}
              </View>

              <KeyboardAvoidingView behavior= "padding"  style= {styles.container}>
                <View style={styles.authButtonsContainer}>

                  <TouchableOpacity
                    onPress={signIn}
                    disabled={googleLoading}
                    style={[styles.customGoogleButton, googleLoading && { opacity: 0.6 }]}
                  >
                    <View style={styles.googleContent}>
                      <Image source={GoogleIcon} style={styles.googleIcon} />
                      <Text style={styles.googleText}>
                        {googleLoading ? i18n.t('loading') : i18n.t('auth.signInWithGoogle')}
                      </Text>
                    </View>
                  </TouchableOpacity>


                  {Platform.OS === 'ios' && isAppleAvailable && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={5}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={i18n.t('Email')}
                    value={email}
                    onChangeText={text => setEmail(text)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={i18n.t('Password')}
                    value={password}
                    onChangeText={text => setPassword(text)}
                    secureTextEntry
                  />
                </View>
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity onPress={handleLogin} style={styles.button}>
                    <Text style={styles.buttonText}>{i18n.t('loginButton')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleSignUp} style={[styles.button, styles.buttonOutline]}>
                    <Text style={styles.buttonOutlineText}>{i18n.t('registerButton')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.troubleAccessContainer}>
                  <Text style={styles.troubleText}>{i18n.t('troubleAccess')}</Text>
                  <View style={styles.troubleLinks}>
                    <TouchableOpacity onPress={handlePasswordReset}>
                      <Text style={styles.troubleLink}>{i18n.t('forgotPasswordLink')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.separator}> | </Text>
                    <TouchableOpacity onPress={handleResendVerificationEmail}>
                      <Text style={styles.troubleLink}>{i18n.t('resendVerificationLink')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>


              </KeyboardAvoidingView>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
    </>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  authButtonsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    // gap: 12, // ✅ Works in React Native 0.71+, otherwise use marginBottom on each button
  },
  customGoogleButton: {
    width: 200,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    // paddingHorizontal: 2, // added padding
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 2,
  },
  
  googleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  appleButton: {
    width: 170,
    height: 44,
    borderRadius: 18,
  },
  safeArea:{
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    // marginBottom: 10,
    width: '100%',
  },
  titleText: {
    fontSize: 60,
    color: 'yellow',
    borderColor: 'red',
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    marginBottom: 10,  // Space between title and phrase
  },
  phraseText: {
    fontSize: 25,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    width:'60%',
    justifyContent: 'center',
  },
  input: {
    backgroundColor:'white',
    opacity: 0.7,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    elevation: 3,
  },
  buttonContainer: {
    width:'60%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '3%',
  },
  button: {
    backgroundColor: '#0782F9',
    width: '80%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'white',
    marginTop: 5,
    borderColor: '#0782F9',
    borderWidth: 2,
  },
  buttonText:{
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonOutlineText: {
    color: '#0782F9',
    fontWeight: '700',
    fontSize: 16,
  },
  rootContainer: {
    flex: 1,
  },
  troubleAccessContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  troubleText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  troubleLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  troubleLink: {
    color: '#0782F9',
    fontWeight: '600',
    fontSize: 13,
  },
  separator: {
    marginHorizontal: 8,
    color: '#999',
    fontSize: 13,
  },
})