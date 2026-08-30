import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFirebaseAuthErrorMessage,
  getActionCodeSettings,
  getAppBaseUrl,
  isFirebaseUserGoogle,
  isFirebaseUserPassword,
  getFirebaseUserProviders,
} from '../firebase';

describe('Firebase Auth Utilities & Error Handling Tests', () => {
  describe('getFirebaseAuthErrorMessage', () => {
    it('should map auth/user-not-found to user friendly guidance', () => {
      const err = { code: 'auth/user-not-found' };
      expect(getFirebaseAuthErrorMessage(err)).toBe(
        'No account was found with this email address. Please check the spelling or create an account.'
      );
    });

    it('should map auth/too-many-requests to lockout / rate limit guidance', () => {
      const err = { code: 'auth/too-many-requests' };
      expect(getFirebaseAuthErrorMessage(err)).toBe(
        'Access to this account has been temporarily disabled due to many failed attempts. Please try again in a few minutes or reset your password.'
      );
    });

    it('should map auth/invalid-action-code to invalid link guidance', () => {
      const err = { code: 'auth/invalid-action-code' };
      expect(getFirebaseAuthErrorMessage(err)).toBe(
        'This verification link is invalid or has already been used.'
      );
    });

    it('should map auth/expired-action-code to expired link guidance', () => {
      const err = { code: 'auth/expired-action-code' };
      expect(getFirebaseAuthErrorMessage(err)).toBe(
        'This verification or password reset link has expired. Please request a new one.'
      );
    });

    it('should map auth/weak-password to password length guidance', () => {
      const err = { code: 'auth/weak-password' };
      expect(getFirebaseAuthErrorMessage(err)).toBe(
        'Password should be at least 6 characters in length.'
      );
    });

    it('should map auth/user-disabled to administrator notice', () => {
      const err = { code: 'auth/user-disabled' };
      expect(getFirebaseAuthErrorMessage(err)).toBe(
        'This user account has been disabled by an administrator.'
      );
    });

    it('should fallback to error message or default text for unknown errors', () => {
      expect(getFirebaseAuthErrorMessage({ message: 'Custom network issue' })).toBe('Custom network issue');
      expect(getFirebaseAuthErrorMessage(null)).toBe('An unknown authentication error occurred.');
    });
  });

  describe('getActionCodeSettings & getAppBaseUrl', () => {
    it('should format action code settings url with leading slash and handleCodeInApp', () => {
      const settings = getActionCodeSettings('settings');
      expect(settings.handleCodeInApp).toBe(true);
      expect(settings.url).toContain('/settings');
    });

    it('should default to root path if no continuePath given', () => {
      const settings = getActionCodeSettings();
      expect(settings.handleCodeInApp).toBe(true);
      expect(settings.url).toBe(getAppBaseUrl() + '/');
    });
  });

  describe('Firebase User Provider Inspection Utilities', () => {
    it('isFirebaseUserGoogle should return true when user has google.com in providerData', () => {
      const mockGoogleUser: any = {
        providerId: 'firebase',
        providerData: [{ providerId: 'google.com' }],
      };
      expect(isFirebaseUserGoogle(mockGoogleUser)).toBe(true);
    });

    it('isFirebaseUserGoogle should return true when user providerId is google.com', () => {
      const mockGoogleUser: any = {
        providerId: 'google.com',
        providerData: [],
      };
      expect(isFirebaseUserGoogle(mockGoogleUser)).toBe(true);
    });

    it('isFirebaseUserGoogle should return false when user has password provider only', () => {
      const mockPasswordUser: any = {
        providerId: 'firebase',
        providerData: [{ providerId: 'password' }],
      };
      expect(isFirebaseUserGoogle(mockPasswordUser)).toBe(false);
      expect(isFirebaseUserGoogle(null)).toBe(false);
    });

    it('isFirebaseUserPassword should detect password provider in providerData', () => {
      const mockPasswordUser: any = {
        providerId: 'firebase',
        providerData: [{ providerId: 'password' }],
      };
      expect(isFirebaseUserPassword(mockPasswordUser)).toBe(true);
    });

    it('getFirebaseUserProviders should return all distinct providers', () => {
      const mockUser: any = {
        providerId: 'custom-provider',
        providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
      };
      const providers = getFirebaseUserProviders(mockUser);
      expect(providers).toContain('google.com');
      expect(providers).toContain('password');
      expect(providers).toContain('custom-provider');
    });
  });
});
