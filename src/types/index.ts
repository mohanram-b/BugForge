export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type IssueStatus = 'Open' | 'Investigating' | 'Fix Proposed' | 'In Progress' | 'Resolved' | 'Verified' | 'Closed' | 'Reopened';
export type UserRole = 'ADMIN' | 'DEVELOPER' | 'TESTER';

export interface User {
  id: string;
  googleSubjectId?: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  salt?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  recoveryCodes?: string[];
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface IssueAttachment {
  id: string;
  issueId: string;
  uploadedBy: string;
  uploaderName?: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  dataBase64?: string;
  category?: 'screenshot' | 'log' | 'config' | 'source' | 'report';
  createdAt: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  mentions?: string[];
  parentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditEvent {
  id: string;
  entityType: 'ISSUE' | 'COMMENT' | 'ATTACHMENT' | 'INVESTIGATION' | 'USER' | 'INTEGRATION';
  entityId: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'SEVERITY_CHANGED' | 'PRIORITY_CHANGED' | 'ASSIGNED' | 'ROOT_CAUSE_ANALYZED' | 'FIX_PROPOSED' | 'FIX_VERIFIED' | 'COMMENT_ADDED' | 'ATTACHMENT_ADDED' | 'INTEGRATION_UPDATED';
  actorId: string;
  actorName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ASSIGNMENT' | 'MENTION' | 'STATUS_CHANGE' | 'FIX_VERIFIED' | 'COMMENT' | 'CRITICAL_ALERT';
  read: boolean;
  createdAt: string;
  issueId?: string;
  link?: string;
}

export interface IntegrationSettings {
  github: {
    connected: boolean;
    repo: string;
    branch: string;
    token?: string;
    webhookUrl?: string;
  };
  gitlab: {
    connected: boolean;
    projectUrl: string;
    token?: string;
  };
  jira: {
    connected: boolean;
    host: string;
    projectKey: string;
    apiToken?: string;
  };
  slack: {
    connected: boolean;
    webhookUrl: string;
    channel: string;
    notifyOnCritical: boolean;
  };
  cicd: {
    enabled: boolean;
    webhookSecret: string;
    autoInvestigate: boolean;
  };
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: Severity;
  priority: Priority;
  status: IssueStatus;
  reporterId: string;
  reporterName: string;
  assigneeId?: string;
  assigneeName?: string;
  tags: string[];
  environment?: string;
  rootCause?: string;
  confidence?: number;
  investigationId?: string;
  affectedFile?: string;
  affectedLine?: number;
  patchCode?: string;
  patchDiff?: string;
  attachments?: IssueAttachment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  verifiedAt?: string;
}

export type InvestigationStatus = 'INITIALIZING' | 'ANALYZING' | 'ROOT_CAUSE_FOUND' | 'VERIFYING' | 'RESOLVED' | 'FAILED';

export interface EvidenceItem {
  id: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'DIRECT' | 'INFERRED' | 'WEAK';
  file: string;
  line?: number;
  codeSnippet?: string;
  description: string;
}

export interface RootCauseHypothesis {
  id: string;
  rank: number;
  title: string;
  confidence: number; // 0-100
  evidenceCount: number;
  evidenceItems: EvidenceItem[];
  reasoning: string;
  affectedFiles: string[];
  isPrimary?: boolean;
}

export interface CompetingCause {
  id: string;
  title: string;
  confidence: number;
  reason: string;
}

export interface WhyCausalStep {
  question: string;
  answer: string;
}

export interface DetectedSecret {
  name: string;
  file: string;
  line: number;
  maskedValue: string;
}

export interface GitChangeInfo {
  commitHash: string;
  file: string;
  message: string;
  author?: string;
}

export interface ConfidenceBreakdown {
  evidenceCount: number;
  codeRelationshipsCount: number;
  matchingStackTrace: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  file: string;
  functionName?: string;
  role: 'entry' | 'caller' | 'callee' | 'root_cause' | 'error_site' | 'impacted' | 'database';
  status: 'normal' | 'error' | 'suspect' | 'fixed' | 'affected';
  line?: number;
  incoming: string[];
  outgoing: string[];
  details?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  isFailurePath?: boolean;
  isBlastRadius?: boolean;
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  failurePath: string[];
}

export interface BlastRadius {
  filesCount: number;
  endpointsCount: number;
  userFlowsCount: number;
  criticalServicesCount: number;
  affectedFiles: Array<{ path: string; reason: string; risk: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  affectedEndpoints: Array<{ method: string; path: string; status: 'BROKEN' | 'DEGRADED' | 'OPERATIONAL'; impact: string }>;
  userFlows: Array<{ name: string; affected: boolean; description: string }>;
  services: Array<{ name: string; status: 'CRITICAL' | 'WARNING' | 'HEALTHY'; description: string }>;
}

export interface RecommendedFix {
  title: string;
  file: string;
  description: string;
  whyFix: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedImpact: string;
  diff: string;
  beforeCode: string;
  afterCode: string;
  appliedFileSnippet?: {
    file: string;
    startLine: number;
    lines: Array<{ num: number; content: string; type: 'unchanged' | 'removed' | 'added' | 'highlight' }>;
  };
}

export interface TestCaseResult {
  id: string;
  suite: string;
  name: string;
  beforeStatus: 'FAIL' | 'PASS';
  afterStatus: 'FAIL' | 'PASS';
  durationMs: number;
  errorMessage?: string;
}

export interface VerificationResult {
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  beforeFailingCount: number;
  afterPassingCount: number;
  totalTests: number;
  buildStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  regressionCheck: 'PASSED' | 'WARNING' | 'FAILED';
  testCases: TestCaseResult[];
  logs: string[];
  executionTimeMs: number;
  verifiedAt?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  timeOffset: string;
  title: string;
  type: 'info' | 'init' | 'warn' | 'error' | 'fatal';
  source: string;
  details?: string;
}

export interface Investigation {
  id: string;
  title: string;
  project: string;
  environment: string;
  service: string;
  createdAt: string;
  status: InvestigationStatus;
  severity: Severity;
  confidence: number;
  errorType: string;
  rawError: string;
  stackTrace: string;
  failureSummary?: string;
  rootCauses: RootCauseHypothesis[];
  whyCausalChain?: WhyCausalStep[];
  competingCauses?: CompetingCause[];
  confidenceBreakdown?: ConfidenceBreakdown;
  detectedSecrets?: DetectedSecret[];
  gitChangeInfo?: GitChangeInfo | null;
  evidence: EvidenceItem[];
  dependencyGraph: DependencyGraphData;
  blastRadius: BlastRadius;
  recommendedFix: RecommendedFix;
  verification: VerificationResult;
  timeline: TimelineEvent[];
  filesSnapshot?: Record<string, string>;
  isDemo?: boolean;
}

export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  language: string;
  sizeBytes: number;
  suspiciousLines?: number[];
  suspiciousNote?: string;
  bugMarker?: {
    line: number;
    severity: Severity;
    title: string;
    description: string;
    confidence: number;
  };
}

export interface ApkManifestData {
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdkVersion: string;
  targetSdkVersion: string;
  permissions: Array<{ name: string; isSuspicious?: boolean; description?: string }>;
  activities: Array<{ name: string; isExported?: boolean; isMain?: boolean }>;
  services: Array<{ name: string; isExported?: boolean }>;
  receivers: Array<{ name: string; isExported?: boolean }>;
  providers: Array<{ name: string }>;
  rawXml: string;
  warnings?: string[];
}

export interface ProjectDependency {
  name: string;
  version?: string;
  type: 'runtime' | 'dev' | 'native' | 'framework';
  sourceFile: string;
  status: 'normal' | 'affected' | 'suspect';
  description?: string;
}

export interface DiscoveredAsset {
  path: string;
  name: string;
  type: 'image' | 'font' | 'json' | 'audio' | 'certificate' | 'config' | 'binary' | 'other';
  sizeBytes: number;
  previewUrl?: string;
  content?: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  sizeBytes?: number;
  language?: string;
  bugSeverity?: Severity;
  bugCount?: number;
  blastRadiusRole?: 'direct' | 'affected' | 'potential';
  isDecompiled?: boolean;
}

export interface CodeSearchMatch {
  file: string;
  line: number;
  content: string;
  matchIndex: number;
}

export interface DemoScenario {
  id: string;
  title: string;
  shortDesc: string;
  category: string;
  severity: Severity;
  confidence: number;
  service: string;
  errorSnippet: string;
  stackSnippet: string;
  investigation: Investigation;
}

export interface DashboardMetrics {
  totalInvestigations: number;
  resolvedCount: number;
  unresolvedCount: number;
  criticalCount: number;
  avgConfidence: number;
  avgResolutionTime: string;
  openBugsCount?: number;
  verificationPendingCount?: number;
}
