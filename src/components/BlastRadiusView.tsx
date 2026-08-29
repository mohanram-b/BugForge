import React, { useState } from 'react';
import { 
  Flame, 
  FileCode, 
  Network, 
  Users, 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { BlastRadius } from '../types';

interface BlastRadiusViewProps {
  blastRadius: BlastRadius;
  onOpenFile?: (file: string) => void;
}

export const BlastRadiusView: React.FC<BlastRadiusViewProps> = ({
  blastRadius,
  onOpenFile,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'endpoints' | 'flows' | 'services'>('files');

  return (
    <div className="space-y-6">
      {/* Top Blast Radius Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('files')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'files'
              ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-[#0D131F] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>AFFECTED FILES</span>
            <FileCode className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{blastRadius.filesCount}</div>
          <div className="text-[11px] text-amber-300 mt-1 font-mono">Direct & transitive</div>
        </div>

        <div 
          onClick={() => setActiveTab('endpoints')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'endpoints'
              ? 'bg-red-500/15 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              : 'bg-[#0D131F] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>AFFECTED ENDPOINTS</span>
            <Network className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{blastRadius.endpointsCount}</div>
          <div className="text-[11px] text-red-400/80 mt-1 font-mono">Returning 500 / unhandled</div>
        </div>

        <div 
          onClick={() => setActiveTab('flows')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'flows'
              ? 'bg-purple-500/15 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
              : 'bg-[#0D131F] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>USER FLOWS IMPACTED</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono">{blastRadius.userFlowsCount}</div>
          <div className="text-[11px] text-purple-400/80 mt-1 font-mono">User journeys halted</div>
        </div>

        <div 
          onClick={() => setActiveTab('services')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'bg-orange-500/15 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
              : 'bg-[#0D131F] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>CRITICAL SERVICES</span>
            <Server className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400 font-mono">{blastRadius.criticalServicesCount}</div>
          <div className="text-[11px] text-orange-400/80 mt-1 font-mono">Service degradation</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="p-6 rounded-xl bg-[#0D131F] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-bold text-white">Blast Radius & Failure Propagation Matrix</h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Files ({blastRadius.affectedFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('endpoints')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'endpoints'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Endpoints ({blastRadius.affectedEndpoints.length})
            </button>
            <button
              onClick={() => setActiveTab('flows')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'flows'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              User Flows ({blastRadius.userFlows.length})
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Services ({blastRadius.services.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Files */}
        {activeTab === 'files' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">FILE PATH</th>
                  <th className="py-2.5 px-3">PROPAGATION REASON</th>
                  <th className="py-2.5 px-3">RISK LEVEL</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {blastRadius.affectedFiles.map((file, idx) => (
                  <tr key={idx} className="hover:bg-[#141C2B]/80 transition-colors">
                    <td className="py-3 px-3 text-white font-bold">{file.path}</td>
                    <td className="py-3 px-3 text-slate-300 font-sans">{file.reason}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          file.risk === 'HIGH'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : file.risk === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {file.risk}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onOpenFile && (
                        <button
                          onClick={() => onOpenFile(file.path)}
                          className="px-2 py-1 rounded bg-[#1C2638] hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[11px] transition-colors cursor-pointer"
                        >
                          Inspect File
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Endpoints */}
        {activeTab === 'endpoints' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">METHOD</th>
                  <th className="py-2.5 px-3">ROUTE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">FAILURE IMPACT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {blastRadius.affectedEndpoints.map((ep, idx) => (
                  <tr key={idx} className="hover:bg-[#141C2B]/80 transition-colors">
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ep.method === 'POST'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : ep.method === 'GET'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        }`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white font-bold">{ep.path}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ep.status === 'BROKEN'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : ep.status === 'DEGRADED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {ep.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans">{ep.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: User Flows */}
        {activeTab === 'flows' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blastRadius.userFlows.map((flow, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  flow.affected
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-[#141C2B] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white font-sans text-sm">{flow.name}</span>
                  {flow.affected ? (
                    <span className="flex items-center gap-1 text-red-400 text-xs font-mono font-bold">
                      <XCircle className="w-4 h-4" />
                      BLOCKED / HALTED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      OPERATIONAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-sans">{flow.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Services */}
        {activeTab === 'services' && (
          <div className="space-y-3">
            {blastRadius.services.map((svc, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[#141C2B] border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white font-sans text-sm">{svc.name}</div>
                  <div className="text-xs text-slate-400 font-sans mt-0.5">{svc.description}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    svc.status === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : svc.status === 'DEGRADED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
