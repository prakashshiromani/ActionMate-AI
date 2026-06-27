import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: privateKey ? privateKey.replace(/\\n/g, "\n") : undefined,
};

if (!getApps().length) {
  // If we have local client credentials or server keys, initialize.
  // In development, if credentials aren't fully set up, we check for empty values to prevent crashes.
  if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
    initializeApp({
      credential: cert(firebaseAdminConfig),
    });
  } else {
    // Fallback initialize if running in environment with default credentials
    initializeApp();
  }
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export { adminAuth, adminDb };
