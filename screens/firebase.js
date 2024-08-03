// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCkckyAm5LZR0isYvjKR-1yG7O0KYC_RDA",
  authDomain: "interzone-c62ed.firebaseapp.com",
  projectId: "interzone-c62ed",
  storageBucket: "interzone-c62ed.appspot.com",
  messagingSenderId: "499613565862",
  appId: "1:499613565862:web:8109d37e00dd3cc57b0567",
  measurementId: "G-NLR3R3XQRR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { auth, db };