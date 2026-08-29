import React from 'react';
import { ShieldAlert, FileCode, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { EvidenceItem } from '../types';

interface EvidencePanelProps {
  evidence: EvidenceItem[];
  onInspectEvidence?: (file: string, line?: number) => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  onInspectEvidence,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Forensic Evidence Catalog ({evidence.length} items)
          </h3>
          <p className="text-xs text-slate-400">
            Traced from AST parsing, runtime telemetry, call stack frames, and configuration analysis
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {evidence.map((ev, idx) => (
          <div
            key={ev.id || idx}
            className="p-4 rounded-xl bg-[#0D131F] border border-slate-800 hover:border-slate-700 transition-all space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    ev.level === 'HIGH'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : ev.level === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {ev.level} CONFIDENCE
                </span>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141C2B] text-slate-300 border border-slate-700">
                  {ev.type || 'DIRECT EVIDENCE'}
                </span>
              </div>

              <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-white font-bold">{ev.file}</span>
                {ev.line && <span className="text-amber-400">:Line {ev.line}</span>}
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {ev.description}
            </p>

            {ev.codeSnippet && (
              <div className="p-2.5 rounded-lg bg-[#06090E] border border-slate-800/80 font-mono text-xs text-amber-300/90 overflow-x-auto">
                <code>{ev.codeSnippet}</code>
              </div>
            )}

            {onInspectEvidence && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onInspectEvidence(ev.file, ev.line)}
                  className="px-2.5 py-1 rounded bg-[#141C2B] hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Locate in Code Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
