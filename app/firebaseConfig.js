import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Firebase configuration
const firebaseConfig = Constants.expoConfig.extra?.firebaseConfig || {};

// Ensure Firebase is initialized only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Fix: Initialize Firebase Auth correctly
// let auth;
// if (getApps().length === 0) {
//   auth = initializeAuth(app, {
//     persistence: getReactNativePersistence(AsyncStorage),
//   });
// } else {
//   auth = getAuth(app);
// }
const auth = getAuth(app);

// Initialize Firestore & Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;