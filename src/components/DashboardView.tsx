import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  UploadCloud, 
  SearchCode, 
  FolderTree, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Shield,
  FileCode,
  Github,
  ChevronRight,
  Zap,
  Activity
} from 'lucide-react';
import { Investigation, Issue } from '../types';

interface DashboardViewProps {
  investigations: Investigation[];
  onOpenInvestigation: (inv: Investigation) => void;
  onNewInvestigation: () => void;
  onOpenExplorer?: (file?: string, line?: number) => void;
  onNavigateToIssues?: () => void;
  onSelectIssue?: (issue: Issue) => void;
  onUploadAndScanFiles?: (files: Record<string, string>, projectName: string, error?: string, repo?: string) => void;
  onConnectGitHub?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  investigations,
  onOpenInvestigation,
  onNewInvestigation,
  onOpenExplorer,
  onNavigateToIssues,
  onSelectIssue,
  onUploadAndScanFiles,
  onConnectGitHub,
}) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

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

  // Metrics computation from real database
  const openCount = issues.filter((i) => i.status === 'Open').length;
  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length +
    investigations.filter((inv) => inv.severity === 'CRITICAL').length;
  const investigatingCount = issues.filter((i) => i.status === 'Investigating').length +
    investigations.filter((inv) => inv.status === 'IN_PROGRESS' || inv.status === 'ANALYZING').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved' || i.status === 'Verified' || i.status === 'Closed').length +
    investigations.filter((inv) => inv.status === 'ROOT_CAUSE_FOUND').length;

  const totalActivityCount = issues.length + investigations.length;

  // Handle direct file upload
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);
    try {
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
              const content = await entry.async('string');
              filesMap[relPath] = content;
            } catch {
              filesMap[relPath] = `// [Binary Asset: ${relPath}]`;
            }
          }
        }

        const projName = file.name.replace(/\.[^/.]+$/, '');
        if (onUploadAndScanFiles && Object.keys(filesMap).length > 0) {
          onUploadAndScanFiles(filesMap, projName);
        } else {
          onNewInvestigation();
        }
      } else {
        const text = await file.text();
        const filesMap: Record<string, string> = { [file.name]: text };
        if (onUploadAndScanFiles) {
          onUploadAndScanFiles(filesMap, file.name, text);
        } else {
          onNewInvestigation();
        }
      }
    } catch (err) {
      console.error('Failed to parse uploaded project', err);
      onNewInvestigation();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-4 font-sans select-none text-[#E2E8F0]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1E2333]">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">
            Workspace Overview
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Real-time investigation status &amp; active repository telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onConnectGitHub || (() => onOpenExplorer && onOpenExplorer())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121622] hover:bg-[#181E2E] border border-[#1E2333] hover:border-[#2B3245] text-xs font-medium text-white transition-colors cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Connect GitHub</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121622] hover:bg-[#181E2E] border border-[#1E2333] hover:border-[#2B3245] text-xs font-medium text-white transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#8B949E]" />
            <span>Upload Project</span>
          </button>

          <button
            onClick={onNewInvestigation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Investigation</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            accept=".apk,.aab,.zip,.log,.txt,.json,.js,.ts,.java,.kt"
          />
        </div>
      </div>

      {/* 4 Essential Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Open Issues</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{openCount}</span>
            <span className="text-[10px] text-[#6E7681]">active</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Critical</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {criticalCount}
            </span>
            <span className="text-[10px] text-[#6E7681]">urgent</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Investigating</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-bold ${investigatingCount > 0 ? 'text-[#F97316]' : 'text-white'}`}>
              {investigatingCount}
            </span>
            <span className="text-[10px] text-[#6E7681]">in triage</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0D1017] border border-[#1E2333] flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[#8B949E]">Resolved</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-bold ${resolvedCount > 0 ? 'text-emerald-400' : 'text-white'}`}>
              {resolvedCount}
            </span>
            <span className="text-[10px] text-[#6E7681]">verified</span>
          </div>
        </div>
      </div>

      {/* Quick Ingest Strip */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`px-4 py-3 rounded-lg border border-dashed transition-colors cursor-pointer flex items-center justify-between text-xs ${
          isDragging
            ? 'border-[#F97316] bg-[#F97316]/5 text-white'
            : 'border-[#1E2333] hover:border-[#2D3548] bg-[#0B0E14] text-[#8B949E]'
        }`}
      >
        <div className="flex items-center gap-3">
          <UploadCloud className="w-4 h-4 text-[#F97316] shrink-0" />
          <span>
            {isProcessing ? 'Decompressing and indexing codebase...' : 'Quick Ingest: Drag & drop an APK, ZIP, or stack trace log file here to analyze'}
          </span>
        </div>
        <span className="text-[10px] text-[#6E7681] font-mono hidden sm:inline">
          .zip • .apk • .log • .json
        </span>
      </div>

      {/* Recent Activity List / Empty State */}
      <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
          <h2 className="text-xs font-semibold text-white tracking-wide">
            Recent Activity
          </h2>
          {totalActivityCount > 0 && onNavigateToIssues && (
            <button
              onClick={onNavigateToIssues}
              className="text-[11px] text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all issues</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {totalActivityCount === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-9 h-9 rounded border border-[#1E2333] bg-[#121622] flex items-center justify-center text-[#8B949E]">
              <Activity className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-white">No workspace activity yet</p>
              <p className="text-[11px] text-[#8B949E] max-w-xs">
                Connect a repository or start an investigation to begin.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={onConnectGitHub || (() => onOpenExplorer && onOpenExplorer())}
                className="px-3 py-1.5 rounded bg-[#161B26] hover:bg-[#1E2433] border border-[#2B3245] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Connect GitHub
              </button>
              <button
                onClick={onNewInvestigation}
                className="px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold transition-colors cursor-pointer"
              >
                Start Investigation
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2333]/60">
            {/* List issues */}
            {issues.slice(0, 5).map((issue) => (
              <div
                key={issue.id}
                onClick={() => {
                  if (onSelectIssue) onSelectIssue(issue);
                  else if (onNavigateToIssues) onNavigateToIssues();
                }}
                className="py-2.5 px-1 flex items-center justify-between hover:bg-[#121622]/50 rounded transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <span className="font-mono text-[11px] text-[#F97316] shrink-0 font-medium">
                    {issue.id}
                  </span>
                  <span className="text-[#E2E8F0] truncate font-medium">
                    {issue.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px]">
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

                  <span className="text-[#8B949E] hidden sm:inline">
                    {issue.status}
                  </span>

                  <span className="text-[#6E7681] text-[10px]">
                    {new Date(issue.updatedAt || issue.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {/* List investigations if distinct */}
            {investigations.slice(0, 3).map((inv) => (
              <div
                key={inv.id}
                onClick={() => onOpenInvestigation(inv)}
                className="py-2.5 px-1 flex items-center justify-between hover:bg-[#121622]/50 rounded transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <span className="font-mono text-[11px] text-amber-400 shrink-0 font-medium">
                    {inv.id}
                  </span>
                  <span className="text-[#E2E8F0] truncate">
                    {inv.rootCauseAnalysis?.failureSummary || inv.errorSummary}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px]">
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40">
                    {inv.severity}
                  </span>

                  <span className="text-[#8B949E] hidden sm:inline">
                    {inv.status === 'ROOT_CAUSE_FOUND' ? 'Resolved' : 'Investigating'}
                  </span>

                  <span className="text-[#6E7681] text-[10px]">
                    {new Date(inv.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
