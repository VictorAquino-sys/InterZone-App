import React, { useState, useEffect, FunctionComponent } from 'react'
import { GoogleAuthProvider, signInWithCredential, createUserWithEmailAndPassword,signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ImageBackground, StyleSheet, View, Text, KeyboardAvoidingView, SafeAreaView, Platform, StatusBar, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import image from '../../assets/localbrands_1.png';
import { auth, db } from '../../src/config/firebase'; // Import Firestore
import { Alert } from 'react-native';
import { GoogleSignin, isSuccessResponse, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { UserData } from '../../src/contexts/UserContext'; // Use useUser here
import { doc, setDoc, getDoc } from 'firebase/firestore';
import i18n from '@/i18n';
import { NativeStackScreenProps } from '@react-navigation/native-stack'; 
import { RootStackParamList } from '../../src/navigationTypes';
import * as RNLocalize from 'react-native-localize';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'LoginScreen'>;

const LoginScreen: FunctionComponent<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>(''); 
  const [show, setShow] = useState<boolean>(true);

  useEffect(() => {
    let alreadyNavigated = false;
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setShow(false);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setShow(true);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
      });

      // Save user data in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(authUser));
      await AsyncStorage.setItem('userId', authUser.uid);
      console.log("User signed up:", authUser.email, "| Country:", country);

      navigation.replace('Terms');
    } catch (error :any) {
      console.log("Firebase Auth Error:"); // Debugging line

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
          case 'auth/email-already-in-use':  // Handle duplicate email
          errorMessage = i18n.t('emailAlreadyInUse');
          break;
      }

      Alert.alert(i18n.t('SignUpError'), errorMessage);
    }
  };

  const handlePasswordReset = async () => {
    if (email.trim() === '') {
        Alert.alert('Input Error', 'Please enter your email address to receive a password reset link.');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        Alert.alert('Check your email', 'A link to reset your password has been sent to your email address.');
    } catch (error: any) {
        console.error('Password Reset Error:', error);
        Alert.alert('Password Reset Failed', error.message || 'Failed to send password reset email.');
    }
};

  // Handle user login and ensure Firestore data is locked
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;
 
      // Fetch user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);
      let userData: UserData | undefined;

      if (userSnap.exists()) {
        userData = userSnap.data() as UserData;
      }

      // Store user data locally
      await AsyncStorage.setItem('user', JSON.stringify(authUser));
      await AsyncStorage.setItem('userName' + authUser.uid, userData?.name || ""); // Save name
      await AsyncStorage.setItem('userCountry' + authUser.uid, userData?.country || "Unknown"); // Save country

      console.log("User logged in:", authUser.email);
      console.log("Fetched name:", userData?.name); 

      // Only navigate to NameInputScreen if the name is missing
      if (!userData?.name) {
        navigation.replace('NameInputScreen', { userId: authUser.uid });
      } else {
          navigation.navigate('BottomTabs'); // Redirect to main app
      }
    } catch (error: any) {
      console.log("Firebase Auth Error:", error.code, error.message); // Debugging line

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
      }

      Alert.alert(i18n.t('loginError'), errorMessage);
    }
  };

  const signIn = async () => {
    try {
      await checkPlayServices(); // Check for Google Play Services
      const userInfo = await handleGoogleSignIn(); // Handle the Google sign-in process
      if (!userInfo.idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      console.log('User signed in with Google:', userCredential.user.email);
    
      // await checkAndCreateFirestoreDocument(userCredential.user); 
      const userRef = doc(db, "users", userCredential.user.uid);
      const docSnap = await getDoc(userRef);
    
      if (!docSnap.exists()) {
        const country = RNLocalize.getCountry(); // 🌍 Get country from device settings
        const language = RNLocalize.getLocales()[0].languageCode;

        await setDoc(userRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || '',
          avatar: userCredential.user.photoURL || '',
          country, // ✅ Store country at account creation
          language, // ✅ added
          createdAt: new Date().toISOString(),
        });

        console.log("📦 Created Firestore document for Google user with country:", country);
      } else {
        console.log("✅ Firestore user already exists for:", userCredential.user.email);
      }
      navigation.navigate('BottomTabs'); // Navigate or update UI
    } catch (error: any) {
      console.error('Error during sign-in process:', error);
      Alert.alert('Login Failed', error.message || 'Failed to sign in with Google');
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
    <ImageBackground source={image} resizeMode="cover" style={styles.rootContainer}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          {show && (
            <>
              <Text style={styles.titleText}>{i18n.t('appTitle')}</Text>
              <Text style={styles.phraseText}>{i18n.t('tagline')}</Text>
            </>
          )}
        </View>

        <KeyboardAvoidingView behavior= "padding"  style= {styles.container}
        >
          <GoogleSigninButton
              style={styles.googleButton}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={signIn}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={text => setEmail(text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={text => setPassword(text)}
              secureTextEntry
            />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleLogin}
              style={styles.button} 
            >
              <Text style={styles.buttonText}>{i18n.t('loginButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSignUp}
              style={[styles.button, styles.buttonOutline]} 
            >
              <Text style={styles.buttonOutlineText}>{i18n.t('registerButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePasswordReset}
              style={[styles.button, styles.buttonForgotPass]}
            >
              <Text style={styles.buttonForgotPassText}>{i18n.t('forgotPasswordButton')}</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    // marginTop: '1%',
    marginBottom: 20,
  },
  safeArea:{
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    // paddingTop: 10,
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
    width:'70%',
    justifyContent: 'center',
  },
  input: {
    backgroundColor:'white',
    opacity: 0.7,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  buttonContainer: {
    width:'60%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '5%',
  },
  button: {
    backgroundColor: '#0782F9',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'white',
    marginTop: 5,
    borderColor: '#0782F9',
    borderWidth: 2,
  },
  buttonForgotPass: {
    backgroundColor: 'white',
    marginTop: 8,
    borderColor: '#00897b',
    borderWidth: 2,
    width: "80%",
  },
  googleButton: {
    width: '70%',
    height: 50,
    borderRadius: 10,
    marginTop: 1 // Or adjust according to your layout
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
  buttonForgotPassText: {
    color: '#00897b',
    fontWeight: '700',
    fontSize: 14,  
  },
  rootContainer: {
    flex: 1,
  },
})