/**
 * Security Utility for Masking Sensitive API Keys and Client Identifiers
 * Prevents accidental exposure of credentials, tokens, and secrets during code browsing & debugging.
 */

export interface MaskRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
}

// Dedicated high-confidence patterns for real credentials & secrets
export const SENSITIVE_PATTERNS: MaskRule[] = [
  // Google / Firebase API Keys (AIzaSy...)
  {
    name: 'Google / Firebase API Key',
    pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g,
    replacement: '[REDACTED_API_KEY]',
  },
  // Firebase App ID (e.g. 1:817526547350:web:1669...)
  {
    name: 'Firebase App ID',
    pattern: /\b1:\d{10,14}:(?:web|android|ios):[a-f0-9]{16,32}\b/gi,
    replacement: '[REDACTED_APP_ID]',
  },
  // Google OAuth Client ID (*.apps.googleusercontent.com)
  {
    name: 'Google OAuth Client ID',
    pattern: /\b\d{10,14}-[a-z0-9_]{20,40}\.apps\.googleusercontent\.com\b/gi,
    replacement: '[REDACTED_CLIENT_ID].apps.googleusercontent.com',
  },
  // OpenAI API Key (sk-...)
  {
    name: 'OpenAI API Key',
    pattern: /\bsk-(?:proj-|none-)?[a-zA-Z0-9_\-]{20,50}\b/g,
    replacement: '[REDACTED_OPENAI_KEY]',
  },
  // Anthropic API Key (sk-ant-...)
  {
    name: 'Anthropic API Key',
    pattern: /\bsk-ant-[a-zA-Z0-9_\-]{20,60}\b/g,
    replacement: '[REDACTED_ANTHROPIC_KEY]',
  },
  // GitHub Tokens (ghp_, gho_, ghu_, ghs_, ghr_, github_pat_)
  {
    name: 'GitHub Token',
    pattern: /\b(?:gh[pours]_[a-zA-Z0-9]{36,40}|github_pat_[a-zA-Z0-9_]{60,90})\b/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },
  // AWS Access Key ID (AKIA / ASIA)
  {
    name: 'AWS Access Key ID',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    replacement: '[REDACTED_AWS_KEY_ID]',
  },
  // Stripe Secret / Publishable / Restricted Key (sk_live_, pk_live_, rk_live_, sk_test_)
  {
    name: 'Stripe API Key',
    pattern: /\b(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,34}\b/g,
    replacement: '[REDACTED_STRIPE_KEY]',
  },
  // Slack Tokens (xoxb-, xoxp-, xoxa-, xoxr-)
  {
    name: 'Slack Token',
    pattern: /\bxox[bpar]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*\b/g,
    replacement: '[REDACTED_SLACK_TOKEN]',
  },
  // JSON Web Token (JWT)
  {
    name: 'JSON Web Token (JWT)',
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    replacement: '[REDACTED_JWT_TOKEN]',
  },
  // Private Key Blocks
  {
    name: 'Private Key Block',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    replacement: '-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY_PAYLOAD]\n-----END PRIVATE KEY-----',
  },
  // Database Connection URL with Passwords
  {
    name: 'Database URL Password',
    pattern: /(mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/([^:]+):([^@\s]+)@/gi,
    replacement: (_match: string, proto: string, user: string) => `${proto}://${user}:[REDACTED_PASSWORD]@`,
  },
  // Code / JSON / ENV key-value declarations for credentials
  // e.g. apiKey: "...", clientSecret: "...", secret_key = "..."
  {
    name: 'Key-Value Secret Assignment',
    pattern: /(["']?(?:apiKey|api_key|apiKeyId|clientSecret|client_secret|privateKey|private_key|accessToken|access_token|authToken|auth_token|secretKey|secret_key|db_password|database_password|dbPassword|appSecret|app_secret|serviceAccountKey)["']?\s*[:=]\s*)(["'`])([^"'`\s]{8,})(['"`])/gi,
    replacement: (_match: string, prefix: string, q1: string, val: string, q2: string) => {
      // Don't mask variable references or empty strings
      if (
        val.startsWith('process.env') ||
        val.startsWith('import.meta.env') ||
        val.includes('${') ||
        val.startsWith('YOUR_') ||
        val.startsWith('<') ||
        val.includes('REDACTED')
      ) {
        return `${prefix}${q1}${val}${q2}`;
      }
      return `${prefix}${q1}[REDACTED]${q2}`;
    },
  },
];

/**
 * Masks sensitive API keys, secrets, tokens, and client identifiers in code.
 * @param code The original code string or line
 * @param customPlaceholder Optional placeholder override (defaults to rule-specific or [REDACTED])
 * @returns The sanitized/masked code string
 */
export function maskSensitiveCode(code: string, customPlaceholder?: string): string {
  if (!code) return code;

  let sanitized = code;
  for (const rule of SENSITIVE_PATTERNS) {
    if (customPlaceholder) {
      sanitized = sanitized.replace(rule.pattern, customPlaceholder);
    } else if (typeof rule.replacement === 'function') {
      sanitized = sanitized.replace(rule.pattern, rule.replacement as any);
    } else {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }

  return sanitized;
}

/**
 * Single line masker helper for gutter & line-by-line rendering
 */
export function maskSensitiveLine(line: string): string {
  return maskSensitiveCode(line);
}

/**
 * Checks whether a given piece of code or file contains potential sensitive secrets.
 */
export function countSensitiveMatches(code: string): number {
  if (!code) return 0;
  let count = 0;
  for (const rule of SENSITIVE_PATTERNS) {
    const matches = code.match(rule.pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Identifies the types and locations of sensitive items detected in a file
 */
export function auditSensitiveSecrets(code: string): Array<{ ruleName: string; line: number; preview: string }> {
  if (!code) return [];
  const results: Array<{ ruleName: string; line: number; preview: string }> = [];
  const lines = code.split('\n');

  lines.forEach((lineText, idx) => {
    for (const rule of SENSITIVE_PATTERNS) {
      if (rule.pattern.test(lineText)) {
        // Reset regex state if global
        rule.pattern.lastIndex = 0;
        results.push({
          ruleName: rule.name,
          line: idx + 1,
          preview: lineText.trim().substring(0, 80),
        });
      }
    }
  });

  return results;
}
