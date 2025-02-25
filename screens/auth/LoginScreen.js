import React, { useState, useEffect } from 'react'
import { getAuth, createUserWithEmailAndPassword,signInWithEmailAndPassword } from "firebase/auth";
import { ImageBackground, StyleSheet, View, Text, KeyboardAvoidingView, TextInput, TouchableOpacity, Keyboard } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';
import image from '../../assets/localbrands_1.png';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../src/config/firebase'; // Import Firestore
// import { db } from '../src/config/firebase';
import { Alert } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import i18n from '../../src/i18n'; 

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [show, setShow] = useState(true);
  const navigation = useNavigation();

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
      // unsubscribeAuthStateChange();
    };
  }, []);

  // Save new user details in Firestore after signup
  const handleSignUp = async () => {
    // const auth = getAuth();
    try {
      const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
      const authUser = userCredentials.user;

      // Create Firestore user document
      await setDoc(doc(db, "users", authUser.uid), {
        uid: authUser.uid,
        email: authUser.email,
        name: "",
        avatar: "",
        createdAt: new Date().toISOString(),
      });

      // Save user data in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(authUser));
      console.log("User signed up:", authUser.email);

      navigation.navigate('NameInputScreen');
    } catch (error) {
      Alert.alert("Sign up Error", error.message);
      }
  };

  // Handle user login and ensure Firestore data is locked
  const handleLogin = async () => {
    // const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;

      //Check if the user's name is stored
      // const userName = await AsyncStorage.getItem('userName' + user.uid);
      // console.log("Checking userName before:", userName);
      
      // Fetch user data from Firestore
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);
      let userData = {};

      if (userSnap.exists()) {
        userData = userSnap.data();
      }

      // Store user data locally
      await AsyncStorage.setItem('user', JSON.stringify(authUser));
      await AsyncStorage.setItem('userName' + authUser.uid, userData.name || ""); // Save name

      console.log("User logged in:", authUser.email);
      console.log("Fetched name:", userData.name); 

      // Only navigate to NameInputScreen if the name is missing
      if (!userData.name) {
        navigation.replace('NameInputScreen', { userId: authUser.uid });
      } else {
          navigation.navigate('BottomTabs'); // Redirect to main app
      }
    } catch (error) {
      Alert.alert("Login Error", error.message);
    }
  };

  return (
    <ImageBackground source={image} resizeMode="cover" style={styles.rootContainer}
    >
        <View style={styles.titleContainer}>
          {show && (<Text style={{fontSize: 60, color: 'yellow', borderColor: 'red',  textAlign: 'center', fontWeight: 'bold'}}>{i18n.t('appTitle')}</Text>)}
        </View>
        <View style={styles.phraseContainer}>
          {show && (<Text style={{fontSize: 25, color: 'white', fontWeight: 'bold',
textAlign: 'center'}}>{i18n.t('tagline')}</Text>)}
        </View>
      <KeyboardAvoidingView behavior= "padding"  style= {styles.container}
      >

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
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 95,
  },
  titleContainer: {
    paddingHorizontal: '15%',
    paddingVertical: '20%',
    marginBottom : '-30%',
    paddingHorizontal: 15,
  },
phraseContainer: {
    paddingLeft: '18%',
    paddingTop: '10%',
    marginBottom : '-40%',
},
  inputContainer: {
    width:'80%',
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
  justifycontent: 'center',
  alignItems: 'center',
  marginTop: '5%',
  marginBottom: '-70%',
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
  bordeColor: '#0782F9',
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
})