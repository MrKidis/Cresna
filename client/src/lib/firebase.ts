import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);
export const firebaseApp = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(config)
  : null;
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export function subscribeToFirebaseToken(listener: (user: User | null) => void) {
  if (!firebaseAuth) return () => undefined;
  return onIdTokenChanged(firebaseAuth, listener);
}

export function signInWithGoogle() {
  if (!firebaseAuth) throw new Error("Firebase Authentication is not configured");
  return signInWithPopup(firebaseAuth, new GoogleAuthProvider());
}

export function signInWithEmail(email: string, password: string) {
  if (!firebaseAuth) throw new Error("Firebase Authentication is not configured");
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export function createFirebaseAccount(email: string, password: string) {
  if (!firebaseAuth) throw new Error("Firebase Authentication is not configured");
  return createUserWithEmailAndPassword(firebaseAuth, email, password);
}

export function signOutFirebase() {
  return firebaseAuth ? signOut(firebaseAuth) : Promise.resolve();
}
