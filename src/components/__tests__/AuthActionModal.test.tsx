import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthActionModal } from '../AuthActionModal';
import * as firebaseModule from '../../lib/firebase';

// Mock the Firebase module
vi.mock('../../lib/firebase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/firebase')>();
  return {
    ...actual,
    auth: {
      currentUser: null,
      onAuthStateChanged: vi.fn((cb) => {
        return () => {};
      }),
    },
    googleProvider: {},
    signInWithPopup: vi.fn(),
    verifyPasswordResetCode: vi.fn(),
    confirmPasswordReset: vi.fn(),
    applyActionCode: vi.fn(),
    sendAccountPasswordReset: vi.fn(),
    detectEmailAuthProviders: vi.fn(),
    isFirebaseUserGoogle: vi.fn(),
    isFirebaseUserPassword: vi.fn(),
    getFirebaseUserProviders: vi.fn(),
  };
});

describe('AuthActionModal Component Tests', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock returns
    vi.mocked(firebaseModule.isFirebaseUserGoogle).mockReturnValue(false);
    vi.mocked(firebaseModule.isFirebaseUserPassword).mockReturnValue(true);
    vi.mocked(firebaseModule.getFirebaseUserProviders).mockReturnValue(['password']);
    vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValue({
      isGoogleUser: false,
      isPasswordUser: true,
      providers: ['password'],
    });
  });

  afterEach(() => {
    // Reset window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  const setWindowLocation = (searchString: string) => {
    const url = new URL(`https://bugforge-17b81.firebaseapp.com/${searchString}`);
    Object.defineProperty(window, 'location', {
      writable: true,
      value: url,
    });
  };

  it('should not render anything when no action code or mode is in the URL', () => {
    setWindowLocation('');
    const { container } = render(<AuthActionModal />);
    expect(container.firstChild).toBeNull();
  });

  describe('Email Verification Flow (mode=verifyEmail)', () => {
    it('should successfully verify email when valid action code is supplied', async () => {
      setWindowLocation('?mode=verifyEmail&oobCode=valid-email-code-123');
      vi.mocked(firebaseModule.applyActionCode).mockResolvedValueOnce(undefined);

      render(<AuthActionModal />);

      // Check for loading state or verification execution
      expect(firebaseModule.applyActionCode).toHaveBeenCalledWith(
        expect.anything(),
        'valid-email-code-123'
      );

      // Await success message display
      await waitFor(() => {
        expect(
          screen.getByText(/Your email address has been successfully verified/i)
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Proceed to BugSynapse/i)).toBeInTheDocument();
    });

    it('should display error message when applyActionCode fails with auth/invalid-action-code', async () => {
      setWindowLocation('?mode=verifyEmail&oobCode=invalid-code');
      const err = { code: 'auth/invalid-action-code', message: 'Invalid action code' };
      vi.mocked(firebaseModule.applyActionCode).mockRejectedValueOnce(err);

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(
          screen.getByText(/This verification link is invalid or has already been used/i)
        ).toBeInTheDocument();
      });
    });

    it('should display error message when applyActionCode fails with auth/expired-action-code', async () => {
      setWindowLocation('?mode=verifyEmail&oobCode=expired-code');
      const err = { code: 'auth/expired-action-code', message: 'Expired action code' };
      vi.mocked(firebaseModule.applyActionCode).mockRejectedValueOnce(err);

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(
          screen.getByText(/This verification or password reset link has expired/i)
        ).toBeInTheDocument();
      });
    });

    it('should display error message when user account is disabled (auth/user-disabled)', async () => {
      setWindowLocation('?mode=verifyEmail&oobCode=disabled-user-code');
      const err = { code: 'auth/user-disabled', message: 'User disabled' };
      vi.mocked(firebaseModule.applyActionCode).mockRejectedValueOnce(err);

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(
          screen.getByText(/This user account has been disabled by an administrator/i)
        ).toBeInTheDocument();
      });
    });

    it('should recognize Google SSO users and skip manual verification code application', async () => {
      setWindowLocation('?mode=verifyEmail&oobCode=code-123');
      const mockGoogleUser = {
        uid: 'google-user-123',
        email: 'dev@google.com',
        providerId: 'google.com',
        providerData: [{ providerId: 'google.com' }],
      };
      Object.defineProperty(firebaseModule.auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: mockGoogleUser,
      });

      vi.mocked(firebaseModule.isFirebaseUserGoogle).mockReturnValue(true);

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(
          screen.getByText(/Your account email is verified by Google Identity SSO/i)
        ).toBeInTheDocument();
      });

      // applyActionCode should not be called
      expect(firebaseModule.applyActionCode).not.toHaveBeenCalled();
      
      // Cleanup
      Object.defineProperty(firebaseModule.auth, 'currentUser', {
        writable: true,
        configurable: true,
        value: null,
      });
    });
  });

  describe('Password Reset Flow (mode=resetPassword)', () => {
    it('should verify reset code and render new password form for standard password accounts', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=valid-pwd-code-456');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockResolvedValueOnce('user@example.com');
      vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValueOnce({
        isGoogleUser: false,
        isPasswordUser: true,
        providers: ['password'],
      });

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(firebaseModule.verifyPasswordResetCode).toHaveBeenCalledWith(
          expect.anything(),
          'valid-pwd-code-456'
        );
      });

      // Target email should be displayed
      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Password fields should be visible
      expect(screen.getByPlaceholderText(/Min\. 6 characters/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Repeat new password/i)).toBeInTheDocument();
    });

    it('should submit password reset successfully when valid passwords match', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=valid-pwd-code-456');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockResolvedValueOnce('user@example.com');
      vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValueOnce({
        isGoogleUser: false,
        isPasswordUser: true,
        providers: ['password'],
      });
      vi.mocked(firebaseModule.confirmPasswordReset).mockResolvedValueOnce(undefined);

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Min\. 6 characters/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/Min\. 6 characters/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/Repeat new password/i);
      const submitBtn = screen.getByRole('button', { name: /Save New Password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass123!' } });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(firebaseModule.confirmPasswordReset).toHaveBeenCalledWith(
          expect.anything(),
          'valid-pwd-code-456',
          'SecurePass123!'
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Your password has been successfully updated/i)
        ).toBeInTheDocument();
      });
    });

    it('should handle auth/weak-password error on submission', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=valid-pwd-code-456');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockResolvedValueOnce('user@example.com');
      vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValueOnce({
        isGoogleUser: false,
        isPasswordUser: true,
        providers: ['password'],
      });
      vi.mocked(firebaseModule.confirmPasswordReset).mockRejectedValueOnce({
        code: 'auth/weak-password',
        message: 'Password is too weak',
      });

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Min\. 6 characters/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/Min\. 6 characters/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/Repeat new password/i);
      const submitBtn = screen.getByRole('button', { name: /Save New Password/i });

      fireEvent.change(newPasswordInput, { target: { value: '123456' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '123456' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Password should be at least 6 characters in length/i)
        ).toBeInTheDocument();
      });
    });

    it('should handle auth/too-many-requests error when rate limit is exceeded', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=valid-pwd-code-456');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockResolvedValueOnce('user@example.com');
      vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValueOnce({
        isGoogleUser: false,
        isPasswordUser: true,
        providers: ['password'],
      });
      vi.mocked(firebaseModule.confirmPasswordReset).mockRejectedValueOnce({
        code: 'auth/too-many-requests',
        message: 'Too many requests',
      });

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Min\. 6 characters/i)).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/Min\. 6 characters/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/Repeat new password/i);
      const submitBtn = screen.getByRole('button', { name: /Save New Password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'NewSecret123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewSecret123!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Access to this account has been temporarily disabled due to many failed attempts/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Social Login / Google Provider Protection', () => {
    it('should suppress password reset UI when user is detected as Google-provider user', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=google-user-pwd-code');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockResolvedValueOnce('developer@google.com');
      vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValueOnce({
        isGoogleUser: true,
        isPasswordUser: false,
        providers: ['google.com'],
      });

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(screen.getByText(/Google Identity Provider/i)).toBeInTheDocument();
      });

      // Password input fields must NOT be rendered
      expect(screen.queryByPlaceholderText(/Min\. 6 characters/i)).toBeNull();
      expect(screen.queryByPlaceholderText(/Repeat new password/i)).toBeNull();

      // Informative explanation & Sign In button should be present
      expect(
        screen.getByText(/Google SSO accounts do not store raw website passwords/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In with Google/i })).toBeInTheDocument();
    });

    it('should trigger Google popup sign in when Sign In with Google is clicked', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=google-user-pwd-code');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockResolvedValueOnce('developer@google.com');
      vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValueOnce({
        isGoogleUser: true,
        isPasswordUser: false,
        providers: ['google.com'],
      });
      vi.mocked(firebaseModule.signInWithPopup).mockResolvedValueOnce({} as any);

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sign In with Google/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In with Google/i }));

      await waitFor(() => {
        expect(firebaseModule.signInWithPopup).toHaveBeenCalled();
      });
    });
  });

  describe('Invalid Code & Resend Link Flow', () => {
    it('should show resend form when verification code is expired or invalid', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=expired-code');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockRejectedValueOnce({
        code: 'auth/expired-action-code',
        message: 'Action code expired',
      });

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(
          screen.getByText(/This verification or password reset link has expired/i)
        ).toBeInTheDocument();
      });

      // Resend input and button should be rendered
      expect(screen.getByPlaceholderText(/Enter your account email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Fresh Reset Link/i })).toBeInTheDocument();
    });

    it('should allow sending fresh reset link and handle auth/user-not-found', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=expired-code');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockRejectedValueOnce({
        code: 'auth/invalid-action-code',
        message: 'Invalid code',
      });
      vi.mocked(firebaseModule.sendAccountPasswordReset).mockRejectedValueOnce({
        code: 'auth/user-not-found',
        message: 'User not found',
      });

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter your account email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText(/Enter your account email/i);
      const resendBtn = screen.getByRole('button', { name: /Send Fresh Reset Link/i });

      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/No account was found with this email address/i)
        ).toBeInTheDocument();
      });
    });

    it('should prevent resending reset email for Google-provider accounts and display helpful warning', async () => {
      setWindowLocation('?mode=resetPassword&oobCode=expired-code');
      vi.mocked(firebaseModule.verifyPasswordResetCode).mockRejectedValueOnce({
        code: 'auth/invalid-action-code',
        message: 'Invalid code',
      });
      vi.mocked(firebaseModule.detectEmailAuthProviders).mockResolvedValueOnce({
        isGoogleUser: true,
        isPasswordUser: false,
        providers: ['google.com'],
      });

      render(<AuthActionModal />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter your account email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText(/Enter your account email/i);
      const resendBtn = screen.getByRole('button', { name: /Send Fresh Reset Link/i });

      fireEvent.change(emailInput, { target: { value: 'social@gmail.com' } });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/authenticated exclusively via Google SSO \(providerId: google.com\)/i)
        ).toBeInTheDocument();
      });

      expect(firebaseModule.sendAccountPasswordReset).not.toHaveBeenCalled();
    });
  });
});
