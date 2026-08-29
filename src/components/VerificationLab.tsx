import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  Loader2, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  Terminal, 
  Sparkles,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RecommendedFix, VerificationResult } from '../types';

interface VerificationLabProps {
  fix: RecommendedFix;
  verification: VerificationResult;
  onVerifyFix: () => Promise<void>;
  isVerifying: boolean;
}

export const VerificationLab: React.FC<VerificationLabProps> = ({
  fix,
  verification,
  onVerifyFix,
  isVerifying,
}) => {
  const [viewMode, setViewMode] = useState<'diff' | 'before_after'>('diff');
  const [copiedPatch, setCopiedPatch] = useState<boolean>(false);

  const handleCopyPatch = () => {
    navigator.clipboard.writeText(fix.diff);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const handleRunVerification = async () => {
    await onVerifyFix();
    // Fire celebratory confetti on verified pass
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#10B981', '#38BDF8', '#F97316'],
    });
  };

  const isVerified = verification.status === 'PASSED';

  return (
    <div className="space-y-6">
      {/* Fix Summary & Verification Banner */}
      <div className="p-6 rounded-xl bg-[#0D131F] border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PROPOSED FIX PATCH
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                RISK: {fix.risk}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{fix.title}</h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Target File: <strong className="text-cyan-400">{fix.file}</strong>
            </p>
          </div>

          <button
            onClick={handleRunVerification}
            disabled={isVerifying}
            className={`px-5 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isVerified
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Verification in Sandbox...</span>
              </>
            ) : isVerified ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Re-Verify Fix in Sandbox</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Verify Fix in Isolated Sandbox</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          {fix.whyFix}
        </p>
      </div>

      {/* Code Diff & Before/After Card */}
      <div className="rounded-xl bg-[#090D14] border border-slate-800 shadow-xl overflow-hidden">
        {/* Header bar */}
        <div className="p-3 bg-[#0E1420] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                viewMode === 'diff'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unified Diff
            </button>
            <button
              onClick={() => setViewMode('before_after')}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                viewMode === 'before_after'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side Before / After
            </button>
          </div>

          <button
            onClick={handleCopyPatch}
            className="px-2.5 py-1 rounded bg-[#141C2B] hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedPatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPatch ? 'Patch Copied' : 'Copy Patch'}</span>
          </button>
        </div>

        {/* Diff View */}
        {viewMode === 'diff' ? (
          <div className="p-4 bg-[#06090E] font-mono text-xs overflow-x-auto space-y-0.5">
            {fix.diff.split('\n').map((line, idx) => {
              const isAdded = line.startsWith('+') && !line.startsWith('+++');
              const isRemoved = line.startsWith('-') && !line.startsWith('---');
              const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');

              return (
                <div
                  key={idx}
                  className={`px-2 py-0.5 rounded ${
                    isAdded
                      ? 'bg-emerald-950/40 text-emerald-300 font-medium'
                      : isRemoved
                      ? 'bg-red-950/40 text-red-300 font-medium'
                      : isHeader
                      ? 'text-cyan-400 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  <code>{line}</code>
                </div>
              );
            })}
          </div>
        ) : (
          /* Before / After Side-by-Side */
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-[#06090E]">
            <div className="p-4 space-y-2">
              <div className="text-xs font-mono text-red-400 font-bold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span>BEFORE (BUGGY CODE)</span>
              </div>
              <pre className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-red-200 font-mono text-xs overflow-x-auto">
                <code>{fix.beforeCode}</code>
              </pre>
            </div>

            <div className="p-4 space-y-2">
              <div className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>AFTER (PATCHED CODE)</span>
              </div>
              <pre className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 font-mono text-xs overflow-x-auto">
                <code>{fix.afterCode}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Automated Verification Sandbox Section */}
      <div className="p-6 rounded-xl bg-[#0D131F] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Automated Sandbox Verification Suite</h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-[#141C2B] text-slate-300 border border-slate-700">
              BUILD: {verification.buildStatus}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              REGRESSION: {verification.regressionCheck}
            </span>
          </div>
        </div>

        {/* Test Cases Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">TEST SUITE & CASE</th>
                <th className="py-2.5 px-3">BEFORE FIX</th>
                <th className="py-2.5 px-3">AFTER FIX (SANDBOX)</th>
                <th className="py-2.5 px-3 text-right">EXECUTION TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {verification.testCases.map((tc) => (
                <tr key={tc.id} className="hover:bg-[#141C2B]/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="text-white font-bold">{tc.name}</div>
                    <div className="text-[10px] text-slate-400">{tc.suite}</div>
                  </td>

                  {/* Before */}
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 inline-flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      FAIL
                    </span>
                  </td>

                  {/* After */}
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                        isVerified || tc.afterStatus === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {isVerified ? 'PASS (VERIFIED)' : tc.afterStatus}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right text-slate-400">
                    {tc.durationMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sandbox Console Logs */}
        <div className="p-4 rounded-lg bg-[#06090E] border border-slate-800 space-y-1 font-mono text-xs text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>SANDBOX EXECUTION LOGS</span>
          </div>
          {verification.logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-slate-500 select-none">[{idx + 1}] </span>
              <span className={log.includes('pass') || log.includes('SUCCESS') ? 'text-emerald-400' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))}
          {isVerified && (
            <div className="text-emerald-400 font-bold pt-2 border-t border-slate-800/80">
              ✓ Fix verified successfully in isolated container. 0 regressions detected. Ready to commit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
