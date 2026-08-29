import React, { useState, useEffect } from 'react';
import { Search, Terminal, ArrowRight } from 'lucide-react';
import { Investigation } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  investigations: Investigation[];
  onSelectInvestigation: (inv: Investigation) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  investigations,
  onSelectInvestigation,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredInvs = investigations.filter((inv) =>
    (inv.title || '').toLowerCase().includes(query.toLowerCase()) ||
    (inv.id || '').toLowerCase().includes(query.toLowerCase()) ||
    (inv.errorType || '').toLowerCase().includes(query.toLowerCase()) ||
    (inv.project || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-lg bg-[#0D1017] border border-[#1E2333] shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Search input bar */}
        <div className="p-3 border-b border-[#1E2333] bg-[#090A0F] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[#F97316] shrink-0" />
          <input
            type="text"
            placeholder="Search active investigations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-white placeholder-[#6E7681] text-xs focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 bg-[#161B26] text-[#8B949E] rounded text-[10px] border border-[#2B3245] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1 text-xs">
          {filteredInvs.length > 0 ? (
            filteredInvs.map((inv) => (
              <button
                key={inv.id}
                onClick={() => {
                  onSelectInvestigation(inv);
                  onClose();
                }}
                className="w-full p-2.5 rounded bg-[#121622] hover:bg-[#181E2E] text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Terminal className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-white truncate text-xs">
                      {inv.title}
                    </div>
                    <div className="text-[10px] text-[#8B949E] font-mono">
                      {inv.id} • {inv.project || 'Project'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#6E7681] shrink-0" />
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-[#8B949E] text-xs">
              {query ? `No investigations found for "${query}"` : 'No investigations in workspace'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
