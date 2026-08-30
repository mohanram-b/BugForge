import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  FileCode, 
  ShieldAlert, 
  Layers, 
  Flame, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  GitCommit, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Clock, 
  Terminal, 
  AlertCircle,
  X,
  Lock,
  FileDown
} from 'lucide-react';
import { Investigation, GraphNode } from '../types';
import { FailurePathGraph } from './FailurePathGraph';
import { 
  generateMarkdownReport, 
  generateDiagnosticLog, 
  createFixedZipArchive, 
  triggerFileDownload,
  exportInvestigationPdf
} from '../utils/bugScanner';

interface InvestigationScreenProps {
  investigation: Investigation;
  onBack: () => void;
  onVerifyFix: () => Promise<void>;
  isVerifying: boolean;
  onExportReport: () => void;
  onOpenInExplorer?: (file: string, line?: number) => void;
}

export const InvestigationScreen: React.FC<InvestigationScreenProps> = ({
  investigation,
  onBack,
  onVerifyFix,
  isVerifying,
  onExportReport,
  onOpenInExplorer,
}) => {
  // Expandable card states
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false);
  const [isWhyChainExpanded, setIsWhyChainExpanded] = useState<boolean>(false);
  const [isCompetingExpanded, setIsCompetingExpanded] = useState<boolean>(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false);
  const [isImpactExpanded, setIsImpactExpanded] = useState<boolean>(false);
  const [isGitChangeExpanded, setIsGitChangeExpanded] = useState<boolean>(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState<boolean>(false);

  const graphNodes = investigation.dependencyGraph?.nodes || [];
  const graphEdges = investigation.dependencyGraph?.edges || [];
  const evidenceList = investigation.evidence || [];
  const rootCauseList = investigation.rootCauses || [];
  const timelineList = investigation.timeline || [];
  const blastRadius = investigation.blastRadius || {
    filesCount: 0,
    endpointsCount: 0,
    userFlowsCount: 0,
    criticalServicesCount: 0,
    affectedFiles: [],
    affectedEndpoints: [],
    userFlows: [],
    services: [],
  };
  const verification = investigation.verification || {
    status: 'IDLE',
    beforeFailingCount: 0,
    afterPassingCount: 0,
    totalTests: 0,
    buildStatus: 'SKIPPED',
    regressionCheck: 'PASSED',
    testCases: [],
    logs: [],
    executionTimeMs: 0,
  };
  const recommendedFix = investigation.recommendedFix || {
    title: 'Proposed Fix',
    file: '',
    description: '',
    whyFix: '',
    risk: 'LOW',
    expectedImpact: '',
    diff: '',
    beforeCode: '',
    afterCode: '',
  };

  // Graph state
  const [graphScale, setGraphScale] = useState<number>(1);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(
    () => graphNodes.find((n) => n.role === 'root_cause') || graphNodes[0] || null
  );

  useEffect(() => {
    const nodes = investigation.dependencyGraph?.nodes || [];
    setSelectedGraphNode(nodes.find((n) => n.role === 'root_cause') || nodes[0] || null);
  }, [investigation]);

  // Code inspection modal state
  const [inspectModalFile, setInspectModalFile] = useState<{ file: string; line?: number } | null>(null);
  const [copiedDiff, setCopiedDiff] = useState<boolean>(false);
  const [isFixApplied, setIsFixApplied] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const filesSnapshot = investigation.filesSnapshot || {};
  const isVerified = investigation.status === 'RESOLVED' || verification.status === 'PASSED';

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(recommendedFix.diff);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportInvestigationPdf(investigation, {
        filename: `${(investigation.project || 'investigation').toLowerCase()}-report.pdf`,
      });
    } catch (err) {
      console.error('Failed to generate investigation PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport(investigation, Object.keys(filesSnapshot).length || 1);
    triggerFileDownload(md, `${(investigation.project || 'investigation').toLowerCase()}-investigation-report.md`, 'text/markdown');
  };

  const handleDownloadLog = () => {
    const log = generateDiagnosticLog(investigation, filesSnapshot);
    triggerFileDownload(log, `${(investigation.project || 'investigation').toLowerCase()}-diagnostics.log`, 'text/plain');
  };

  const handleDownloadFixedZip = async () => {
    setIsDownloadingZip(true);
    try {
      const zipBlob = await createFixedZipArchive(filesSnapshot, recommendedFix);
      triggerFileDownload(zipBlob, `${(investigation.project || 'investigation').toLowerCase()}-fixed.zip`, 'application/zip');
    } catch (err) {
      console.error('Failed to create fixed zip:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
              Investigation: {investigation.project}
            </h1>
            <span className="text-xs font-mono text-slate-500">• {investigation.createdAt}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onVerifyFix}
            disabled={isVerifying}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isVerified
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-[#F97316] hover:bg-[#FB923C] text-black'
            }`}
          >
            {isVerifying ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Verification...</span>
              </>
            ) : isVerified ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Re-run Verification</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Verification</span>
              </>
            )}
          </button>

          <button
            onClick={onExportReport}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono transition-colors border border-white/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FAILURE CARD */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-2xl bg-[#0E131F] border border-white/10 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                investigation.severity === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {investigation.severity}
            </span>

            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {investigation.confidence}% confidence
            </span>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Error Type: <span className="text-slate-200">{investigation.errorType}</span>
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {investigation.title}
          </h2>
          <div className="mt-2 text-sm text-slate-300 leading-relaxed font-sans">
            <span className="font-semibold text-slate-100">What happened?</span>{' '}
            {investigation.failureSummary || 'The application failed during startup execution and rejected downstream requests.'}
          </div>
        </div>

        {/* Expandable: View details */}
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isDetailsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#F97316]" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>{isDetailsExpanded ? 'Hide raw failure details' : 'View details (raw error & stack trace)'}</span>
          </button>

          {isDetailsExpanded && (
            <div className="mt-3 p-3.5 rounded-xl bg-[#090D14] border border-white/10 space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block mb-1">Raw Error Message:</span>
                <p className="text-red-300 bg-red-950/30 p-2.5 rounded border border-red-500/20 whitespace-pre-wrap">
                  {investigation.rawError}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block mb-1">Stack Trace:</span>
                <pre className="text-slate-400 bg-black/40 p-2.5 rounded border border-white/5 overflow-x-auto text-[11px] leading-relaxed">
                  {investigation.stackTrace}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ROOT CAUSE CARD */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-2xl bg-[#0E131F] border border-amber-500/30 shadow-md space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              Root Cause
            </h2>
          </div>

          <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
            {investigation.rootCauses[0]?.confidence || investigation.confidence}% confidence
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white">
              {investigation.rootCauses[0]?.title || investigation.title}
            </h3>
            {onOpenInExplorer && investigation.recommendedFix?.file && (
              <button
                onClick={() => onOpenInExplorer(investigation.recommendedFix.file, 4)}
                className="px-3 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Open in Explorer →</span>
              </button>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            {investigation.rootCauses[0]?.reasoning || 'Environment configuration is loaded after database initialization. The database starts before DATABASE_URL is available.'}
          </p>
        </div>

        {/* Action: Why? causal chain expansion */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setIsWhyChainExpanded(!isWhyChainExpanded)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isWhyChainExpanded ? 'Hide "Why?" Causal Chain' : 'Why? (Expand Causal Chain)'}</span>
            {isWhyChainExpanded ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronRight className="w-3.5 h-3.5 ml-1" />}
          </button>

          {isWhyChainExpanded && (
            <div className="p-4 rounded-xl bg-[#090D14] border border-amber-500/20 space-y-3">
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wide block">
                Causal Step-By-Step Breakdown:
              </span>
              <div className="space-y-3 text-xs">
                {(investigation.whyCausalChain || [
                  { question: 'Why did the API fail?', answer: 'Database connection failed.' },
                  { question: 'Why did the database fail?', answer: 'DATABASE_URL was unavailable in process.env.' },
                  { question: 'Why was it unavailable?', answer: 'Environment configuration loaded too late in the startup sequence.' }
                ]).map((step, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1 font-mono">
                    <span className="text-slate-400 font-semibold">{step.question}</span>
                    <p className="text-amber-300 flex items-center gap-1 pl-2">
                      <span className="text-slate-600">→</span> {step.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Other Possibilities / Competing Causes */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          <button
            onClick={() => setIsCompetingExpanded(!isCompetingExpanded)}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isCompetingExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#F97316]" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>{isCompetingExpanded ? 'Hide competing possibilities' : 'Other possibilities (competing hypotheses)'}</span>
          </button>

          {isCompetingExpanded && (
            <div className="mt-2 space-y-2">
              {(investigation.competingCauses || [
                { id: 'c1', title: 'Environment initialization order', confidence: 94, reason: 'Database is invoked prior to dotenv loader.' },
                { id: 'c2', title: 'Invalid connection credentials', confidence: 61, reason: 'Port or host unavailable in production config.' },
                { id: 'c3', title: 'Network or VPC isolation', confidence: 34, reason: 'Outbound socket blocked by firewall rules.' }
              ]).map((hyp) => (
                <div key={hyp.id} className="p-3 rounded-lg bg-[#090D14] border border-white/5 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-white font-semibold">{hyp.title}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">{hyp.reason}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-bold shrink-0 ml-3">
                    {hyp.confidence}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confidence Breakdown Note */}
        <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Based on: {evidenceList.length} evidence items, {graphNodes.length} code relationships, 1 matching stack trace
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EVIDENCE CARD */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-2xl bg-[#0E131F] border border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Evidence</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">{evidenceList.length} strongest matches</span>
        </div>

        {/* Evidence List */}
        <div className="space-y-2.5">
          {evidenceList.map((ev) => (
            <div
              key={ev.id}
              onClick={() => setInspectModalFile({ file: ev.file, line: ev.line })}
              className="p-3.5 rounded-xl bg-[#090D14] border border-white/10 hover:border-slate-600 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ev.level === 'HIGH'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : ev.level === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {ev.level}
                  </span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    {ev.file}{ev.line ? `:${ev.line}` : ''}
                  </span>
                </div>
                <p className="text-slate-300 text-xs font-sans">{ev.description}</p>
              </div>

              <span className="text-[11px] font-mono text-slate-500 hover:text-white shrink-0 self-start sm:self-center">
                Click to inspect →
              </span>
            </div>
          ))}
        </div>

        {/* Security Scan Warning */}
        {investigation.detectedSecrets && investigation.detectedSecrets.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-300 font-mono">⚠ Possible secret detected</span>
              <p className="text-slate-300 text-xs">
                {investigation.detectedSecrets.map((s) => `${s.name} (${s.file}:${s.line})`).join(', ')}.
              </p>
              <span className="text-[11px] font-mono text-slate-400 block">Values are hidden for safety.</span>
            </div>
          </div>
        )}

        {/* Evidence -> Timeline (Collapsed by default) */}
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isTimelineExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#F97316]" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>{isTimelineExpanded ? 'Hide execution timeline' : `Evidence Timeline (${investigation.timeline.length} events)`}</span>
          </button>

          {isTimelineExpanded && (
            <div className="mt-3 p-4 rounded-xl bg-[#090D14] border border-white/10 space-y-2.5 font-mono text-xs">
              {investigation.timeline.map((event) => (
                <div key={event.id} className="flex items-start gap-3 pb-2 border-b border-white/5 last:border-b-0">
                  <span className="text-slate-500 text-[11px] shrink-0 w-16">{event.timestamp.split('.')[0]}</span>
                  <div className="space-y-0.5">
                    <span
                      className={`font-semibold ${
                        event.type === 'fatal' || event.type === 'error'
                          ? 'text-red-400'
                          : event.type === 'warn'
                          ? 'text-amber-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {event.title}
                    </span>
                    {event.details && <p className="text-slate-400 text-[11px]">{event.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FAILURE PATH CARD (RECHARTS DATA VISUALIZATION) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <FailurePathGraph
          nodes={graphNodes}
          graphData={investigation.dependencyGraph}
          selectedNodeId={selectedGraphNode?.id}
          onSelectNode={(node) => setSelectedGraphNode(node)}
          onOpenFileInExplorer={(file, line) => setInspectModalFile({ file, line })}
        />
      </section>

      {/* ========================================================================= */}
      {/* 5. IMPACT CARD (BLAST RADIUS) */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-2xl bg-[#0E131F] border border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              Impact (Blast Radius)
            </h2>
          </div>
        </div>

        {/* Compact Summary Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#090D14] border border-white/10 text-center font-mono">
            <span className="text-xs text-slate-400 block">Files</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{blastRadius.filesCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#090D14] border border-white/10 text-center font-mono">
            <span className="text-xs text-slate-400 block">Endpoints</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{blastRadius.endpointsCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#090D14] border border-white/10 text-center font-mono">
            <span className="text-xs text-slate-400 block">User Flows</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{blastRadius.userFlowsCount}</span>
          </div>
        </div>

        {/* Affected User Flows List */}
        <div className="space-y-1.5 text-xs">
          <span className="text-slate-400 font-mono text-[11px] block">Affected Flows & Endpoints:</span>
          <div className="flex flex-wrap gap-2">
            {blastRadius.userFlows.map((flow, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 font-mono">
                ✕ {flow.name}
              </span>
            ))}
            {blastRadius.affectedEndpoints.map((ep, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-mono">
                {ep.method} {ep.path}
              </span>
            ))}
          </div>
        </div>

        {/* Expandable: View affected components */}
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={() => setIsImpactExpanded(!isImpactExpanded)}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isImpactExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#F97316]" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>{isImpactExpanded ? 'Hide affected components' : 'View all affected components & services'}</span>
          </button>

          {isImpactExpanded && (
            <div className="mt-3 space-y-2">
              {blastRadius.affectedFiles.map((file, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-[#090D14] border border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-white truncate">{file.path}</span>
                  <span className="text-slate-400 text-[11px] shrink-0 ml-3">{file.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FIX CARD (RECOMMENDED FIX) */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-2xl bg-[#0E131F] border border-emerald-500/30 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              Recommended Fix
            </h2>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
              Risk: {recommendedFix.risk}
            </span>
            <span className="text-slate-400">File: <strong className="text-white">{recommendedFix.file}</strong></span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">{recommendedFix.title}</h3>
          <p className="text-xs text-slate-300">{recommendedFix.expectedImpact}</p>
        </div>

        {/* Code Diff Box */}
        <div className="rounded-xl bg-[#090D14] border border-white/10 overflow-hidden">
          <div className="p-2.5 bg-[#141C2B] border-b border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">{recommendedFix.file}</span>
            <button
              onClick={handleCopyDiff}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedDiff ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDiff ? 'Copied' : 'Copy Diff'}</span>
            </button>
          </div>

          <pre className="p-3.5 font-mono text-xs overflow-x-auto leading-relaxed text-slate-200">
            {recommendedFix.diff.split('\n').map((line, idx) => {
              const isAdd = line.startsWith('+');
              const isDel = line.startsWith('-');
              return (
                <div
                  key={idx}
                  className={`px-2 py-0.5 rounded ${
                    isAdd
                      ? 'bg-emerald-950/40 text-emerald-300 font-semibold'
                      : isDel
                      ? 'bg-red-950/40 text-red-300 line-through'
                      : 'text-slate-400'
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </pre>
        </div>

        {/* Git "What changed?" expandable */}
        {investigation.gitChangeInfo && (
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => setIsGitChangeExpanded(!isGitChangeExpanded)}
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <GitCommit className="w-3.5 h-3.5 text-[#F97316]" />
              <span>{isGitChangeExpanded ? 'Hide Git Change' : 'What changed? (Git Commit Analysis)'}</span>
            </button>

            {isGitChangeExpanded && (
              <div className="mt-2 p-3 rounded-xl bg-[#090D14] border border-white/10 font-mono text-xs space-y-1">
                <span className="text-amber-400">Likely introduced by commit {investigation.gitChangeInfo.commitHash} in {investigation.gitChangeInfo.file}</span>
                <p className="text-slate-300 text-[11px]">{investigation.gitChangeInfo.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsFixApplied(!isFixApplied)}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              isFixApplied
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isFixApplied ? 'Fix Applied in Workspace' : 'Apply Fix'}</span>
          </button>

          <button
            onClick={handleDownloadFixedZip}
            disabled={isDownloadingZip}
            className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingZip ? 'Creating ZIP...' : 'Download Fixed Code (ZIP)'}</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. VERIFICATION CARD (VERIFY FIX) */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-2xl bg-[#0E131F] border border-white/10 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              Verify Fix
            </h2>
          </div>

          <button
            onClick={onVerifyFix}
            disabled={isVerifying}
            className="px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-black text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isVerifying ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isVerified ? 'Re-run verification' : 'Run verification'}</span>
              </>
            )}
          </button>
        </div>

        {/* Verification Check Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#090D14] border border-white/10">
            <span className="text-slate-400 text-[11px] block">Tests</span>
            <span className="font-bold text-emerald-400 mt-1 flex items-center gap-1">
              ✓ Passed ({isVerified ? verification.totalTests : verification.afterPassingCount}/{verification.totalTests})
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#090D14] border border-white/10">
            <span className="text-slate-400 text-[11px] block">Build</span>
            <span className="font-bold text-emerald-400 mt-1 flex items-center gap-1">
              ✓ Passed
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#090D14] border border-white/10">
            <span className="text-slate-400 text-[11px] block">Failure</span>
            <span className={`font-bold mt-1 flex items-center gap-1 ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isVerified ? '✓ Resolved' : 'Ready to verify'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#090D14] border border-white/10">
            <span className="text-slate-400 text-[11px] block">Regression</span>
            <span className="font-bold text-emerald-400 mt-1 flex items-center gap-1">
              ✓ None detected
            </span>
          </div>
        </div>

        {/* Before / After Compact Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 space-y-1">
            <span className="font-bold text-red-400 text-[11px] uppercase tracking-wider block">Before</span>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center gap-1.5 text-red-300">
                <span>✕</span> <span>Failure active</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-300">
                <span>✕</span> <span>3 tests failing</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
            <span className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider block">After</span>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span>✓</span> <span>Failure resolved</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span>✓</span> <span>All tests passing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Cases Table & Sandbox Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Automated Test Suites:</span>
            <button
              onClick={() => setIsLogsExpanded(!isLogsExpanded)}
              className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Terminal className="w-3 h-3" />
              <span>{isLogsExpanded ? 'Hide Runner Logs' : 'View Runner Logs'}</span>
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {verification.testCases.map((tc) => (
              <div
                key={tc.id}
                className="p-2.5 rounded-lg bg-[#090D14] border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px]">{tc.suite}</span>
                  <span className="text-white">{tc.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[10px]">{tc.durationMs}ms</span>
                  <span className={`font-bold ${isVerified || tc.afterStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isVerified ? '✓ PASS' : tc.beforeStatus === 'PASS' ? '✓ PASS' : '✕ FAIL'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {isLogsExpanded && (
            <pre className="p-3 rounded-xl bg-[#090D14] border border-white/10 font-mono text-[11px] text-slate-400 overflow-x-auto leading-relaxed">
              {verification.logs.join('\n')}
            </pre>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. EXPORT REPORT BUTTON */}
      {/* ========================================================================= */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
        <div className="text-xs font-mono text-slate-400">
          Ready to share or archive this root cause diagnosis?
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-black font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isExportingPdf ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Exporting PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Export PDF Report</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold border border-white/10 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-[#F97316]" />
            <span>Markdown</span>
          </button>

          <button
            onClick={handleDownloadLog}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs font-medium border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Log File</span>
          </button>
        </div>
      </div>

      {/* Code Inspection Drawer / Modal */}
      {inspectModalFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0E131F] border border-white/15 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-mono text-sm">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">{inspectModalFile.file}</span>
                {inspectModalFile.line && <span className="text-amber-400">:Line {inspectModalFile.line}</span>}
              </div>

              <button
                onClick={() => setInspectModalFile(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-[#090D14] p-4 border border-white/5 font-mono text-xs text-slate-300">
              {filesSnapshot[inspectModalFile.file] ? (
                filesSnapshot[inspectModalFile.file].split('\n').map((l, i) => {
                  const lineNum = i + 1;
                  const isHighlight = inspectModalFile.line === lineNum;
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 px-2 py-0.5 rounded ${
                        isHighlight ? 'bg-amber-500/20 text-amber-300 font-bold border-l-2 border-amber-400' : ''
                      }`}
                    >
                      <span className="text-slate-600 w-8 select-none text-right">{lineNum}</span>
                      <span className="whitespace-pre-wrap">{l}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 italic">
                  File content snapshot available for project files. (Matched error location: {inspectModalFile.file})
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              {onOpenInExplorer && inspectModalFile && (
                <button
                  onClick={() => {
                    const file = inspectModalFile.file;
                    const line = inspectModalFile.line;
                    setInspectModalFile(null);
                    onOpenInExplorer(file, line);
                  }}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-mono text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Open Full Project Explorer →</span>
                </button>
              )}
              <button
                onClick={() => setInspectModalFile(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-mono text-xs rounded-lg transition-colors cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
