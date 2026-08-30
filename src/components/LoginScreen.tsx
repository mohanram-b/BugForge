import React, { useState } from 'react';
import { 
  Shield, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  syncUserProfile,
  sendAccountPasswordReset,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from '../lib/firebase';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Google Firebase authentication
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
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
        setError('Sign-in was cancelled. Please select your Google account.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Authorized domain configuration required in Firebase console.');
      } else {
        setError(err.message || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Email/Password Sign-in or Registration or Password Reset
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // 1. Password Reset Request Flow
    if (mode === 'forgot') {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        setError('Please enter your account email address');
        return;
      }
      setLoading(true);
      try {
        // Dispatch real password reset via Firebase Authentication
        await sendAccountPasswordReset(cleanEmail);
        setSuccessMessage(`Password recovery link successfully sent to ${cleanEmail}. Please check your inbox (and spam folder) to reset your password.`);
      } catch (err: any) {
        console.error('[Password Reset Request Failed]', err);
        setError(err.message || 'Failed to send password reset email. Please verify the email address.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        let firebaseCreated = false;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          if (userCredential.user) {
            await updateProfile(userCredential.user, {
              displayName: name.trim() || email.split('@')[0],
            });
            const profile = await syncUserProfile(userCredential.user);
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
            firebaseCreated = true;
            onLoginSuccess(mappedUser);
            return;
          }
        } catch (fbErr: any) {
          console.warn('[Firebase Signup Note]', fbErr?.code, fbErr?.message);
          // If already in use, throw clear error
          if (fbErr?.code === 'auth/email-already-in-use') {
            throw new Error('An account with this email already exists. Please sign in.');
          }
          if (fbErr?.code === 'auth/weak-password') {
            throw new Error('Password should be at least 6 characters.');
          }
        }

        if (!firebaseCreated) {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim() || email.split('@')[0],
              email: email.trim(),
              password: password,
              role: 'DEVELOPER',
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || 'Registration failed');
          }

          onLoginSuccess(data.user);
        }
      } else {
        // Sign in
        let firebaseSignedIn = false;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          if (userCredential.user) {
            const profile = await syncUserProfile(userCredential.user);
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
            firebaseSignedIn = true;
            onLoginSuccess(mappedUser);
            return;
          }
        } catch (fbErr: any) {
          console.warn('[Firebase Signin Note]', fbErr?.code);
        }

        if (!firebaseSignedIn) {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              password: password,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            // Auto register demo session if valid
            if (res.status === 401 && (email.includes('@') && password.length >= 4)) {
              const autoRegRes = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: email.split('@')[0],
                  email: email.trim(),
                  password: password,
                  role: 'DEVELOPER',
                }),
              });
              if (autoRegRes.ok) {
                const regData = await autoRegRes.json();
                onLoginSuccess(regData.user);
                return;
              }
            }
            throw new Error(data.message || 'Invalid email or password');
          }

          onLoginSuccess(data.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative min-h-screen w-full bg-[#07080B] text-[#E2E8F0] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden font-sans selection:bg-[#F97316]/30 selection:text-white">
      {/* Top Ambient Glow Gradient */}
      <div 
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[380px] opacity-40 blur-[100px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(234,88,12,0.15) 45%, transparent 70%)'
        }}
      />

      {/* Grid Pattern Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        
        {/* Rich Brand Title Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97316] to-[#C2410C] p-[1px] shadow-lg shadow-orange-500/25">
              <div className="w-full h-full bg-[#0D0F16] rounded-[11px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#F97316]" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-mono">
              BugForge
            </h1>
          </div>
          <p className="text-xs text-[#8B949E] tracking-wide max-w-xs font-medium">
            AI-powered software root cause & debugging workspace
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-[#0D1017]/90 backdrop-blur-xl border border-[#1E2333] hover:border-[#282F45] rounded-2xl p-6 sm:p-8 shadow-2xl transition-all duration-200">
          
          {/* Notifications */}
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider mb-1.5 font-mono">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#222738] focus:border-[#F97316] rounded-lg text-sm text-white placeholder-[#525B70] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider mb-1.5 font-mono">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-[#222738] focus:border-[#F97316] rounded-lg text-sm text-white placeholder-[#525B70] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider font-mono">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-[#8B949E] hover:text-[#F97316] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 pr-10 bg-[#141824] border border-[#222738] focus:border-[#F97316] rounded-lg text-sm text-white placeholder-[#525B70] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6E7681] hover:text-[#C9D1D9] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Orange Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#F97316] hover:bg-[#EA580C] active:bg-[#C2410C] text-black font-bold text-sm rounded-lg transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                </span>
              )}
            </button>
          </form>

          {/* Social Auth Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1E2333]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-[#0D1017] px-3 text-[#6E7681]">or continue with</span>
            </div>
          </div>

          {/* Google SSO Button */}
          <button
            id="continue-with-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#141824] hover:bg-[#1A1F2E] active:bg-[#121622] border border-[#222738] hover:border-[#333B52] text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {googleLoading ? (
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
            <span>Google Account</span>
          </button>
        </div>

        {/* Footer Mode Switcher */}
        <div className="mt-6 text-center text-xs text-[#8B949E]">
          {mode === 'signin' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[#F97316] font-semibold hover:underline cursor-pointer transition-colors"
              >
                Sign up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[#F97316] font-semibold hover:underline cursor-pointer transition-colors"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-[#F97316] font-semibold hover:underline cursor-pointer transition-colors"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
