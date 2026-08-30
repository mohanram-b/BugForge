import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  Github, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  FolderTree, 
  Play, 
  FileCode, 
  FileArchive, 
  Smartphone, 
  X 
} from 'lucide-react';
import { useActiveProject } from '../context/ActiveProjectContext';
import { Investigation, Issue, ProjectType } from '../types';

interface DashboardViewProps {
  investigations?: Investigation[];
  onOpenInvestigation?: (inv: Investigation) => void;
  onNewInvestigation: () => void;
  onOpenExplorer?: (file?: string, line?: number) => void;
  onNavigateToIssues?: () => void;
  onSelectIssue?: (issue: Issue) => void;
  onUploadAndScanFiles?: (files: Record<string, string>, projectName: string, error?: string, repo?: string) => void;
  onConnectGitHub?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNewInvestigation,
  onOpenExplorer,
  onUploadAndScanFiles,
}) => {
  const { 
    activeProject, 
    loadingActiveProject, 
    projectFiles, 
    uploadAndSetActiveProject, 
    removeActiveProject 
  } = useActiveProject();

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remove Project Confirmation Modal
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  // GitHub Import Modal
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [gitRepoInput, setGitRepoInput] = useState<string>('');
  const [isImportingGit, setIsImportingGit] = useState<boolean>(false);
  const [gitError, setGitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Format bytes to human readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Determine project type and ProjectType enum from filename
  const detectProjectType = (filename: string): { displayType: string; projectType: ProjectType } => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.apk')) return { displayType: 'Android APK', projectType: 'android_apk' };
    if (lower.endsWith('.aab')) return { displayType: 'Android App Bundle', projectType: 'android_aab' };
    if (lower.endsWith('.zip')) return { displayType: 'ZIP Archive', projectType: 'zip_archive' };
    if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.ts') || lower.endsWith('.tsx')) {
      return { displayType: 'TypeScript / JavaScript', projectType: 'source_project' };
    }
    if (lower.endsWith('.java') || lower.endsWith('.kt')) {
      return { displayType: 'Java / Kotlin Source', projectType: 'source_project' };
    }
    return { displayType: 'Source Project', projectType: 'source_project' };
  };

  // Format upload time relative/friendly
  const formatUploadDate = (isoString?: string): string => {
    if (!isoString) return 'Uploaded recently';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Uploaded today at ${timeStr}`;
      }
      return `Uploaded on ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
    } catch {
      return 'Uploaded recently';
    }
  };

  // Process Real File Upload
  const handleFileUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setErrorMessage(null);
    setUploadingFileName(file.name);
    setUploadProgress(0);

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 85);
        setUploadProgress(percent);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file. Please try again.');
      setUploadProgress(null);
      setUploadingFileName('');
    };

    reader.onload = async (event) => {
      setUploadProgress(90);
      try {
        const lowerName = file.name.toLowerCase();
        const filesMap: Record<string, string> = {};

        if (lowerName.endsWith('.zip') || lowerName.endsWith('.apk') || lowerName.endsWith('.aab')) {
          const buffer = event.target?.result as ArrayBuffer;
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          const loadedZip = await zip.loadAsync(buffer);

          const entries = Object.keys(loadedZip.files);
          for (const relPath of entries) {
            const entry = loadedZip.files[relPath];
            if (!entry.dir) {
              const isBinary =
                relPath.endsWith('.png') ||
                relPath.endsWith('.jpg') ||
                relPath.endsWith('.ico') ||
                relPath.endsWith('.dex') ||
                relPath.endsWith('.so') ||
                relPath.endsWith('.jar') ||
                relPath.endsWith('.arsc');

              if (!isBinary) {
                try {
                  const text = await entry.async('string');
                  filesMap[relPath] = text;
                } catch {
                  filesMap[relPath] = `[Binary Content: ${entry.name}]`;
                }
              } else {
                filesMap[relPath] = `[Binary Asset: ${entry.name}]`;
              }
            }
          }

          if (Object.keys(filesMap).length === 0) {
            filesMap['AndroidManifest.xml'] = `<!-- Android Package ${file.name} -->\n<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.app">\n  <application android:label="${file.name}">\n    <activity android:name=".MainActivity" />\n  </application>\n</manifest>`;
          }
        } else {
          const text = event.target?.result as string;
          filesMap[file.name] = text || `// File: ${file.name}\n// Size: ${file.size} bytes`;
        }

        setUploadProgress(98);

        const { displayType, projectType } = detectProjectType(file.name);
        const formattedSize = formatFileSize(file.size);

        await uploadAndSetActiveProject(
          filesMap,
          file.name,
          displayType,
          formattedSize,
          file.size,
          projectType
        );

        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(null);
          setUploadingFileName('');
        }, 400);

        if (onUploadAndScanFiles) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          onUploadAndScanFiles(filesMap, cleanName);
        }
      } catch (err: any) {
        console.error('File parsing error:', err);
        setErrorMessage(err.message || 'Failed to parse file archive.');
        setUploadProgress(null);
        setUploadingFileName('');
      }
    };

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.zip') || lowerName.endsWith('.apk') || lowerName.endsWith('.aab')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // GitHub Repository Connect
  const handleConnectGitHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitRepoInput.trim()) return;

    let repo = gitRepoInput.trim();
    repo = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    if (!repo.includes('/')) {
      setGitError('Please enter a valid format: "owner/repo"');
      return;
    }

    setIsImportingGit(true);
    setGitError(null);

    try {
      const res = await fetch(`/api/github/tree?repo=${encodeURIComponent(repo)}&branch=main`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to connect repository. Verify repo name.');
      }

      const data = await res.json();
      const tree = data.tree || [];
      const filesMap: Record<string, string> = {};

      const blobFiles = tree
        .filter((t: any) => t.type === 'blob' && !t.path.startsWith('.'))
        .slice(0, 40);

      await Promise.all(
        blobFiles.map(async (fileNode: any) => {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${fileNode.path}`;
            const fileRes = await fetch(rawUrl);
            if (fileRes.ok) {
              const text = await fileRes.text();
              filesMap[fileNode.path] = text;
            } else {
              filesMap[fileNode.path] = `// Remote GitHub file: ${fileNode.path}`;
            }
          } catch {
            filesMap[fileNode.path] = `// Remote GitHub file: ${fileNode.path}`;
          }
        })
      );

      if (Object.keys(filesMap).length === 0) {
        filesMap['README.md'] = `# ${repo}\n\nImported from GitHub repository.`;
      }

      const repoName = repo.split('/')[1] || repo;

      await uploadAndSetActiveProject(
        filesMap,
        repoName,
        'GitHub Repository',
        'Remote Repo',
        0,
        'github_repo',
        `https://github.com/${repo}`,
        'main'
      );

      setIsGitHubModalOpen(false);
      setGitRepoInput('');

      if (onUploadAndScanFiles) {
        onUploadAndScanFiles(filesMap, repoName, undefined, `https://github.com/${repo}`);
      }
    } catch (err: any) {
      console.error('GitHub connection error:', err);
      setGitError(err.message || 'Failed to import repository.');
    } finally {
      setIsImportingGit(false);
    }
  };

  // Remove Project Execution
  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    try {
      await removeActiveProject();
      setIsRemoveModalOpen(false);
    } catch (err: any) {
      console.error('Failed to remove project:', err);
      setErrorMessage(err.message || 'Failed to remove project.');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleStartInvestigation = () => {
    if (activeProject && onUploadAndScanFiles) {
      const cleanName = activeProject.name.replace(/\.[^/.]+$/, '');
      onUploadAndScanFiles(projectFiles, cleanName);
    }
    onNewInvestigation();
  };

  // Loading indicator for active project initialization
  if (loadingActiveProject && !activeProject) {
    return (
      <div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-center font-sans text-[#8B949E]">
        <div className="flex items-center gap-3 text-xs">
          <Loader2 className="w-4 h-4 text-[#F97316] animate-spin" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ACTIVE PROJECT EXISTS -> CURRENT PROJECT DASHBOARD
  // =========================================================================
  if (activeProject) {
    const fileCount = activeProject.indexedFileCount || Object.keys(projectFiles).length || 1;

    return (
      <div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-8 font-sans text-[#E2E8F0] select-none">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[620px]"
        >
          {/* Main Card */}
          <div className="bg-[#0D1017] border border-[#1E2333] rounded-xl shadow-xl overflow-hidden vector-card-border">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1E2333] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  Current Project
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Ready</span>
              </div>
            </div>

            {/* Project Details Body */}
            <div className="p-6 space-y-5">
              
              {/* Project Title and Icon */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#141824] border border-[#222738] flex items-center justify-center text-[#F97316] shrink-0">
                  {activeProject.projectType === 'android_apk' || activeProject.projectType === 'android_aab' ? (
                    <Smartphone className="w-6 h-6" />
                  ) : activeProject.projectType === 'zip_archive' ? (
                    <FileArchive className="w-6 h-6" />
                  ) : activeProject.projectType === 'github_repo' ? (
                    <Github className="w-6 h-6" />
                  ) : (
                    <FileCode className="w-6 h-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-white font-mono truncate" title={activeProject.name}>
                    {activeProject.name}
                  </h2>
                  <p className="text-xs text-[#8B949E] mt-0.5">
                    {activeProject.fileType || 'Source Project'}
                  </p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-3 gap-3 bg-[#07090E] border border-[#1A1F2C] rounded-lg p-3.5 text-xs">
                <div>
                  <span className="text-[11px] text-[#6E7681] block">Size</span>
                  <span className="text-[#C9D1D9] font-mono font-medium">{activeProject.fileSize}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6E7681] block">Status</span>
                  <span className="text-emerald-400 font-medium">{activeProject.status || 'Ready'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6E7681] block">Indexed Files</span>
                  <span className="text-[#C9D1D9] font-mono font-medium">{fileCount}</span>
                </div>
              </div>

              {/* Upload Timestamp */}
              <div className="text-xs text-[#6E7681] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{formatUploadDate(activeProject.uploadedAt)}</span>
              </div>

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenExplorer}
                  className="btn-motion py-2.5 px-4 rounded-lg bg-[#141824] hover:bg-[#1A2030] border border-[#222738] hover:border-[#2F374C] text-xs font-medium text-white cursor-pointer flex items-center justify-center gap-2"
                >
                  <FolderTree className="w-4 h-4 text-[#8B949E]" />
                  <span>Open Explorer</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartInvestigation}
                  className="btn-motion py-2.5 px-4 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs cursor-pointer flex items-center justify-center gap-2 shadow-xs shadow-orange-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Start Investigation</span>
                </button>
              </div>

              {/* Subtle Divider */}
              <div className="border-t border-[#1E2333] pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsRemoveModalOpen(true)}
                  className="btn-motion text-xs text-[#8B949E] hover:text-red-400 flex items-center gap-1.5 py-1 px-2.5 rounded hover:bg-red-950/20 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Project</span>
                </button>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Remove Project Confirmation Modal */}
        <AnimatePresence>
          {isRemoveModalOpen && (
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
                className="w-full max-w-md bg-[#0D1017] border border-[#1E2333] rounded-xl shadow-2xl p-6 space-y-4 text-xs font-sans"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
                  <span className="font-semibold text-white text-sm">
                    Remove {activeProject.name}?
                  </span>
                  <button
                    onClick={() => !isRemoving && setIsRemoveModalOpen(false)}
                    disabled={isRemoving}
                    className="text-[#8B949E] hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#8B949E] leading-relaxed">
                  This will remove the project from your BUGFORGE workspace, including its indexed files and project-specific analysis.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2333]">
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={() => setIsRemoveModalOpen(false)}
                    className="btn-motion px-4 py-2 rounded-lg bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={handleConfirmRemove}
                    className="btn-motion px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isRemoving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Remove Project</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: NO ACTIVE PROJECT -> UPLOAD PROJECT DASHBOARD
  // =========================================================================
  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-8 font-sans text-[#E2E8F0] select-none">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[820px] flex flex-col items-center text-center"
      >
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            BUGFORGE
          </h1>
          <h2 className="text-base sm:text-lg font-medium text-[#C9D1D9] mb-1">
            Upload a project
          </h2>
          <p className="text-xs sm:text-sm text-[#8B949E]">
            Import your application or repository for investigation.
          </p>
        </div>

        {/* Primary Upload Container */}
        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          onClick={() => {
            if (uploadProgress === null) {
              fileInputRef.current?.click();
            }
          }}
          whileHover={{ scale: uploadProgress === null ? 1.004 : 1 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className={`w-full relative rounded-xl border-2 border-dashed transition-colors duration-150 cursor-pointer overflow-hidden p-8 sm:p-12 ${
            isDragging
              ? 'border-[#F97316] bg-[#F97316]/5 shadow-lg shadow-orange-500/10'
              : 'border-[#1E2333] hover:border-[#2E364B] bg-[#0D1017] hover:bg-[#0E121B]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            accept=".apk,.aab,.zip,.js,.jsx,.ts,.tsx,.java,.kt,.py,.json,.txt,.log"
          />

          {/* Dynamic State in Upload Area */}
          {uploadProgress !== null ? (
            /* Uploading State with Real Progress */
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <UploadCloud className="w-10 h-10 text-[#F97316] animate-pulse" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white">Uploading project</div>
                <div className="text-xs text-[#8B949E] font-mono">{uploadingFileName}</div>
              </div>
              
              {/* Real Progress Bar */}
              <div className="w-full max-w-xs space-y-1.5 pt-2">
                <div className="w-full h-2 bg-[#161B26] rounded-full overflow-hidden border border-[#222838]">
                  <div
                    className="h-full bg-[#F97316] transition-all duration-150 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#8B949E] font-mono">
                  <span>Processing & Indexing</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            </div>
          ) : (
            /* Default Ready / Empty Upload State */
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#141824] border border-[#222738] flex items-center justify-center text-[#F97316] mb-1">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-base font-semibold text-white">Upload Project</div>
                <div className="text-xs sm:text-sm text-[#8B949E]">Drop files here or click to browse</div>
              </div>
              <div className="pt-3 text-[11px] text-[#6E7681] tracking-wider uppercase font-medium">
                APK • ZIP • Source Project
              </div>
            </div>
          )}
        </motion.div>

        {/* Error message alert if any */}
        {errorMessage && (
          <div className="mt-4 w-full p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Divider OR */}
        <div className="flex items-center justify-center my-6 w-full max-w-[320px]">
          <div className="flex-1 border-t border-[#1E2333]" />
          <span className="px-4 text-[11px] font-semibold text-[#6E7681] uppercase tracking-wider">
            OR
          </span>
          <div className="flex-1 border-t border-[#1E2333]" />
        </div>

        {/* Secondary Action: Connect GitHub Repository */}
        <button
          type="button"
          onClick={() => setIsGitHubModalOpen(true)}
          className="btn-motion w-full max-w-[420px] py-2.5 px-4 rounded-lg bg-[#0D1017] hover:bg-[#141824] border border-[#1E2333] hover:border-[#2D3548] text-xs font-medium text-[#C9D1D9] hover:text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <Github className="w-4 h-4" />
          <span>Connect GitHub Repository</span>
        </button>

      </motion.div>

      {/* GitHub Connect Modal */}
      <AnimatePresence>
        {isGitHubModalOpen && (
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
              className="w-full max-w-md rounded-xl bg-[#0D1017] border border-[#1E2333] shadow-2xl p-6 space-y-4 text-xs font-sans"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
                <span className="font-semibold text-white text-sm">Connect GitHub Repository</span>
                <button
                  onClick={() => !isImportingGit && setIsGitHubModalOpen(false)}
                  disabled={isImportingGit}
                  className="text-[#8B949E] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {gitError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{gitError}</span>
                </div>
              )}

              <form onSubmit={handleConnectGitHubSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#8B949E] font-medium">Repository Path</label>
                  <input
                    type="text"
                    required
                    value={gitRepoInput}
                    onChange={(e) => setGitRepoInput(e.target.value)}
                    placeholder="e.g. facebook/react or vercel/next.js"
                    className="w-full px-3 py-2 rounded bg-[#161B26] border border-[#1E2333] text-white focus:outline-none focus:border-[#F97316] font-mono text-xs"
                  />
                  <p className="text-[10px] text-[#6E7681]">
                    Enter owner/repo to load into your active workspace.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E2333]">
                  <button
                    type="button"
                    disabled={isImportingGit}
                    onClick={() => setIsGitHubModalOpen(false)}
                    className="btn-motion px-3.5 py-1.5 rounded-lg bg-[#161B26] border border-[#2B3245] text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImportingGit}
                    className="btn-motion px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isImportingGit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Connect & Import</span>
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
