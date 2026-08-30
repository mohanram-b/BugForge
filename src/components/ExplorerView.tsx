import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  File, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Search, 
  X,
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Loader2, 
  Edit3, 
  Eye, 
  Check, 
  GitCommit, 
  AlertCircle,
  FolderTree,
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CaseSensitive,
  WholeWord
} from 'lucide-react';
import { Investigation, FileTreeNode } from '../types';
import { buildFileTree, extractProjectIssues } from '../utils/bugScanner';
import { 
  maskSensitiveCode, 
  maskSensitiveLine, 
  countSensitiveMatches 
} from '../utils/securityMasker';
import { useActiveProject } from '../context/ActiveProjectContext';

interface ExplorerViewProps {
  files: Record<string, string>;
  investigation: Investigation | null;
  selectedFilePath?: string;
  selectedFileLine?: number;
  onSelectFile?: (path: string, line?: number) => void;
  onOpenInvestigation?: () => void;
  onNewInvestigation?: () => void;
  onGoToDashboard?: () => void;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  files,
  investigation,
  selectedFilePath,
  selectedFileLine,
  onSelectFile,
  onOpenInvestigation,
  onNewInvestigation,
  onGoToDashboard,
}) => {
  const { activeProject, updateActiveFile } = useActiveProject();
  const [activeFiles, setActiveFiles] = useState<Record<string, string>>(files);
  const [loadingFile, setLoadingFile] = useState<boolean>(false);

  // Active viewed file
  const [activeFile, setActiveFile] = useState<string>(() => {
    if (selectedFilePath && files[selectedFilePath]) return selectedFilePath;
    if (investigation?.recommendedFix?.file && files[investigation.recommendedFix.file]) {
      return investigation.recommendedFix.file;
    }
    const paths = Object.keys(files);
    return paths[0] || '';
  });

  // Source Viewer Editing & Sync State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedCode, setEditedCode] = useState<string>('');
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error'>('synced');
  const [pushResult, setPushResult] = useState<{
    success: boolean;
    message: string;
    commitSha?: string;
    commitUrl?: string;
  } | null>(null);

  // Security Credentials Masking
  const [isMaskingEnabled, setIsMaskingEnabled] = useState<boolean>(true);

  // Local File In-Code Search State
  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [searchMatchCase, setSearchMatchCase] = useState<boolean>(false);
  const [searchMatchWholeWord, setSearchMatchWholeWord] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(true);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeLine, setActiveLine] = useState<number | undefined>(selectedFileLine);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'app', 'components']));
  const [fileFilter, setFileFilter] = useState<string>('');

  const codeContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setActiveFiles(files);
    const paths = Object.keys(files);
    if (!activeFile && paths.length > 0) {
      setActiveFile(paths[0]);
    }
  }, [files]);

  useEffect(() => {
    if (activeFile && activeFiles[activeFile] !== undefined) {
      setEditedCode(activeFiles[activeFile]);
    }
  }, [activeFile, activeFiles]);

  useEffect(() => {
    if (selectedFilePath && activeFiles[selectedFilePath]) {
      setActiveFile(selectedFilePath);
      setActiveLine(selectedFileLine);
    }
  }, [selectedFilePath, selectedFileLine, activeFiles]);

  const filePaths = useMemo(() => Object.keys(activeFiles), [activeFiles]);
  const hasProject = Boolean(activeProject && (filePaths.length > 0 || activeProject.name));

  // Compute all issues and file errors across the workspace
  const detectedIssues = useMemo(() => {
    return extractProjectIssues(activeFiles, activeProject?.name || 'Active Project', activeProject?.id || 'PRJ-CURRENT');
  }, [activeFiles, activeProject?.name, activeProject?.id]);

  const errorFilesMap = useMemo(() => {
    const map: Record<string, { line: number; title: string; severity: string; id?: string }[]> = {};
    for (const iss of detectedIssues) {
      if (iss.affectedFile) {
        if (!map[iss.affectedFile]) map[iss.affectedFile] = [];
        map[iss.affectedFile].push({
          line: iss.affectedLine || 1,
          title: iss.title,
          severity: iss.severity,
          id: iss.id,
        });
      }
    }
    if (investigation?.recommendedFix?.file) {
      const fixFile = investigation.recommendedFix.file;
      if (!map[fixFile]) map[fixFile] = [];
      const alreadyHas = map[fixFile].some((e) => e.line === (investigation.recommendedFix?.line || 1));
      if (!alreadyHas) {
        map[fixFile].push({
          line: investigation.recommendedFix.line || 1,
          title: investigation.recommendedFix.title || investigation.recommendedFix.description || 'Root Cause Bug',
          severity: investigation.severity || 'CRITICAL',
          id: investigation.id,
        });
      }
    }
    return map;
  }, [detectedIssues, investigation]);

  // Helper to count recursive errors in a folder node
  const getFolderErrorCount = (node: FileTreeNode): number => {
    if (!node.isDirectory) {
      return errorFilesMap[node.path]?.length || 0;
    }
    let count = 0;
    if (node.children) {
      for (const child of node.children) {
        count += getFolderErrorCount(child);
      }
    }
    return count;
  };

  const currentFileErrors = useMemo(() => {
    return errorFilesMap[activeFile] || [];
  }, [errorFilesMap, activeFile]);

  const activeContent = activeFiles[activeFile] || '';

  const sensitiveMatchesCount = useMemo(() => {
    return countSensitiveMatches(editedCode || activeContent);
  }, [editedCode, activeContent]);

  const [currentErrorIdx, setCurrentErrorIdx] = useState<number>(0);

  const scrollToLine = (lineNum: number) => {
    setActiveLine(lineNum);
    const element = document.getElementById(`line-${lineNum}`);
    if (element && codeContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextError = () => {
    if (currentFileErrors.length === 0) return;
    const nextIdx = (currentErrorIdx + 1) % currentFileErrors.length;
    setCurrentErrorIdx(nextIdx);
    scrollToLine(currentFileErrors[nextIdx].line);
  };

  const handlePrevError = () => {
    if (currentFileErrors.length === 0) return;
    const prevIdx = (currentErrorIdx - 1 + currentFileErrors.length) % currentFileErrors.length;
    setCurrentErrorIdx(prevIdx);
    scrollToLine(currentFileErrors[prevIdx].line);
  };

  // Compute local search match occurrences across the active file
  const searchMatches = useMemo(() => {
    const query = localSearchQuery.trim();
    if (!query) return [];
    const content = isMaskingEnabled ? maskSensitiveCode(editedCode || activeContent) : (editedCode || activeContent);
    const lines = content.split('\n');
    const results: { lineNum: number; globalIndex: number; start: number; end: number; lineText: string }[] = [];
    let count = 0;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      let flags = 'g';
      if (!searchMatchCase) flags += 'i';

      try {
        let pattern = '';
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (searchMatchWholeWord) {
          pattern = `\\b${escaped}\\b`;
        } else {
          pattern = escaped;
        }

        const regex = new RegExp(pattern, flags);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          results.push({
            lineNum,
            globalIndex: count,
            start: match.index,
            end: match.index + match[0].length,
            lineText: line,
          });
          count++;
          if (regex.lastIndex === match.index) {
            regex.lastIndex++;
          }
        }
      } catch {
        const targetLine = searchMatchCase ? line : line.toLowerCase();
        const targetQuery = searchMatchCase ? query : query.toLowerCase();
        let pos = 0;
        while ((pos = targetLine.indexOf(targetQuery, pos)) !== -1) {
          results.push({
            lineNum,
            globalIndex: count,
            start: pos,
            end: pos + query.length,
            lineText: line,
          });
          count++;
          pos += Math.max(1, query.length);
        }
      }
    });

    return results;
  }, [localSearchQuery, searchMatchCase, searchMatchWholeWord, editedCode, activeContent, isMaskingEnabled]);

  // Unique lines that contain search matches
  const matchedLineNumbers = useMemo(() => {
    return Array.from(new Set(searchMatches.map((m) => m.lineNum)));
  }, [searchMatches]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(nextIdx);
    scrollToLine(searchMatches[nextIdx].lineNum);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIdx(prevIdx);
    scrollToLine(searchMatches[prevIdx].lineNum);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    setCurrentMatchIdx(0);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Keyboard shortcut (⌘F / Ctrl+F) to toggle and focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          }
        }, 50);
      } else if (e.key === 'Escape' && isSearchOpen) {
        if (localSearchQuery) {
          setLocalSearchQuery('');
        } else {
          setIsSearchOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, localSearchQuery]);

  // When search query or options change, jump to first match
  useEffect(() => {
    if (localSearchQuery.trim() && searchMatches.length > 0) {
      setCurrentMatchIdx(0);
      scrollToLine(searchMatches[0].lineNum);
    }
  }, [localSearchQuery, searchMatchCase, searchMatchWholeWord, activeFile]);

  // Build directory tree
  const treeNodes = useMemo(() => {
    const filtered = fileFilter
      ? filePaths.filter((p) => p.toLowerCase().includes(fileFilter.toLowerCase()))
      : filePaths;
    return buildFileTree(filtered);
  }, [filePaths, fileFilter]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleSelectFile = async (filePath: string) => {
    setActiveFile(filePath);
    setActiveLine(undefined);
    setPushResult(null);
    setCurrentErrorIdx(0);
    if (onSelectFile) onSelectFile(filePath);
  };

  const handleCodeChange = (newVal: string) => {
    setEditedCode(newVal);
    setSyncStatus('saving');
    // Debounce save locally
    setActiveFiles((prev) => ({ ...prev, [activeFile]: newVal }));
    updateActiveFile(activeFile, newVal);
    setTimeout(() => {
      setSyncStatus('synced');
    }, 400);
  };

  const handleSaveAndPush = async () => {
    if (!activeFile) return;
    setIsPushing(true);
    setSyncStatus('saving');
    try {
      await updateActiveFile(activeFile, editedCode);
      setSyncStatus('synced');
      setPushResult({
        success: true,
        message: `Saved ${activeFile} to active workspace.`,
      });
    } catch (err: any) {
      setSyncStatus('error');
      setPushResult({
        success: false,
        message: err.message || 'Failed to save file changes.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  // Recursive tree renderer
  const renderTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = activeFile === node.path;
      const isAffected =
        investigation?.recommendedFix?.file === node.path ||
        investigation?.rootCauses?.[0]?.affectedFiles?.some((c) => node.path.includes(c)) ||
        investigation?.blastRadius?.affectedFiles?.some((f) => f.path === node.path);

      if (node.isDirectory) {
        const nestedErrorCount = getFolderErrorCount(node);

        return (
          <div key={node.path}>
            <button
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="w-full flex items-center justify-between py-1 pr-2 text-[13px] text-[#8B949E] hover:text-white hover:bg-[#121622] rounded transition-colors text-left font-sans cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-[#6E7681] shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[#6E7681] shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-[#F97316]/80 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-[#8B949E] shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
              </div>

              {/* Nested Folder Error Indicator */}
              {nestedErrorCount > 0 && (
                <span
                  className="flex items-center gap-1 shrink-0"
                  title={`${nestedErrorCount} error(s) located in ${node.name}/`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]" />
                  <span className="text-[9px] font-mono font-medium text-rose-300 bg-rose-950/40 px-1 py-0.2 rounded border border-rose-800/30">
                    {nestedErrorCount}
                  </span>
                </span>
              )}
            </button>

            {isExpanded && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      const fileErrors = errorFilesMap[node.path];
      const hasErrors = Boolean(fileErrors && fileErrors.length > 0);

      return (
        <button
          key={node.path}
          onClick={() => handleSelectFile(node.path)}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          className={`w-full flex items-center justify-between py-1 pr-2 text-[13px] rounded transition-colors text-left font-sans cursor-pointer ${
            isSelected
              ? 'bg-[#161B26] text-white font-medium border-l-2 border-[#F97316]'
              : 'text-[#8B949E] hover:text-white hover:bg-[#121622]'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {node.name.endsWith('.ts') || node.name.endsWith('.tsx') || node.name.endsWith('.js') ? (
              <FileCode className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
            ) : node.name.endsWith('.json') ? (
              <FileText className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            ) : (
              <File className="w-3.5 h-3.5 text-[#6E7681] shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {/* Red Indication Mark for Bug / Error */}
          {hasErrors ? (
            <span className="flex items-center gap-1.5 shrink-0" title={`${fileErrors.length} bug(s) identified in file`}>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
              <span className="text-[9px] font-mono font-semibold tracking-tight text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40 leading-none">
                {fileErrors.length} {fileErrors.length === 1 ? 'bug' : 'bugs'}
              </span>
            </span>
          ) : isAffected ? (
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0" title="Affected by issue" />
          ) : null}
        </button>
      );
    });
  };

  // =========================================================================
  // STATE A: NO ACTIVE PROJECT LOADED -> BLOCKED EMPTY STATE WITH GO TO DASHBOARD
  // =========================================================================
  if (!hasProject) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 font-sans select-none text-[#E2E8F0] flex flex-col items-center justify-center">
        <div className="w-full bg-[#0D1017] border border-[#1E2333] rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl border border-[#1E2333] bg-[#121622] flex items-center justify-center text-[#8B949E]">
            <FolderTree className="w-6 h-6 text-[#F97316]" />
          </div>

          <div className="space-y-1 max-w-sm">
            <h2 className="text-base font-semibold text-white">No Project Loaded</h2>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Upload a project or connect a repository from the Dashboard to explore files and AST structures.
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

  // =========================================================================
  // STATE B: ACTIVE PROJECT LOADED -> 3-COLUMN EXPLORER WORKSPACE
  // =========================================================================
  return (
    <div className="w-full font-sans select-none text-[#E2E8F0] flex-1 flex flex-col min-h-0 space-y-3">
      {/* Top Project Sub-Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1E2333] text-xs">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-[#F97316]" />
          <span className="font-semibold text-white font-mono">{activeProject?.name}</span>
          <span className="px-2 py-0.2 rounded text-[10px] bg-[#161B26] text-[#8B949E] border border-[#2B3245]">
            {activeProject?.fileType || 'Source Project'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#8B949E] text-xs font-mono">
          <span>{filePaths.length} indexed files</span>
        </div>
      </div>

      {/* Main 3-Column Split View */}
      <div className="flex-1 grid grid-cols-12 gap-0 border border-[#1E2333] rounded-xl overflow-hidden min-h-[560px] bg-[#090A0F]">
        {/* ========================================================================= */}
        {/* COLUMN 1: FILE TREE (col-span-3) */}
        {/* ========================================================================= */}
        <div className="col-span-3 bg-[#0D1017] border-r border-[#1E2333] flex flex-col min-h-0">
          {/* File Filter Input */}
          <div className="p-2 border-b border-[#1E2333]">
            <div className="relative">
              <Search className="w-3 h-3 text-[#6E7681] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter files..."
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
                className="w-full pl-6 pr-2 py-1 bg-[#161B26] border border-[#1E2333] rounded text-xs text-white placeholder-[#6E7681] focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          {/* Tree Scroll Area */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {treeNodes.length > 0 ? (
              renderTree(treeNodes)
            ) : (
              <div className="py-6 text-center text-xs text-[#6E7681]">
                No matching files
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: SOURCE CODE VIEWER / EDITOR (col-span-6) */}
        {/* ========================================================================= */}
        <div className="col-span-6 flex flex-col bg-[#090A0F] border-r border-[#1E2333] overflow-hidden min-h-0">
          {/* Editor Header Bar */}
          <div className="px-3 py-2 border-b border-[#1E2333] bg-[#0B0E14] flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 font-mono truncate min-w-0">
              <span className="text-[#C9D1D9] text-[13px] font-medium truncate">{activeFile || 'No file selected'}</span>
              {loadingFile && <Loader2 className="w-3 h-3 animate-spin text-[#F97316]" />}
              {activeFiles[activeFile] !== editedCode && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                  Unsaved
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono">
              {/* Security Credentials Masking Toggle */}
              <button
                type="button"
                onClick={() => setIsMaskingEnabled(!isMaskingEnabled)}
                className={`px-2 py-1 rounded text-[11px] font-sans flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  isMaskingEnabled
                    ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/50'
                    : 'bg-amber-950/50 border-amber-800/50 text-amber-300 hover:bg-amber-900/50'
                }`}
                title={
                  isMaskingEnabled
                    ? 'Security Masking: ACTIVE. Sensitive API keys, client IDs, tokens, and credentials in displayed code are safely replaced with [REDACTED]. Click to toggle unmasking.'
                    : 'Security Masking: DISABLED. Raw credentials and tokens are visible. Click to re-enable masking.'
                }
              >
                {isMaskingEnabled ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                )}
                <span>{isMaskingEnabled ? 'Masked' : 'Raw'}</span>
                {sensitiveMatchesCount > 0 && isMaskingEnabled && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                    {sensitiveMatchesCount}
                  </span>
                )}
              </button>

              {/* Inline Source Viewer Sync Indicator */}
              <div className="flex items-center gap-1 text-[11px]">
                {syncStatus === 'saving' || isPushing ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-[10px] font-sans">Saving...</span>
                  </span>
                ) : syncStatus === 'error' ? (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[10px] font-sans">Error</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" />
                    <span className="text-[10px] font-sans">Synced</span>
                  </span>
                )}
              </div>

              {/* Search in File Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (!isSearchOpen) {
                    setTimeout(() => {
                      if (searchInputRef.current) {
                        searchInputRef.current.focus();
                        searchInputRef.current.select();
                      }
                    }, 50);
                  }
                }}
                className={`px-2 py-1 rounded text-[11px] font-sans flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  isSearchOpen
                    ? 'bg-[#F97316]/20 border-[#F97316]/50 text-[#F97316]'
                    : 'bg-[#161B26] border-[#1E2333] text-[#8B949E] hover:text-white'
                }`}
                title="Search in current file (⌘F / Ctrl+F)"
              >
                <Search className="w-3 h-3" />
                <span>Find</span>
                {searchMatches.length > 0 && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#F97316]/30 text-[#F97316] font-bold">
                    {searchMatches.length}
                  </span>
                )}
              </button>

              {/* Edit / View Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-2 py-1 rounded text-[11px] font-sans flex items-center gap-1 border transition-colors cursor-pointer ${
                  isEditing
                    ? 'bg-[#F97316]/20 border-[#F97316]/50 text-[#F97316]'
                    : 'bg-[#161B26] border-[#1E2333] text-[#8B949E] hover:text-white'
                }`}
                title="Toggle Edit Mode"
              >
                {isEditing ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                <span>{isEditing ? 'View Mode' : 'Edit Mode'}</span>
              </button>

              {/* Save Button */}
              <button
                type="button"
                onClick={() => handleSaveAndPush()}
                disabled={isPushing || !activeFile}
                className="px-2.5 py-1 rounded bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-[11px] font-sans flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                title="Save locally to active workspace (Ctrl+S / ⌘S)"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <GitCommit className="w-3 h-3" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Local In-File Search Bar */}
          {isSearchOpen && (
            <div className="px-3 py-2 bg-[#0B0F17] border-b border-[#1E2333] flex flex-wrap items-center justify-between gap-2 text-xs font-mono select-none z-10">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1 max-w-sm flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.shiftKey) {
                          handlePrevMatch();
                        } else {
                          handleNextMatch();
                        }
                      } else if (e.key === 'Escape') {
                        if (localSearchQuery) {
                          setLocalSearchQuery('');
                        } else {
                          setIsSearchOpen(false);
                        }
                      }
                    }}
                    placeholder="Search in this file (Enter for next, Shift+Enter for prev)..."
                    className="w-full pl-8 pr-7 py-1 rounded bg-[#05080E] border border-slate-700/80 focus:border-[#F97316] text-[#F1F5F9] placeholder:text-slate-500 text-xs font-mono focus:outline-none transition-all"
                  />
                  {localSearchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2 text-slate-400 hover:text-white cursor-pointer"
                      title="Clear search (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Match options: Match Case, Match Whole Word */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSearchMatchCase(!searchMatchCase)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                      searchMatchCase
                        ? 'bg-[#F97316]/20 border-[#F97316]/60 text-[#F97316] font-bold'
                        : 'bg-[#141C2B] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Match Case (Aa)"
                  >
                    Aa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMatchWholeWord(!searchMatchWholeWord)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                      searchMatchWholeWord
                        ? 'bg-[#F97316]/20 border-[#F97316]/60 text-[#F97316] font-bold'
                        : 'bg-[#141C2B] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Match Whole Word (\b)"
                  >
                    \b
                  </button>
                </div>
              </div>

              {/* Search Results Navigation & Stats */}
              <div className="flex items-center gap-2 shrink-0">
                {localSearchQuery.trim() ? (
                  searchMatches.length > 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {currentMatchIdx + 1} of {searchMatches.length} match{searchMatches.length === 1 ? '' : 'es'}
                      {searchMatches[currentMatchIdx] ? ` • Line ${searchMatches[currentMatchIdx].lineNum}` : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      No matches found
                    </span>
                  )
                ) : null}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMatch}
                    disabled={searchMatches.length === 0}
                    className="p-1 rounded bg-[#141C2B] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    title="Previous match (Shift+Enter)"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    disabled={searchMatches.length === 0}
                    className="p-1 rounded bg-[#141C2B] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    title="Next match (Enter)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="p-1 rounded bg-transparent hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                    title="Close search (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sensitive Credentials Redaction Notice */}
          {sensitiveMatchesCount > 0 && isMaskingEnabled && !isEditing && (
            <div className="px-3 py-1 bg-emerald-950/25 border-b border-emerald-800/30 flex items-center justify-between text-[11px] font-mono text-emerald-300/90 select-none">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {sensitiveMatchesCount} sensitive identifier{sensitiveMatchesCount === 1 ? '' : 's'} masked with <span className="text-emerald-200 font-bold">[REDACTED]</span> placeholders
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMaskingEnabled(false)}
                className="text-[10px] text-emerald-400 hover:text-emerald-200 underline shrink-0 cursor-pointer font-sans"
              >
                Reveal Raw
              </button>
            </div>
          )}

          {/* Save Result Banner */}
          {pushResult && (
            <div
              className={`px-3 py-1.5 border-b text-[11px] flex items-center justify-between ${
                pushResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-800/40 text-red-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {pushResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span className="truncate">{pushResult.message}</span>
              </div>
            </div>
          )}

          {/* Diagnostics Status Bar (When active file has identified bugs) */}
          {currentFileErrors.length > 0 && !isEditing && (
            <div className="px-3 py-1.5 bg-[#13080C] border-b border-rose-900/40 flex items-center justify-between text-xs font-mono select-none">
              <div className="flex items-center gap-2 text-rose-300 text-[11px] font-medium min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)] shrink-0" />
                <span className="truncate">
                  {currentFileErrors.length} {currentFileErrors.length === 1 ? 'Error' : 'Errors'} Identified in{' '}
                  <span className="text-white font-semibold">{activeFile.split('/').pop()}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevError}
                  className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-[10px] font-mono cursor-pointer transition-colors"
                  title="Jump to previous error"
                >
                  ▲ Prev
                </button>
                <button
                  type="button"
                  onClick={handleNextError}
                  className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-[10px] font-mono cursor-pointer transition-colors"
                  title="Jump to next error"
                >
                  ▼ Next
                </button>
              </div>
            </div>
          )}

          {/* Code Viewer / Editor Area */}
          {isEditing ? (
            <div className="flex-1 flex overflow-hidden bg-[#05070C]">
              {/* Line Gutter */}
              <div className="w-12 select-none shrink-0 py-3 bg-[#080B12] border-r border-[#1E2333] text-right pr-3 text-[12px] text-[#717E8C] font-mono tabular-nums overflow-hidden">
                {editedCode.split('\n').map((_, idx) => (
                  <div key={idx + 1} className="leading-[24px] h-[24px]">
                    {idx + 1}
                  </div>
                ))}
              </div>
              {/* Editable Textarea */}
              <textarea
                ref={textareaRef}
                value={editedCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const value = e.currentTarget.value;
                    const newValue = value.substring(0, start) + '  ' + value.substring(end);
                    handleCodeChange(newValue);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                      }
                    }, 0);
                  }
                }}
                spellCheck={false}
                placeholder="// Type or paste code here..."
                className="flex-1 p-3 bg-transparent text-[#F1F5F9] font-mono text-[13px] leading-[24px] tracking-[0.015em] resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-[#F97316]/30 selection:text-white"
              />
            </div>
          ) : (
            <div
              ref={codeContainerRef}
              className="flex-1 overflow-auto font-mono text-[13px] leading-[24px] tracking-[0.015em] bg-[#05070C] py-2"
            >
              {(editedCode || activeContent).split('\n').map((line, idx) => {
                const lineNum = idx + 1;
                const isTargetLine = activeLine === lineNum;
                const fileErrors = errorFilesMap[activeFile] || [];
                const lineError = fileErrors.find((e) => e.line === lineNum);
                const isErrorLine = Boolean(lineError);
                const isRootCauseLine =
                  investigation?.recommendedFix?.line === lineNum &&
                  investigation?.recommendedFix?.file === activeFile;

                const hasSearchMatches = matchedLineNumbers.includes(lineNum);
                const isCurrentActiveMatchLine = searchMatches[currentMatchIdx]?.lineNum === lineNum;

                // Render line content with highlighted search matches if any
                const renderLineContent = () => {
                  const displayLine = isMaskingEnabled ? maskSensitiveLine(line) : (line || ' ');
                  if (!localSearchQuery.trim() || searchMatches.length === 0 || !hasSearchMatches) {
                    return displayLine;
                  }

                  const lineMatches = searchMatches.filter((m) => m.lineNum === lineNum);
                  if (lineMatches.length === 0) {
                    return displayLine;
                  }

                  const sorted = [...lineMatches].sort((a, b) => a.start - b.start);
                  const nodes: React.ReactNode[] = [];
                  let lastPos = 0;

                  sorted.forEach((m, mIdx) => {
                    if (m.start > lastPos) {
                      nodes.push(displayLine.slice(lastPos, m.start));
                    }
                    const isCur = m.globalIndex === currentMatchIdx;
                    const matchedSnippet = displayLine.slice(m.start, m.end);
                    nodes.push(
                      <mark
                        key={`m-${lineNum}-${mIdx}-${m.start}`}
                        className={`rounded-xs transition-all ${
                          isCur
                            ? 'bg-[#F97316] text-black font-bold ring-2 ring-amber-300 shadow-[0_0_8px_rgba(249,115,22,0.9)] px-0.5'
                            : 'bg-amber-400/40 text-amber-100 border-b border-amber-400/80 px-0.5'
                        }`}
                      >
                        {matchedSnippet}
                      </mark>
                    );
                    lastPos = m.end;
                  });

                  if (lastPos < displayLine.length) {
                    nodes.push(displayLine.slice(lastPos));
                  }

                  return nodes;
                };

                return (
                  <div key={lineNum} id={`line-${lineNum}`} className="flex flex-col">
                    <div
                      className={`flex items-start transition-colors px-1 ${
                        isErrorLine
                          ? 'bg-rose-950/45 border-l-[3px] border-rose-500 shadow-[inset_0_0_12px_rgba(244,63,94,0.12)]'
                          : isRootCauseLine
                          ? 'bg-amber-950/40 border-l-[3px] border-amber-400 shadow-[inset_0_0_12px_rgba(251,191,36,0.1)]'
                          : isCurrentActiveMatchLine
                          ? 'bg-amber-500/25 border-l-[3px] border-[#F97316] shadow-[inset_0_0_12px_rgba(249,115,22,0.2)]'
                          : hasSearchMatches
                          ? 'bg-amber-500/10 border-l-[3px] border-amber-500/50'
                          : isTargetLine
                          ? 'bg-orange-500/20 border-l-[3px] border-[#F97316]'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Line Number Gutter */}
                      <span
                        className={`w-11 shrink-0 text-right pr-3 select-none text-[12px] tabular-nums font-mono leading-[24px] ${
                          isErrorLine
                            ? 'text-rose-400 font-bold'
                            : isRootCauseLine
                            ? 'text-amber-400 font-bold'
                            : isCurrentActiveMatchLine
                            ? 'text-[#F97316] font-bold'
                            : hasSearchMatches
                            ? 'text-amber-300 font-bold'
                            : isTargetLine
                            ? 'text-[#F97316] font-bold'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {lineNum}
                      </span>

                      {/* Error / Bug Red Indication Marker & Search Indicator */}
                      <span className="w-5 shrink-0 text-center select-none flex items-center justify-center pt-1.5">
                        {isErrorLine ? (
                          <span
                            className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] inline-block animate-pulse"
                            title={lineError?.title || 'Bug identified on line'}
                          />
                        ) : isRootCauseLine ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline" />
                        ) : isCurrentActiveMatchLine ? (
                          <span
                            className="w-2 h-2 rounded-full bg-[#F97316] shadow-[0_0_8px_rgba(249,115,22,1)] inline-block animate-pulse"
                            title={`Active search match on line ${lineNum}`}
                          />
                        ) : hasSearchMatches ? (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block"
                            title={`Search match on line ${lineNum}`}
                          />
                        ) : null}
                      </span>

                      {/* Code Line with high contrast & search highlighting */}
                      <pre
                        className={`flex-1 whitespace-pre font-mono text-[13px] leading-[24px] tracking-[0.015em] selection:bg-[#F97316]/30 selection:text-white ${
                          isErrorLine
                            ? 'text-rose-100 font-semibold'
                            : isRootCauseLine
                            ? 'text-amber-100 font-semibold'
                            : isTargetLine
                            ? 'text-white font-semibold'
                            : 'text-[#E2E8F0]'
                        }`}
                      >
                        {renderLineContent()}
                      </pre>
                    </div>

                    {/* Inline Technical Bug Diagnostic Card */}
                    {isErrorLine && lineError && (
                      <div className="my-2 ml-16 mr-3 p-3 rounded-lg bg-[#14090E] border border-rose-600/50 shadow-md flex items-start justify-between gap-3 text-xs font-mono select-text">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-bold tracking-wider shrink-0 uppercase shadow-xs">
                            {lineError.severity || 'HIGH'}
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-[12px] font-bold text-rose-100 truncate">
                              {lineError.title}
                            </div>
                            <div className="text-[11px] text-rose-300/90 leading-relaxed font-sans">
                              Line {lineNum} • Identified during static AST analysis &amp; failure triage
                            </div>
                          </div>
                        </div>
                        {onOpenInvestigation && (
                          <button
                            type="button"
                            onClick={onOpenInvestigation}
                            className="shrink-0 text-[11px] font-sans font-semibold text-rose-200 hover:text-white px-3 py-1.5 rounded-md bg-rose-900/60 hover:bg-rose-800/80 border border-rose-600/60 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                            <span>Investigate</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: COMPACT INVESTIGATION / AST PANEL (col-span-3) */}
        {/* ========================================================================= */}
        <div className="col-span-3 flex flex-col bg-[#0D1017] p-4 space-y-4 overflow-y-auto text-xs min-h-0">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
            <span className="font-semibold text-white">Investigation</span>
            {investigation && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                  investigation.severity === 'CRITICAL'
                    ? 'text-red-400 bg-red-950/40 border border-red-800/40'
                    : 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                }`}
              >
                {investigation.severity || 'CRITICAL'}
              </span>
            )}
          </div>

          {investigation ? (
            <div className="space-y-4">
              {/* Root Cause Summary */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8B949E] font-medium uppercase tracking-wider block">
                  Root Cause
                </span>
                <p className="text-[#C9D1D9] leading-relaxed">
                  {investigation.rootCauseAnalysis?.primaryRootCause ||
                    investigation.rootCauses?.[0]?.title ||
                    investigation.rootCauseAnalysis?.failureSummary ||
                    investigation.failureSummary ||
                    investigation.errorSummary ||
                    'Failure identified in workspace.'}
                </p>
              </div>

              {/* Confidence & Evidence Count */}
              <div className="p-2.5 rounded bg-[#121622] border border-[#1E2333] space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#8B949E]">Confidence</span>
                  <span className="text-[#F97316] font-bold">
                    {investigation.confidenceScore || investigation.confidence || 94}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8B949E]">Evidence Signals</span>
                  <span className="text-white">
                    {investigation.latentSignals?.length ||
                      investigation.evidence?.length ||
                      investigation.rootCauses?.[0]?.evidenceItems?.length ||
                      0}
                  </span>
                </div>
              </div>

              {/* Open Full Investigation Button */}
              {onOpenInvestigation && (
                <button
                  type="button"
                  onClick={onOpenInvestigation}
                  className="w-full px-3 py-2 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-xs font-medium text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Open Full Analysis</span>
                </button>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2 text-[#8B949E]">
              <p className="text-xs">No active diagnosis for this file.</p>
              {onNewInvestigation && (
                <button
                  type="button"
                  onClick={onNewInvestigation}
                  className="px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold cursor-pointer"
                >
                  Diagnose Codebase
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
