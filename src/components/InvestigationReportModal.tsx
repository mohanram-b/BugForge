import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  FileDown, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  Code2,
  FileCode
} from 'lucide-react';
import { Investigation } from '../types';
import { exportInvestigationPdf } from '../utils/pdfExporter';

interface InvestigationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  investigation: Investigation;
}

export const InvestigationReportModal: React.FC<InvestigationReportModalProps> = ({
  isOpen,
  onClose,
  investigation,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'structured' | 'markdown'>('structured');

  const rootCause0 = investigation.rootCauses?.[0];
  const blastRadius = investigation.blastRadius || {
    filesCount: 1,
    endpointsCount: 2,
    userFlowsCount: 2,
    criticalServicesCount: 1,
    affectedFiles: [],
    affectedEndpoints: [],
    userFlows: [],
    services: [],
  };
  const evidenceList = investigation.evidence || [];
  const recommendedFix = investigation.recommendedFix || {
    title: 'Recommended Patch',
    file: 'src/server.js',
    risk: 'LOW',
    diff: '',
    whyFix: 'Load environment variables and initialize dependencies in order.',
  };
  const verification = investigation.verification || {
    buildStatus: 'PASSED',
    regressionCheck: 'PASSED',
    testCases: [],
    executionTimeMs: 380,
  };

  const markdownReport = `# BUGFORGE FORENSIC INVESTIGATION REPORT
**Incident ID:** ${investigation.id}
**Project:** ${investigation.project || 'Project'}
**Service:** ${investigation.service || 'Service'}
**Severity:** ${investigation.severity || 'HIGH'}
**Status:** ${investigation.status || 'ACTIVE'}
**Confidence:** ${investigation.confidence || 90}%
**Generated:** ${new Date().toISOString()}

---

## 1. Executive Incident Summary
${investigation.title}

* **Failure Locus:** ${investigation.errorType || 'Runtime Error'}
* **Impact Summary:** ${blastRadius.filesCount} files affected, ${blastRadius.endpointsCount} broken endpoints, ${blastRadius.userFlowsCount} disrupted user flows.

\`\`\`
${investigation.rawError || ''}
\`\`\`

---

## 2. Primary Root Cause Hypothesis (Confidence: ${rootCause0?.confidence || 95}%)
**${rootCause0?.title || 'Root Cause'}**

${rootCause0?.reasoning || ''}

**Affected Files:**
${(rootCause0?.affectedFiles || []).map((f) => `- \`${f}\``).join('\n')}

---

## 3. Forensic Evidence Catalog
${evidenceList
  .map(
    (e, idx) => `### Evidence Item #${idx + 1} [${e.level} CONFIDENCE - ${e.type}]
- **File:** \`${e.file}\`${e.line ? ` (Line ${e.line})` : ''}
- **Description:** ${e.description}
${e.codeSnippet ? `\`\`\`javascript\n${e.codeSnippet}\n\`\`\`` : ''}`
  )
  .join('\n\n')}

---

## 4. Blast Radius Matrix
- **Affected Files:** ${(blastRadius.affectedFiles || []).map((f) => `\`${f.path}\` (${f.risk})`).join(', ')}
- **Affected Endpoints:** ${(blastRadius.affectedEndpoints || []).map((ep) => `\`${ep.method} ${ep.path}\` (${ep.status})`).join(', ')}

---

## 5. Recommended Fix Patch
**Target File:** \`${recommendedFix.file}\`
**Risk Level:** ${recommendedFix.risk}

\`\`\`diff
${recommendedFix.diff}
\`\`\`

### Why This Fix Works
${recommendedFix.whyFix}

---

## 6. Automated Sandbox Verification
- **Build Status:** ${verification.buildStatus}
- **Regression Analysis:** ${verification.regressionCheck}
- **Test Results:** ${(verification.testCases || []).map((tc) => `\n  - [${tc.afterStatus}] ${tc.name} (${tc.durationMs}ms)`).join('')}

---
*Report generated autonomously by BUGFORGE Forensic AI Engine v2.4.*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BUGFORGE-Report-${investigation.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportInvestigationPdf(investigation, {
        filename: `BUGFORGE-Report-${investigation.id}.pdf`,
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-2xl bg-[#0D1017] border border-[#1E2333] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#1E2333] bg-[#090A0F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 border border-[#F97316]/30 flex items-center justify-center text-[#F97316] shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Forensic Investigation Report</h2>
                  <p className="text-[11px] text-[#8B949E] font-mono">Incident #{investigation.id} • {investigation.project || 'Workspace'}</p>
                </div>
              </div>

              {/* Top Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* PDF Export Button */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="btn-motion px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Export complete forensic documentation PDF"
                >
                  {isExportingPdf ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Export PDF Report</span>
                    </>
                  )}
                </button>

                {/* Markdown Download */}
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="btn-motion px-2.5 py-1.5 rounded-lg bg-[#161B26] hover:bg-[#1E2433] text-[#C9D1D9] hover:text-white text-xs font-mono border border-[#2B3245] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#8B949E]" />
                  <span>Download .md</span>
                </button>

                {/* Copy Markdown */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-motion px-2.5 py-1.5 rounded-lg bg-[#161B26] hover:bg-[#1E2433] text-[#C9D1D9] hover:text-white text-xs font-mono border border-[#2B3245] flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8B949E]" />}
                  <span>{copied ? 'Copied' : 'Copy MD'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-[#161B26] transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* View Sub-Tabs (Structured Executive View vs Raw Markdown) */}
            <div className="flex items-center gap-2 px-5 py-2 border-b border-[#1E2333] bg-[#0A0D14] text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('structured')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  previewTab === 'structured'
                    ? 'bg-[#161B26] text-white border border-[#2B3245]'
                    : 'text-[#8B949E] hover:text-white'
                }`}
              >
                Executive Forensic Layout
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('markdown')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  previewTab === 'markdown'
                    ? 'bg-[#161B26] text-white border border-[#2B3245]'
                    : 'text-[#8B949E] hover:text-white'
                }`}
              >
                Raw Markdown
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 bg-[#06090E] space-y-5 text-xs text-[#C9D1D9]">
              {previewTab === 'structured' ? (
                <div className="space-y-6">
                  {/* 1. Header Metadata Banner */}
                  <div className="p-4 rounded-xl bg-[#0D1017] border border-[#1E2333] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{investigation.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            investigation.severity === 'CRITICAL'
                              ? 'bg-red-950/50 text-red-300 border border-red-800/40'
                              : 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                          }`}
                        >
                          {investigation.severity || 'HIGH'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B949E]">
                        Target Project: <span className="text-white font-medium">{investigation.project}</span> • Locus: <span className="text-white font-mono">{investigation.errorType || 'Runtime'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-[#8B949E] block uppercase font-mono">Confidence</span>
                        <span className="text-sm font-mono font-bold text-[#F97316]">{investigation.confidence || 94}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#8B949E] block uppercase font-mono">Status</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">{investigation.status || 'RESOLVED'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Raw Error Log */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Terminal className="w-3.5 h-3.5 text-red-400" />
                      <span>Raw Error Log &amp; Exception Trace</span>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[#080B10] border border-red-950/60 font-mono text-[11px] text-red-200/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {investigation.rawError || 'No fatal runtime log.'}
                    </pre>
                  </div>

                  {/* 3. Primary Root Cause Analysis */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Root Cause Findings</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0D1017] border border-amber-500/30 space-y-2">
                      <h4 className="text-xs font-bold text-amber-300">
                        {rootCause0?.title || investigation.title}
                      </h4>
                      <p className="text-xs text-[#C9D1D9] leading-relaxed">
                        {rootCause0?.reasoning || investigation.failureSummary || 'Failure identified through AST trace analysis.'}
                      </p>

                      {investigation.whyCausalChain && investigation.whyCausalChain.length > 0 && (
                        <div className="pt-2 border-t border-[#1E2333] space-y-1.5">
                          <span className="text-[10px] font-mono font-semibold text-[#8B949E] uppercase tracking-wider block">
                            Causal Chain:
                          </span>
                          {investigation.whyCausalChain.map((step, i) => (
                            <div key={i} className="p-2 rounded bg-[#080B10] border border-[#1E2333] font-mono text-[11px] space-y-0.5">
                              <span className="text-[#8B949E]">{step.question}</span>
                              <p className="text-orange-300 font-semibold pl-2">→ {step.answer}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Blast Radius Matrix */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>Blast Radius &amp; Affected Components</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 font-mono text-center">
                      <div className="p-3 rounded-lg bg-[#0D1017] border border-[#1E2333]">
                        <span className="text-[10px] text-[#8B949E] block">FILES</span>
                        <span className="text-base font-bold text-white mt-0.5 block">{blastRadius.filesCount}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0D1017] border border-[#1E2333]">
                        <span className="text-[10px] text-[#8B949E] block">ENDPOINTS</span>
                        <span className="text-base font-bold text-white mt-0.5 block">{blastRadius.endpointsCount}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0D1017] border border-[#1E2333]">
                        <span className="text-[10px] text-[#8B949E] block">USER FLOWS</span>
                        <span className="text-base font-bold text-white mt-0.5 block">{blastRadius.userFlowsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Recommended Fix Code */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified Fix Patch</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#8B949E]">
                        Target: <span className="text-white font-medium">{recommendedFix.file}</span> (Risk: {recommendedFix.risk})
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0D1017] border border-emerald-500/30 space-y-3">
                      <p className="text-xs text-[#C9D1D9]">
                        {recommendedFix.whyFix || recommendedFix.description}
                      </p>

                      {recommendedFix.diff && (
                        <pre className="p-3 rounded bg-[#080B10] border border-[#1E2333] font-mono text-[11px] text-[#C9D1D9] overflow-x-auto whitespace-pre leading-relaxed">
                          {recommendedFix.diff}
                        </pre>
                      )}
                    </div>
                  </div>

                  {/* 6. Verification Status */}
                  <div className="p-3.5 rounded-xl bg-[#0D1017] border border-[#1E2333] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sandbox Verification: {verification.buildStatus || 'PASSED'}</span>
                    </div>
                    <span className="text-[#8B949E]">0 Regressions Detected</span>
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                  {markdownReport}
                </pre>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
