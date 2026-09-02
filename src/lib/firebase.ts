import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json' with { type: 'json' };

const firebaseConfig = {
  projectId: firebaseConfigData.projectId,
  appId: firebaseConfigData.appId,
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
};

let app: FirebaseApp;
let firestoreDb: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Initialize Firestore with custom databaseId if specified in config
  if (firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== '(default)') {
    firestoreDb = getFirestore(app, firebaseConfigData.firestoreDatabaseId);
  } else {
    firestoreDb = getFirestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization error, fallback to default:', error);
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  firestoreDb = getFirestore(app);
}

export { app, firestoreDb, firebaseConfigData };
