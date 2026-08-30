import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  ArrowLeft, 
  FolderTree, 
  ChevronDown, 
  ChevronRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  LayoutDashboard,
  SearchCode,
  CheckCircle2,
  Play,
  RotateCcw,
  Download,
  Copy,
  Check,
  FileCode,
  Layers,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { 
  Issue, 
  IssueComment, 
  Severity, 
  Priority, 
  IssueStatus, 
  User, 
  Investigation 
} from '../types';
import { useActiveProject } from '../context/ActiveProjectContext';
import { 
  extractProjectIssues, 
  generateMarkdownReport, 
  generateDiagnosticLog, 
  createFixedZipArchive, 
  triggerFileDownload,
  scanCodebaseForBugs
} from '../utils/bugScanner';
import { InvestigationScreen } from './InvestigationScreen';
import { InvestigateView } from './InvestigateView';

interface IssuesViewProps {
  onOpenInExplorer?: (file: string, line?: number) => void;
  currentUser: User;
  initialSelectedIssueId?: string | null;
  onGoToDashboard?: () => void;
  activeInvestigation?: Investigation | null;
  investigations?: Investigation[];
  onSelectInvestigation?: (inv: Investigation) => void;
  onVerifyFix?: (fixCode: string) => Promise<void>;
  isVerifying?: boolean;
  onExportReport?: () => void;
  onUploadAndScanFiles?: (
    files: Record<string, string>,
    projectName: string,
    error?: string,
    repo?: string
  ) => Promise<void> | void;
}

type IssuesSubTab = 'issues_list' | 'investigation_deepdive';

export const IssuesView: React.FC<IssuesViewProps> = ({
  onOpenInExplorer,
  currentUser,
  initialSelectedIssueId,
  onGoToDashboard,
  activeInvestigation,
  investigations = [],
  onSelectInvestigation,
  onVerifyFix,
  isVerifying = false,
  onExportReport,
  onUploadAndScanFiles,
}) => {
  const { activeProject, projectFiles } = useActiveProject();
  const [subTab, setSubTab] = useState<IssuesSubTab>('issues_list');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Selected Issue Detail
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [isAnalyzingSingleIssue, setIsAnalyzingSingleIssue] = useState<boolean>(false);
  const [copiedDiffId, setCopiedDiffId] = useState<boolean>(false);

  // New Issue Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newSteps, setNewSteps] = useState<string>('');
  const [newExpected, setNewExpected] = useState<string>('');
  const [newActual, setNewActual] = useState<string>('');
  const [newSeverity, setNewSeverity] = useState<Severity>('HIGH');
  const [newPriority, setNewPriority] = useState<Priority>('Medium');
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchIssues();
    fetchUsers();
  }, [activeProject?.id, Object.keys(projectFiles).length]);

  useEffect(() => {
    if (initialSelectedIssueId && issues.length > 0) {
      const match = issues.find((i) => i.id === initialSelectedIssueId);
      if (match) {
        openIssueDetail(match);
        setSubTab('issues_list');
      }
    }
  }, [initialSelectedIssueId, issues]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !newAssigneeId) {
          setNewAssigneeId(data[0].id);
        }
      }
    } catch {
      // silent
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const projParam = activeProject?.id ? `?projectId=${encodeURIComponent(activeProject.id)}` : '';
      const res = await fetch(`/api/issues${projParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setIssues(data);
        } else if (projectFiles && Object.keys(projectFiles).length > 0) {
          // Scan locally if backend had no records
          const generated = extractProjectIssues(
            projectFiles,
            activeProject?.name || 'Active Workspace',
            activeProject?.id || 'PRJ-CURRENT'
          );
          setIssues(generated);
          // Sync with server
          fetch('/api/issues/bulk-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              projectId: activeProject?.id || 'PRJ-CURRENT',
              issues: generated,
            }),
          }).catch(() => {});
        } else {
          setIssues([]);
        }
      } else if (projectFiles && Object.keys(projectFiles).length > 0) {
        const generated = extractProjectIssues(
          projectFiles,
          activeProject?.name || 'Active Workspace',
          activeProject?.id || 'PRJ-CURRENT'
        );
        setIssues(generated);
      }
    } catch (e) {
      console.error(e);
      if (projectFiles && Object.keys(projectFiles).length > 0) {
        const generated = extractProjectIssues(
          projectFiles,
          activeProject?.name || 'Active Workspace',
          activeProject?.id || 'PRJ-CURRENT'
        );
        setIssues(generated);
      }
    } finally {
      setLoading(false);
    }
  };

  const openIssueDetail = async (issue: Issue) => {
    setSelectedIssue(issue);
    try {
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const res = await fetch(`/api/issues/${issue.id}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      setComments([]);
    }
  };

  const handleUpdateStatus = async (issueId: string, newStatus: IssueStatus) => {
    try {
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setIssues((prev) =>
          prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
        );
        if (selectedIssue && selectedIssue.id === issueId) {
          setSelectedIssue((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (e) {
      console.error('Failed to update issue status', e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const res = await fetch(`/api/issues/${selectedIssue.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: newCommentText.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [...prev, created]);
        setNewCommentText('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const token = localStorage.getItem('bf_auth_token') || localStorage.getItem('bf_token') || '';
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          stepsToReproduce: newSteps.trim(),
          expectedResult: newExpected.trim(),
          actualResult: newActual.trim(),
          severity: newSeverity,
          priority: newPriority,
          assigneeId: newAssigneeId || undefined,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setIssues((prev) => [created, ...prev]);
        setIsNewModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewSteps('');
        setNewExpected('');
        setNewActual('');
        openIssueDetail(created);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAiInvestigationOnIssue = async (issue: Issue) => {
    if (!activeProject || !projectFiles || Object.keys(projectFiles).length === 0) return;
    setIsAnalyzingSingleIssue(true);

    try {
      const errorContext = `${issue.title}\n${issue.description || ''}\n${issue.stepsToReproduce || ''}\n${issue.actualResult || ''}`;
      const scanned = await scanCodebaseForBugs(
        projectFiles,
        activeProject.name,
        errorContext
      );

      const generatedRootCause =
        scanned.investigation.rootCauses?.[0]?.reasoning ||
        scanned.investigation.rootCauses?.[0]?.title ||
        scanned.investigation.failureSummary ||
        'Root cause identified via AST inspection.';

      const generatedFix = scanned.investigation.recommendedFix;

      // Update issue locally and on server
      const updatedIssue: Issue = {
        ...issue,
        rootCause: generatedRootCause,
        confidence: scanned.investigation.confidence || 92,
        affectedFile: generatedFix?.file || issue.affectedFile,
        affectedLine: 12,
        status: 'Investigating',
      };

      setIssues((prev) => prev.map((i) => (i.id === issue.id ? updatedIssue : i)));
      setSelectedIssue(updatedIssue);

      if (onSelectInvestigation) {
        onSelectInvestigation(scanned.investigation);
      }
    } catch (err) {
      console.error('Failed to analyze issue', err);
    } finally {
      setIsAnalyzingSingleIssue(false);
    }
  };

  const handleCopyDiff = (diffText: string) => {
    navigator.clipboard.writeText(diffText);
    setCopiedDiffId(true);
    setTimeout(() => setCopiedDiffId(false), 2000);
  };

  const handleDownloadIssueMarkdown = (issue: Issue) => {
    const content = `# Issue Report: ${issue.id} - ${issue.title}
**Status**: ${issue.status} | **Severity**: ${issue.severity} | **Priority**: ${issue.priority}
**Project**: ${activeProject?.name || 'Workspace'}
**Assignee**: ${issue.assigneeName || 'Unassigned'}
**Created**: ${issue.createdAt}

## Description
${issue.description || 'No description provided.'}

## Steps to Reproduce
${issue.stepsToReproduce || 'N/A'}

## Expected vs Actual
- **Expected**: ${issue.expectedResult || 'N/A'}
- **Actual**: ${issue.actualResult || 'N/A'}

## AI Root Cause Analysis
${issue.rootCause || 'No root cause attached.'}
${issue.affectedFile ? `- **Affected File**: ${issue.affectedFile}${issue.affectedLine ? `:${issue.affectedLine}` : ''}` : ''}
${issue.confidence ? `- **Confidence**: ${issue.confidence}%` : ''}

Generated by BUGFORGE.
`;
    triggerFileDownload(content, `${issue.id}-report.md`, 'text/markdown');
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.description && issue.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (issue.rootCause && issue.rootCause.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || issue.severity === severityFilter;
    const matchesAssignee = assigneeFilter === 'ALL' || issue.assigneeId === assigneeFilter;

    return matchesSearch && matchesStatus && matchesSeverity && matchesAssignee;
  });

  const hasActiveFilters = statusFilter !== 'ALL' || severityFilter !== 'ALL' || assigneeFilter !== 'ALL';

  if (!activeProject) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 font-sans select-none text-[#E2E8F0] flex flex-col items-center justify-center">
        <div className="w-full bg-[#0D1017] border border-[#1E2333] rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl border border-[#1E2333] bg-[#121622] flex items-center justify-center text-[#8B949E]">
            <AlertTriangle className="w-6 h-6 text-[#F97316]" />
          </div>

          <div className="space-y-1 max-w-sm">
            <h2 className="text-base font-semibold text-white">No Project Loaded</h2>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Upload a project or connect a repository from the Dashboard to view and manage issues.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToDashboard}
              className="btn-motion px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-3 font-sans select-none text-[#E2E8F0] space-y-4">
      {/* ========================================================================= */}
      {/* TOP UNIFIED WORKSPACE SUB-NAVIGATION (ISSUES vs AI INVESTIGATION) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-[#1E2333] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSubTab('issues_list');
            }}
            className={`btn-motion relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
              subTab === 'issues_list'
                ? 'bg-[#161B26] text-white border border-[#2B3245]'
                : 'text-[#8B949E] hover:text-white hover:bg-[#121622]'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${subTab === 'issues_list' ? 'text-[#F97316]' : 'text-[#8B949E]'}`} />
            <span>Workspace Issues</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#0D1017] text-[#8B949E] border border-[#1E2333]">
              {issues.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('investigation_deepdive');
            }}
            className={`btn-motion relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
              subTab === 'investigation_deepdive'
                ? 'bg-[#161B26] text-white border border-[#2B3245]'
                : 'text-[#8B949E] hover:text-white hover:bg-[#121622]'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${subTab === 'investigation_deepdive' ? 'text-[#F97316]' : 'text-[#8B949E]'}`} />
            <span>AI Investigation &amp; Diagnostics</span>
            {activeInvestigation && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-500/10 text-[#F97316] border border-orange-500/30">
                {activeInvestigation.confidence || 94}%
              </span>
            )}
          </button>
        </div>

        {/* Project Name Indicator */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#8B949E]">
          <span>Project:</span>
          <span className="text-white font-medium truncate max-w-[200px]">{activeProject.name}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: ISSUES WORKSPACE (LIST & DETAIL) */}
      {/* ========================================================================= */}
      {subTab === 'issues_list' && (
        <AnimatePresence mode="wait" initial={false}>
          {selectedIssue ? (
            /* ========================================================================= */
            /* ISSUE DETAIL VIEW */
            /* ========================================================================= */
            <motion.div
              key="issue-detail"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {/* Top Back Navigation Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1E2333]">
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="btn-motion flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-white cursor-pointer py-1 px-2 rounded hover:bg-[#161B26]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Issues List</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadIssueMarkdown(selectedIssue)}
                    className="btn-motion px-2.5 py-1 rounded bg-[#121622] hover:bg-[#181E2E] border border-[#1E2333] text-xs text-[#8B949E] hover:text-white flex items-center gap-1.5 cursor-pointer"
                    title="Export Markdown Report"
                  >
                    <Download className="w-3 h-3 text-[#F97316]" />
                    <span>Export MD</span>
                  </button>

                  <span className="font-mono text-xs text-[#8B949E]">{selectedIssue.id}</span>
                </div>
              </div>

              {/* Title & Status Bar */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    {selectedIssue.title}
                  </h1>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[#8B949E]">Status:</span>
                    <select
                      value={selectedIssue.status}
                      onChange={(e) => handleUpdateStatus(selectedIssue.id, e.target.value as IssueStatus)}
                      className="px-2.5 py-1 rounded bg-[#161B26] border border-[#2B3245] text-xs font-semibold text-white focus:outline-none focus:border-[#F97316] cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Fix Proposed">Fix Proposed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Verified">Verified</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      selectedIssue.severity === 'CRITICAL'
                        ? 'text-red-400 bg-red-950/40 border border-red-800/40'
                        : selectedIssue.severity === 'HIGH'
                        ? 'text-orange-400 bg-orange-950/40 border border-orange-800/40'
                        : 'text-[#8B949E] bg-[#161B26] border border-[#2B3245]'
                    }`}
                  >
                    {selectedIssue.severity}
                  </span>
                  <span className="text-[#8B949E]">•</span>
                  <span className="text-[#A0AEC0]">Priority: {selectedIssue.priority || 'Medium'}</span>
                  <span className="text-[#8B949E]">•</span>
                  <span className="text-[#A0AEC0]">Assignee: {selectedIssue.assigneeName || 'Unassigned'}</span>
                </div>
              </div>

              {/* Issue Description & Reproduction Steps */}
              <div className="space-y-4 text-xs leading-relaxed text-[#C9D1D9] pb-5 border-b border-[#1E2333]">
                {selectedIssue.description && (
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
                      Description
                    </h3>
                    <p className="whitespace-pre-wrap">{selectedIssue.description}</p>
                  </div>
                )}

                {selectedIssue.stepsToReproduce && (
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] mb-1.5">
                      Steps to Reproduce
                    </h3>
                    <pre className="p-3 rounded bg-[#0D1017] border border-[#1E2333] font-mono text-[11px] text-[#A0AEC0] whitespace-pre-wrap">
                      {selectedIssue.stepsToReproduce}
                    </pre>
                  </div>
                )}

                {(selectedIssue.expectedResult || selectedIssue.actualResult) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {selectedIssue.expectedResult && (
                      <div className="p-3 rounded bg-[#0D1017] border border-[#1E2333]">
                        <span className="text-[10px] font-semibold uppercase text-[#8B949E] block mb-1">
                          Expected Result
                        </span>
                        <p className="text-[11px] text-[#A0AEC0]">{selectedIssue.expectedResult}</p>
                      </div>
                    )}
                    {selectedIssue.actualResult && (
                      <div className="p-3 rounded bg-[#0D1017] border border-[#1E2333]">
                        <span className="text-[10px] font-semibold uppercase text-red-400/80 block mb-1">
                          Actual Result / Failure
                        </span>
                        <p className="text-[11px] text-red-300/90">{selectedIssue.actualResult}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* INTEGRATED FORENSIC INVESTIGATION & RESOLUTION SECTION */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F97316]" />
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      AI Investigation &amp; Root Cause Analysis
                    </h2>
                  </div>
                  {selectedIssue.confidence && (
                    <span className="text-xs font-mono font-semibold text-[#F97316]">
                      {selectedIssue.confidence}% Confidence
                    </span>
                  )}
                </div>

                {selectedIssue.rootCause ? (
                  <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1E2333] space-y-4 shadow-sm">
                    {/* Primary Diagnosis */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E] block">
                        Root Cause Diagnosis
                      </span>
                      <p className="text-xs text-[#E2E8F0] leading-relaxed">
                        {selectedIssue.rootCause}
                      </p>
                    </div>

                    {/* Affected File Line Marker */}
                    {selectedIssue.affectedFile && (
                      <div className="p-2.5 rounded-lg bg-[#07090E] border border-[#1E2333] flex items-center justify-between">
                        <div className="font-mono text-xs text-[#8B949E] flex items-center gap-2 truncate pr-2">
                          <FileCode className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                          <span className="truncate">
                            Target File:{' '}
                            <span className="text-white font-semibold">
                              {selectedIssue.affectedFile}
                              {selectedIssue.affectedLine ? `:${selectedIssue.affectedLine}` : ''}
                            </span>
                          </span>
                        </div>

                        {onOpenInExplorer && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenInExplorer(selectedIssue.affectedFile!, selectedIssue.affectedLine)
                            }
                            className="btn-motion px-2.5 py-1 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <FolderTree className="w-3 h-3 text-[#F97316]" />
                            <span>Open in Explorer</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Recommended Code Fix & Diff (If active investigation matches) */}
                    {activeInvestigation?.recommendedFix && (
                      <div className="space-y-2 pt-2 border-t border-[#1E2333]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Recommended Code Fix</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyDiff(activeInvestigation.recommendedFix?.diff || '')}
                            className="text-[11px] font-mono text-[#8B949E] hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedDiffId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedDiffId ? 'Copied' : 'Copy Diff'}</span>
                          </button>
                        </div>

                        <p className="text-xs text-[#C9D1D9]">
                          {activeInvestigation.recommendedFix.description}
                        </p>

                        {/* Code Diff Box */}
                        {activeInvestigation.recommendedFix.diff && (
                          <pre className="p-3 rounded bg-[#07090E] border border-[#1E2333] font-mono text-[11px] leading-relaxed text-[#C9D1D9] overflow-x-auto whitespace-pre">
                            {activeInvestigation.recommendedFix.diff}
                          </pre>
                        )}

                        {/* Verification Trigger Button */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            {onVerifyFix && (
                              <button
                                type="button"
                                onClick={() => onVerifyFix(activeInvestigation.recommendedFix?.afterCode || '')}
                                disabled={isVerifying}
                                className="btn-motion px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {isVerifying ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Verifying Fix in Sandbox...</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Verify Fix Simulation</span>
                                  </>
                                )}
                              </button>
                            )}

                            {activeInvestigation.verification?.status === 'PASSED' && (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified (0 Regressions)</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectInvestigation && activeInvestigation) {
                                onSelectInvestigation(activeInvestigation);
                              }
                              setSubTab('investigation_deepdive');
                            }}
                            className="btn-motion text-xs text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <span>Open Full Forensic Investigation Suite</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* No Root Cause Attached -> Instant AI Investigation Trigger */
                  <div className="p-5 rounded-xl bg-[#0D1017] border border-[#1E2333] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-xs font-semibold text-white">
                        No automated investigation attached yet
                      </h3>
                      <p className="text-[11px] text-[#8B949E] max-w-md">
                        Run BUGFORGE static AST and forensic trace analysis on this issue to generate root causes, blast radius, and verified code fixes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRunAiInvestigationOnIssue(selectedIssue)}
                      disabled={isAnalyzingSingleIssue}
                      className="btn-motion shrink-0 px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isAnalyzingSingleIssue ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing AST &amp; Logs...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-current" />
                          <span>Investigate Root Cause</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-white tracking-wide">
                  Comments &amp; Triage Log ({comments.length})
                </h3>

                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-lg bg-[#0D1017] border border-[#1E2333] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{comment.authorName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#161B26] text-[#8B949E]">
                            {comment.authorRole}
                          </span>
                        </div>
                        <span className="text-[#6E7681]">
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[#C9D1D9] whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Write a comment or resolution note..."
                      className="flex-1 px-3 py-2 rounded bg-[#0D1017] border border-[#1E2333] text-xs text-white focus:outline-none focus:border-[#F97316]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newCommentText.trim()}
                      className="btn-motion px-3.5 py-2 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-xs font-medium text-white disabled:opacity-50 cursor-pointer"
                    >
                      Comment
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            /* ========================================================================= */
            /* COMPACT ISSUES LIST VIEW */
            /* ========================================================================= */
            <motion.div
              key="issues-list"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* Active Investigation Highlight Banner (If one exists) */}
              {activeInvestigation && (
                <div className="p-3.5 rounded-xl bg-[#0D1017] border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 border border-[#F97316]/30 flex items-center justify-center text-[#F97316] shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {activeInvestigation.title || `Investigation: ${activeInvestigation.project}`}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-orange-500/20 text-orange-300">
                          {activeInvestigation.confidence || 94}% confidence
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B949E] truncate">
                        {activeInvestigation.failureSummary || 'Failure identified in workspace code.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSubTab('investigation_deepdive')}
                    className="btn-motion shrink-0 px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>View AI Diagnostics</span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              )}

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1E2333]">
                <div>
                  <h1 className="text-base font-semibold text-white tracking-tight">
                    Project Issues &amp; Bugs
                  </h1>
                  <p className="text-xs text-[#8B949E] mt-0.5">
                    Unified workspace for tracking, investigating, and resolving defects
                  </p>
                </div>

                {/* Search, Filter & New Issue CTA */}
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search issues..."
                      className="pl-8 pr-3 py-1.5 rounded bg-[#0D1017] border border-[#1E2333] hover:border-[#2B3245] focus:border-[#F97316] text-xs text-white focus:outline-none w-44 sm:w-56 transition-colors duration-150"
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <div className="relative" ref={filterRef}>
                    <button
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className={`btn-motion flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium cursor-pointer ${
                        hasActiveFilters
                          ? 'bg-[#F97316]/10 border-[#F97316]/40 text-[#F97316]'
                          : 'bg-[#0D1017] hover:bg-[#121622] border-[#1E2333] text-[#8B949E] hover:text-white'
                      }`}
                    >
                      <Filter className="w-3 h-3" />
                      <span>Filter</span>
                      <ChevronDown className="w-3 h-3 text-[#8B949E]" />
                    </button>

                    <AnimatePresence>
                      {isFilterOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 4 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute right-0 mt-2 w-64 rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-xl p-3 space-y-3 z-50 text-xs"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
                            <span className="font-medium text-white">Filters</span>
                            {hasActiveFilters && (
                              <button
                                onClick={() => {
                                  setStatusFilter('ALL');
                                  setSeverityFilter('ALL');
                                  setAssigneeFilter('ALL');
                                }}
                                className="text-[11px] text-[#F97316] hover:underline cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>

                          {/* Status filter */}
                          <div className="space-y-1">
                            <span className="text-[11px] text-[#8B949E] font-medium">Status</span>
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="w-full px-2 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-xs text-white focus:outline-none"
                            >
                              <option value="ALL">All Statuses</option>
                              <option value="Open">Open</option>
                              <option value="Investigating">Investigating</option>
                              <option value="Fix Proposed">Fix Proposed</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Verified">Verified</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>

                          {/* Severity filter */}
                          <div className="space-y-1">
                            <span className="text-[11px] text-[#8B949E] font-medium">Severity</span>
                            <select
                              value={severityFilter}
                              onChange={(e) => setSeverityFilter(e.target.value)}
                              className="w-full px-2 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-xs text-white focus:outline-none"
                            >
                              <option value="ALL">All Severities</option>
                              <option value="CRITICAL">Critical</option>
                              <option value="HIGH">High</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="LOW">Low</option>
                            </select>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* New Issue CTA */}
                  <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="btn-motion flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New Issue</span>
                  </button>
                </div>
              </div>

              {/* List or Empty State */}
              {filteredIssues.length === 0 ? (
                <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-9 h-9 rounded border border-[#1E2333] bg-[#121622] flex items-center justify-center text-[#8B949E]">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-white">No issues found</p>
                    <p className="text-[11px] text-[#8B949E] max-w-xs">
                      Create an issue or run an automated forensic scan from the AI Investigation tab.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="btn-motion px-3.5 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    New Issue
                  </button>
                </div>
              ) : (
                <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg divide-y divide-[#1E2333]/80 overflow-hidden">
                  {filteredIssues.map((issue) => (
                    <motion.div
                      key={issue.id}
                      onClick={() => openIssueDetail(issue)}
                      whileHover={{ backgroundColor: 'rgba(22, 27, 38, 0.7)' }}
                      className="px-4 py-3 flex items-center justify-between transition-colors duration-100 cursor-pointer text-xs select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-4">
                        <span className="font-mono text-[11px] text-[#F97316] font-medium shrink-0">
                          {issue.id}
                        </span>
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-medium text-[#E2E8F0] truncate">
                            {issue.title}
                          </span>
                          {issue.rootCause && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] bg-orange-500/10 text-[#F97316] border border-orange-500/30 flex items-center gap-1 font-mono">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>AI Diagnosed</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                              issue.severity === 'CRITICAL'
                                ? 'text-red-400 bg-red-950/40 border border-red-800/40'
                                : issue.severity === 'HIGH'
                                ? 'text-orange-400 bg-orange-950/40 border border-orange-800/40'
                                : 'text-[#8B949E] bg-[#161B26]'
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span className="text-[#8B949E] hidden sm:inline">•</span>
                          <span className="text-[#8B949E] hidden sm:inline">{issue.status}</span>
                        </div>

                        <span className="text-[#A0AEC0] w-24 text-right truncate hidden md:inline">
                          {issue.assigneeName || 'Unassigned'}
                        </span>

                        <span className="text-[#6E7681] text-[10px] w-16 text-right">
                          {new Date(issue.updatedAt || issue.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: UNIFIED AI INVESTIGATION & DIAGNOSTICS SUITE */}
      {/* ========================================================================= */}
      {subTab === 'investigation_deepdive' && (
        <div className="space-y-4">
          {activeInvestigation ? (
            <InvestigationScreen
              investigation={activeInvestigation}
              onBack={() => setSubTab('issues_list')}
              onVerifyFix={async () => {
                if (onVerifyFix && activeInvestigation.recommendedFix?.afterCode) {
                  await onVerifyFix(activeInvestigation.recommendedFix.afterCode);
                }
              }}
              isVerifying={isVerifying}
              onExportReport={() => {
                if (onExportReport) onExportReport();
              }}
              onOpenInExplorer={onOpenInExplorer}
            />
          ) : (
            <InvestigateView
              onStartInvestigation={async (files, projectName, pastedError, gitRepoUrl) => {
                if (onUploadAndScanFiles) {
                  await onUploadAndScanFiles(files, projectName, pastedError, gitRepoUrl);
                }
              }}
              onGoToDashboard={onGoToDashboard}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE NEW ISSUE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isNewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-2xl p-5 space-y-4 font-sans text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
                <h2 className="text-sm font-semibold text-white">Create New Issue</h2>
                <button
                  onClick={() => setIsNewModalOpen(false)}
                  className="text-[#8B949E] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateIssue} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8B949E] font-medium">Issue Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Authentication crash on startup"
                    className="w-full px-3 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8B949E] font-medium">Severity</label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as Severity)}
                      className="w-full px-2 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none"
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8B949E] font-medium">Assignee</label>
                    <select
                      value={newAssigneeId}
                      onChange={(e) => setNewAssigneeId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#8B949E] font-medium">Description</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Detailed failure description or environment logs..."
                    className="w-full px-3 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#8B949E] font-medium">Steps to Reproduce</label>
                  <textarea
                    rows={2}
                    value={newSteps}
                    onChange={(e) => setNewSteps(e.target.value)}
                    placeholder="1. Step one..."
                    className="w-full px-3 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2333]">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="btn-motion px-3 py-1.5 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-motion px-3.5 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer shadow-xs"
                  >
                    Create Issue
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
