import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, setLogLevel, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth;
let db: Firestore;

const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

if (isConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  if (typeof window !== "undefined") {
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      console.warn("Could not initialize firestore with persistent cache, falling back:", e);
      db = getFirestore(app);
    }
  } else {
    db = getFirestore(app);
  }

  try {
    setLogLevel("silent"); // Suppress firestore connection warnings in offline modes
  } catch (e) {
    console.warn("Could not set firestore log level:", e);
  }
} else {
  // During build pre-rendering, env vars might be empty.
  // Export dummy instances to prevent Firebase initialization crash.
  app = undefined;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db };
