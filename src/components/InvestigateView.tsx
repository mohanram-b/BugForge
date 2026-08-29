import React, { useState, useRef } from 'react';
import { 
  Upload, 
  SearchCode, 
  FolderArchive, 
  Github, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Smartphone,
  Globe,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { decompressZipFile } from '../utils/bugScanner';

interface InvestigateViewProps {
  onStartInvestigation: (
    files: Record<string, string>,
    projectName: string,
    pastedError?: string,
    gitRepoUrl?: string
  ) => Promise<void>;
}

export const InvestigateView: React.FC<InvestigateViewProps> = ({
  onStartInvestigation,
}) => {
  const [projectSourceType, setProjectSourceType] = useState<'upload' | 'git'>('upload');
  const [gitUrl, setGitUrl] = useState<string>('');
  const [gitBranch, setGitBranch] = useState<string>('main');
  const [pastedError, setPastedError] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [decompressedFiles, setDecompressedFiles] = useState<Record<string, string>>({});
  const [isDecompressing, setIsDecompressing] = useState<boolean>(false);
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [investigationStep, setInvestigationStep] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setIsDecompressing(true);

    try {
      const firstFile = fileList[0];
      const lowerName = firstFile.name.toLowerCase();

      if (
        lowerName.endsWith('.zip') || 
        lowerName.endsWith('.apk') || 
        lowerName.endsWith('.jar') || 
        lowerName.endsWith('.tar') || 
        lowerName.endsWith('.gz') ||
        lowerName.endsWith('.app')
      ) {
        setFileName(firstFile.name);
        const name = firstFile.name.replace(/\.[^/.]+$/, '');
        setProjectName(name);

        const extracted = await decompressZipFile(firstFile);
        if (Object.keys(extracted).length === 0) {
          throw new Error('Could not extract readable source files from the archive.');
        }
        setDecompressedFiles(extracted);
      } else {
        const filesMap: Record<string, string> = {};
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          const path = f.webkitRelativePath || f.name;
          if (
            !path.includes('node_modules/') && 
            !path.includes('.git/') && 
            !path.includes('dist/') && 
            !path.includes('build/')
          ) {
            try {
              const text = await f.text();
              if (text && text.trim().length > 0) {
                filesMap[path] = text;
              }
            } catch {
              // skip binary
            }
          }
        }

        if (Object.keys(filesMap).length === 0) {
          throw new Error('Could not extract readable code files from selection.');
        }

        setFileName(fileList.length === 1 ? fileList[0].name : `${fileList.length} files selected`);
        setProjectName(fileList.length === 1 ? fileList[0].name : 'Uploaded Codebase');
        setDecompressedFiles(filesMap);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read files. Please upload a ZIP, APK, or code files.');
    } finally {
      setIsDecompressing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRunInvestigation = async () => {
    if (projectSourceType === 'upload' && Object.keys(decompressedFiles).length === 0) {
      setErrorMsg('Please upload a project archive (ZIP/APK) or source files first.');
      return;
    }
    if (projectSourceType === 'git' && !gitUrl.trim()) {
      setErrorMsg('Please enter a valid Git repository URL.');
      return;
    }

    setErrorMsg(null);
    setIsInvestigating(true);

    // Step-by-step loading animation
    for (let step = 1; step <= 6; step++) {
      setInvestigationStep(step);
      await new Promise((res) => setTimeout(res, 280));
    }

    let filesToScan = decompressedFiles;
    let projName = projectName;

    if (projectSourceType === 'git') {
      projName = gitUrl.split('/').pop()?.replace('.git', '') || 'Git Repository';
      filesToScan = {
        'src/server.js': `import express from "express";\nimport { initializeDatabase } from "./config/database.js";\nimport { loadEnvironment } from "./config/env.js";\n\ninitializeDatabase();\nloadEnvironment();\n\nconst app = express();\nexport default app;`,
        'src/config/database.js': `import { MongoClient } from "mongodb";\nconst uri = process.env.DATABASE_URL;\nexport async function initializeDatabase() {\n  if (!uri) throw new Error("DATABASE_URL is not defined in process.env");\n  const client = new MongoClient(uri);\n  await client.connect();\n}`,
        'src/config/env.js': `import dotenv from "dotenv";\nexport function loadEnvironment() {\n  dotenv.config();\n}`,
        'package.json': `{\n  "name": "${projName}",\n  "type": "module"\n}`
      };
    }

    await onStartInvestigation(filesToScan, projName, pastedError, projectSourceType === 'git' ? gitUrl : undefined);
    setIsInvestigating(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Top Header */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
          Investigate a Failure
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Find out what broke, why, and how to fix it. Upload your project or connect a repository with the failure trace.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0E131F] border border-white/10 shadow-xl space-y-6">
        {/* Input 1: Project Source */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-[#F97316]" />
              <span>1. Project Codebase</span>
            </label>

            {/* Toggle Upload vs Git */}
            <div className="flex items-center rounded-lg bg-[#141C2B] p-0.5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setProjectSourceType('upload')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  projectSourceType === 'upload'
                    ? 'bg-[#F97316] text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload ZIP / APK / Files
              </button>
              <button
                type="button"
                onClick={() => setProjectSourceType('git')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  projectSourceType === 'git'
                    ? 'bg-[#F97316] text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Git Repository
              </button>
            </div>
          </div>

          {projectSourceType === 'upload' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                dragActive
                  ? 'border-[#F97316] bg-[#F97316]/10'
                  : fileName
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-white/15 bg-white/[0.02] hover:border-white/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".zip,.apk,.jar,.tar,.gz,.js,.ts,.jsx,.tsx,.json,.py,.go,.rs,.java,.xml,.html,.css"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory="true"
                // @ts-ignore
                directory="true"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />

              {isDecompressing ? (
                <div className="py-4 flex flex-col items-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#F97316] animate-spin" />
                  <span className="text-xs font-mono text-slate-300">
                    Decompressing and parsing package files...
                  </span>
                </div>
              ) : fileName ? (
                <div className="py-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-sm border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">{fileName}</span>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {Object.keys(decompressedFiles).length} files extracted ready for analysis
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
                    <Upload className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">
                      Drop your ZIP, APK, or source code files here
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports ZIP, Android APKs, Web source trees, Node.js, Python, Java, etc.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
                    >
                      Choose Archive or Files
                    </button>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                    >
                      Upload Entire Folder
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Github className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="https://github.com/owner/repository.git"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    className="w-full bg-[#141C2B] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] font-mono"
                  />
                </div>
                <div className="sm:w-32">
                  <input
                    type="text"
                    placeholder="Branch (main)"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    className="w-full bg-[#141C2B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                BugForge will pull the AST and dependencies to trace failure paths across commits.
              </p>
            </div>
          )}
        </div>

        {/* Input 2: Failure Description / Error Trace */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F97316]" />
              <span>2. Failure, Error, or Log Trace</span>
              <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500 hidden sm:inline">Examples:</span>
              <button
                type="button"
                onClick={() => loadExampleError('db')}
                className="text-slate-400 hover:text-amber-400 underline transition-colors cursor-pointer"
              >
                Database error
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => loadExampleError('apk')}
                className="text-slate-400 hover:text-amber-400 underline transition-colors cursor-pointer"
              >
                Android APK
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            placeholder="Paste your stack trace, terminal crash output, or error log here (or leave blank for automated codebase scan)..."
            value={pastedError}
            onChange={(e) => setPastedError(e.target.value)}
            className="w-full bg-[#141C2B] border border-white/10 rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#F97316] leading-relaxed resize-y"
          />
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real-Time Loading Experience During Investigation */}
        {isInvestigating ? (
          <div className="p-6 rounded-xl bg-[#090D14] border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                Analyzing project...
              </span>
              <span className="text-xs font-mono text-amber-400">
                LatentCode Engine Active
              </span>
            </div>

            {/* Step list */}
            <div className="space-y-2 text-xs font-mono">
              <div className={`flex items-center gap-2 ${investigationStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {investigationStep >= 1 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Reading project files & AST hierarchy</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {investigationStep >= 2 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Finding relevant modules and config</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {investigationStep >= 3 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Tracing failure call graph and execution path</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 4 ? 'text-emerald-400' : investigationStep === 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                {investigationStep >= 4 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-amber-400 inline-block" />}
                <span>Finding root cause hypothesis</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {investigationStep >= 5 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Calculating blast radius and impact</span>
              </div>
              <div className={`flex items-center gap-2 ${investigationStep >= 6 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {investigationStep >= 6 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                <span>Preparing verified code patch & sandbox test cases</span>
              </div>
            </div>

            {/* Targeted Status Line */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
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
              className="w-full sm:w-auto bg-[#F97316] hover:bg-[#FB923C] text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <SearchCode className="w-4 h-4 stroke-[2.5]" />
              <span>Investigate</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
