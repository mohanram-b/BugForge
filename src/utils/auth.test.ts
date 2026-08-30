import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firebaseAuth from 'firebase/auth';
import {
  auth,
  sendAccountPasswordReset,
  sendUserEmailVerification,
  detectEmailAuthProviders,
  getFirebaseAuthErrorMessage,
  getActionCodeSettings,
  isFirebaseUserGoogle,
  isFirebaseUserPassword,
  getFirebaseUserProviders,
} from '../lib/firebase';

// Mock the firebase/auth module directly
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return {
    ...actual,
    sendPasswordResetEmail: vi.fn(),
    sendEmailVerification: vi.fn(),
    verifyPasswordResetCode: vi.fn(),
    confirmPasswordReset: vi.fn(),
    applyActionCode: vi.fn(),
    fetchSignInMethodsForEmail: vi.fn(),
    signInWithPopup: vi.fn(),
  };
});

describe('Firebase Auth Service & Provider Flows (Password Reset & Email Verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default current user to null
    Object.defineProperty(auth, 'currentUser', {
      writable: true,
      configurable: true,
      value: null,
    });
  });

  describe('Password Reset Flow (sendAccountPasswordReset)', () => {
    it('should successfully dispatch a password reset email with action code settings', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValueOnce(undefined);

      const result = await sendAccountPasswordReset('developer@example.com', '/settings');

      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
        auth,
        'developer@example.com',
        expect.objectContaining({
          url: expect.stringContaining('/settings'),
          handleCodeInApp: true,
        })
      );
      expect(result).toEqual({
        success: true,
        email: 'developer@example.com',
      });
    });

    it('should fall back to standard reset email if action code uri is unauthorized', async () => {
      // First call fails with unauthorized continue uri, fallback succeeds
      vi.mocked(firebaseAuth.sendPasswordResetEmail)
        .mockRejectedValueOnce({ code: 'auth/unauthorized-continue-uri' })
        .mockResolvedValueOnce(undefined);

      const result = await sendAccountPasswordReset('developer@example.com');

      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledTimes(2);
      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenLastCalledWith(auth, 'developer@example.com');
      expect(result).toEqual({
        success: true,
        email: 'developer@example.com',
      });
    });

    it('should throw an error if email address is empty or whitespace', async () => {
      await expect(sendAccountPasswordReset('   ')).rejects.toThrow(
        'Please specify a valid email address.'
      );
      expect(firebaseAuth.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should block password reset for active Google SSO accounts', async () => {
      const mockGoogleUser = {
        uid: 'google-user-id',
        email: 'googleuser@gmail.com',
        providerId: 'google.com',
        providerData: [{ providerId: 'google.com' }],
      } as any;

      Object.defineProperty(auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: mockGoogleUser,
      });

      await expect(sendAccountPasswordReset('googleuser@gmail.com')).rejects.toThrow(
        /This account is authenticated via Google Identity Provider/i
      );
      expect(firebaseAuth.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle auth/user-not-found error code gracefully', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockRejectedValueOnce({
        code: 'auth/user-not-found',
        message: 'There is no user record corresponding to this identifier.',
      });

      await expect(sendAccountPasswordReset('unknown@example.com')).rejects.toThrow(
        'No account was found with this email address. Please check the spelling or create an account.'
      );
    });

    it('should handle auth/too-many-requests rate limit error code', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockRejectedValueOnce({
        code: 'auth/too-many-requests',
        message: 'Access temporarily disabled.',
      });

      await expect(sendAccountPasswordReset('flooded@example.com')).rejects.toThrow(
        'Access to this account has been temporarily disabled due to many failed attempts. Please try again in a few minutes or reset your password.'
      );
    });

    it('should handle auth/invalid-email error code', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockRejectedValueOnce({
        code: 'auth/invalid-email',
        message: 'The email address is badly formatted.',
      });

      await expect(sendAccountPasswordReset('bad-email-format')).rejects.toThrow(
        'Please provide a valid email address.'
      );
    });
  });

  describe('Password Reset Confirmation & Code Verification', () => {
    it('should verify password reset code and return target email', async () => {
      vi.mocked(firebaseAuth.verifyPasswordResetCode).mockResolvedValueOnce('user@example.com');

      const email = await firebaseAuth.verifyPasswordResetCode(auth, 'valid-oob-code');
      expect(email).toBe('user@example.com');
      expect(firebaseAuth.verifyPasswordResetCode).toHaveBeenCalledWith(auth, 'valid-oob-code');
    });

    it('should handle auth/invalid-action-code when code has already been used or corrupted', async () => {
      vi.mocked(firebaseAuth.verifyPasswordResetCode).mockRejectedValueOnce({
        code: 'auth/invalid-action-code',
      });

      try {
        await firebaseAuth.verifyPasswordResetCode(auth, 'used-code');
      } catch (err: any) {
        expect(getFirebaseAuthErrorMessage(err)).toBe(
          'This verification link is invalid or has already been used.'
        );
      }
    });

    it('should handle auth/expired-action-code during reset code verification', async () => {
      vi.mocked(firebaseAuth.verifyPasswordResetCode).mockRejectedValueOnce({
        code: 'auth/expired-action-code',
      });

      try {
        await firebaseAuth.verifyPasswordResetCode(auth, 'expired-code');
      } catch (err: any) {
        expect(getFirebaseAuthErrorMessage(err)).toBe(
          'This verification or password reset link has expired. Please request a new one.'
        );
      }
    });

    it('should confirm password reset successfully with new password', async () => {
      vi.mocked(firebaseAuth.confirmPasswordReset).mockResolvedValueOnce(undefined);

      await firebaseAuth.confirmPasswordReset(auth, 'valid-oob-code', 'NewStrongPassword123!');
      expect(firebaseAuth.confirmPasswordReset).toHaveBeenCalledWith(
        auth,
        'valid-oob-code',
        'NewStrongPassword123!'
      );
    });

    it('should handle auth/weak-password during password update confirmation', async () => {
      vi.mocked(firebaseAuth.confirmPasswordReset).mockRejectedValueOnce({
        code: 'auth/weak-password',
      });

      try {
        await firebaseAuth.confirmPasswordReset(auth, 'valid-oob-code', '123');
      } catch (err: any) {
        expect(getFirebaseAuthErrorMessage(err)).toBe(
          'Password should be at least 6 characters in length.'
        );
      }
    });
  });

  describe('Email Verification Flow (sendUserEmailVerification)', () => {
    it('should throw an error if no authenticated user session exists', async () => {
      Object.defineProperty(auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: null,
      });

      await expect(sendUserEmailVerification()).rejects.toThrow(
        'No authenticated user session found to verify.'
      );
      expect(firebaseAuth.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should automatically mark Google SSO users as pre-verified without sending email', async () => {
      const mockGoogleUser = {
        uid: 'google-user-id',
        email: 'googler@gmail.com',
        providerId: 'google.com',
        providerData: [{ providerId: 'google.com' }],
      } as any;

      Object.defineProperty(auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: mockGoogleUser,
      });

      const result = await sendUserEmailVerification();
      expect(result).toEqual({
        success: true,
        email: 'googler@gmail.com',
      });
      expect(firebaseAuth.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should dispatch email verification for standard password accounts', async () => {
      const mockPasswordUser = {
        uid: 'password-user-id',
        email: 'passworduser@example.com',
        providerId: 'password',
        providerData: [{ providerId: 'password' }],
      } as any;

      Object.defineProperty(auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: mockPasswordUser,
      });

      vi.mocked(firebaseAuth.sendEmailVerification).mockResolvedValueOnce(undefined);

      const result = await sendUserEmailVerification('/profile');
      expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledWith(
        mockPasswordUser,
        expect.objectContaining({
          url: expect.stringContaining('/profile'),
          handleCodeInApp: true,
        })
      );
      expect(result).toEqual({
        success: true,
        email: 'passworduser@example.com',
      });
    });

    it('should fall back to standard email verification on uri error', async () => {
      const mockPasswordUser = {
        uid: 'password-user-id',
        email: 'passworduser@example.com',
        providerId: 'password',
        providerData: [{ providerId: 'password' }],
      } as any;

      Object.defineProperty(auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: mockPasswordUser,
      });

      vi.mocked(firebaseAuth.sendEmailVerification)
        .mockRejectedValueOnce({ code: 'auth/invalid-continue-uri' })
        .mockResolvedValueOnce(undefined);

      const result = await sendUserEmailVerification();
      expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledTimes(2);
      expect(firebaseAuth.sendEmailVerification).toHaveBeenLastCalledWith(mockPasswordUser);
      expect(result).toEqual({
        success: true,
        email: 'passworduser@example.com',
      });
    });

    it('should handle auth/user-disabled error when verifying email', async () => {
      const mockPasswordUser = {
        uid: 'password-user-id',
        email: 'disabled@example.com',
        providerId: 'password',
        providerData: [{ providerId: 'password' }],
      } as any;

      Object.defineProperty(auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: mockPasswordUser,
      });

      vi.mocked(firebaseAuth.sendEmailVerification).mockRejectedValueOnce({
        code: 'auth/user-disabled',
      });

      await expect(sendUserEmailVerification()).rejects.toThrow(
        'This user account has been disabled by an administrator.'
      );
    });

    it('should handle auth/too-many-requests error when sending email verification', async () => {
      const mockPasswordUser = {
        uid: 'password-user-id',
        email: 'spammy@example.com',
        providerId: 'password',
        providerData: [{ providerId: 'password' }],
      } as any;

      Object.defineProperty(auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: mockPasswordUser,
      });

      vi.mocked(firebaseAuth.sendEmailVerification).mockRejectedValueOnce({
        code: 'auth/too-many-requests',
      });

      await expect(sendUserEmailVerification()).rejects.toThrow(
        'Access to this account has been temporarily disabled due to many failed attempts. Please try again in a few minutes or reset your password.'
      );
    });
  });

  describe('Apply Action Code Flow (applyActionCode)', () => {
    it('should apply email verification action code successfully', async () => {
      vi.mocked(firebaseAuth.applyActionCode).mockResolvedValueOnce(undefined);

      await firebaseAuth.applyActionCode(auth, 'valid-verification-code');
      expect(firebaseAuth.applyActionCode).toHaveBeenCalledWith(auth, 'valid-verification-code');
    });

    it('should handle applyActionCode errors with auth/expired-action-code', async () => {
      vi.mocked(firebaseAuth.applyActionCode).mockRejectedValueOnce({
        code: 'auth/expired-action-code',
      });

      try {
        await firebaseAuth.applyActionCode(auth, 'expired-code');
      } catch (err: any) {
        expect(getFirebaseAuthErrorMessage(err)).toBe(
          'This verification or password reset link has expired. Please request a new one.'
        );
      }
    });
  });

  describe('Provider Identification & Classification Utilities', () => {
    it('isFirebaseUserGoogle identifies Google providers correctly', () => {
      expect(isFirebaseUserGoogle(null)).toBe(false);
      expect(isFirebaseUserGoogle(undefined)).toBe(false);
      expect(
        isFirebaseUserGoogle({
          providerId: 'google.com',
          providerData: [],
        } as any)
      ).toBe(true);
      expect(
        isFirebaseUserGoogle({
          providerId: 'firebase',
          providerData: [{ providerId: 'google.com' }],
        } as any)
      ).toBe(true);
      expect(
        isFirebaseUserGoogle({
          providerId: 'password',
          providerData: [{ providerId: 'password' }],
        } as any)
      ).toBe(false);
    });

    it('isFirebaseUserPassword identifies Password providers correctly', () => {
      expect(isFirebaseUserPassword(null)).toBe(false);
      expect(
        isFirebaseUserPassword({
          providerId: 'password',
          providerData: [],
        } as any)
      ).toBe(true);
      expect(
        isFirebaseUserPassword({
          providerId: 'firebase',
          providerData: [{ providerId: 'password' }],
        } as any)
      ).toBe(true);
      expect(
        isFirebaseUserPassword({
          providerId: 'google.com',
          providerData: [{ providerId: 'google.com' }],
        } as any)
      ).toBe(false);
    });

    it('getFirebaseUserProviders aggregates all provider ids', () => {
      expect(getFirebaseUserProviders(null)).toEqual([]);
      const providers = getFirebaseUserProviders({
        providerId: 'google.com',
        providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
      } as any);
      expect(providers).toEqual(['google.com', 'password']);
    });
  });
});
