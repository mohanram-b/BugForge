import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  ActionCodeSettings,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  collection, 
  where,
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  Firestore 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { maskEmail, maskUrl, authLogger } from '../utils/authDiagnostics';

// Safely resolve configuration preferring environment variables for secure GitHub publishing
const env = (import.meta as any).env || {};
const resolvedFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  firestoreDatabaseId: env.VITE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with specific database ID if configured
const targetDbId = resolvedFirebaseConfig.firestoreDatabaseId;
export const firestore: Firestore = targetDbId && targetDbId !== '(default)'
  ? getFirestore(app, targetDbId)
  : getFirestore(app);

export { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  where,
  onSnapshot,
  query,
  orderBy,
  limit
};
export type { FirebaseUser, ActionCodeSettings };

/**
 * Resolve the dynamic application base URL, supporting APP_BASE_URL environment variable,
 * window.location.origin, and production Firebase domains rather than hardcoded localhost paths.
 */
export function getAppBaseUrl(): string {
  // 1. Check environment variable overrides (VITE_APP_BASE_URL or APP_BASE_URL)
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const envBaseUrl = (
    metaEnv?.VITE_APP_BASE_URL ||
    metaEnv?.APP_BASE_URL ||
    (typeof process !== 'undefined' && process.env ? process.env.APP_BASE_URL : undefined)
  ) as string | undefined;

  if (envBaseUrl && typeof envBaseUrl === 'string' && envBaseUrl.trim()) {
    return envBaseUrl.trim().replace(/\/+$/, '');
  }

  // 2. Use current browser origin if available
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
    return window.location.origin.replace(/\/+$/, '');
  }

  // 3. Fallback to production Firebase hosting domain
  return 'https://bugforge-17b81.firebaseapp.com';
}

/**
 * Construct compliant Firebase Auth Action Code Settings ensuring continueUrl points to base production domain
 * with deep-linking support via standard route parameters.
 */
export function getActionCodeSettings(continuePath = '/'): ActionCodeSettings {
  const baseUrl = getAppBaseUrl();
  const cleanPath = continuePath.startsWith('/') ? continuePath : `/${continuePath}`;
  const targetUrl = `${baseUrl}${cleanPath}`;
  return {
    url: targetUrl,
    handleCodeInApp: true,
  };
}

// Human-friendly Firebase Auth error mapper
export function getFirebaseAuthErrorMessage(err: any): string {
  if (!err) return 'An unknown authentication error occurred.';
  const code = err.code || '';
  
  switch (code) {
    case 'auth/user-not-found':
      return 'No account was found with this email address. Please check the spelling or create an account.';
    case 'auth/wrong-password':
      return 'The password entered is incorrect. Please check and try again.';
    case 'auth/invalid-credential':
      return 'Invalid credentials provided. Please verify your email and password.';
    case 'auth/invalid-email':
      return 'Please provide a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account is already registered with this email. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters in length.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed attempts. Please try again in a few minutes or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connectivity issue. Please check your internet connection and try again.';
    case 'auth/unauthorized-domain':
      return 'Domain not authorized for Firebase Auth. Please ensure authorized domains are configured in your Firebase Console.';
    case 'auth/expired-action-code':
      return 'This verification or password reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This verification link is invalid or has already been used.';
    case 'auth/user-disabled':
      return 'This user account has been disabled by an administrator.';
    case 'auth/requires-recent-login':
      return 'For your security, updating this requires recent authentication. Please sign out and sign in again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in or password reset is not currently enabled in Firebase Authentication settings.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by browser. Please allow popups for this site.';
    case 'auth/cancelled-popup-request':
      return 'Authentication request was cancelled.';
    default:
      return err.message || 'An error occurred during authentication. Please try again.';
  }
}

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

export async function updateUserProfileData(
  uid: string, 
  updates: { displayName?: string; photoURL?: string }
): Promise<void> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    await updateProfile(currentUser, {
      ...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}),
      ...(updates.photoURL !== undefined ? { photoURL: updates.photoURL } : {})
    });
  }

  try {
    const userRef = doc(firestore, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Firebase] Firestore profile sync note:', err);
  }
}

export interface UserAuthProviderInfo {
  isGoogleUser: boolean;
  isPasswordUser: boolean;
  providers: string[];
}

/**
 * Inspect providerId list on a Firebase User object to check for Google provider
 */
export function isFirebaseUserGoogle(user?: FirebaseUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.providerData?.some(p => p.providerId === 'google.com') ||
    user.providerId === 'google.com'
  );
}

/**
 * Inspect providerId list on a Firebase User object to check for password provider
 */
export function isFirebaseUserPassword(user?: FirebaseUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.providerData?.some(p => p.providerId === 'password') ||
    user.providerId === 'password'
  );
}

/**
 * Get all providerIds from a Firebase User object
 */
export function getFirebaseUserProviders(user?: FirebaseUser | null): string[] {
  if (!user) return [];
  const providers = user.providerData?.map(p => p.providerId) || [];
  if (user.providerId && !providers.includes(user.providerId)) {
    providers.push(user.providerId);
  }
  return providers;
}

/**
 * Detect whether an account email is associated with Google Identity SSO vs standard password credentials
 */
export async function detectEmailAuthProviders(email: string): Promise<UserAuthProviderInfo> {
  const cleanEmail = email.trim().toLowerCase();
  const result: UserAuthProviderInfo = {
    isGoogleUser: false,
    isPasswordUser: false,
    providers: []
  };

  // 1. Check active session if email matches by inspecting providerData and providerId
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
    result.isGoogleUser = isFirebaseUserGoogle(auth.currentUser);
    result.isPasswordUser = isFirebaseUserPassword(auth.currentUser);
    result.providers = getFirebaseUserProviders(auth.currentUser);
  }

  // 2. Query Firebase Auth sign-in methods for email
  try {
    const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
    if (methods && methods.length > 0) {
      result.providers = Array.from(new Set([...result.providers, ...methods]));
      if (methods.includes('google.com')) result.isGoogleUser = true;
      if (methods.includes('password')) result.isPasswordUser = true;
    }
  } catch (err) {
    console.warn('[Firebase] fetchSignInMethodsForEmail notice:', err);
  }

  // 3. Query Firestore users collection for additional verification
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userData = snap.docs[0].data() as AppUserProfile;
      if (userData.providerId === 'google.com' || (userData as any).googleSubjectId) {
        result.isGoogleUser = true;
        if (!result.providers.includes('google.com')) result.providers.push('google.com');
      }
      if (userData.providerId === 'password') {
        result.isPasswordUser = true;
        if (!result.providers.includes('password')) result.providers.push('password');
      }
    }
  } catch (err) {
    console.warn('[Firebase] Firestore provider lookup note:', err);
  }

  return result;
}

/**
 * Dispatch an official Password Reset Email via Firebase Authentication
 * Awaits the actual provider response before resolving.
 */
export async function sendAccountPasswordReset(email: string, continuePath = '/'): Promise<{ success: boolean; email: string }> {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    throw new Error('Please specify a valid email address.');
  }

  // Explicit check for active user session if authenticated with Google
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail.toLowerCase()) {
    if (isFirebaseUserGoogle(auth.currentUser) && !isFirebaseUserPassword(auth.currentUser)) {
      throw new Error('This account is authenticated via Google Identity Provider (google.com). Passwords cannot be reset because security credentials are managed through your Google Account.');
    }
  }

  const actionCodeSettings = getActionCodeSettings(continuePath);
  const startTime = Date.now();
  authLogger.initiated('Password Reset Email Dispatch', {
    targetEmail: cleanEmail,
    continueUrl: actionCodeSettings.url,
  });

  try {
    // Attempt with ActionCodeSettings for smooth in-app redirection to production URL
    await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
    const duration = Date.now() - startTime;
    console.info(`[Firebase Auth] Password reset email successfully accepted for: ${cleanEmail} (continueUrl: ${actionCodeSettings.url})`);
    authLogger.success('Password Reset Email Dispatch', {
      targetEmail: cleanEmail,
      durationMs: duration,
    });
    return { success: true, email: cleanEmail };
  } catch (firstErr: any) {
    // If domain or action code settings failed, attempt standard fallback
    if (firstErr?.code === 'auth/unauthorized-continue-uri' || firstErr?.code === 'auth/invalid-continue-uri') {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        const duration = Date.now() - startTime;
        console.info(`[Firebase Auth] Password reset email (standard) accepted for: ${cleanEmail}`);
        authLogger.success('Password Reset Email Dispatch (Standard Fallback)', {
          targetEmail: cleanEmail,
          durationMs: duration,
        });
        return { success: true, email: cleanEmail };
      } catch (fallbackErr: any) {
        const duration = Date.now() - startTime;
        console.error('[Firebase Auth Error] Password reset failed:', fallbackErr?.code, fallbackErr?.message);
        authLogger.error('Password Reset Email Dispatch (Standard Fallback)', fallbackErr, {
          targetEmail: cleanEmail,
          durationMs: duration,
        });
        throw new Error(getFirebaseAuthErrorMessage(fallbackErr));
      }
    }
    const duration = Date.now() - startTime;
    console.error('[Firebase Auth Error] Password reset failed:', firstErr?.code, firstErr?.message);
    authLogger.error('Password Reset Email Dispatch', firstErr, {
      targetEmail: cleanEmail,
      durationMs: duration,
    });
    throw new Error(getFirebaseAuthErrorMessage(firstErr));
  }
}

/**
 * Dispatch an official Email Verification message to the currently logged in user
 */
export async function sendUserEmailVerification(continuePath = '/'): Promise<{ success: boolean; email: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('No authenticated user session found to verify.');
  }

  // Explicit check: Google provider accounts are pre-verified by Google SSO
  if (isFirebaseUserGoogle(currentUser)) {
    console.info('[Firebase Auth] User is authenticated via Google provider; email is automatically verified.');
    authLogger.success('Email Verification (Google SSO Pre-verified)', {
      targetEmail: currentUser.email,
      durationMs: 0,
    });
    return { success: true, email: currentUser.email };
  }

  const actionCodeSettings = getActionCodeSettings(continuePath);
  const startTime = Date.now();
  authLogger.initiated('Email Verification Dispatch', {
    targetEmail: currentUser.email,
    continueUrl: actionCodeSettings.url,
  });

  try {
    await sendEmailVerification(currentUser, actionCodeSettings);
    const duration = Date.now() - startTime;
    console.info(`[Firebase Auth] Email verification message accepted for: ${currentUser.email} (continueUrl: ${actionCodeSettings.url})`);
    authLogger.success('Email Verification Dispatch', {
      targetEmail: currentUser.email,
      durationMs: duration,
    });
    return { success: true, email: currentUser.email };
  } catch (firstErr: any) {
    if (firstErr?.code === 'auth/unauthorized-continue-uri' || firstErr?.code === 'auth/invalid-continue-uri') {
      try {
        await sendEmailVerification(currentUser);
        const duration = Date.now() - startTime;
        console.info(`[Firebase Auth] Email verification (standard) accepted for: ${currentUser.email}`);
        authLogger.success('Email Verification Dispatch (Standard Fallback)', {
          targetEmail: currentUser.email,
          durationMs: duration,
        });
        return { success: true, email: currentUser.email };
      } catch (fallbackErr: any) {
        const duration = Date.now() - startTime;
        console.error('[Firebase Auth Error] Email verification failed:', fallbackErr?.code, fallbackErr?.message);
        authLogger.error('Email Verification Dispatch (Standard Fallback)', fallbackErr, {
          targetEmail: currentUser.email,
          durationMs: duration,
        });
        throw new Error(getFirebaseAuthErrorMessage(fallbackErr));
      }
    }
    const duration = Date.now() - startTime;
    console.error('[Firebase Auth Error] Email verification failed:', firstErr?.code, firstErr?.message);
    authLogger.error('Email Verification Dispatch', firstErr, {
      targetEmail: currentUser.email,
      durationMs: duration,
    });
    throw new Error(getFirebaseAuthErrorMessage(firstErr));
  }
}

/**
 * Verify current password before modifying sensitive account settings
 */
export async function verifyCurrentPassword(currentPassword: string): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return true;
  }
  if (!currentUser.email) {
    return true;
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    return true;
  } catch (err: any) {
    if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
      throw new Error('Current password is incorrect. Please verify and try again.');
    }
    if (err?.code === 'auth/user-mismatch') {
      throw new Error('Provided credential does not match the active session.');
    }
    if (err?.code === 'auth/provider-already-linked' || err?.code === 'auth/operation-not-allowed') {
      throw err;
    }
    throw new Error(getFirebaseAuthErrorMessage(err));
  }
}

/**
 * Update the password of the active account in Firebase Authentication
 */
export async function updateAccountPassword(newPassword: string, currentPassword?: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user session found.');
  }

  if (currentPassword && currentUser.email) {
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
    } catch (reauthErr: any) {
      console.warn('Reauth note before password update:', reauthErr?.code);
    }
  }

  try {
    await updatePassword(currentUser, newPassword);
  } catch (err: any) {
    console.error('[Firebase Auth] Password update failed:', err?.code, err?.message);
    throw new Error(getFirebaseAuthErrorMessage(err));
  }
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

