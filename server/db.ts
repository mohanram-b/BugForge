import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  User, 
  UserRole, 
  Issue, 
  IssueComment, 
  IssueAttachment, 
  AuditEvent, 
  Notification, 
  IntegrationSettings,
  Severity,
  Priority,
  IssueStatus,
  Investigation
} from '../src/types';

const DB_FILE = path.join(process.cwd(), 'server', 'database.json');

// Password helper using crypto
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Initial seed users
const DEFAULT_SALT = 'bugforge_secure_salt_2026';
const INITIAL_USERS: User[] = [
  {
    id: 'usr_default',
    googleSubjectId: 'google_user_default',
    name: 'Mohan Ram',
    email: 'mohanramdharun1@gmail.com',
    role: 'DEVELOPER',
    passwordHash: hashPassword('password123', DEFAULT_SALT),
    salt: DEFAULT_SALT,
    mfaEnabled: false,
    avatarUrl: '',
    createdAt: new Date().toISOString(),
  },
];

// Start empty until user imports a real project or creates issues
const INITIAL_ISSUES: Issue[] = [];
const INITIAL_COMMENTS: IssueComment[] = [];
const INITIAL_AUDIT: AuditEvent[] = [];
const INITIAL_NOTIFICATIONS: Notification[] = [];

const INITIAL_INTEGRATIONS: IntegrationSettings = {
  github: {
    connected: false,
    repo: '',
    branch: 'main',
    token: '',
  },
  gitlab: {
    connected: false,
    projectUrl: '',
    token: '',
  },
  jira: {
    connected: false,
    host: '',
    projectKey: '',
    apiToken: '',
  },
  slack: {
    connected: false,
    webhookUrl: '',
    channel: '#bugforge-alerts',
    notifyOnCritical: true,
  },
  cicd: {
    enabled: true,
    webhookSecret: 'bf_secret_ci_webhook_token_2026',
    autoInvestigate: true,
  },
};

export interface DatabaseSchema {
  users: User[];
  issues: Issue[];
  comments: IssueComment[];
  attachments: IssueAttachment[];
  auditEvents: AuditEvent[];
  notifications: Notification[];
  integrations: IntegrationSettings;
  sessions: Record<string, { userId: string; expiresAt: number }>;
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[Database] Failed to read database file, initializing defaults', e);
    }
    return {
      users: INITIAL_USERS,
      issues: INITIAL_ISSUES,
      comments: INITIAL_COMMENTS,
      attachments: [],
      auditEvents: INITIAL_AUDIT,
      notifications: INITIAL_NOTIFICATIONS,
      integrations: INITIAL_INTEGRATIONS,
      sessions: {},
    };
  }

  public save(): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Database] Failed to persist data', e);
    }
  }

  // Users & Auth
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserByGoogleSubjectId(googleSubjectId: string): User | undefined {
    return this.data.users.find((u) => u.googleSubjectId === googleSubjectId);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.save();
      return this.data.users[idx];
    }
    return undefined;
  }

  // Sessions
  public createSession(userId: string): string {
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    this.data.sessions[token] = { userId, expiresAt };
    this.save();
    return token;
  }

  public getSession(token: string): { userId: string; expiresAt: number } | undefined {
    const session = this.data.sessions[token];
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    if (session) {
      delete this.data.sessions[token];
      this.save();
    }
    return undefined;
  }

  public deleteSession(token: string): void {
    delete this.data.sessions[token];
    this.save();
  }

  // Issues
  public getIssues(): Issue[] {
    return this.data.issues;
  }

  public getIssueById(id: string): Issue | undefined {
    return this.data.issues.find((i) => i.id === id);
  }

  public createIssue(issue: Issue): Issue {
    this.data.issues.unshift(issue);
    this.save();
    return issue;
  }

  public updateIssue(id: string, updates: Partial<Issue>): Issue | undefined {
    const idx = this.data.issues.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.data.issues[idx] = { 
        ...this.data.issues[idx], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      this.save();
      return this.data.issues[idx];
    }
    return undefined;
  }

  public deleteIssue(id: string): boolean {
    const prevLen = this.data.issues.length;
    this.data.issues = this.data.issues.filter((i) => i.id !== id);
    if (this.data.issues.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Comments
  public getComments(issueId: string): IssueComment[] {
    return this.data.comments.filter((c) => c.issueId === issueId);
  }

  public addComment(comment: IssueComment): IssueComment {
    this.data.comments.push(comment);
    this.save();
    return comment;
  }

  // Attachments
  public getAttachments(issueId: string): IssueAttachment[] {
    return this.data.attachments.filter((a) => a.issueId === issueId);
  }

  public addAttachment(att: IssueAttachment): IssueAttachment {
    this.data.attachments.push(att);
    this.save();
    return att;
  }

  // Audit Events
  public getAuditEvents(issueId?: string): AuditEvent[] {
    if (issueId) {
      return this.data.auditEvents.filter((a) => a.entityId === issueId);
    }
    return this.data.auditEvents;
  }

  public addAuditEvent(event: AuditEvent): void {
    this.data.auditEvents.unshift(event);
    this.save();
  }

  // Notifications
  public getNotifications(userId: string): Notification[] {
    return this.data.notifications.filter((n) => n.userId === userId);
  }

  public addNotification(notif: Notification): void {
    this.data.notifications.unshift(notif);
    this.save();
  }

  public markNotificationRead(id: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  public markAllNotificationsRead(userId: string): void {
    this.data.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    this.save();
  }

  // Integrations
  public getIntegrations(): IntegrationSettings {
    return this.data.integrations;
  }

  public updateIntegrations(settings: Partial<IntegrationSettings>): IntegrationSettings {
    this.data.integrations = { ...this.data.integrations, ...settings };
    this.save();
    return this.data.integrations;
  }
}

export const db = new Database();
