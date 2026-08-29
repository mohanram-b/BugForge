import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with specific database ID if configured
export const firestore: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  firebaseSignOut, 
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
};
export type { FirebaseUser };

// User Profile synchronization with Firestore
export interface AppUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  providerId: string;
  role: 'ADMIN' | 'DEVELOPER' | 'TESTER';
  createdAt: string;
  lastLoginAt: string;
  mfaEnabled?: boolean;
}

export async function syncUserProfile(user: FirebaseUser): Promise<AppUserProfile> {
  const userRef = doc(firestore, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const now = new Date().toISOString();

    if (snap.exists()) {
      const data = snap.data() as AppUserProfile;
      const updatedProfile: AppUserProfile = {
        uid: user.uid,
        displayName: user.displayName || data.displayName || user.email?.split('@')[0] || 'Developer',
        email: user.email || data.email || '',
        photoURL: user.photoURL || data.photoURL || '',
        providerId: user.providerData[0]?.providerId || 'google.com',
        role: data.role || 'DEVELOPER',
        createdAt: data.createdAt || now,
        lastLoginAt: now,
        mfaEnabled: data.mfaEnabled ?? false,
      };

      await updateDoc(userRef, {
        displayName: updatedProfile.displayName,
        photoURL: updatedProfile.photoURL,
        lastLoginAt: updatedProfile.lastLoginAt,
      });

      return updatedProfile;
    } else {
      const newProfile: AppUserProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Developer',
        email: user.email || '',
        photoURL: user.photoURL || '',
        providerId: user.providerData[0]?.providerId || 'google.com',
        role: 'DEVELOPER',
        createdAt: now,
        lastLoginAt: now,
        mfaEnabled: false,
      };

      await setDoc(userRef, newProfile);
      return newProfile;
    }
  } catch (err) {
    console.warn('[Firebase Auth] Firestore user sync notice:', err);
    // Fallback profile if offline/permission issue
    return {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Developer',
      email: user.email || '',
      photoURL: user.photoURL || '',
      providerId: user.providerData[0]?.providerId || 'google.com',
      role: 'DEVELOPER',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      mfaEnabled: false,
    };
  }
}
