import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  AlertTriangle, 
  Check, 
  Copy, 
  ShieldAlert,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { EvidenceItem } from '../types';

interface CodeExplorerProps {
  files: Record<string, string>;
  initialFile?: string;
  initialLine?: number;
  evidenceItems?: EvidenceItem[];
  highlightLine?: number;
}

export const CodeExplorer: React.FC<CodeExplorerProps> = ({
  files,
  initialFile,
  initialLine,
  evidenceItems = [],
  highlightLine,
}) => {
  const filePaths = Object.keys(files);
  const [selectedFile, setSelectedFile] = useState<string>(
    initialFile && files[initialFile] ? initialFile : filePaths[0] || 'src/index.js'
  );
  const [targetLine, setTargetLine] = useState<number | undefined>(initialLine || highlightLine);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialFile && files[initialFile]) {
      setSelectedFile(initialFile);
    }
  }, [initialFile, files]);

  useEffect(() => {
    if (initialLine || highlightLine) {
      setTargetLine(initialLine || highlightLine);
    }
  }, [initialLine, highlightLine]);

  const fileContent = files[selectedFile] || '// File content not available';
  const lines = fileContent.split('\n');

  const fileEvidence = evidenceItems.filter((e) => e.file === selectedFile);

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[520px] rounded-xl bg-[#090D14] border border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden">
      {/* File Tree Sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0B101A] p-3 flex flex-col">
        <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-2 flex items-center justify-between">
          <span>PROJECT FILES</span>
          <span className="text-[10px] text-amber-400 font-mono">{filePaths.length} Files</span>
        </div>

        <div className="space-y-1 overflow-y-auto flex-1 font-mono text-xs">
          {filePaths.map((path) => {
            const isSelected = selectedFile === path;
            const hasEvidence = evidenceItems.some((e) => e.file === path);

            return (
              <button
                key={path}
                onClick={() => {
                  setSelectedFile(path);
                  setTargetLine(undefined);
                }}
                className={`w-full px-2.5 py-1.5 rounded-md text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131B2A]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="truncate">{path}</span>
                </div>

                {hasEvidence && (
                  <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 flex flex-col bg-[#06090E] overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0A0E17] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">File:</span>
            <span className="text-white font-bold">{selectedFile}</span>
            {targetLine && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px]">
                Target: Line {targetLine}
              </span>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded bg-[#141C2B] hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Code Lines with Suspicious Line Highlight */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const isSuspicious = lineNum === targetLine;
            const evidenceMatch = fileEvidence.find((e) => e.line === lineNum);

            return (
              <div key={lineNum} className="group flex flex-col">
                <div
                  className={`flex items-start py-0.5 px-2 rounded ${
                    isSuspicious
                      ? 'bg-red-500/15 border-l-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                      : 'hover:bg-[#111724]'
                  }`}
                >
                  {/* Line Number */}
                  <span
                    className={`w-10 select-none shrink-0 text-right pr-4 ${
                      isSuspicious ? 'text-red-400 font-bold' : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                  >
                    {lineNum}
                  </span>

                  {/* Line Text */}
                  <span
                    className={`flex-1 whitespace-pre-wrap ${
                      isSuspicious
                        ? 'text-red-200 font-medium'
                        : lineText.trim().startsWith('//')
                        ? 'text-slate-500 italic'
                        : lineText.includes('import') || lineText.includes('export')
                        ? 'text-purple-300'
                        : lineText.includes('const') || lineText.includes('function') || lineText.includes('async')
                        ? 'text-cyan-300'
                        : lineText.includes('process.env')
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {lineText || ' '}
                  </span>
                </div>

                {/* Evidence Callout inline */}
                {evidenceMatch && (
                  <div className="my-1.5 ml-12 mr-4 p-2.5 rounded-md bg-red-950/40 border border-red-500/40 text-red-200 text-[11px] font-sans flex items-start gap-2 shadow-lg animate-in fade-in duration-200">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-red-300 font-mono text-[10px] uppercase">
                        FORENSIC EVIDENCE [{evidenceMatch.level} CONFIDENCE]
                      </div>
                      <div>{evidenceMatch.description}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
