import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  X, 
  ArrowRight,
  ExternalLink,
  Info,
  ShieldAlert
} from 'lucide-react';
import { 
  auth, 
  googleProvider,
  signInWithPopup,
  verifyPasswordResetCode, 
  confirmPasswordReset, 
  applyActionCode, 
  getFirebaseAuthErrorMessage,
  sendAccountPasswordReset,
  detectEmailAuthProviders,
  getAppBaseUrl,
  isFirebaseUserGoogle,
  isFirebaseUserPassword,
  getFirebaseUserProviders
} from '../lib/firebase';
import { authLogger, maskEmail, maskUrl } from '../utils/authDiagnostics';

interface AuthActionModalProps {
  onComplete?: () => void;
}

export const AuthActionModal: React.FC<AuthActionModalProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [continueUrl, setContinueUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [targetEmail, setTargetEmail] = useState<string>('');

  // Provider Detection & Verification
  const [isCheckingProvider, setIsCheckingProvider] = useState<boolean>(false);
  const [isGoogleProviderUser, setIsGoogleProviderUser] = useState<boolean>(false);
  const [isPasswordProviderUser, setIsPasswordProviderUser] = useState<boolean>(false);
  const [detectedProviders, setDetectedProviders] = useState<string[]>([]);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState<boolean>(false);

  // Form & Execution State
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Resend link state
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const parsedMode = urlParams.get('mode');
    const parsedCode = urlParams.get('oobCode');
    const parsedContinueUrl = urlParams.get('continueUrl');

    if (parsedMode && parsedCode) {
      setMode(parsedMode);
      setOobCode(parsedCode);
      setContinueUrl(parsedContinueUrl);
      setIsOpen(true);

      // Check active Firebase user's providerId via providerData explicitly
      const activeUser = auth.currentUser;
      const checkUserIsGoogle = (user: typeof activeUser) => {
        if (!user) return false;
        // Explicit inspection of user.providerData array for google.com provider
        const hasGoogleInProviderData = Boolean(
          user.providerData && 
          Array.isArray(user.providerData) && 
          user.providerData.some((p) => p && p.providerId === 'google.com')
        );
        const isDirectGoogle = user.providerId === 'google.com';
        return Boolean(hasGoogleInProviderData || isDirectGoogle || isFirebaseUserGoogle(user));
      };

      // Diagnostic logging of current auth state and providerId
      const activeProviders = activeUser ? getFirebaseUserProviders(activeUser) : [];
      const activeGoogle = activeUser ? checkUserIsGoogle(activeUser) : false;
      const activePassword = activeUser ? isFirebaseUserPassword(activeUser) : false;

      authLogger.initiated(`AuthActionModal [${parsedMode}] Initialized`, {
        targetEmail: activeUser?.email || undefined,
        continueUrl: parsedContinueUrl || undefined,
      });

      console.info(
        `[Auth Diagnostic : ActionModal] Auth State: ${activeUser ? 'authenticated' : 'unauthenticated'} | ` +
        `UID: ${activeUser?.uid || 'none'} | providerId: ${activeUser?.providerId || 'none'} | ` +
        `providerData: [${activeProviders.join(', ')}] | isGoogleProvider: ${activeGoogle} | mode: ${parsedMode}`
      );

      if (activeUser) {
        setDetectedProviders(activeProviders);
        setIsGoogleProviderUser(activeGoogle);
        setIsPasswordProviderUser(activePassword);
      }

      // Real-time listener for auth state to inspect providerId and providerData on the Firebase user object
      const unsubscribe = auth.onAuthStateChanged((user) => {
        const userProviders = user ? getFirebaseUserProviders(user) : [];
        const isGoogle = checkUserIsGoogle(user);
        const isPassword = user ? isFirebaseUserPassword(user) : false;
        
        console.info(
          `[Auth Diagnostic : Auth State Changed] Auth State: ${user ? 'authenticated' : 'unauthenticated'} | ` +
          `providerId: ${user?.providerId || 'none'} | providerData: [${userProviders.join(', ')}] | ` +
          `isGoogle: ${isGoogle} | emailVerified: ${user?.emailVerified || false}`
        );

        setDetectedProviders(userProviders);
        if (isGoogle) {
          setIsGoogleProviderUser(true);
          setIsPasswordProviderUser(false);
        } else if (isPassword) {
          setIsPasswordProviderUser(true);
          setIsGoogleProviderUser(false);
        }
      });

      if (parsedMode === 'resetPassword') {
        setIsVerifyingCode(true);
        const startTime = Date.now();
        authLogger.initiated('Verify Password Reset Action Code', {
          continueUrl: parsedContinueUrl || undefined,
        });

        verifyPasswordResetCode(auth, parsedCode)
          .then(async (email) => {
            const duration = Date.now() - startTime;
            authLogger.success('Verify Password Reset Action Code', {
              targetEmail: email,
              durationMs: duration,
            });
            setTargetEmail(email);
            setResendEmail(email);

            // Detailed inspection of authentication provider for target account
            setIsCheckingProvider(true);
            try {
              const providerInfo = await detectEmailAuthProviders(email);
              setDetectedProviders(providerInfo.providers);
              
              console.info(
                `[Auth Diagnostic : Reset Account Provider Check] Target: ${maskEmail(email)} | ` +
                `Providers: [${providerInfo.providers.join(', ')}] | isGoogle: ${providerInfo.isGoogleUser}`
              );

              if (providerInfo.isGoogleUser && !providerInfo.isPasswordUser) {
                // Explicitly identify Google SSO user without password credentials
                setIsGoogleProviderUser(true);
                setIsPasswordProviderUser(false);
              } else if (providerInfo.isPasswordUser) {
                setIsPasswordProviderUser(true);
                setIsGoogleProviderUser(false);
              }
            } catch (pErr) {
              console.warn('[Provider Check Note]', pErr);
            } finally {
              setIsCheckingProvider(false);
            }
          })
          .catch((err) => {
            const duration = Date.now() - startTime;
            authLogger.error('Verify Password Reset Action Code', err, {
              durationMs: duration,
            });
            console.error('[Firebase Action Code Verification Error]', err);
            setError(getFirebaseAuthErrorMessage(err));
          })
          .finally(() => {
            setIsVerifyingCode(false);
          });
      } else if (parsedMode === 'verifyEmail') {
        // If current user is authenticated with Google provider, email is already verified
        if (activeUser && checkUserIsGoogle(activeUser)) {
          console.info('[Auth Diagnostic : VerifyEmail] Active user has google.com provider in providerData; skipping manual verification code.');
          setSuccess('Your account email is verified by Google Identity SSO (providerId: google.com). Manual email verification triggers are disabled for OAuth accounts.');
          setIsGoogleProviderUser(true);
          return;
        }

        setIsLoading(true);
        const startTime = Date.now();
        authLogger.initiated('Apply Email Verification Action Code');

        applyActionCode(auth, parsedCode)
          .then(() => {
            const duration = Date.now() - startTime;
            authLogger.success('Apply Email Verification Action Code', {
              durationMs: duration,
            });
            setSuccess('Your email address has been successfully verified! You now have full verified access to BugForge.');
          })
          .catch((err) => {
            const duration = Date.now() - startTime;
            authLogger.error('Apply Email Verification Action Code', err, {
              durationMs: duration,
            });
            console.error('[Firebase Email Verification Error]', err);
            setError(getFirebaseAuthErrorMessage(err));
          })
          .finally(() => {
            setIsLoading(false);
          });
      }

      return () => {
        unsubscribe();
      };
    }
  }, []);

  const handleClose = () => {
    // If a valid continueUrl is supplied within the same origin or path, redirect appropriately
    const baseUrl = getAppBaseUrl();
    if (continueUrl && typeof window !== 'undefined') {
      try {
        const resolved = new URL(continueUrl, baseUrl);
        if (resolved.origin === window.location.origin) {
          window.location.href = resolved.href;
          return;
        }
      } catch {
        // Safe fallback
      }
    }

    // Clean URL params without reloading page
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('oobCode');
      url.searchParams.delete('continueUrl');
      url.searchParams.delete('apiKey');
      url.searchParams.delete('lang');
      window.history.replaceState({}, document.title, url.pathname);
    }
    setIsOpen(false);
    onComplete?.();
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningInWithGoogle(true);
    const startTime = Date.now();
    authLogger.initiated('Google SSO in ActionModal');

    try {
      await signInWithPopup(auth, googleProvider);
      const duration = Date.now() - startTime;
      authLogger.success('Google SSO in ActionModal', { durationMs: duration });
      setSuccess('Successfully signed in with Google Identity SSO.');
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      authLogger.error('Google SSO in ActionModal', err, { durationMs: duration });
      console.error('[Google SSO in Modal Error]', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    // Explicit check: Prevent resetting password for Google SSO users
    if (isGoogleProviderUser) {
      setError('Password reset is disabled for accounts authenticated via Google Identity Provider (google.com). Please sign in using Google.');
      return;
    }

    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    const startTime = Date.now();
    authLogger.initiated('Confirm Password Reset', {
      targetEmail: targetEmail || undefined,
    });

    try {
      setIsLoading(true);
      await confirmPasswordReset(auth, oobCode, newPassword);
      const duration = Date.now() - startTime;
      authLogger.success('Confirm Password Reset', {
        targetEmail: targetEmail || undefined,
        durationMs: duration,
      });
      setSuccess('Your password has been successfully updated. You can now sign in with your new password.');
    } catch (err: any) {
      const duration = Date.now() - startTime;
      authLogger.error('Confirm Password Reset', err, {
        targetEmail: targetEmail || undefined,
        durationMs: duration,
      });
      console.error('[Firebase Reset Confirmation Error]', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resendEmail.trim();
    if (!cleanEmail) return;

    setError(null);
    setResendSuccess(null);

    // Explicit check: Check if resend email is a Google SSO user
    try {
      setIsResending(true);
      const providerCheck = await detectEmailAuthProviders(cleanEmail);
      if (providerCheck.isGoogleUser && !providerCheck.isPasswordUser) {
        setError(`The account ${cleanEmail} is authenticated exclusively via Google SSO (providerId: google.com). Password reset links cannot be dispatched.`);
        return;
      }

      await sendAccountPasswordReset(cleanEmail);
      setResendSuccess(`A fresh password reset link has been dispatched to ${cleanEmail}. Please check your inbox.`);
    } catch (err: any) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="auth-action-modal-overlay"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans"
      >
        <motion.div
          id="auth-action-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#0D1017] border border-[#1E2333] rounded-2xl shadow-2xl overflow-hidden text-slate-200"
        >
          {/* Header Bar with Gradient Accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#F97316] via-amber-500 to-emerald-500" />
          
          <div className="p-6 space-y-5">
            {/* Modal Title & Close */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#F97316]/10 border border-[#F97316]/30 text-[#F97316]">
                  {mode === 'resetPassword' ? (
                    <KeyRound className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {mode === 'resetPassword' ? 'Account Security & Password' : 'Email Verification'}
                  </h3>
                  <p className="text-xs text-[#8B949E]">
                    {mode === 'resetPassword' 
                      ? 'Secure credentials management'
                      : 'Authenticating your email address'}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-auth-action-modal"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Inspection Badge */}
            {detectedProviders.length > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#121622] border border-[#1E2333] text-[11px]">
                <span className="text-slate-400">Auth Provider:</span>
                <span className="font-mono font-medium text-slate-200 flex items-center gap-1.5">
                  {isGoogleProviderUser ? (
                    <span className="text-sky-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      Google Identity SSO (google.com)
                    </span>
                  ) : isPasswordProviderUser ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Password Credentials (password)
                    </span>
                  ) : (
                    <span>{detectedProviders.join(', ')}</span>
                  )}
                </span>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Success Notification */}
            {success && (
              <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-3">
                  <p className="font-medium leading-relaxed">{success}</p>
                  <button
                    id="btn-auth-action-success-proceed"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <span>Proceed to BugForge</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Body: Password Reset Flow */}
            {mode === 'resetPassword' && !success && (
              <>
                {isVerifyingCode || isCheckingProvider ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#F97316]" />
                    <span>Inspecting Firebase authentication providerId...</span>
                  </div>
                ) : isGoogleProviderUser ? (
                  /* GOOGLE SSO USER DETECTED: Specifically hide the Password Reset section & form */
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/50 space-y-3">
                      <div className="flex items-center gap-2.5 text-sky-400 font-semibold text-xs">
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
                        <span>Google Identity Provider (providerId: google.com)</span>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed">
                        The account <span className="font-mono text-white font-medium">{targetEmail || 'Google User'}</span> is authenticated exclusively via <strong>Google Identity SSO</strong>.
                      </p>
                      
                      <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-[#07080B]/50 p-2.5 rounded-lg border border-sky-900/30">
                        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>Google SSO accounts do not store raw website passwords in Firebase. Password reset forms are disabled for this account type.</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isSigningInWithGoogle}
                        className="w-full py-2.5 rounded-lg bg-white hover:bg-slate-100 text-black font-semibold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
                      >
                        {isSigningInWithGoogle ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
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
                        <span>Sign In with Google</span>
                      </button>

                      <div className="flex items-center justify-between pt-2 text-[11px]">
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-sky-400 flex items-center gap-1 transition-colors"
                        >
                          <span>Google Account Security</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          type="button"
                          onClick={handleClose}
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Return to App
                        </button>
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  /* If token is invalid or expired, allow requesting a new one (only for password accounts) */
                  <form onSubmit={handleResendResetLink} className="space-y-3 pt-1">
                    <p className="text-xs text-slate-400">
                      You can request a new password reset link below:
                    </p>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="Enter your account email"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] text-xs font-mono"
                      />
                    </div>
                    {resendSuccess && (
                      <p className="text-xs text-emerald-400 font-medium">
                        {resendSuccess}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={isResending || !resendEmail.trim()}
                      className="w-full py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                    >
                      {isResending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      <span>{isResending ? 'Sending Link...' : 'Send Fresh Reset Link'}</span>
                    </button>
                  </form>
                ) : (
                  /* Standard Password-based user form */
                  <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                    {targetEmail && (
                      <div className="p-3 rounded-lg bg-[#161B26] border border-[#1E2333] text-xs flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Account:</span>
                        <span className="font-mono text-white font-medium">{targetEmail}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#F97316]" />
                        <span>New Password</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className={`w-full px-3.5 py-2.5 rounded-lg bg-[#161B26] border text-white focus:outline-none text-xs font-mono ${
                          confirmPassword && newPassword !== confirmPassword
                            ? 'border-rose-500 focus:border-rose-500'
                            : 'border-[#1E2333] focus:border-[#F97316]'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !newPassword || newPassword !== confirmPassword}
                      className="w-full py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity shadow-md"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      <span>{isLoading ? 'Saving Password...' : 'Save New Password'}</span>
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Body: Email Verification View */}
            {mode === 'verifyEmail' && !success && (
              <div className="py-4 space-y-3">
                {isGoogleProviderUser ? (
                  /* GOOGLE SSO USER DETECTED: Specifically hide the Email Verification section & trigger */
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/50 space-y-3">
                      <div className="flex items-center gap-2.5 text-sky-400 font-semibold text-xs">
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
                        <span>Google Identity Provider (providerId: google.com)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        This account is authenticated through <strong>Google Identity SSO</strong> (<code>providerId: google.com</code>).
                      </p>
                      <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-[#07080B]/50 p-2.5 rounded-lg border border-sky-900/30">
                        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>Google SSO accounts are pre-verified by Google. Manual email verification sections and dispatch triggers are disabled for OAuth accounts.</span>
                      </div>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Verifying email address with Firebase...</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
