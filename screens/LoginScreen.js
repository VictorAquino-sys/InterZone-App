import React, { useState, useEffect } from 'react'
import { getAuth, createUserWithEmailAndPassword,signInWithEmailAndPassword } from "firebase/auth";
import { ImageBackground, StyleSheet, View, Text, KeyboardAvoidingView, TextInput, TouchableOpacity, Keyboard } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';
import image from '../assets/localbrands_1.png';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../screens/firebase';

const LoginScreen = () => {
  const [email, setEmail] = useState('') 
  const [password, setPassword] = useState('') 
  const [show, setShow] = useState(true)
  const navigation = useNavigation()
  // const auth = getAuth();

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

    // const unsubscribeAuthStateChange = auth.onAuthStateChanged(user => {
    //   if (user && !alreadyNavigated) {
    //     alreadyNavigated = true;
    //   // Store user data in AsyncStorage
    //     AsyncStorage.setItem('user', JSON.stringify(user));
    //   //navigation.navigate('HomeScreen' });
    //   }
    // });

    // checkExistingUser();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      // unsubscribeAuthStateChange();
    };
  }, []);

  const handleSignUp = async () => {
    // const auth = getAuth();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      //Store user data in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log("handleSignUp");
      navigation.navigate('NameInputScreen');
    } catch (error) {
      alert(error.message);
      }
  };

  const handleLogin = async () => {
    // const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;

      //Check if the user's name is stored
      const userName = await AsyncStorage.getItem('userName' + user.uid);
      console.log("Checking userName before:", userName);
      if (userName) {
        console.log("Checking userName:", userName);
        navigation.navigate('HomeScreen');
      } else {
        // Navigate to NameInputScreen if no name is found
        console.log("No username found. Asking user to enter a name.");
        console.log("Verifying user.id:", user.uid);
        navigation.navigate('NameInputScreen', { userId: user.uid });
      }

      //Store user data in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log(user.email);
      } catch(error) {
        console.log('errorCode: ', error.code);
        console.log('errorMessage:', error.message);
      }
  };

  return (
    <ImageBackground source={image} resizeMode="cover" style={styles.rootContainer}
    >
        <View style={styles.titleContainer}>
          {show && (<Text style={{fontSize: 60, color: 'yellow', borderColor: 'red',  textAlign: 'center', fontWeight: 'bold'}}>Interzone</Text>)}
        </View>
        <View style={styles.phraseContainer}>
          {show && (<Text style={{fontSize: 25, color: 'white', fontWeight: 'bold',
textAlign: 'center'}}>Estas en todas!</Text>)}
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
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSignUp}
            style={[styles.button, styles.buttonOutline]} 
          >
            <Text style={styles.buttonOutlineText}>Register</Text>
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