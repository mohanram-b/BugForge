import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Bell, 
  Check, 
  Save, 
  User as UserIcon,
  Camera,
  Upload,
  RefreshCw,
  KeyRound,
  Mail,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Laptop,
  Smartphone,
  X,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Pencil,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { User } from '../types';
import { 
  auth,
  updateUserProfileData, 
  sendAccountPasswordReset, 
  sendUserEmailVerification,
  updateAccountPassword,
  verifyCurrentPassword
} from '../lib/firebase';
import { ProfileAvatarModal } from './ProfileAvatarModal';
import { 
  AuthActionState, 
  createInitialAuthActionState, 
  executeAwaitedAuthAction, 
  maskEmail 
} from '../utils/authDiagnostics';

interface SettingsViewProps {
  currentUser: User;
  onUpdateCurrentUser?: (user: User) => void;
}

type SettingsTab = 'profile' | 'security' | 'notifications';

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile & Customization' },
  { id: 'security', label: 'Security & Gmail Password' },
  { id: 'notifications', label: 'Notifications & Alerts' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUpdateCurrentUser,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Username & Profile State
  const [username, setUsername] = useState<string>(currentUser.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser.avatarUrl || '');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password & Security State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState<boolean>(false);
  const [isVerifyingCurrentPassword, setIsVerifyingCurrentPassword] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);

  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState<boolean>(false);
  const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Standardized AuthActionState for email actions
  const [resetEmailState, setResetEmailState] = useState<AuthActionState<{ success: boolean; email: string }>>(
    createInitialAuthActionState()
  );
  const [verificationEmailState, setVerificationEmailState] = useState<AuthActionState<{ success: boolean; email: string }>>(
    createInitialAuthActionState()
  );

  // Authentication provider detection
  const isGoogleUser = Boolean(
    currentUser.googleSubjectId || 
    auth.currentUser?.providerData.some(p => p.providerId === 'google.com')
  );
  const isEmailVerified = Boolean(auth.currentUser?.emailVerified || isGoogleUser);

  // Global Floating Bottom Toast State
  const [bottomToast, setBottomToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: string;
  } | null>(null);

  const triggerBottomToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBottomToast({ type, title, message, timestamp: timeStr });
    setTimeout(() => {
      setBottomToast((curr) => (curr?.title === title ? null : curr));
    }, 4500);
  };

  // Notification Preferences State
  const [notifyCritical, setNotifyCritical] = useState<boolean>(true);
  const [notifyRootCause, setNotifyRootCause] = useState<boolean>(true);
  const [notifyVerification, setNotifyVerification] = useState<boolean>(true);

  // Handle Profile Update (Username & Avatar)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = username.trim();
    if (!trimmedName) {
      setProfileError('Username cannot be empty.');
      triggerBottomToast('error', 'Update Failed', 'Username cannot be empty.');
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateUserProfileData(currentUser.id, {
        displayName: trimmedName,
        photoURL: avatarUrl,
      });

      const updatedUser: User = {
        ...currentUser,
        name: trimmedName,
        avatarUrl: avatarUrl,
      };

      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updatedUser);
      }
      localStorage.setItem('bugforge_current_user', JSON.stringify(updatedUser));

      const successMsg = 'Profile picture and username updated successfully!';
      setProfileSuccess(successMsg);
      triggerBottomToast('success', 'Profile Updated', `Changes saved for ${trimmedName}`);
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      const errMsg = err?.message || 'Failed to update profile. Please try again.';
      setProfileError(errMsg);
      triggerBottomToast('error', 'Update Failed', errMsg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Step 1: Verify Current Password
  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current account password to proceed.');
      return;
    }

    try {
      setIsVerifyingCurrentPassword(true);
      await verifyCurrentPassword(currentPassword);
      setIsCurrentPasswordVerified(true);
      setPasswordSuccess('Current password verified. You can now set your new password.');
      triggerBottomToast('info', 'Password Verified', 'Identity confirmed. Enter your new password below.');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      console.error('Verification error:', err);
      const msg = err?.message || 'Failed to verify current password. Please try again.';
      setPasswordError(msg);
      triggerBottomToast('error', 'Verification Failed', msg);
    } finally {
      setIsVerifyingCurrentPassword(false);
    }
  };

  // Handle Step 2: Update Password With New Credentials
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await updateAccountPassword(newPassword, currentPassword);
      setPasswordSuccess('Website account password successfully updated.');
      triggerBottomToast('success', 'Password Updated', 'Your website account password has been changed.');
      
      // Reset form fields
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setIsCurrentPasswordVerified(false);
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      console.error('Password update error:', err);
      if (err?.code === 'auth/requires-recent-login') {
        setPasswordError('For security, updating your password requires recent login. Alternatively, use the Gmail reset link below.');
      } else {
        setPasswordError(err?.message || 'Failed to update password. You can also send a reset link to your Gmail.');
      }
      triggerBottomToast('error', 'Password Update Failed', err?.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Sending Password Reset Email to Gmail
  const handleSendGmailReset = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentUser.email) {
      setPasswordError('No email associated with current account.');
      setResetEmailState({
        status: 'error',
        data: null,
        message: 'No email associated with current account.',
        errorCode: 'auth/missing-email',
        startedAt: null,
        completedAt: null,
        durationMs: null,
      });
      return;
    }

    try {
      setIsSendingResetEmail(true);
      const res = await executeAwaitedAuthAction(
        'Gmail Password Reset',
        () => sendAccountPasswordReset(currentUser.email!),
        {
          targetEmail: currentUser.email,
          onStateChange: (state) => setResetEmailState(state),
        }
      );
      const msg = `An official password reset link has been dispatched to ${maskEmail(res.email)}. Please check your inbox and spam folder.`;
      setPasswordSuccess(msg);
      triggerBottomToast('success', 'Reset Link Dispatched', `Email sent to ${maskEmail(res.email)}`);
    } catch (err: any) {
      console.error('[Firebase Password Reset Error]', err);
      setPasswordError(err?.message || 'Failed to send password reset email.');
      triggerBottomToast('error', 'Reset Link Failed', err?.message || 'Could not send reset email.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Handle Sending Email Verification
  const handleSendEmailVerification = async () => {
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      setIsSendingVerificationEmail(true);
      const res = await executeAwaitedAuthAction(
        'Email Verification',
        () => sendUserEmailVerification(),
        {
          targetEmail: currentUser.email || undefined,
          onStateChange: (state) => setVerificationEmailState(state),
        }
      );
      const msg = `Email verification link has been dispatched to ${maskEmail(res.email)}. Please open the link in your inbox to confirm verification.`;
      setVerificationSuccess(msg);
      triggerBottomToast('success', 'Verification Dispatched', `Email sent to ${maskEmail(res.email)}`);
    } catch (err: any) {
      console.error('[Firebase Email Verification Error]', err);
      setVerificationError(err?.message || 'Failed to send verification email.');
      triggerBottomToast('error', 'Verification Failed', err?.message || 'Could not send verification email.');
    } finally {
      setIsSendingVerificationEmail(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: 'Empty', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 2, text: 'Good', color: 'bg-amber-500' };
    return { score: 3, text: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="w-full max-w-4xl mx-auto py-6 font-sans select-none text-[#E2E8F0] space-y-6 relative pb-16">
      {/* Header */}
      <div className="pb-2 border-b border-[#1E2333]">
        <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
          <span>Workspace Settings</span>
        </h1>
        <p className="text-xs text-[#8B949E] mt-0.5">
          Manage your account profile, customize your developer avatar, and configure Gmail password credentials
        </p>
      </div>

      {/* Tabs with Smooth Pill Indicator */}
      <div className="flex items-center gap-2 border-b border-[#1E2333] pb-2 text-xs relative">
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3 py-1.5 rounded-md cursor-pointer select-none transition-colors duration-150 focus:outline-none ${
                isActive ? 'text-white font-semibold' : 'text-[#8B949E] hover:text-[#E2E8F0]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="settings-subtab-liquid-indicator"
                  className="liquid-pill-indicator"
                  transition={{
                    type: 'spring',
                    stiffness: 480,
                    damping: 36,
                    mass: 0.75,
                  }}
                >
                  <div className="liquid-tab-sheen" />
                </motion.div>
              )}
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Tab Contents with Animated Transition */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {/* ========================================================================= */}
          {/* 1. PROFILE & CUSTOMIZATION SECTION */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl text-xs">
              {/* Feedback Alerts */}
              {profileSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Profile Picture Customization Card with Clickable Avatar & Small Action Badge */}
              <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#F97316]" />
                    <span className="font-semibold text-white">Profile Picture Customization</span>
                  </div>
                  <span className="text-[11px] text-[#8B949E]">Click photo to customize</span>
                </div>

                {/* Avatar Display with Small Logo Badge & Direct Click */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-[#090D14] border border-slate-800/80">
                  {/* Interactive Avatar Container */}
                  <div className="relative self-center sm:self-auto group">
                    <button
                      type="button"
                      onClick={() => setIsAvatarModalOpen(true)}
                      className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#F97316] bg-[#161B26] flex items-center justify-center shadow-lg transition-all transform group-hover:scale-105 group-hover:ring-4 group-hover:ring-[#F97316]/30 cursor-pointer"
                      title="Click to customize profile picture from computer, phone camera, or presets"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar Preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#161B26] text-[#F97316] font-bold text-2xl">
                          {username ? username.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}

                      {/* Hover Overlay Hint */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera className="w-5 h-5 text-[#F97316]" />
                        <span className="text-[9px] font-semibold mt-0.5">Change</span>
                      </div>
                    </button>

                    {/* Small Action Badge Logo on Profile to tell user there is an option */}
                    <button
                      type="button"
                      onClick={() => setIsAvatarModalOpen(true)}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-black flex items-center justify-center shadow-md border-2 border-[#090D14] cursor-pointer transition-transform hover:scale-110"
                      title="Click to change profile picture"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Information & Action Buttons */}
                  <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center justify-center sm:justify-start gap-2">
                        <span>{username || 'Developer'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#141C2B] text-[10px] text-amber-400 font-mono border border-amber-500/20">
                          Customizable
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#8B949E] mt-0.5">
                        Click your profile picture or the action button to select presets or upload from your computer/mobile device.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold flex items-center gap-1.5 transition-colors text-xs cursor-pointer shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Profile Picture</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarUrl('');
                            triggerBottomToast('info', 'Avatar Reset', 'Reset to initial letter avatar. Click Save Changes to apply.');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#161B26] hover:bg-rose-950/40 border border-[#2B3245] hover:border-rose-500/40 text-[#8B949E] hover:text-rose-300 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset to Initials</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Device Access Capabilities Card */}
                <div className="p-3.5 rounded-lg bg-[#121622] border border-[#1E2333] flex flex-wrap items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-4 text-[#8B949E]">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Laptop className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>Desktop &amp; Laptop</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mobile Camera &amp; Gallery</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>12+ Presets</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="text-[#F97316] hover:underline font-medium cursor-pointer"
                  >
                    Open Avatar Studio →
                  </button>
                </div>
              </div>

              {/* Account Details & Username Form Card */}
              <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-4">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#F97316]" />
                  <span className="font-semibold text-white">Account Details &amp; Username</span>
                </div>

                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-[#C9D1D9]">
                    Username / Full Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] font-sans text-xs transition-colors"
                  />
                  <span className="text-[10px] text-[#6E7681] block">
                    This name is displayed across diagnostic tickets, investigations, and team annotations.
                  </span>
                </div>

                {/* Registered Gmail */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-medium text-[#C9D1D9]">
                    Registered Gmail Account
                  </label>
                  <div className="px-3.5 py-2.5 rounded-lg bg-[#121622] border border-[#1E2333] text-[#A0AEC0] font-mono text-xs flex items-center justify-between">
                    <span>{currentUser.email || 'developer@bugsynapse.ai'}</span>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Identity</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Profile Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-motion px-6 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 2. SECURITY & GMAIL PASSWORD SECTION */}
          {/* ========================================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl text-xs">
              {/* Feedback Alerts */}
              {passwordSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{passwordError}</span>
                </div>
              )}
              {verificationSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{verificationSuccess}</span>
                </div>
              )}
              {verificationError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{verificationError}</span>
                </div>
              )}

              {/* Email Address & Verification Status Card */}
              <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#F97316]" />
                    <span className="font-semibold text-white">Email Address &amp; Verification Status</span>
                  </div>
                  {isEmailVerified ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Email</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Unverified Email</span>
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[#121622] border border-[#1E2333] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Account Email:</span>
                    <span className="text-white font-mono font-medium">{currentUser.email || 'developer@bugsynapse.ai'}</span>
                  </div>
                  {!isEmailVerified && !isGoogleUser && (
                    <button
                      type="button"
                      onClick={handleSendEmailVerification}
                      disabled={isSendingVerificationEmail}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1E2333] hover:bg-[#2A3144] border border-amber-500/40 text-amber-300 font-medium text-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 self-start sm:self-auto"
                    >
                      {isSendingVerificationEmail ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                      <span>{isSendingVerificationEmail ? 'Dispatching...' : 'Send Verification Email'}</span>
                    </button>
                  )}
                </div>

                {/* Verification Email Lifecycle Feedback */}
                {verificationEmailState.status === 'loading' && (
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    <span>Awaiting Firebase verification dispatch for <strong className="font-mono text-white">{maskEmail(currentUser.email || '')}</strong>...</span>
                  </div>
                )}
                {verificationEmailState.status === 'success' && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Verification Email Dispatched
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                        200 OK
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                      Verification link delivered to <strong className="font-mono text-white">{maskEmail(verificationEmailState.data?.email || currentUser.email || '')}</strong>. Please check your inbox.
                    </p>
                  </div>
                )}
                {verificationEmailState.status === 'error' && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        Verification Dispatch Failed
                      </span>
                      {verificationEmailState.errorCode && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 font-mono text-[10px]">
                          {verificationEmailState.errorCode}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">
                      {verificationEmailState.message}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-[#8B949E]">
                  {isGoogleUser ? (
                    <span>This account is authenticated through Google Identity SSO. Email verification is automatically handled by Google.</span>
                  ) : (
                    <span>Firebase sends an email verification link directly to your inbox to confirm ownership and authorize sensitive account changes.</span>
                  )}
                </p>
              </div>

              {/* Change Website Account Password Card OR Google SSO Card */}
              {isGoogleUser ? (
                <div className="p-5 rounded-xl bg-[#0D1017] border border-sky-900/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-400">
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
                      <span className="font-semibold text-white">Google Identity Provider (providerId: google.com)</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-400 text-[10px] font-mono font-semibold">
                      Social Login Active
                    </span>
                  </div>

                  <p className="text-[11px] text-[#8B949E] leading-relaxed">
                    You are logged in with <strong>Google SSO</strong>. Your account credentials, password resets, and 2-step verifications are securely handled by Google. BugSynapse does not store or maintain a separate password for this account.
                  </p>

                  <div className="pt-1 flex items-center gap-3">
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#161B26] hover:bg-[#202738] border border-sky-800/50 text-sky-300 hover:text-sky-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Manage Google Account Security</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  {/* Change Website Account Password Card (2-STEP VERIFICATION FLOW FOR PASSWORD USERS) */}
                  <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[#F97316]" />
                        <span className="font-semibold text-white">Change Account Password for Website</span>
                      </div>
                      {isCurrentPasswordVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-semibold flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          <span>Unlocked</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8B949E]">
                      To protect your account, please enter your current password first. Once verified, you will be able to set and confirm your new credentials.
                    </p>

                    {/* STEP 1: ASK FIRSTLY FOR CURRENT PASSWORD */}
                    {!isCurrentPasswordVerified ? (
                      <form onSubmit={handleVerifyCurrentPassword} className="space-y-3 pt-2">
                        <div className="p-4 rounded-xl bg-[#090D14] border border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-medium text-[#C9D1D9] flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-[#F97316]" />
                              <span>Step 1: Enter Current Password</span>
                            </label>
                            <span className="text-[10px] text-[#8B949E]">Required for Security</span>
                          </div>

                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              required
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter your existing account password"
                              className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-3 text-[#6E7681] hover:text-[#C9D1D9] cursor-pointer"
                            >
                              {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <p className="text-[10px] text-[#6E7681]">
                              Don't remember your current password? Use the Gmail reset link below.
                            </p>
                            <button
                              type="submit"
                              disabled={isVerifyingCurrentPassword || !currentPassword.trim()}
                              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-opacity shrink-0"
                            >
                              {isVerifyingCurrentPassword ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5" />
                              )}
                              <span>{isVerifyingCurrentPassword ? 'Verifying...' : 'Verify & Continue'}</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      /* STEP 2: SHOW PASSWORD CHANGE OPTION COLUMNS */
                      <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1 animate-fade-in">
                        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-[11px] text-emerald-300">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Current password verified. Enter your new password below.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCurrentPasswordVerified(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            className="text-slate-400 hover:text-white underline cursor-pointer text-[10px]"
                          >
                            Lock again
                          </button>
                        </div>

                        {/* Columns for New Password & Confirm Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Column 1: New Password */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-[#C9D1D9]">
                                New Password
                              </label>
                              {newPassword && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  Strength: <strong className="text-white">{strength.text}</strong>
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] font-mono text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-3 text-[#6E7681] hover:text-[#C9D1D9] cursor-pointer"
                              >
                                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {/* Password strength meter */}
                            {newPassword && (
                              <div className="flex gap-1 pt-1">
                                <div className={`h-1 flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-800'}`} />
                                <div className={`h-1 flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-800'}`} />
                                <div className={`h-1 flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-800'}`} />
                              </div>
                            )}
                          </div>

                          {/* Column 2: Confirm Password */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-[#C9D1D9]">
                                Confirm New Password
                              </label>
                              {confirmPassword && (
                                <span className={`text-[10px] font-mono ${
                                  newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {newPassword === confirmPassword ? '✓ Matches' : '✗ No match'}
                                </span>
                              )}
                            </div>
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat new password"
                              className={`w-full px-3.5 py-2.5 rounded-lg bg-[#161B26] border text-white focus:outline-none font-mono text-xs ${
                                confirmPassword && newPassword !== confirmPassword
                                  ? 'border-rose-500 focus:border-rose-500'
                                  : 'border-[#1E2333] focus:border-[#F97316]'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={isUpdatingPassword || !newPassword || newPassword !== confirmPassword}
                            className="btn-motion px-5 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-opacity shadow-xs"
                          >
                            {isUpdatingPassword ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                            <span>{isUpdatingPassword ? 'Updating Password...' : 'Save New Website Password'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsCurrentPasswordVerified(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            className="px-4 py-2.5 rounded-lg bg-[#161B26] hover:bg-[#202738] border border-slate-700 text-[#8B949E] hover:text-white text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Gmail Reset Link Dispatch Card */}
                  <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-sky-400" />
                      <span className="font-semibold text-white">Gmail Password Reset Link</span>
                    </div>
                    <p className="text-[11px] text-[#8B949E]">
                      Prefer receiving an official reset link? Firebase will email a secure password reset authorization directly to your Gmail account (<span className="text-[#C9D1D9] font-mono">{currentUser.email || 'your-gmail@google.com'}</span>).
                    </p>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleSendGmailReset}
                        disabled={isSendingResetEmail}
                        className="px-4 py-2 rounded-lg bg-[#161B26] hover:bg-[#202738] border border-sky-800/50 text-sky-300 hover:text-sky-200 font-medium text-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isSendingResetEmail ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span>{isSendingResetEmail ? 'Dispatching Link...' : 'Send Password Reset Link to Gmail'}</span>
                      </button>
                    </div>

                    {/* Password Reset Email Lifecycle Feedback */}
                    {resetEmailState.status === 'loading' && (
                      <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-500/40 text-sky-200 text-xs flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                        <span>Awaiting Firebase password reset dispatch for <strong className="font-mono text-white">{maskEmail(currentUser.email || '')}</strong>...</span>
                      </div>
                    )}
                    {resetEmailState.status === 'success' && (
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Password Reset Link Dispatched
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                            200 OK
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                          Reset authorization link delivered to <strong className="font-mono text-white">{maskEmail(resetEmailState.data?.email || currentUser.email || '')}</strong>. Please check your inbox.
                        </p>
                      </div>
                    )}
                    {resetEmailState.status === 'error' && (
                      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            Password Reset Dispatch Failed
                          </span>
                          {resetEmailState.errorCode && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 font-mono text-[10px]">
                              {resetEmailState.errorCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">
                          {resetEmailState.message}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Security & Authentication Overview */}
              <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">Account Security &amp; Identity</span>
                </div>
                <p className="text-[11px] text-[#8B949E]">
                  Your workspace is safeguarded by Firebase authentication protocols, password encryption, and strict session management.
                </p>
                <div className="pt-2 flex items-center gap-4 text-[11px]">
                  <span className="text-[#6E7681]">Status: <span className="text-emerald-400 font-medium">Verified Active</span></span>
                  <span className="text-[#6E7681]">Provider: <span className="text-[#C9D1D9] font-mono">{isGoogleUser ? 'Google Identity SSO' : 'Firebase Email & Password'}</span></span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. NOTIFICATIONS SECTION */}
          {/* ========================================================================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 max-w-2xl text-xs">
              <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#F97316]" />
                  <span className="font-semibold text-white">Alert &amp; Triage Preferences</span>
                </div>
                <p className="text-[11px] text-[#8B949E]">
                  Configure which automated investigation notifications and triage alerts to receive.
                </p>
                <div className="space-y-3 pt-2 text-[11px] text-[#C9D1D9]">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifyCritical} 
                      onChange={(e) => setNotifyCritical(e.target.checked)}
                      className="rounded accent-[#F97316] w-4 h-4" 
                    />
                    <span>Notify when a critical severity issue or defect is identified</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifyRootCause} 
                      onChange={(e) => setNotifyRootCause(e.target.checked)}
                      className="rounded accent-[#F97316] w-4 h-4" 
                    />
                    <span>Notify when an AI root-cause forensic analysis completes</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifyVerification} 
                      onChange={(e) => setNotifyVerification(e.target.checked)}
                      className="rounded accent-[#F97316] w-4 h-4" 
                    />
                    <span>Notify when automated sandbox fix verification succeeds</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PROFILE AVATAR STUDIO MODAL */}
      {/* ========================================================================= */}
      <ProfileAvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarUrl={avatarUrl}
        username={username}
        onSelectAvatar={(newUrl) => {
          setAvatarUrl(newUrl);
          triggerBottomToast('info', 'Avatar Selected', 'New photo chosen. Click "Save Profile Changes" to apply.');
        }}
      />

      {/* ========================================================================= */}
      {/* FLOATING SUCCESS / ACTION MESSAGE AT BOTTOM OF SCREEN */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {bottomToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] sm:w-auto min-w-[320px] rounded-2xl bg-[#090D14]/95 border border-slate-700 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md p-3.5 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                bottomToast.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : bottomToast.type === 'error'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40'
              }`}>
                {bottomToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : bottomToast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span>{bottomToast.title}</span>
                  <span className="text-[10px] text-[#6E7681] font-mono">{bottomToast.timestamp}</span>
                </div>
                <p className="text-[11px] text-[#C9D1D9] truncate">
                  {bottomToast.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBottomToast(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
