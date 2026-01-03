// src/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual config from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCxEU2Udrw4f1tfMvhk3AYIXnxb0P0-MPg",
    authDomain: "finacial-107a3.firebaseapp.com",
    projectId: "finacial-107a3",
    storageBucket: "finacial-107a3.firebasestorage.app",
    messagingSenderId: "608170235938",
    appId: "1:608170235938:web:113b7ae0f33f961aa9d27b",
    measurementId: "G-BXZXN7W1F9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "vyaya-app"; // You can name this whatever you want