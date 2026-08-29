import React, { useState } from 'react';
import { 
  History, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileCode, 
  Trash2,
  Filter,
  PlusCircle
} from 'lucide-react';
import { Investigation } from '../types';

interface HistoryViewProps {
  investigations: Investigation[];
  onOpenInvestigation: (inv: Investigation) => void;
  onNewInvestigation: () => void;
  onClearHistory?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  investigations,
  onOpenInvestigation,
  onNewInvestigation,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredInvestigations = investigations.filter((inv) => {
    const matchesSearch =
      (inv.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.project || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.rawError || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' || inv.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 py-4 font-sans select-none text-[#E2E8F0]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1E2333]">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">
            Investigation History
          </h1>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Archived diagnostic runs, root cause reports, and verification logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {investigations.length > 0 && onClearHistory && (
            <button
              onClick={onClearHistory}
              className="px-2.5 py-1.5 rounded bg-[#161B26] hover:bg-red-950/40 text-[#8B949E] hover:text-red-300 text-xs transition-colors border border-[#2B3245] flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={onNewInvestigation}
            className="bg-[#F97316] hover:bg-[#EA580C] text-black font-semibold text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Investigate</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {investigations.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, project, or error..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D1017] border border-[#1E2333] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#6E7681] focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#0D1017] border border-[#1E2333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      )}

      {/* List / Empty State */}
      {filteredInvestigations.length > 0 ? (
        <div className="bg-[#0D1017] border border-[#1E2333] rounded-lg divide-y divide-[#1E2333]/80">
          {filteredInvestigations.map((inv) => {
            const isVerified = inv.status === 'RESOLVED' || inv.verification?.status === 'PASSED';
            return (
              <div
                key={inv.id}
                onClick={() => onOpenInvestigation(inv)}
                className="px-4 py-3 hover:bg-[#121622]/60 transition-colors cursor-pointer flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#F97316] font-medium">
                      {inv.id}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                        inv.severity === 'CRITICAL'
                          ? 'bg-red-950/40 text-red-400 border border-red-800/40'
                          : 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                      }`}
                    >
                      {inv.severity}
                    </span>
                    <span className="text-[#8B949E]">•</span>
                    <span className="text-[#8B949E] text-[11px]">{inv.confidenceScore || inv.confidence || 90}% confidence</span>
                  </div>

                  <h3 className="text-xs font-medium text-[#E2E8F0] truncate">
                    {inv.title}
                  </h3>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-[11px]">
                  <span className="text-[#6E7681] text-[10px]">
                    {new Date(inv.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6E7681]" />
                </div>
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
            <h3 className="text-xs font-semibold text-white">No investigations yet</h3>
            <p className="text-[11px] text-[#8B949E] max-w-sm mx-auto">
              Start an investigation from the Investigate tab or connect a repository.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
