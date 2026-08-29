import React from 'react';
import { BookOpen, ShieldAlert, Zap, Layers, Terminal, CheckCircle2, ArrowRight } from 'lucide-react';

export const DocsView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Documentation & Architecture Specification</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          BUGFORGE Forensic AI Architecture
        </h1>
        <p className="text-base text-slate-300 mt-2">
          "Traditional AI debugging reads the error. BUGFORGE understands the software around the error."
        </p>
      </div>

      {/* 1. Core Paradigm */}
      <section className="p-6 rounded-2xl bg-[#0D131F] border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          1. The Forensic Pipeline Paradigm
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          Most coding assistants fail at real-world debugging because they operate solely on the isolated error string or raw stack trace. BUGFORGE introduces a 7-stage deterministic & AI hybrid forensic pipeline:
        </p>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-[#141C2B] text-slate-200">
            <strong className="text-red-400">1. Failure Ingestion:</strong> Normalizes stack traces, unhandled promise rejections, and runtime logs.
          </div>
          <div className="p-2.5 rounded-lg bg-[#141C2B] text-slate-200">
            <strong className="text-amber-400">2. AST & Call Graph Linking:</strong> Maps each stack frame to exact source lines and traces upstream callers and downstream callee modules.
          </div>
          <div className="p-2.5 rounded-lg bg-[#141C2B] text-slate-200">
            <strong className="text-cyan-400">3. Configuration & State Analysis:</strong> Evaluates environment load sequence, token validation schemes, and schema contract mismatches.
          </div>
          <div className="p-2.5 rounded-lg bg-[#141C2B] text-slate-200">
            <strong className="text-purple-400">4. Ranked Hypothesis Generation:</strong> Generates evidence-backed root cause candidates with confidence ratings.
          </div>
          <div className="p-2.5 rounded-lg bg-[#141C2B] text-slate-200">
            <strong className="text-orange-400">5. Blast Radius Calculation:</strong> Assesses transitive impacts on dependent endpoints, routes, and critical user flows.
          </div>
          <div className="p-2.5 rounded-lg bg-[#141C2B] text-slate-200">
            <strong className="text-blue-400">6. Unified Diff Patch:</strong> Generates targeted, non-breaking code corrections.
          </div>
          <div className="p-2.5 rounded-lg bg-[#141C2B] text-slate-200">
            <strong className="text-emerald-400">7. Sandbox Verification:</strong> Runs automated regression checks and test suites to prove resolution.
          </div>
        </div>
      </section>

      {/* 2. LatentCode Context Engine */}
      <section className="p-6 rounded-2xl bg-[#0D131F] border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          2. LatentCode Context Engine
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          Instead of flooding the LLM context window with hundreds of irrelevant project files, the LatentCode Engine parses project ASTs, extracts symbol tables, and compiles an exact execution slice representing only the active call path and direct dependencies.
        </p>
      </section>
    </div>
  );
};
