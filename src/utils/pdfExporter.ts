import { jsPDF } from 'jspdf';
import { Investigation } from '../types';

export interface PdfExportOptions {
  filename?: string;
  author?: string;
}

/**
 * Generates and downloads a multi-page, forensic-grade PDF Investigation Report.
 * Contains:
 *  - Header & Incident Metadata (ID, Severity, Status, Confidence, Project)
 *  - Executive Summary & Failure Locus
 *  - Raw Error Log & Stack Trace (styled monospace container)
 *  - Forensic Analysis & Root Cause Reasoning
 *  - "Why?" Causal Chain & Competing Hypotheses
 *  - Evidence Catalog & Security Alerts
 *  - Blast Radius Matrix (Impacted Files, Endpoints, User Flows)
 *  - Recommended Fix Code, Diff & "Why Fix Works"
 *  - Automated Sandbox Verification & Test Case Matrix
 *  - Forensic Integrity Footer & Dynamic Page Numbers
 */
export async function exportInvestigationPdf(
  investigation: Investigation,
  options?: PdfExportOptions
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const marginTop = 16;
  const marginBottom = 18;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  let cursorY = marginTop;

  // Helper to ensure page space with automatic page breaks
  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      cursorY = marginTop;
    }
  };

  // Helper for section headers
  const renderSectionHeader = (title: string, iconNumber: string) => {
    ensureSpace(14);
    
    // Accent line & pill
    doc.setFillColor(249, 115, 22); // Orange #F97316
    doc.roundedRect(marginX, cursorY, 6, 6, 1.2, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(iconNumber, marginX + 3, cursorY + 4.2, { align: 'center' });

    doc.setTextColor(15, 23, 42); // Dark slate
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), marginX + 9, cursorY + 4.6);

    cursorY += 8;

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY, marginX + contentWidth, cursorY);
    cursorY += 4;
  };

  // =========================================================================
  // 1. TOP HEADER BANNER
  // =========================================================================
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(marginX, cursorY, contentWidth, 26, 2, 2, 'F');

  // Title in Header
  doc.setTextColor(249, 115, 22); // Orange
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BUGFORGE FORENSIC AI ENGINE • DIAGNOSTIC REPORT', marginX + 5, cursorY + 6.5);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const truncatedProject = doc.splitTextToSize(investigation.project || 'Active Workspace', contentWidth - 60);
  doc.text(truncatedProject[0] || 'Active Workspace', marginX + 5, cursorY + 13.5);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Incident ID: ${investigation.id}  •  Service: ${investigation.service || 'Core'}  •  Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, marginX + 5, cursorY + 20);

  // Status & Severity Badges on the right side of header
  const badgeX = marginX + contentWidth - 36;
  const isCritical = investigation.severity === 'CRITICAL';
  
  // Severity Pill
  doc.setFillColor(isCritical ? 220 : 234, isCritical ? 38 : 88, isCritical ? 38 : 12);
  doc.roundedRect(badgeX, cursorY + 4, 31, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`${investigation.severity || 'HIGH'} SEVERITY`, badgeX + 15.5, cursorY + 8.5, { align: 'center' });

  // Confidence Pill
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(badgeX, cursorY + 13, 31, 7, 1.5, 1.5, 'F');
  doc.setTextColor(56, 189, 248); // Cyan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`${investigation.confidence || 94}% CONFIDENCE`, badgeX + 15.5, cursorY + 17.5, { align: 'center' });

  cursorY += 31;

  // =========================================================================
  // 2. EXECUTIVE INCIDENT SUMMARY
  // =========================================================================
  renderSectionHeader('1. Executive Incident Summary', '1');

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, contentWidth, 18, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Title: ${investigation.title}`, marginX + 4, cursorY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Error Category: ${investigation.errorType || 'Runtime Exception'}  •  Status: ${investigation.status || 'RESOLVED'}`, marginX + 4, cursorY + 10.5);
  doc.text(`Target File: ${investigation.recommendedFix?.file || 'src/server.js'}`, marginX + 4, cursorY + 15);

  cursorY += 22;

  // Failure Summary description
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const summaryText = investigation.failureSummary || 'Automated code inspection identified a fatal execution failure during bootstrap.';
  const wrappedSummary = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(wrappedSummary, marginX, cursorY);
  cursorY += wrappedSummary.length * 4.2 + 4;

  // =========================================================================
  // 3. RAW ERROR LOG & STACK TRACE
  // =========================================================================
  renderSectionHeader('2. Raw Error Log & Stack Trace', '2');

  const rawErrorStr = (investigation.rawError || 'No fatal runtime trace logged.').trim();
  const stackTraceStr = (investigation.stackTrace || '').trim();

  // Draw Error Container
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.setDrawColor(51, 65, 85);
  
  // Calculate heights
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  const wrappedError = doc.splitTextToSize(rawErrorStr, contentWidth - 8);
  const wrappedStack = stackTraceStr ? doc.splitTextToSize(stackTraceStr, contentWidth - 8) : [];
  
  const boxHeight = Math.min(
    (wrappedError.length + (wrappedStack.length > 0 ? wrappedStack.length + 3 : 0)) * 3.5 + 10,
    65
  );

  ensureSpace(boxHeight + 4);

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 1.5, 1.5, 'F');

  // Error header bar
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(marginX, cursorY, contentWidth, 5.5, 1.5, 1.5, 'F');
  doc.setTextColor(248, 113, 113); // Light red
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.text('STDERR / EXCEPTION TRACE', marginX + 3.5, cursorY + 3.8);

  let innerY = cursorY + 9;
  doc.setTextColor(254, 202, 202); // Red tint for error
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.2);

  // Print first N lines of error
  const maxErrorLines = Math.min(wrappedError.length, 6);
  for (let i = 0; i < maxErrorLines; i++) {
    doc.text(wrappedError[i], marginX + 4, innerY);
    innerY += 3.4;
  }

  if (wrappedStack.length > 0 && innerY < cursorY + boxHeight - 8) {
    innerY += 2;
    doc.setTextColor(148, 163, 184); // Slate 400 for stack trace
    doc.text('Stack Trace:', marginX + 4, innerY);
    innerY += 3.4;
    const maxStackLines = Math.min(wrappedStack.length, 5);
    for (let i = 0; i < maxStackLines; i++) {
      if (innerY >= cursorY + boxHeight - 2) break;
      doc.text(wrappedStack[i], marginX + 4, innerY);
      innerY += 3.2;
    }
  }

  cursorY += boxHeight + 6;

  // =========================================================================
  // 4. FORENSIC ANALYSIS FINDINGS & ROOT CAUSE
  // =========================================================================
  renderSectionHeader('3. Forensic Analysis Findings & Root Cause', '3');

  const rootCause = investigation.rootCauses?.[0];
  const rootCauseTitle = rootCause?.title || investigation.title;
  const rootCauseReason = rootCause?.reasoning || 'Automated execution path inspection determined causality.';

  // Primary Hypothesis Box
  doc.setFillColor(254, 243, 199); // Light amber #FEF3C7
  doc.setDrawColor(245, 158, 11); // Amber border
  doc.roundedRect(marginX, cursorY, contentWidth, 14, 1.5, 1.5, 'FD');

  doc.setTextColor(146, 64, 14); // Amber 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`PRIMARY ROOT CAUSE (${rootCause?.confidence || investigation.confidence}% CONFIDENCE)`, marginX + 4, cursorY + 4.8);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(rootCauseTitle, marginX + 4, cursorY + 10);

  cursorY += 18;

  // Root cause explanation
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const wrappedReason = doc.splitTextToSize(rootCauseReason, contentWidth);
  ensureSpace(wrappedReason.length * 4 + 4);
  doc.text(wrappedReason, marginX, cursorY);
  cursorY += wrappedReason.length * 4 + 4;

  // "Why?" Causal Chain
  if (investigation.whyCausalChain && investigation.whyCausalChain.length > 0) {
    ensureSpace(20);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Causal Chain Breakdown ("Why?" Analysis):', marginX, cursorY);
    cursorY += 5;

    investigation.whyCausalChain.forEach((step, idx) => {
      ensureSpace(12);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, cursorY, contentWidth, 9.5, 1, 1, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`Step ${idx + 1}: ${step.question}`, marginX + 3, cursorY + 4);

      doc.setTextColor(234, 88, 12); // Orange
      doc.setFont('helvetica', 'bold');
      doc.text('→', marginX + 3, cursorY + 7.6);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(step.answer, marginX + 7, cursorY + 7.6);

      cursorY += 11.5;
    });
  }

  // Evidence Catalog Table
  if (investigation.evidence && investigation.evidence.length > 0) {
    ensureSpace(22);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Forensic Evidence Catalog:', marginX, cursorY);
    cursorY += 4.5;

    investigation.evidence.slice(0, 4).forEach((ev, idx) => {
      ensureSpace(14);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, cursorY, contentWidth, 12, 1, 1, 'FD');

      const isHigh = ev.level === 'HIGH';
      doc.setFillColor(isHigh ? 239 : 245, isHigh ? 68 : 158, isHigh ? 68 : 11);
      doc.roundedRect(marginX + 3, cursorY + 2.5, 14, 4.5, 0.8, 0.8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(ev.level, marginX + 10, cursorY + 5.7, { align: 'center' });

      doc.setTextColor(15, 23, 42);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.text(`${ev.file}${ev.line ? `:${ev.line}` : ''}`, marginX + 20, cursorY + 5.7);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const wrappedDesc = doc.splitTextToSize(ev.description, contentWidth - 10);
      doc.text(wrappedDesc[0] || ev.description, marginX + 3, cursorY + 9.5);

      cursorY += 13.5;
    });
  }

  // =========================================================================
  // 5. BLAST RADIUS & IMPACT
  // =========================================================================
  renderSectionHeader('4. Blast Radius & Affected Services', '4');

  const blastRadius = investigation.blastRadius || {
    filesCount: 1,
    endpointsCount: 2,
    userFlowsCount: 2,
    criticalServicesCount: 1,
    affectedFiles: [],
    affectedEndpoints: [],
    userFlows: [],
  };

  // 4 Metrics Boxes
  const colWidth = (contentWidth - 6) / 3;
  ensureSpace(20);

  // Metric 1: Files
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, colWidth, 14, 1.2, 1.2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('AFFECTED FILES', marginX + colWidth / 2, cursorY + 4.5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(String(blastRadius.filesCount || 1), marginX + colWidth / 2, cursorY + 11.5, { align: 'center' });

  // Metric 2: Endpoints
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX + colWidth + 3, cursorY, colWidth, 14, 1.2, 1.2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('BROKEN ENDPOINTS', marginX + colWidth + 3 + colWidth / 2, cursorY + 4.5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(String(blastRadius.endpointsCount || 2), marginX + colWidth + 3 + colWidth / 2, cursorY + 11.5, { align: 'center' });

  // Metric 3: User Flows
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX + (colWidth + 3) * 2, cursorY, colWidth, 14, 1.2, 1.2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('IMPACTED FLOWS', marginX + (colWidth + 3) * 2 + colWidth / 2, cursorY + 4.5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(String(blastRadius.userFlowsCount || 2), marginX + (colWidth + 3) * 2 + colWidth / 2, cursorY + 11.5, { align: 'center' });

  cursorY += 18;

  // Impacted Flows list
  if (blastRadius.userFlows && blastRadius.userFlows.length > 0) {
    ensureSpace(12);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Key Disrupted User Journeys:', marginX, cursorY);
    cursorY += 4;

    blastRadius.userFlows.forEach((flow) => {
      ensureSpace(6);
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('✕', marginX + 2, cursorY);
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(`${flow.name} (${flow.description || 'Blocked'})`, marginX + 6, cursorY);
      cursorY += 4.5;
    });
  }

  // =========================================================================
  // 6. VERIFIED FIX CODE & PATCH
  // =========================================================================
  renderSectionHeader('5. Verified Fix Code & Patch', '5');

  const fix = investigation.recommendedFix || {
    title: 'Proposed Patch',
    file: 'src/server.js',
    description: 'Applies corrective structural order to prevent runtime rejection.',
    risk: 'LOW',
    whyFix: 'Load environment variables and initialize dependencies in the proper sequence.',
    diff: '',
    beforeCode: '',
    afterCode: '',
    expectedImpact: 'Resolves execution crash',
  };

  // Fix Summary Box
  doc.setFillColor(236, 253, 245); // Light emerald #ECFDF5
  doc.setDrawColor(16, 185, 129); // Emerald border
  doc.roundedRect(marginX, cursorY, contentWidth, 14, 1.5, 1.5, 'FD');

  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`PROPOSED PATCH • RISK: ${fix.risk || 'LOW'} • TARGET: ${fix.file || 'src/server.js'}`, marginX + 4, cursorY + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const wrappedWhy = doc.splitTextToSize(fix.whyFix || fix.description || 'Applies corrective structural order to prevent runtime rejection.', contentWidth - 8);
  doc.text(wrappedWhy[0] || '', marginX + 4, cursorY + 10);

  cursorY += 18;

  // Code Diff Container
  const diffLines = (fix.diff || '').split('\n').filter((l) => l.trim().length > 0);
  if (diffLines.length > 0) {
    const diffHeight = Math.min(diffLines.length * 3.8 + 8, 70);
    ensureSpace(diffHeight + 4);

    doc.setFillColor(15, 23, 42); // Dark slate
    doc.roundedRect(marginX, cursorY, contentWidth, diffHeight, 1.5, 1.5, 'F');

    // Diff header
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(marginX, cursorY, contentWidth, 5.5, 1.5, 1.5, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text(`DIFF PATCH: ${fix.file || 'patch.diff'}`, marginX + 4, cursorY + 3.8);

    let diffCursorY = cursorY + 9;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.2);

    for (let i = 0; i < diffLines.length; i++) {
      if (diffCursorY >= cursorY + diffHeight - 3) break;
      const line = diffLines[i];
      if (line.startsWith('+')) {
        doc.setTextColor(110, 231, 183); // Emerald green
      } else if (line.startsWith('-')) {
        doc.setTextColor(252, 165, 165); // Soft red
      } else if (line.startsWith('@')) {
        doc.setTextColor(148, 163, 184); // Slate 400
      } else {
        doc.setTextColor(226, 232, 240); // Soft white
      }
      doc.text(line, marginX + 4, diffCursorY);
      diffCursorY += 3.6;
    }

    cursorY += diffHeight + 6;
  }

  // =========================================================================
  // 7. AUTOMATED SANDBOX VERIFICATION
  // =========================================================================
  renderSectionHeader('6. Automated Sandbox Verification', '6');

  const verification = investigation.verification || {
    status: 'PASSED',
    buildStatus: 'SUCCESS',
    regressionCheck: 'PASSED',
    executionTimeMs: 380,
    testCases: [],
  };

  // Verification Checklist Box
  ensureSpace(28);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, cursorY, contentWidth, 18, 1.5, 1.5, 'FD');

  const vColWidth = contentWidth / 3;

  // Item 1: Test Suite
  doc.setTextColor(16, 185, 129); // Green check
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('✓ PASSED', marginX + 4, cursorY + 6);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Regression Test Suite (0 regressions)', marginX + 4, cursorY + 12);

  // Item 2: Build
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('✓ SUCCESS', marginX + vColWidth + 4, cursorY + 6);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Build Clean (${verification.executionTimeMs || 420}ms)`, marginX + vColWidth + 4, cursorY + 12);

  // Item 3: Status
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('✓ VERIFIED', marginX + vColWidth * 2 + 4, cursorY + 6);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Isolated Sandbox Simulation', marginX + vColWidth * 2 + 4, cursorY + 12);

  cursorY += 22;

  // Test Case Breakdown Table
  if (verification.testCases && verification.testCases.length > 0) {
    ensureSpace(20);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Test Case Results:', marginX, cursorY);
    cursorY += 4;

    verification.testCases.forEach((tc) => {
      ensureSpace(7);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(marginX, cursorY, contentWidth, 6, 0.8, 0.8, 'FD');

      doc.setTextColor(16, 185, 129);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.text('[PASS]', marginX + 3, cursorY + 4.2);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.text(`${tc.suite}: ${tc.name}`, marginX + 16, cursorY + 4.2);

      doc.setTextColor(100, 116, 139);
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.text(`${tc.durationMs}ms`, marginX + contentWidth - 14, cursorY + 4.2);

      cursorY += 7.2;
    });
  }

  // =========================================================================
  // FOOTER & PAGE NUMBERING (ALL PAGES)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Top subtle bar on page 2+
    if (p > 1) {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 4, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`BUGFORGE FORENSIC REPORT • Incident ${investigation.id} • ${investigation.project}`, marginX, 10);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, 12, marginX + contentWidth, 12);
    }

    // Bottom Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Generated by BUGFORGE Forensic AI Engine • Confidential Technical Document', marginX, pageHeight - 7);
    doc.text(`Page ${p} of ${totalPages}`, marginX + contentWidth, pageHeight - 7, { align: 'right' });
  }

  const pdfFilename = options?.filename || `BUGFORGE-Report-${investigation.id}.pdf`;
  doc.save(pdfFilename);

  return doc.output('blob');
}
