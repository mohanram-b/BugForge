import React, { useState } from 'react';
import { X, FileText, Download, Copy, Check, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Investigation } from '../types';

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

  if (!isOpen) return null;

  const rootCause0 = investigation.rootCauses?.[0];
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
  const evidenceList = investigation.evidence || [];
  const recommendedFix = investigation.recommendedFix || {
    file: '',
    risk: 'LOW',
    diff: '',
    whyFix: '',
  };
  const verification = investigation.verification || {
    buildStatus: 'PASSED',
    regressionCheck: 'NONE',
    testCases: [],
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

  const handleDownload = () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0D131F] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-[#0E1420] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Forensic Investigation Report</h2>
              <p className="text-xs text-slate-400 font-mono">Incident #{investigation.id} | Markdown / PDF Export</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#141C2B] hover:bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#06090E] font-mono text-xs text-slate-300 space-y-4">
          <pre className="whitespace-pre-wrap leading-relaxed">
            {markdownReport}
          </pre>
        </div>
      </div>
    </div>
  );
};
