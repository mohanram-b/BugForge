import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  UploadCloud, 
  ExternalLink,
  RefreshCw,
  GitBranch,
  Github,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Edit3,
  Check,
  GitCommit
} from 'lucide-react';
import { Investigation, Severity, FileTreeNode } from '../types';
import { buildFileTree } from '../utils/bugScanner';

interface ExplorerViewProps {
  files: Record<string, string>;
  investigation: Investigation | null;
  selectedFilePath?: string;
  selectedFileLine?: number;
  onSelectFile?: (path: string, line?: number) => void;
  onOpenInvestigation?: () => void;
  onNewInvestigation?: () => void;
  onUploadProject?: (files: Record<string, string>, projectName: string) => void;
  connectedRepo?: string;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  files,
  investigation,
  selectedFilePath,
  selectedFileLine,
  onSelectFile,
  onOpenInvestigation,
  onNewInvestigation,
  onUploadProject,
  connectedRepo: initialConnectedRepo,
}) => {
  const [activeFiles, setActiveFiles] = useState<Record<string, string>>(files);
  const [repoName, setRepoName] = useState<string>(initialConnectedRepo || '');
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [branches, setBranches] = useState<string[]>(['main']);
  const [loadingBranch, setLoadingBranch] = useState<boolean>(false);
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState<boolean>(false);

  // GitHub Connect Modal
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [inputRepo, setInputRepo] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Active viewed file
  const [activeFile, setActiveFile] = useState<string>(() => {
    if (selectedFilePath && files[selectedFilePath]) return selectedFilePath;
    if (investigation?.recommendedFix?.file && files[investigation.recommendedFix.file]) {
      return investigation.recommendedFix.file;
    }
    const paths = Object.keys(files);
    return paths[0] || '';
  });

  // Source Viewer Editing & GitHub Sync State
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

  const [activeLine, setActiveLine] = useState<number | undefined>(selectedFileLine);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'app', 'components']));
  const [fileFilter, setFileFilter] = useState<string>('');
  const [inCodeSearch, setInCodeSearch] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Keyboard shortcut: Ctrl+S / Cmd+S to Save and Push directly to GitHub
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAndPush();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, editedCode, repoName, selectedBranch, activeFiles]);

  const filePaths = useMemo(() => Object.keys(activeFiles), [activeFiles]);
  const hasProject = filePaths.length > 0 || !!repoName;

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
    if (onSelectFile) onSelectFile(filePath);

    // If file content is missing or placeholder and repo is connected, lazy-fetch from GitHub
    if ((!activeFiles[filePath] || activeFiles[filePath].startsWith('// [Binary')) && repoName) {
      setLoadingFile(true);
      try {
        const res = await fetch(`/api/github/file?repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(selectedBranch)}&path=${encodeURIComponent(filePath)}`);
        if (res.ok) {
          const data = await res.json();
          setActiveFiles((prev) => ({ ...prev, [filePath]: data.content }));
          setEditedCode(data.content);
        }
      } catch (err) {
        console.error('Failed to lazy load file content', err);
      } finally {
        setLoadingFile(false);
      }
    }
  };

  // Save changes locally and automatically push to GitHub
  const handleSaveAndPush = async (overrideContent?: string) => {
    if (!activeFile) return;

    const contentToPush = overrideContent !== undefined ? overrideContent : editedCode;

    // 1. Update local files map
    const updatedFiles = {
      ...activeFiles,
      [activeFile]: contentToPush,
    };
    setActiveFiles(updatedFiles);
    if (onUploadProject) {
      onUploadProject(updatedFiles, repoName || 'workspace');
    }

    // 2. Trigger automatic push request to the backend service
    setIsPushing(true);
    setSyncStatus('saving');
    setPushResult(null);

    const targetRepo = repoName || 'mohanram-b/BugForge';
    const targetBranch = selectedBranch || 'main';

    try {
      const res = await fetch('/api/github/push-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: targetRepo,
          branch: targetBranch,
          path: activeFile,
          content: contentToPush,
          commitMessage: `Update ${activeFile} via BUGFORGE Source Viewer`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSyncStatus('error');
        setPushResult({
          success: false,
          message: data.message || 'Push to remote repository failed.',
        });
      } else {
        setSyncStatus('synced');
        setPushResult({
          success: true,
          message: data.message || `Saved and pushed to ${targetRepo}@${targetBranch}`,
          commitSha: data.commitSha,
          commitUrl: data.commitUrl,
        });
      }
    } catch (err: any) {
      setSyncStatus('error');
      setPushResult({
        success: false,
        message: err.message || 'Network error while attempting to push to GitHub.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  // Handle Code Change with live Auto-Sync to GitHub
  const handleCodeChange = (newCode: string) => {
    setEditedCode(newCode);
    setSyncStatus('saving');

    // Debounce auto-push to GitHub (1.5s after user stops typing)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveAndPush(newCode);
    }, 1500);
  };

  // GitHub Import
  const handleConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRepo.trim() || !inputRepo.includes('/')) {
      setGithubError('Please enter a valid "owner/repo" format (e.g. expressjs/express)');
      return;
    }

    setIsImporting(true);
    setGithubError(null);
    try {
      // 1. Fetch branches
      const branchRes = await fetch(`/api/github/branches?repo=${encodeURIComponent(inputRepo.trim())}`);
      const branchData = await branchRes.json();
      if (!branchRes.ok) {
        throw new Error(branchData.message || 'Failed to fetch repository branches');
      }

      setBranches(branchData.branches || ['main']);
      const defaultBranch = branchData.defaultBranch || 'main';
      setSelectedBranch(defaultBranch);

      // 2. Import tree
      const importRes = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: inputRepo.trim(),
          branch: defaultBranch,
          showIgnored,
        }),
      });

      const importData = await importRes.json();
      if (!importRes.ok) {
        throw new Error(importData.message || 'Failed to import repository tree');
      }

      // Populate file map from tree items
      const newFiles: Record<string, string> = { ...importData.preloadedFiles };
      if (Array.isArray(importData.tree)) {
        importData.tree.forEach((item: any) => {
          if (item.type === 'blob' && !newFiles[item.path]) {
            newFiles[item.path] = ''; // lazy loaded
          }
        });
      }

      setRepoName(inputRepo.trim());
      setActiveFiles(newFiles);
      setIsConnectModalOpen(false);

      const paths = Object.keys(newFiles);
      if (paths.length > 0) {
        handleSelectFile(paths[0]);
      }
      if (onUploadProject) {
        onUploadProject(newFiles, inputRepo.trim());
      }
    } catch (err: any) {
      setGithubError(err.message || 'Failed to connect to GitHub repository');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBranchChange = async (newBranch: string) => {
    setSelectedBranch(newBranch);
    if (!repoName) return;

    setLoadingBranch(true);
    try {
      const importRes = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoName,
          branch: newBranch,
          showIgnored,
        }),
      });

      if (importRes.ok) {
        const importData = await importRes.json();
        const newFiles: Record<string, string> = { ...importData.preloadedFiles };
        if (Array.isArray(importData.tree)) {
          importData.tree.forEach((item: any) => {
            if (item.type === 'blob' && !newFiles[item.path]) {
              newFiles[item.path] = '';
            }
          });
        }
        setActiveFiles(newFiles);
        const paths = Object.keys(newFiles);
        if (paths.length > 0) {
          handleSelectFile(paths[0]);
        }
      }
    } catch (err) {
      console.error('Failed to switch branch', err);
    } finally {
      setLoadingBranch(false);
    }
  };

  // Upload local project
  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.zip') || filename.endsWith('.apk') || filename.endsWith('.aab')) {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const filesMap: Record<string, string> = {};

      const entries = Object.keys(loadedZip.files);
      for (const relPath of entries) {
        const entry = loadedZip.files[relPath];
        if (!entry.dir && !relPath.startsWith('__MACOSX/')) {
          try {
            filesMap[relPath] = await entry.async('string');
          } catch {
            filesMap[relPath] = `// [Binary Resource: ${relPath}]`;
          }
        }
      }

      setRepoName(file.name.replace(/\.[^/.]+$/, ''));
      setActiveFiles(filesMap);
      const paths = Object.keys(filesMap);
      if (paths.length > 0) handleSelectFile(paths[0]);
      if (onUploadProject) onUploadProject(filesMap, file.name);
    } else {
      const text = await file.text();
      const filesMap = { [file.name]: text };
      setRepoName('Local Files');
      setActiveFiles(filesMap);
      handleSelectFile(file.name);
      if (onUploadProject) onUploadProject(filesMap, file.name);
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
        return (
          <div key={node.path}>
            <button
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="w-full flex items-center gap-1.5 py-1 text-[13px] text-[#8B949E] hover:text-white hover:bg-[#121622] rounded transition-colors text-left font-sans"
            >
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
            </button>

            {isExpanded && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <button
          key={node.path}
          onClick={() => handleSelectFile(node.path)}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          className={`w-full flex items-center justify-between py-1 pr-2 text-[13px] rounded transition-colors text-left font-sans ${
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

          {isAffected && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0" title="Affected by issue" />
          )}
        </button>
      );
    });
  };

  const activeContent = activeFiles[activeFile] ?? '';
  const lines = useMemo(() => activeContent.split('\n'), [activeContent]);

  // If no project is loaded, display the clean mandated Empty Explorer State
  if (!hasProject) {
    return (
      <div className="w-full max-w-5xl mx-auto py-8 font-sans select-none text-[#E2E8F0]">
        <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-10 h-10 rounded border border-[#1E2333] bg-[#121622] flex items-center justify-center text-[#8B949E]">
            <Github className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">Explorer</h2>
            <p className="text-xs text-[#8B949E]">No project loaded.</p>
            <p className="text-xs text-[#6E7681]">
              Connect a GitHub repository or upload a project to begin.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="px-3.5 py-1.5 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Connect GitHub</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Upload Project</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalUpload}
              className="hidden"
              accept=".apk,.aab,.zip,.log,.txt,.json,.js,.ts,.java,.kt"
            />
          </div>
        </div>

        {/* GitHub Connect Modal */}
        {isConnectModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-2xl p-5 space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
                <span className="font-semibold text-white text-sm">Connect GitHub Repository</span>
                <button
                  onClick={() => setIsConnectModalOpen(false)}
                  className="text-[#8B949E] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {githubError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{githubError}</span>
                </div>
              )}

              <form onSubmit={handleConnectGitHub} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8B949E] font-medium">Repository Path</label>
                  <input
                    type="text"
                    required
                    value={inputRepo}
                    onChange={(e) => setInputRepo(e.target.value)}
                    placeholder="e.g. facebook/react or vercel/next.js"
                    className="w-full px-3 py-1.5 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] font-mono text-xs"
                  />
                  <p className="text-[10px] text-[#6E7681]">
                    Enter public repository or configure GITHUB_TOKEN in Settings for private repos.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2333]">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-3 py-1.5 rounded bg-[#161B26] border border-[#2B3245] text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="px-3.5 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Import Repository</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3-COLUMN RESTRAINED WORKSPACE
  // =========================================================================
  return (
    <div className="w-full h-[calc(100vh-68px)] max-w-7xl mx-auto flex flex-col font-sans select-none text-[#E2E8F0] pb-2">
      {/* Top Breadcrumb & Repository Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1E2333] bg-[#090A0F] text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[#8B949E]">Explorer</span>
          <span className="text-[#6E7681]">/</span>
          <span className="text-white font-medium">{repoName || 'workspace'}</span>
          {branches.length > 1 && (
            <div className="flex items-center gap-1 ml-2">
              <GitBranch className="w-3 h-3 text-[#F97316]" />
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                disabled={loadingBranch}
                className="bg-[#121622] border border-[#1E2333] text-[11px] text-[#C9D1D9] rounded px-1.5 py-0.5 focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Small, Persistent Remote Sync Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all duration-200 ${
              syncStatus === 'saving' || isPushing
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 animate-pulse'
                : syncStatus === 'error'
                ? 'bg-red-950/40 border-red-500/40 text-red-300'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
            }`}
            title={
              syncStatus === 'saving' || isPushing
                ? 'Detected changes. Syncing and pushing to GitHub...'
                : syncStatus === 'error'
                ? 'Failed to push to GitHub'
                : 'Remote repository is up-to-date'
            }
          >
            {syncStatus === 'saving' || isPushing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                <span className="font-sans font-medium">Syncing...</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="font-sans font-medium">Sync Error</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="font-sans font-medium">Synced</span>
              </>
            )}
          </div>

          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="text-[11px] text-[#8B949E] hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-[#121622] border border-[#1E2333] cursor-pointer"
          >
            <Github className="w-3 h-3" />
            <span>Switch Repo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] text-[#8B949E] hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-[#121622] border border-[#1E2333] cursor-pointer"
          >
            <UploadCloud className="w-3 h-3" />
            <span>Upload</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLocalUpload}
            className="hidden"
            accept=".apk,.aab,.zip,.log,.txt,.json,.js,.ts,.java,.kt"
          />
        </div>
      </div>

      {/* 3 Columns */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden bg-[#090A0F]">
        {/* ========================================================================= */}
        {/* COLUMN 1: FILE TREE (col-span-3) */}
        {/* ========================================================================= */}
        <div className="col-span-3 border-r border-[#1E2333] flex flex-col bg-[#0D1017]">
          {/* File filter search */}
          <div className="p-2 border-b border-[#1E2333]">
            <div className="relative">
              <Search className="w-3 h-3 text-[#6E7681] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-6 pr-2 py-1 rounded bg-[#161B26] border border-[#1E2333] text-[12px] text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Tree Scroll Area */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {renderTree(treeNodes)}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: SOURCE VIEWER (col-span-6) */}
        {/* ========================================================================= */}
        <div className="col-span-6 flex flex-col bg-[#090A0F] border-r border-[#1E2333] overflow-hidden">
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
              {/* Inline Source Viewer Sync Indicator */}
              <div className="flex items-center gap-1 text-[11px]">
                {syncStatus === 'saving' || isPushing ? (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-[10px] font-sans">Syncing...</span>
                  </span>
                ) : syncStatus === 'error' ? (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[10px] font-sans">Sync failed</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" />
                    <span className="text-[10px] font-sans">Synced</span>
                  </span>
                )}
              </div>

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

              {/* Save & Push to GitHub Button */}
              <button
                type="button"
                onClick={() => handleSaveAndPush()}
                disabled={isPushing || !activeFile}
                className="px-2.5 py-1 rounded bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-[11px] font-sans flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                title="Save locally and automatically push to GitHub (Ctrl+S / ⌘S)"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Pushing...</span>
                  </>
                ) : (
                  <>
                    <GitCommit className="w-3 h-3" />
                    <span>Save & Push</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* GitHub Push Result Notification Banner */}
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
              {pushResult.commitUrl && (
                <a
                  href={pushResult.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 underline text-emerald-400 hover:text-emerald-200 shrink-0 ml-2"
                >
                  <span>View Commit</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Code Viewer / Editor */}
          {isEditing ? (
            <div className="flex-1 flex overflow-hidden bg-[#07090E]">
              {/* Line Gutter */}
              <div className="w-12 select-none shrink-0 py-2 bg-[#0A0D14] border-r border-[#1E2333] text-right pr-2 text-[12px] text-[#484F58] font-mono overflow-hidden">
                {editedCode.split('\n').map((_, idx) => (
                  <div key={idx + 1} className="leading-[20px] h-[20px]">
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
                  // Support tab key indentation
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
                className="flex-1 p-2 bg-transparent text-[#C9D1D9] font-mono text-[13px] leading-[20px] resize-none focus:outline-none overflow-auto whitespace-pre"
              />
            </div>
          ) : (
            <div
              ref={codeContainerRef}
              className="flex-1 overflow-auto font-mono text-[13px] leading-[20px] bg-[#07090E] p-2"
            >
              {(editedCode || activeContent).split('\n').map((line, idx) => {
                const lineNum = idx + 1;
                const isTargetLine = activeLine === lineNum;
                const isRootCauseLine =
                  investigation?.recommendedFix?.line === lineNum &&
                  investigation?.recommendedFix?.file === activeFile;

                return (
                  <div
                    key={lineNum}
                    id={`line-${lineNum}`}
                    className={`flex items-start transition-colors ${
                      isRootCauseLine
                        ? 'bg-amber-500/10 border-l-2 border-amber-400'
                        : isTargetLine
                        ? 'bg-white/5 border-l-2 border-[#F97316]'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Line Number Gutter */}
                    <span className="w-10 shrink-0 text-right pr-3 select-none text-[12px] text-[#484F58]">
                      {lineNum}
                    </span>

                    {/* Root Cause Gutter Marker */}
                    <span className="w-4 shrink-0 text-center select-none">
                      {isRootCauseLine && <AlertTriangle className="w-3 h-3 text-amber-400 inline" />}
                    </span>

                    {/* Code Line */}
                    <pre className="flex-1 text-[#C9D1D9] whitespace-pre font-mono text-[13px]">
                      {line || ' '}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: COMPACT INVESTIGATION PANEL (col-span-3) */}
        {/* ========================================================================= */}
        <div className="col-span-3 flex flex-col bg-[#0D1017] p-4 space-y-4 overflow-y-auto text-xs">
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
                {investigation.severity}
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
                    investigation.rootCauseAnalysis?.failureSummary ||
                    investigation.errorSummary}
                </p>
              </div>

              {/* Confidence & Evidence Count */}
              <div className="p-2.5 rounded bg-[#121622] border border-[#1E2333] space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#8B949E]">Confidence</span>
                  <span className="text-[#F97316] font-bold">{investigation.confidenceScore}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8B949E]">Evidence Signals</span>
                  <span className="text-white">{investigation.latentSignals?.length || 0}</span>
                </div>
              </div>

              {/* Open Full Investigation Button */}
              {onOpenInvestigation && (
                <button
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
              <p className="text-xs">No active investigation for this file.</p>
              <button
                onClick={onNewInvestigation}
                className="px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold cursor-pointer"
              >
                Run Investigation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
