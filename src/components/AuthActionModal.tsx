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
  Sparkles
} from 'lucide-react';
import { 
  auth, 
  verifyPasswordResetCode, 
  confirmPasswordReset, 
  applyActionCode, 
  getFirebaseAuthErrorMessage,
  sendAccountPasswordReset
} from '../lib/firebase';

interface AuthActionModalProps {
  onComplete?: () => void;
}

export const AuthActionModal: React.FC<AuthActionModalProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [targetEmail, setTargetEmail] = useState<string>('');

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

    if (parsedMode && parsedCode) {
      setMode(parsedMode);
      setOobCode(parsedCode);
      setIsOpen(true);

      if (parsedMode === 'resetPassword') {
        setIsVerifyingCode(true);
        verifyPasswordResetCode(auth, parsedCode)
          .then((email) => {
            setTargetEmail(email);
            setResendEmail(email);
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
    // Clean URL params without reloading page
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('oobCode');
      url.searchParams.delete('apiKey');
      url.searchParams.delete('lang');
      window.history.replaceState({}, document.title, url.pathname);
    }
    setIsOpen(false);
    onComplete?.();
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
                    {mode === 'resetPassword' ? 'Reset Account Password' : 'Email Verification'}
                  </h3>
                  <p className="text-xs text-[#8B949E]">
                    {mode === 'resetPassword' 
                      ? 'Set a new password for your BugForge account'
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

            {/* Body: Password Reset Form */}
            {mode === 'resetPassword' && !success && (
              <>
                {isVerifyingCode ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#F97316]" />
                    <span>Verifying reset link with Firebase Authentication...</span>
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
