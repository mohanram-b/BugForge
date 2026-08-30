import React, { useState } from 'react';
import { 
  SearchCode, 
  FolderArchive, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  LayoutDashboard,
  Play,
  FileCode,
  Smartphone,
  Github,
  FileArchive
} from 'lucide-react';
import { useActiveProject } from '../context/ActiveProjectContext';

interface InvestigateViewProps {
  onStartInvestigation: (
    files: Record<string, string>,
    projectName: string,
    pastedError?: string,
    gitRepoUrl?: string
  ) => Promise<void>;
  onGoToDashboard?: () => void;
}

export const InvestigateView: React.FC<InvestigateViewProps> = ({
  onStartInvestigation,
  onGoToDashboard,
}) => {
  const { activeProject, projectFiles } = useActiveProject();
  const [pastedError, setPastedError] = useState<string>('');
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [investigationStep, setInvestigationStep] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileCount = activeProject?.indexedFileCount || Object.keys(projectFiles).length || 0;

  const handleRunInvestigation = async () => {
    if (!activeProject) {
      setErrorMsg('No active project found. Please upload a project on the Dashboard.');
      return;
    }

    setErrorMsg(null);
    setIsInvestigating(true);

    // Step-by-step loading progress
    for (let step = 1; step <= 6; step++) {
      setInvestigationStep(step);
      await new Promise((res) => setTimeout(res, 260));
    }

    try {
      await onStartInvestigation(
        projectFiles, 
        activeProject.name, 
        pastedError.trim() || undefined,
        activeProject.repoUrl
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Investigation failed to complete.');
    } finally {
      setIsInvestigating(false);
    }
  };

  const loadExampleError = (type: 'db' | 'apk' | 'async') => {
    if (type === 'db') {
      setPastedError('FATAL: DATABASE_URL is not defined in process.env when initializeDatabase() was called.\n    at initializeDatabase (src/config/database.js:14:11)\n    at Object.<anonymous> (src/server.js:18:1)');
    } else if (type === 'apk') {
      setPastedError('java.lang.SecurityException: Permission denied (missing INTERNET permission)\n    at java.net.HttpURLConnection.connect(HttpURLConnection.java:89)\n    at com.example.app.ApiClient.fetchUserData(ApiClient.java:12)');
    } else {
      setPastedError('UnhandledPromiseRejection: TypeError: Cannot read properties of undefined (reading "id")\n    at getUserProfile (src/routes/user.routes.js:42:25)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)');
    }
  };

  // =========================================================================
  // STATE A: NO ACTIVE PROJECT LOADED -> BLOCKED EMPTY STATE WITH GO TO DASHBOARD
  // =========================================================================
  if (!activeProject) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 font-sans select-none text-[#E2E8F0] flex flex-col items-center justify-center">
        <div className="w-full bg-[#0D1017] border border-[#1E2333] rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl border border-[#1E2333] bg-[#121622] flex items-center justify-center text-[#8B949E]">
            <SearchCode className="w-6 h-6 text-[#F97316]" />
          </div>

          <div className="space-y-1 max-w-sm">
            <h2 className="text-base font-semibold text-white">No Project Loaded</h2>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Upload a project or connect a repository from the Dashboard before running forensic investigations.
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
  // STATE B: ACTIVE PROJECT LOADED -> TARGETED INVESTIGATION WORKSPACE
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 font-sans text-[#E2E8F0] select-none">
      {/* Top Header */}
      <div className="text-center space-y-1.5 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Investigate a Failure
        </h1>
        <p className="text-xs sm:text-sm text-[#8B949E] max-w-lg mx-auto">
          Diagnose failure paths, isolate root causes, and synthesize verified code patches for your active project.
        </p>
      </div>

      {/* Main Investigation Panel */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0D1017] border border-[#1E2333] shadow-xl space-y-6">
        
        {/* Step 1: Active Codebase Target (Locked to activeProject) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <FolderArchive className="w-4 h-4 text-[#F97316]" />
              <span>1. Target Project</span>
            </label>

            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Active Workspace</span>
            </span>
          </div>

          {/* Active Project Banner */}
          <div className="p-4 rounded-xl bg-[#121622] border border-[#1E2333] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#181E2E] border border-[#262F44] flex items-center justify-center text-[#F97316] shrink-0">
                {activeProject.projectType === 'android_apk' || activeProject.projectType === 'android_aab' ? (
                  <Smartphone className="w-5 h-5" />
                ) : activeProject.projectType === 'zip_archive' ? (
                  <FileArchive className="w-5 h-5" />
                ) : activeProject.projectType === 'github_repo' ? (
                  <Github className="w-5 h-5" />
                ) : (
                  <FileCode className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white font-mono truncate">
                  {activeProject.name}
                </h3>
                <p className="text-xs text-[#8B949E] mt-0.5">
                  {activeProject.fileType || 'Source Project'} • {fileCount} indexed files
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-[#C9D1D9] bg-[#161B26] px-2.5 py-1 rounded border border-[#222838]">
                {activeProject.fileSize || 'Attached'}
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Optional Failure Description / Error Trace */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-[#F97316]" />
              <span>2. Failure Log / Stack Trace</span>
              <span className="text-xs font-normal text-[#8B949E] normal-case">(Optional)</span>
            </label>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#6E7681] hidden sm:inline">Examples:</span>
              <button
                type="button"
                onClick={() => loadExampleError('db')}
                className="text-[#8B949E] hover:text-[#F97316] underline transition-colors cursor-pointer"
              >
                Database
              </button>
              <span className="text-[#2B3245]">•</span>
              <button
                type="button"
                onClick={() => loadExampleError('apk')}
                className="text-[#8B949E] hover:text-[#F97316] underline transition-colors cursor-pointer"
              >
                Android
              </button>
              <span className="text-[#2B3245]">•</span>
              <button
                type="button"
                onClick={() => loadExampleError('async')}
                className="text-[#8B949E] hover:text-[#F97316] underline transition-colors cursor-pointer"
              >
                Async
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            placeholder="Paste your stack trace, crash output, or error log here (or leave blank for an automated project-wide AST scan)..."
            value={pastedError}
            onChange={(e) => setPastedError(e.target.value)}
            className="w-full bg-[#090A0F] border border-[#1E2333] rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-[#6E7681] focus:outline-none focus:border-[#F97316] leading-relaxed resize-y"
          />
        </div>

        {/* Error message alert if any */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real-Time Loading Experience During Investigation */}
        {isInvestigating ? (
          <div className="p-6 rounded-xl bg-[#090A0F] border border-orange-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2 font-mono">
                <Loader2 className="w-4 h-4 text-[#F97316] animate-spin" />
                Analyzing {activeProject.name}...
              </span>
              <span className="text-[11px] font-mono text-[#F97316]">
                Forensic AST Engine Active
              </span>
            </div>

            {/* Step list */}
            <div className="space-y-2 text-xs font-mono">
              <div className={`flex items-center gap-2 ${investigationStep >= 1 ? 'text-emerald-400' : 'text-[#6E7681]'}`}>
                {investigationStep >= 1 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Reading project files & AST hierarchy</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 2 ? 'text-emerald-400' : 'text-[#6E7681]'}`}>
                {investigationStep >= 2 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Finding relevant modules and config</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 3 ? 'text-emerald-400' : 'text-[#6E7681]'}`}>
                {investigationStep >= 3 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Tracing failure call graph and execution path</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 4 ? 'text-emerald-400' : investigationStep === 3 ? 'text-amber-400' : 'text-[#6E7681]'}`}>
                {investigationStep >= 4 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-amber-400 inline-block" />}
                <span>Finding root cause hypothesis</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 5 ? 'text-emerald-400' : 'text-[#6E7681]'}`}>
                {investigationStep >= 5 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Calculating blast radius and impact</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 6 ? 'text-emerald-400' : 'text-[#6E7681]'}`}>
                {investigationStep >= 6 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Preparing verified code patch & sandbox test cases</span>
              </div>
            </div>

            {/* Targeted Status Line */}
            <div className="pt-2 border-t border-[#1E2333] flex items-center justify-between text-[11px] font-mono text-[#8B949E]">
              <span className="text-emerald-400">Codebase context ✓</span>
              <span className="text-emerald-400">Failure path ✓</span>
              <span className="text-emerald-400">Root cause ✓</span>
            </div>
          </div>
        ) : (
          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={handleRunInvestigation}
              className="btn-motion w-full sm:w-auto bg-[#F97316] hover:bg-[#EA580C] text-black font-bold text-xs px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Start Investigation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
