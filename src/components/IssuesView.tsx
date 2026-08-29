import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  ArrowLeft, 
  ExternalLink, 
  MessageSquare, 
  Paperclip, 
  Send, 
  Check, 
  AlertCircle, 
  Clock, 
  User as UserIcon,
  ShieldAlert,
  FolderTree,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Issue, IssueComment, IssueAttachment, AuditEvent, Severity, Priority, IssueStatus, User } from '../types';

interface IssuesViewProps {
  onOpenInExplorer?: (file: string, line?: number) => void;
  currentUser: User;
  initialSelectedIssueId?: string | null;
}

export const IssuesView: React.FC<IssuesViewProps> = ({
  onOpenInExplorer,
  currentUser,
  initialSelectedIssueId,
}) => {
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
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

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
  }, []);

  useEffect(() => {
    if (initialSelectedIssueId && issues.length > 0) {
      const match = issues.find((i) => i.id === initialSelectedIssueId);
      if (match) openIssueDetail(match);
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
      const res = await fetch('/api/issues');
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const openIssueDetail = async (issue: Issue) => {
    setSelectedIssue(issue);
    try {
      const [commentsRes, auditRes] = await Promise.all([
        fetch(`/api/issues/${issue.id}/comments`),
        fetch(`/api/issues/${issue.id}/audit`),
      ]);
      if (commentsRes.ok) setComments(await commentsRes.json());
      if (auditRes.ok) setAuditEvents(await auditRes.json());
    } catch {
      // silent
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
          authorName: currentUser.name || 'Developer',
          authorRole: currentUser.role || 'DEVELOPER',
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [...prev, created]);
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const assignedUser = users.find((u) => u.id === newAssigneeId);
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
          assigneeId: newAssigneeId || currentUser.id,
          assigneeName: assignedUser?.name || currentUser.name,
          reporterId: currentUser.id,
          reporterName: currentUser.name,
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
    } catch (err) {
      console.error('Failed to create issue', err);
    }
  };

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = `${issue.id} ${issue.title} ${issue.description || ''} ${issue.assigneeName || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    if (statusFilter !== 'ALL' && issue.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (assigneeFilter !== 'ALL' && issue.assigneeId !== assigneeFilter) return false;
    return true;
  });

  const hasActiveFilters = statusFilter !== 'ALL' || severityFilter !== 'ALL' || assigneeFilter !== 'ALL';

  return (
    <div className="w-full max-w-5xl mx-auto py-4 font-sans select-none text-[#E2E8F0]">
      {/* ========================================================================= */}
      {/* 1. DETAIL VIEW (Single-Column Vertical Flow) */}
      {/* ========================================================================= */}
      {selectedIssue ? (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => setSelectedIssue(null)}
            className="flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to issues</span>
          </button>

          {/* Issue Header */}
          <div className="space-y-2 pb-4 border-b border-[#1E2333]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8B949E]">
              <span className="font-semibold text-[#F97316]">{selectedIssue.id}</span>
              <span>•</span>
              <span className="text-[#A0AEC0]">{selectedIssue.assigneeName ? `Assigned to ${selectedIssue.assigneeName}` : 'Unassigned'}</span>
            </div>

            <h1 className="text-lg font-semibold text-white tracking-tight">
              {selectedIssue.title}
            </h1>

            <div className="flex items-center gap-2 pt-1 text-xs">
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
              <span className="text-[#C9D1D9] font-medium">{selectedIssue.status}</span>
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
                      Expected
                    </span>
                    <p className="text-[11px] text-[#A0AEC0]">{selectedIssue.expectedResult}</p>
                  </div>
                )}
                {selectedIssue.actualResult && (
                  <div className="p-3 rounded bg-[#0D1017] border border-[#1E2333]">
                    <span className="text-[10px] font-semibold uppercase text-red-400/80 block mb-1">
                      Actual
                    </span>
                    <p className="text-[11px] text-red-300/90">{selectedIssue.actualResult}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BUGFORGE Investigation & Root Cause Section */}
          {selectedIssue.rootCause ? (
            <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                  <span className="text-xs font-semibold text-white">
                    BUGFORGE Investigation
                  </span>
                </div>
                {selectedIssue.confidence && (
                  <span className="text-[11px] font-mono text-[#8B949E]">
                    {selectedIssue.confidence}% confidence
                  </span>
                )}
              </div>

              <p className="text-xs text-[#C9D1D9] leading-relaxed">
                {selectedIssue.rootCause}
              </p>

              {selectedIssue.affectedFile && (
                <div className="pt-2 flex items-center justify-between border-t border-[#1E2333]">
                  <div className="font-mono text-[11px] text-[#8B949E]">
                    Affected: <span className="text-[#F97316]">{selectedIssue.affectedFile}{selectedIssue.affectedLine ? `:${selectedIssue.affectedLine}` : ''}</span>
                  </div>

                  {onOpenInExplorer && (
                    <button
                      onClick={() => onOpenInExplorer(selectedIssue.affectedFile!, selectedIssue.affectedLine)}
                      className="px-2.5 py-1 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-xs font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderTree className="w-3 h-3 text-[#F97316]" />
                      <span>Open in Explorer</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Comments */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-white tracking-wide">
              Comments ({comments.length})
            </h3>

            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded bg-[#0D1017] border border-[#1E2333] space-y-1.5 text-xs"
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
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 rounded bg-[#0D1017] border border-[#1E2333] text-xs text-white focus:outline-none focus:border-[#F97316]"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newCommentText.trim()}
                  className="px-3.5 py-2 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-xs font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. COMPACT ISSUES LIST VIEW */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1E2333]">
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">
                Issues
              </h1>
              <p className="text-xs text-[#8B949E] mt-0.5">
                All active issues for the current workspace
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
                  className="pl-8 pr-3 py-1.5 rounded bg-[#0D1017] border border-[#1E2333] hover:border-[#2B3245] focus:border-[#F97316] text-xs text-white focus:outline-none w-44 sm:w-56 transition-colors"
                />
              </div>

              {/* Filter Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer ${
                    hasActiveFilters
                      ? 'bg-[#F97316]/10 border-[#F97316]/40 text-[#F97316]'
                      : 'bg-[#0D1017] hover:bg-[#121622] border-[#1E2333] text-[#8B949E] hover:text-white'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span>Filter</span>
                  <ChevronDown className="w-3 h-3 text-[#8B949E]" />
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-xl p-3 space-y-3 z-50 text-xs">
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
                  </div>
                )}
              </div>

              {/* New Issue CTA */}
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold transition-colors cursor-pointer"
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
                <p className="text-xs font-medium text-white">No issues yet</p>
                <p className="text-[11px] text-[#8B949E] max-w-xs">
                  Create an issue when a problem needs investigation.
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="px-3.5 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold transition-colors cursor-pointer"
              >
                New Issue
              </button>
            </div>
          ) : (
            <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg divide-y divide-[#1E2333]/80">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => openIssueDetail(issue)}
                  className="px-4 py-3 flex items-center justify-between hover:bg-[#121622]/60 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-4 min-w-0 pr-4">
                    <span className="font-mono text-[11px] text-[#F97316] font-medium shrink-0">
                      {issue.id}
                    </span>
                    <span className="font-medium text-[#E2E8F0] truncate">
                      {issue.title}
                    </span>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. NEW ISSUE MODAL */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-2xl p-5 space-y-4 font-sans text-xs">
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
                  className="px-3 py-1.5 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs transition-colors cursor-pointer"
                >
                  Create Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
