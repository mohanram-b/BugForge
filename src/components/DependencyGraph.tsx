import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  FileCode, 
  Cpu, 
  ArrowRight,
  Info,
  Flame,
  ShieldCheck,
  Activity,
  Network
} from 'lucide-react';
import { DependencyGraphData, GraphNode } from '../types';
import { FailurePathGraph } from './FailurePathGraph';

interface DependencyGraphProps {
  graphData: DependencyGraphData;
  onSelectNode?: (node: GraphNode) => void;
  onOpenFileInExplorer?: (file: string, line?: number) => void;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  graphData,
  onSelectNode,
  onOpenFileInExplorer,
}) => {
  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];
  const failurePath = graphData?.failurePath || [];

  const [displayMode, setDisplayMode] = useState<'recharts' | 'topology'>('recharts');
  const [scale, setScale] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(
    () => nodes.find((n) => n.role === 'root_cause' || n.role === 'error_site') || nodes[0] || null
  );
  const [showFailurePathOnly, setShowFailurePathOnly] = useState<boolean>(false);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.15, 1.8));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.15, 0.6));
  const handleResetZoom = () => setScale(1);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    if (onSelectNode) onSelectNode(node);
  };

  const filteredEdges = showFailurePathOnly
    ? edges.filter((e) => e.isFailurePath)
    : edges;

  const filteredNodes = showFailurePathOnly
    ? nodes.filter((n) => failurePath.includes(n.id) || n.role === 'root_cause' || n.role === 'error_site')
    : nodes;

  return (
    <div className="space-y-4">
      {/* Visual Mode Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0E1420] border border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-white uppercase">
            Dependency &amp; Call Sequence Visualizer
          </span>
        </div>

        <div className="flex items-center rounded-lg bg-[#141C2B] border border-slate-700 p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setDisplayMode('recharts')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              displayMode === 'recharts'
                ? 'bg-[#F97316] text-black font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Recharts Sequence Flow</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('topology')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              displayMode === 'topology'
                ? 'bg-[#F97316] text-black font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Topology Map</span>
          </button>
        </div>
      </div>

      {displayMode === 'recharts' ? (
        <FailurePathGraph
          graphData={graphData}
          nodes={nodes}
          selectedNodeId={selectedNode?.id}
          onSelectNode={handleNodeClick}
          onOpenFileInExplorer={onOpenFileInExplorer}
        />
      ) : (
        <div className="relative w-full h-[520px] rounded-xl bg-[#090D14] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Top Graph Controls Bar */}
          <div className="p-3 border-b border-slate-800/80 bg-[#0E1420]/90 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                  Failure Path
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  Root Cause
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span>
                  Normal
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFailurePathOnly(!showFailurePathOnly)}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${
                  showFailurePathOnly
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-[#141C2B] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {showFailurePathOnly ? 'Showing Failure Path' : 'Show All Impact Nodes'}
              </button>

              <div className="flex items-center rounded-lg bg-[#141C2B] border border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div className="relative flex-1 bg-dot-pattern overflow-auto p-6 flex items-center justify-center">
            <div
              className="transition-transform duration-200 origin-center"
              style={{ transform: `scale(${scale})` }}
            >
              <svg width="860" height="420" className="overflow-visible">
                <defs>
                  {/* Arrow markers */}
                  <marker
                    id="arrow-failure"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
                  </marker>

                  <marker
                    id="arrow-normal"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748B" />
                  </marker>

                  <marker
                    id="arrow-blast"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
                  </marker>
                </defs>

                {/* Render Edges */}
                {filteredEdges.map((edge) => {
                  const fromNode = nodes.find((n) => n.id === edge.from);
                  const toNode = nodes.find((n) => n.id === edge.to);

                  if (!fromNode || !toNode) return null;

                  const x1 = (fromNode.x || 100) + 75;
                  const y1 = (fromNode.y || 100) + 30;
                  const x2 = (toNode.x || 100) + 75;
                  const y2 = (toNode.y || 100) + 30;

                  // Curved bezier curve
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const cx = x1 + dx / 2;
                  const cy = y1 + dy / 2 - (dx === 0 ? 0 : 20);

                  const isFail = edge.isFailurePath;
                  const isBlast = edge.isBlastRadius;

                  return (
                    <g key={edge.id} className="cursor-pointer group">
                      <path
                        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                        fill="none"
                        stroke={isFail ? '#EF4444' : isBlast ? '#F59E0B' : '#334155'}
                        strokeWidth={isFail ? '2.5' : '1.5'}
                        strokeDasharray={isFail ? '4 2' : undefined}
                        className={isFail ? 'animate-pulse' : ''}
                        markerEnd={`url(#${isFail ? 'arrow-failure' : isBlast ? 'arrow-blast' : 'arrow-normal'})`}
                      />
                      {edge.label && (
                        <text
                          x={cx}
                          y={cy - 6}
                          fill={isFail ? '#FCA5A5' : '#94A3B8'}
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          className="bg-black/80 px-1"
                        >
                          {edge.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {filteredNodes.map((node) => {
                  const x = node.x || 100;
                  const y = node.y || 100;
                  const isSelected = selectedNode?.id === node.id;
                  const isRootCause = node.role === 'root_cause';
                  const isError = node.status === 'error' || node.role === 'error_site';
                  const isAffected = node.status === 'affected';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => handleNodeClick(node)}
                      className="cursor-pointer transition-transform hover:scale-105"
                    >
                      {/* Outer glow for root cause / error */}
                      {(isRootCause || isError) && (
                        <rect
                          x="-4"
                          y="-4"
                          width="158"
                          height="68"
                          rx="10"
                          fill="none"
                          stroke={isRootCause ? '#F59E0B' : '#EF4444'}
                          strokeWidth="2"
                          strokeOpacity="0.6"
                          className="animate-pulse"
                        />
                      )}

                      {/* Main Node Box */}
                      <rect
                        x="0"
                        y="0"
                        width="150"
                        height="60"
                        rx="8"
                        fill={isSelected ? '#1A2333' : '#0F172A'}
                        stroke={
                          isSelected
                            ? '#38BDF8'
                            : isRootCause
                            ? '#F59E0B'
                            : isError
                            ? '#EF4444'
                            : isAffected
                            ? '#F97316'
                            : '#334155'
                        }
                        strokeWidth={isSelected ? '2' : '1.5'}
                        className="shadow-lg"
                      />

                      {/* Header Badge */}
                      <rect
                        x="0"
                        y="0"
                        width="150"
                        height="20"
                        rx="8"
                        fill={
                          isRootCause
                            ? 'rgba(245, 158, 11, 0.2)'
                            : isError
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(51, 65, 85, 0.4)'
                        }
                      />

                      {/* Header label */}
                      <text
                        x="8"
                        y="14"
                        fill={isRootCause ? '#FCD34D' : isError ? '#FCA5A5' : '#94A3B8'}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {isRootCause
                          ? '⚡ ROOT CAUSE'
                          : isError
                          ? '❌ ERROR LOCUS'
                          : isAffected
                          ? '⚠ IMPACTED'
                          : node.role.toUpperCase()}
                      </text>

                      {/* Node Title */}
                      <text
                        x="8"
                        y="36"
                        fill="#FFFFFF"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {node.label.length > 18 ? `${node.label.slice(0, 16)}...` : node.label}
                      </text>

                      {/* File / Subtitle */}
                      <text
                        x="8"
                        y="50"
                        fill="#64748B"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {node.file.split('/').pop()}
                        {node.line ? `:${node.line}` : ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Bottom Node Detail Drawer */}
          {selectedNode && (
            <div className="p-4 border-t border-slate-800 bg-[#0E1420] text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm font-sans">{selectedNode.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedNode.role === 'root_cause'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : selectedNode.status === 'error'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    ROLE: {selectedNode.role.toUpperCase()}
                  </span>
                </div>
                <div className="text-slate-400 flex items-center gap-2">
                  <span>File: <strong className="text-slate-200">{selectedNode.file}</strong></span>
                  {selectedNode.line && <span>Line: <strong className="text-amber-400">{selectedNode.line}</strong></span>}
                </div>
                <div className="text-slate-300 text-[11px] font-sans">
                  {selectedNode.details || 'Identified in execution call path.'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenFileInExplorer && (
                  <button
                    type="button"
                    onClick={() => onOpenFileInExplorer(selectedNode.file, selectedNode.line)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>View in Code Explorer</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
