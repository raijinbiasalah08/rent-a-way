import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from Vite environment variables with fallback defaults
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCTikiJ7XX0bvGOOb_TWeIsTLlyVVhZ8Go",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "raijixn-1857e.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "raijixn-1857e",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "raijixn-1857e.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "805240015526",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:805240015526:web:4cc86629e8e62f68f54267",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YM67PTK2Q9"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication, Firestore, and Google Provider
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to prompt account selection every time
googleProvider.setCustomParameters({
    prompt: 'select_account',
});

export { signInWithPopup, signOut };
export default app;
