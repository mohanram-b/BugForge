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
  Info
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
  getAppBaseUrl
} from '../lib/firebase';

interface AuthActionModalProps {
  onComplete?: () => void;
}

export const AuthActionModal: React.FC<AuthActionModalProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [continueUrl, setContinueUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [targetEmail, setTargetEmail] = useState<string>('');

  // Provider Detection
  const [isCheckingProvider, setIsCheckingProvider] = useState<boolean>(false);
  const [isGoogleProviderUser, setIsGoogleProviderUser] = useState<boolean>(false);
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

      if (parsedMode === 'resetPassword') {
        setIsVerifyingCode(true);
        verifyPasswordResetCode(auth, parsedCode)
          .then(async (email) => {
            setTargetEmail(email);
            setResendEmail(email);

            // Check if the user is a Google-provider user
            setIsCheckingProvider(true);
            try {
              const providerInfo = await detectEmailAuthProviders(email);
              if (providerInfo.isGoogleUser && !providerInfo.isPasswordUser) {
                setIsGoogleProviderUser(true);
              }
            } catch (pErr) {
              console.warn('[Provider Check Note]', pErr);
            } finally {
              setIsCheckingProvider(false);
            }
          })
          .catch((err) => {
            console.error('[Firebase Action Code Verification Error]', err);
            setError(getFirebaseAuthErrorMessage(err));
          })
          .finally(() => {
            setIsVerifyingCode(false);
          });
      } else if (parsedMode === 'verifyEmail') {
        setIsLoading(true);
        applyActionCode(auth, parsedCode)
          .then(() => {
            setSuccess('Your email address has been successfully verified! You now have full verified access to BugForge.');
          })
          .catch((err) => {
            console.error('[Firebase Email Verification Error]', err);
            setError(getFirebaseAuthErrorMessage(err));
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
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
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccess('Successfully signed in with Google Identity SSO.');
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: any) {
      console.error('[Google SSO in Modal Error]', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
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

    try {
      setIsLoading(true);
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess('Your password has been successfully updated. You can now sign in with your new password.');
    } catch (err: any) {
      console.error('[Firebase Reset Confirmation Error]', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setError(null);
    setResendSuccess(null);

    try {
      setIsResending(true);
      await sendAccountPasswordReset(resendEmail.trim());
      setResendSuccess(`A fresh password reset link has been dispatched to ${resendEmail.trim()}. Please check your inbox.`);
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
                    <span>Verifying authentication provider details...</span>
                  </div>
                ) : isGoogleProviderUser ? (
                  /* GOOGLE SSO USER DETECTED: Prevent showing password-reset form */
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
                        <span>Google Identity Account</span>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed">
                        The account <span className="font-mono text-white font-medium">{targetEmail}</span> is authenticated exclusively via <strong>Google Identity SSO</strong>.
                      </p>
                      
                      <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-[#07080B]/50 p-2.5 rounded-lg border border-sky-900/30">
                        <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>Google SSO accounts do not maintain a separate password on BugForge. Security and passwords are managed through your Google Account.</span>
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
                  /* If token is invalid or expired, allow requesting a new one */
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
                {isLoading ? (
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
