import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

const PIPELINE_STEPS = [
  'Parsing error & stack trace frames',
  'Locating stack frames in source files',
  'Scanning project AST & module dependencies',
  'Building interactive dependency & call graph',
  'Finding related functions & symbol linkages',
  'Analyzing runtime configuration & load order',
  'Ranking root causes with forensic evidence',
  'Calculating blast radius & impact matrix',
  'Generating minimal unified diff fix',
  'Preparing automated verification sandbox'
];

interface InvestigationPipelineProps {
  isAnalyzing: boolean;
  onComplete?: () => void;
}

export const InvestigationPipeline: React.FC<InvestigationPipelineProps> = ({
  isAnalyzing,
  onComplete
}) => {
  const [completedSteps, setCompletedSteps] = useState<number>(isAnalyzing ? 0 : PIPELINE_STEPS.length);

  useEffect(() => {
    if (!isAnalyzing) {
      setCompletedSteps(PIPELINE_STEPS.length);
      return;
    }

    setCompletedSteps(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCompletedSteps(step);
      if (step >= PIPELINE_STEPS.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 180); // Fast, realistic ~1.8s analysis animation

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  return (
    <div className="p-4 rounded-xl bg-[#0B101A] border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
          {completedSteps < PIPELINE_STEPS.length ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>FORENSIC PIPELINE EXECUTING ({completedSteps}/{PIPELINE_STEPS.length})</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">FORENSIC ANALYSIS COMPLETED (10/10 STAGES)</span>
            </>
          )}
        </div>
        <span className="text-[11px] font-mono text-slate-400">LatentCode Core v2.4</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {PIPELINE_STEPS.map((label, idx) => {
          const isDone = completedSteps > idx;
          const isCurrent = completedSteps === idx;

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : isCurrent
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse'
                  : 'bg-[#121824] border-slate-800/80 text-slate-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 text-[9px] flex items-center justify-center text-slate-600 font-bold">
                  {idx + 1}
                </div>
              )}
              <span className="truncate text-[11px] font-medium">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
