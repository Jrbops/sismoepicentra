// Firebase client init
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBffbhf7h1H-ONrzUAWjN0PxM8HykX9erk',
  authDomain: 'epicentraio.firebaseapp.com',
  projectId: 'epicentraio',
  storageBucket: 'epicentraio.firebasestorage.app',
  messagingSenderId: '991202392911',
  appId: '1:991202392911:web:f1cdcd39445d0e9cea233a',
  measurementId: 'G-M87MSC4QWD',
};

export default defineNuxtPlugin(() => {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  try {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((e) => console.warn('[firebase] anon sign-in failed', e));
      }
    });
  } catch (e) {
    console.warn('[firebase] auth init failed', e);
  }
  return {
    provide: { firebaseApp: app, db, auth },
  };
});
