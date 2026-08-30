import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  ArrowRight, 
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileCode,
  Sparkles
} from 'lucide-react';
import { Investigation } from '../types';
import { useActiveProject } from '../context/ActiveProjectContext';

interface HistoryViewProps {
  investigations: Investigation[];
  onOpenInvestigation: (inv: Investigation) => void;
  onNewInvestigation?: () => void;
  onClearHistory?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  investigations,
  onOpenInvestigation,
  onClearHistory,
}) => {
  const { activeProject } = useActiveProject();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derive history items, ensuring the active project is included if investigations is empty
  const allItems: Investigation[] = investigations.length > 0
    ? investigations
    : activeProject
    ? [
        {
          id: `INV-${activeProject.id.slice(-4)}`,
          title: `Diagnostic Run: ${activeProject.name}`,
          project: activeProject.name,
          environment: 'Production Workspace',
          service: 'Core Engine',
          rawError: 'No fatal runtime crashes logged.',
          failureSummary: 'Workspace static analysis and scan report',
          confidence: 92,
          severity: 'HIGH',
          status: 'ANALYZING',
          rootCauses: [],
          evidence: [],
          timeline: [],
          createdAt: activeProject.uploadedAt || new Date().toISOString(),
        } as unknown as Investigation,
      ]
    : [];

  const filteredInvestigations = allItems.filter((inv) => {
    const name = inv.project || inv.title || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 py-4 font-sans select-none text-[#E2E8F0]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1E2333]">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">
            History
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Recently uploaded apps and diagnostic error history
          </p>
        </div>

        <div className="flex items-center gap-2">
          {allItems.length > 0 && onClearHistory && (
            <button
              onClick={onClearHistory}
              className="btn-motion px-2.5 py-1.5 rounded bg-[#161B26] hover:bg-red-950/40 text-[#8B949E] hover:text-red-300 text-xs border border-[#2B3245] flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {allItems.length > 0 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search uploaded app or file name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0D1017] border border-[#1E2333] hover:border-[#2B3245] focus:border-[#F97316] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#6E7681] focus:outline-none transition-colors duration-150"
          />
        </div>
      )}

      {/* List / Expandable Error Entries */}
      {filteredInvestigations.length > 0 ? (
        <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg divide-y divide-[#1E2333]/80 overflow-hidden shadow-md">
          {filteredInvestigations.map((inv) => {
            const isExpanded = expandedId === inv.id;
            const displayName = inv.project || inv.title || 'Uploaded Project';
            const errorFound =
              inv.rawError ||
              inv.failureSummary ||
              inv.rootCauses?.[0]?.title ||
              'No error logged';

            return (
              <div key={inv.id} className="transition-colors duration-150">
                {/* Front Header: Shows ONLY the Name and expandable chevron */}
                <button
                  type="button"
                  onClick={() => toggleExpand(inv.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-[#121622] text-left cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded border border-[#2B3245] bg-[#161B26] flex items-center justify-center text-[#F97316] shrink-0">
                      <FileCode className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-white truncate">
                      {displayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-[#6E7681]">
                      {new Date(inv.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#F97316]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#6E7681]" />
                    )}
                  </div>
                </button>

                {/* Expanded Error Details (Shown ONLY after clicking) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeInOut' }}
                      className="overflow-hidden bg-[#0A0D14] border-t border-[#1E2333]/60 px-5 py-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs font-semibold text-red-300">
                            Last Error Found
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            inv.severity === 'CRITICAL'
                              ? 'bg-red-950/50 text-red-400 border border-red-800/40'
                              : 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                          }`}
                        >
                          {inv.severity || 'HIGH'}
                        </span>
                      </div>

                      {/* Error Content */}
                      <div className="p-3 rounded bg-[#07090E] border border-red-950/60 font-mono text-[12px] leading-relaxed text-red-200/90 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {errorFound}
                      </div>

                      {/* Action to view full investigation */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#8B949E]">
                          Confidence: {inv.confidence || 90}%
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenInvestigation(inv)}
                          className="btn-motion px-3 py-1.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3 h-3 stroke-[2.5]" />
                          <span>Open Full Investigation</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-lg bg-[#0D1017] border border-[#1E2333] text-center space-y-3">
          <div className="w-9 h-9 rounded border border-[#1E2333] bg-[#121622] mx-auto flex items-center justify-center text-[#8B949E]">
            <History className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-white">No history yet</h3>
            <p className="text-[11px] text-[#8B949E] max-w-sm mx-auto">
              Upload a project from the Dashboard to start tracking errors and investigations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
