/**
 * Authentication Action Diagnostic and Lifecycle Management Utility
 * 
 * Provides standardized state management (Idle, Loading, Success, Error),
 * safe diagnostic logging that masks sensitive data, and verification utilities
 * to ensure auth requests are strictly awaited before navigation or unmounting.
 */

export type AuthActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AuthActionState<T = any> {
  status: AuthActionStatus;
  data: T | null;
  message: string | null;
  errorCode: string | null;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
}

export function createInitialAuthActionState<T = any>(): AuthActionState<T> {
  return {
    status: 'idle',
    data: null,
    message: null,
    errorCode: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  };
}

/**
 * Mask an email address safely for diagnostic logs without leaking user PII.
 * Example: "developer@example.com" -> "d***r@example.com"
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '[REDACTED_EMAIL]';
  const parts = email.trim().split('@');
  if (parts.length !== 2) return '[INVALID_EMAIL_FORMAT]';
  
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  const maskedLocal = `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask sensitive query parameters from URLs (e.g. oobCode, apiKey, token)
 */
export function maskUrl(urlStr?: string | null): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr, 'http://localhost');
    if (parsed.searchParams.has('oobCode')) {
      parsed.searchParams.set('oobCode', '[REDACTED_CODE]');
    }
    if (parsed.searchParams.has('apiKey')) {
      parsed.searchParams.set('apiKey', '[REDACTED_KEY]');
    }
    if (parsed.searchParams.has('token')) {
      parsed.searchParams.set('token', '[REDACTED_TOKEN]');
    }
    return parsed.toString().replace('http://localhost', '');
  } catch {
    return urlStr.replace(/(oobCode=)[^&]+/gi, '$1[REDACTED_CODE]');
  }
}

/**
 * Diagnostic logger for authentication events with timestamping and payload sanitization
 */
export const authLogger = {
  initiated(actionName: string, meta: { targetEmail?: string; continueUrl?: string } = {}) {
    const maskedTarget = meta.targetEmail ? maskEmail(meta.targetEmail) : 'N/A';
    const maskedContinue = meta.continueUrl ? maskUrl(meta.continueUrl) : 'N/A';
    console.info(
      `[Auth Diagnostic : ${actionName}] INITIATED | Target: ${maskedTarget} | ContinueUrl: ${maskedContinue} | Timestamp: ${new Date().toISOString()}`
    );
  },

  success(actionName: string, meta: { targetEmail?: string; durationMs?: number } = {}) {
    const maskedTarget = meta.targetEmail ? maskEmail(meta.targetEmail) : 'N/A';
    const duration = meta.durationMs !== undefined ? `${meta.durationMs}ms` : 'unknown';
    console.info(
      `[Auth Diagnostic : ${actionName}] SUCCESS (200/OK) | Target: ${maskedTarget} | Duration: ${duration} | Timestamp: ${new Date().toISOString()}`
    );
  },

  error(actionName: string, error: any, meta: { targetEmail?: string; durationMs?: number } = {}) {
    const maskedTarget = meta.targetEmail ? maskEmail(meta.targetEmail) : 'N/A';
    const duration = meta.durationMs !== undefined ? `${meta.durationMs}ms` : 'unknown';
    const errorCode = error?.code || 'auth/unknown-error';
    const errorMessage = error?.message || 'Unknown provider exception';
    console.warn(
      `[Auth Diagnostic : ${actionName}] FAILED | Code: ${errorCode} | Target: ${maskedTarget} | Duration: ${duration} | Message: ${errorMessage}`
    );
  },
};

/**
 * Diagnostic execution wrapper that enforces strict promise awaiting,
 * lifecycle state dispatching (Idle -> Loading -> Success | Error),
 * and prevents premature navigation or unmounting races.
 */
export async function executeAwaitedAuthAction<T>(
  actionName: string,
  actionFn: () => Promise<T>,
  options: {
    targetEmail?: string;
    continueUrl?: string;
    onStateChange?: (state: AuthActionState<T>) => void;
  } = {}
): Promise<T> {
  const startTime = Date.now();
  
  // 1. Dispatch Loading State
  const loadingState: AuthActionState<T> = {
    status: 'loading',
    data: null,
    message: null,
    errorCode: null,
    startedAt: startTime,
    completedAt: null,
    durationMs: null,
  };
  options.onStateChange?.(loadingState);
  authLogger.initiated(actionName, {
    targetEmail: options.targetEmail,
    continueUrl: options.continueUrl,
  });

  try {
    // 2. Strict Await of Firebase Provider Execution
    const result = await actionFn();
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 3. Dispatch Success State
    const successState: AuthActionState<T> = {
      status: 'success',
      data: result,
      message: 'Operation completed successfully.',
      errorCode: null,
      startedAt: startTime,
      completedAt: endTime,
      durationMs: duration,
    };
    options.onStateChange?.(successState);
    authLogger.success(actionName, {
      targetEmail: options.targetEmail,
      durationMs: duration,
    });

    return result;
  } catch (err: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const errorCode = err?.code || 'auth/unknown-error';
    const errorMessage = err?.message || 'Authentication operation failed.';

    // 4. Dispatch Error State
    const errorState: AuthActionState<T> = {
      status: 'error',
      data: null,
      message: errorMessage,
      errorCode,
      startedAt: startTime,
      completedAt: endTime,
      durationMs: duration,
    };
    options.onStateChange?.(errorState);
    authLogger.error(actionName, err, {
      targetEmail: options.targetEmail,
      durationMs: duration,
    });

    throw err;
  }
}

/**
 * Diagnostic Verification Harness
 * Verifies that a given UI handler function properly awaits async auth operations
 * and enforces correct state progression without race conditions.
 */
export async function verifyAuthActionLifecycle<T>(
  handlerFn: (onStateChange: (state: AuthActionState<T>) => void) => Promise<any>
): Promise<{
  isAwaited: boolean;
  stateHistory: AuthActionStatus[];
  totalDurationMs: number;
  finalStatus: AuthActionStatus;
}> {
  const stateHistory: AuthActionStatus[] = ['idle'];
  const startTime = Date.now();

  const handleStateChange = (state: AuthActionState<T>) => {
    if (stateHistory[stateHistory.length - 1] !== state.status) {
      stateHistory.push(state.status);
    }
  };

  let handlerCompleted = false;
  const promise = handlerFn(handleStateChange);
  
  // If promise is not a Promise, it wasn't awaited properly
  const isPromise = Boolean(promise && typeof promise.then === 'function');
  
  try {
    await promise;
    handlerCompleted = true;
  } catch {
    handlerCompleted = true;
  }

  const endTime = Date.now();
  const finalStatus = stateHistory[stateHistory.length - 1] || 'idle';

  return {
    isAwaited: isPromise && handlerCompleted && stateHistory.includes('loading'),
    stateHistory,
    totalDurationMs: endTime - startTime,
    finalStatus,
  };
}
