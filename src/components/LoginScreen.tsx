import React, { useState } from 'react';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, syncUserProfile } from '../lib/firebase';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        // If popup is blocked in iframe/mobile, fallback to redirect or handle error
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }

      if (result?.user) {
        const profile = await syncUserProfile(result.user);
        const mappedUser: User = {
          id: profile.uid,
          name: profile.displayName,
          email: profile.email,
          avatarUrl: profile.photoURL,
          role: profile.role,
          createdAt: profile.createdAt,
          lastLoginAt: profile.lastLoginAt,
          mfaEnabled: profile.mfaEnabled,
        };
        onLoginSuccess(mappedUser);
      }
    } catch (err: any) {
      console.error('[Firebase Google Login Error]', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please select your Google account.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Authorized domain required in Firebase Console for this domain.');
      } else {
        setError(err.message || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#E2E8F0] flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="relative w-full max-w-sm flex flex-col items-center text-center">
        {/* Brand Mark */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded border border-[#2D3348] bg-[#121520] flex items-center justify-center text-[#F97316]">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">BUGFORGE</span>
        </div>

        {/* Workspace Tagline */}
        <p className="text-xs text-[#8B949E] tracking-wide mb-8">
          AI-powered software investigation workspace
        </p>

        {/* Card Container */}
        <div className="w-full bg-[#0D1017] border border-[#1E2333] rounded-lg p-6 flex flex-col items-center shadow-xl">
          {error && (
            <div className="w-full mb-4 p-3 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            id="continue-with-google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#161B26] hover:bg-[#1C2230] active:bg-[#121620] border border-[#2B3245] hover:border-[#3D4760] text-sm font-medium text-white rounded transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#F97316]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
