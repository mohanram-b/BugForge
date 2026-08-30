import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart,
  Bar, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  ReferenceLine,
  ReferenceDot,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { 
  Layers, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  AlertTriangle, 
  CheckCircle2, 
  FileCode, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  ArrowRight, 
  Clock, 
  Activity, 
  BarChart3, 
  Network, 
  Flame,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { GraphNode, DependencyGraphData } from '../types';

export interface FailurePathGraphProps {
  graphData?: DependencyGraphData;
  nodes?: GraphNode[];
  selectedNodeId?: string;
  onSelectNode?: (node: GraphNode) => void;
  onOpenFileInExplorer?: (file: string, line?: number) => void;
  className?: string;
}

type ViewMode = 'sequence' | 'waterfall' | 'radar';

export const FailurePathGraph: React.FC<FailurePathGraphProps> = ({
  graphData,
  nodes: customNodes,
  selectedNodeId,
  onSelectNode,
  onOpenFileInExplorer,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('sequence');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [showFailurePathOnly, setShowFailurePathOnly] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Normalize nodes with sequence information and metrics
  const rawNodes = customNodes || graphData?.nodes || [];
  const failurePathIds = graphData?.failurePath || [];

  const sequenceNodes = useMemo(() => {
    let list = [...rawNodes];

    // Filter if requested
    if (showFailurePathOnly) {
      list = list.filter(
        (n) =>
          failurePathIds.includes(n.id) ||
          n.role === 'root_cause' ||
          n.role === 'error_site' ||
          n.status === 'error'
      );
    }

    // Sort by sequenceOrder or role hierarchy
    return list.map((node, index) => {
      const order = node.sequenceOrder ?? index + 1;
      const isRootCause = node.role === 'root_cause';
      const isErrorSite = node.role === 'error_site' || node.status === 'error';
      const isImpacted = node.role === 'impacted' || node.status === 'affected';

      const executionTime =
        node.executionTimeMs ??
        (isRootCause ? 74 : isErrorSite ? 140 : isImpacted ? 35 : 20);

      const startOffset = node.startOffsetMs ?? index * 45;
      const errorProb =
        node.errorProbability ??
        (isRootCause ? 92 : isErrorSite ? 98 : isImpacted ? 65 : 5);

      const impact =
        node.impactScore ??
        (isRootCause ? 95 : isErrorSite ? 90 : isImpacted ? 70 : 15);

      const depth = node.callDepth ?? (index < 2 ? index + 1 : Math.min(index + 1, 4));

      return {
        ...node,
        sequenceOrder: order,
        executionTimeMs: executionTime,
        startOffsetMs: startOffset,
        errorProbability: errorProb,
        impactScore: impact,
        callDepth: depth,
        displayName: node.label.length > 16 ? `${node.label.slice(0, 15)}...` : node.label,
        stepLabel: `#${order} ${node.label.split(' ')[0]}`,
        fileNameOnly: node.file.split('/').pop() || node.file,
      };
    }).sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));
  }, [rawNodes, showFailurePathOnly, failurePathIds]);

  const [activeNode, setActiveNode] = useState<GraphNode | null>(() => {
    if (selectedNodeId) {
      const found = sequenceNodes.find((n) => n.id === selectedNodeId);
      if (found) return found;
    }
    return (
      sequenceNodes.find((n) => n.role === 'root_cause') ||
      sequenceNodes.find((n) => n.role === 'error_site') ||
      sequenceNodes[0] ||
      null
    );
  });

  // Sync selectedNodeId prop changes
  useEffect(() => {
    if (selectedNodeId) {
      const found = sequenceNodes.find((n) => n.id === selectedNodeId);
      if (found) {
        setActiveNode(found);
        const idx = sequenceNodes.findIndex((n) => n.id === selectedNodeId);
        if (idx >= 0) setPlaybackIndex(idx);
      }
    }
  }, [selectedNodeId, sequenceNodes]);

  // Playback loop for auto-stepping through the sequence
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && sequenceNodes.length > 0) {
      timer = setInterval(() => {
        setPlaybackIndex((prev) => {
          const next = (prev + 1) % sequenceNodes.length;
          const nextNode = sequenceNodes[next];
          setActiveNode(nextNode);
          if (onSelectNode) onSelectNode(nextNode);
          return next;
        });
      }, 1400);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, sequenceNodes, onSelectNode]);

  const handleSelectStep = (index: number) => {
    if (index >= 0 && index < sequenceNodes.length) {
      setPlaybackIndex(index);
      const node = sequenceNodes[index];
      setActiveNode(node);
      if (onSelectNode) onSelectNode(node);
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleStepPrev = () => {
    const prev = (playbackIndex - 1 + sequenceNodes.length) % sequenceNodes.length;
    handleSelectStep(prev);
  };

  const handleStepNext = () => {
    const next = (playbackIndex + 1) % sequenceNodes.length;
    handleSelectStep(next);
  };

  const handleReset = () => {
    setIsPlaying(false);
    handleSelectStep(0);
  };

  // Compute summary stats
  const rootCauseNode = sequenceNodes.find((n) => n.role === 'root_cause');
  const errorSiteNode = sequenceNodes.find((n) => n.role === 'error_site' || n.status === 'error');
  const totalExecutionTime = sequenceNodes.reduce((acc, curr) => acc + (curr.executionTimeMs || 0), 0);

  // Radar chart formatted data
  const radarData = useMemo(() => {
    return sequenceNodes.map((n) => ({
      module: n.fileNameOnly,
      risk: n.errorProbability || 0,
      impact: n.impactScore || 0,
      latency: Math.min(100, Math.round(((n.executionTimeMs || 0) / 150) * 100)),
      depth: (n.callDepth || 1) * 25,
    }));
  }, [sequenceNodes]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isRoot = data.role === 'root_cause';
      const isErr = data.role === 'error_site' || data.status === 'error';
      const isImp = data.role === 'impacted';

      return (
        <div className="p-3 rounded-xl bg-[#090D16] border border-[#263147] shadow-2xl text-xs font-mono text-[#E2E8F0] space-y-1.5 max-w-[280px] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] pb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRoot ? 'bg-amber-400' : isErr ? 'bg-rose-500' : isImp ? 'bg-orange-400' : 'bg-cyan-400'
                }`}
              />
              {data.label}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-bold uppercase">
              Step #{data.sequenceOrder}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>File: <span className="text-slate-200">{data.file}{data.line ? `:${data.line}` : ''}</span></div>
            {data.functionName && <div>Function: <span className="text-amber-300 font-semibold">{data.functionName}</span></div>}
            <div>Role: <span className="text-white font-semibold uppercase">{data.role}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1E293B] text-[10px]">
            <div>
              <span className="text-slate-400 block">Execution Latency</span>
              <span className="text-cyan-400 font-bold">{data.executionTimeMs} ms</span>
            </div>
            <div>
              <span className="text-slate-400 block">Error Risk</span>
              <span className={`font-bold ${data.errorProbability > 70 ? 'text-rose-400' : 'text-amber-400'}`}>
                {data.errorProbability}%
              </span>
            </div>
          </div>

          {data.triggerReason && (
            <p className="text-[10px] text-amber-200/90 pt-1 border-t border-[#1E293B] italic">
              {data.triggerReason}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`rounded-2xl bg-[#090D14] border border-[#1E293B] shadow-xl overflow-hidden flex flex-col font-sans transition-all ${
        isExpanded ? 'fixed inset-4 z-50 bg-[#070A10]' : 'w-full'
      } ${className}`}
    >
      {/* Top Header & View Controls */}
      <div className="p-3.5 sm:p-4 border-b border-[#1E293B] bg-[#0D121F] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 border border-[#F97316]/30 flex items-center justify-center text-[#F97316] shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight uppercase font-mono">
                Failure Path Dependency Graph
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30">
                Recharts Call Sequence
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Trace chronological propagation from ingress to fatal locus ({sequenceNodes.length} modules mapped)
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Expand */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-[#141C2B] border border-[#263147] p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('sequence')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'sequence'
                  ? 'bg-[#F97316] text-black font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Call Sequence</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('waterfall')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'waterfall'
                  ? 'bg-[#F97316] text-black font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline Waterfall</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'radar'
                  ? 'bg-[#F97316] text-black font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Impact Matrix</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFailurePathOnly(!showFailurePathOnly)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
              showFailurePathOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#141C2B] text-slate-300 border-[#263147] hover:border-slate-500'
            }`}
            title="Toggle between isolated failure path vs all coupled modules"
          >
            {showFailurePathOnly ? 'Failure Path' : 'All Modules'}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[#141C2B] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-[#263147] transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#0B0F19] border-b border-[#1E293B] text-xs font-mono">
        <div className="p-2 rounded-lg bg-[#101624] border border-[#1E293B]">
          <span className="text-[10px] text-slate-400 block uppercase">Ingress Trigger</span>
          <span className="text-white font-bold truncate block">
            {sequenceNodes[0]?.label || 'HTTP Entry'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-[#101624] border border-amber-500/30">
          <span className="text-[10px] text-amber-400 block uppercase">⚡ Root Cause Module</span>
          <span className="text-amber-200 font-bold truncate block">
            {rootCauseNode?.label || 'server.js'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-[#101624] border border-rose-500/30">
          <span className="text-[10px] text-rose-400 block uppercase">❌ Fatal Error Site</span>
          <span className="text-rose-200 font-bold truncate block">
            {errorSiteNode?.label || 'database.js'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-[#101624] border border-[#1E293B]">
          <span className="text-[10px] text-slate-400 block uppercase">Total Call Duration</span>
          <span className="text-cyan-400 font-bold block">
            {totalExecutionTime} ms ({sequenceNodes.length} hops)
          </span>
        </div>
      </div>

      {/* Interactive Playback Control Bar */}
      <div className="px-4 py-2.5 bg-[#0D121E] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="px-3 py-1 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-black font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
            <span>{isPlaying ? 'Pause Sequence' : 'Simulate Call Flow'}</span>
          </button>

          <button
            type="button"
            onClick={handleStepPrev}
            disabled={playbackIndex === 0}
            className="p-1.5 rounded-lg bg-[#141C2B] hover:bg-[#1E293B] text-slate-300 disabled:opacity-40 border border-[#263147] cursor-pointer"
            title="Step Back"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono text-slate-300 font-semibold px-1">
            Step {playbackIndex + 1} of {sequenceNodes.length}
          </span>

          <button
            type="button"
            onClick={handleStepNext}
            disabled={playbackIndex === sequenceNodes.length - 1}
            className="p-1.5 rounded-lg bg-[#141C2B] hover:bg-[#1E293B] text-slate-300 disabled:opacity-40 border border-[#263147] cursor-pointer"
            title="Step Forward"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-[#141C2B] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-[#263147] cursor-pointer"
            title="Reset to Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Sequence Breadcrumb Ribbon */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {sequenceNodes.map((node, idx) => {
            const isSelected = activeNode?.id === node.id;
            const isRoot = node.role === 'root_cause';
            const isErr = node.role === 'error_site' || node.status === 'error';

            return (
              <React.Fragment key={node.id}>
                <button
                  type="button"
                  onClick={() => handleSelectStep(idx)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono shrink-0 transition-all cursor-pointer border flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#F97316] text-black font-bold border-[#F97316]'
                      : isRoot
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : isErr
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                      : 'bg-[#141C2B] text-slate-400 border-[#263147] hover:text-white'
                  }`}
                >
                  <span>#{idx + 1}</span>
                  <span className="truncate max-w-[90px]">{node.displayName}</span>
                  {isRoot && <Zap className="w-2.5 h-2.5 text-amber-300" />}
                  {isErr && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>}
                </button>
                {idx < sequenceNodes.length - 1 && (
                  <span className="text-slate-600 font-mono text-xs">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="p-4 sm:p-6 flex-1 min-h-[340px] bg-[#070A11] flex flex-col justify-center">
        {viewMode === 'sequence' && (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={sequenceNodes}
                margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const node = e.activePayload[0].payload;
                    setActiveNode(node);
                    const idx = sequenceNodes.findIndex((n) => n.id === node.id);
                    if (idx >= 0) setPlaybackIndex(idx);
                    if (onSelectNode) onSelectNode(node);
                  }
                }}
              >
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="latencyBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity={0.6} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />

                <XAxis
                  dataKey="stepLabel"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  fontFamily="monospace"
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />

                {/* Left Y Axis: Execution Latency */}
                <YAxis
                  yAxisId="left"
                  stroke="#38BDF8"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  unit="ms"
                  domain={[0, 'auto']}
                />

                {/* Right Y Axis: Error Probability Risk */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#EF4444"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  unit="%"
                  domain={[0, 100]}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Error Propagation Risk Area Curve */}
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="errorProbability"
                  name="Error Risk"
                  fill="url(#riskGradient)"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#EF4444', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                  activeDot={{ r: 7, fill: '#F97316', stroke: '#FFFFFF', strokeWidth: 2 }}
                />

                {/* Module Execution Latency Bars */}
                <Bar
                  yAxisId="left"
                  dataKey="executionTimeMs"
                  name="Execution Latency (ms)"
                  radius={[6, 6, 0, 0]}
                  barSize={36}
                >
                  {sequenceNodes.map((entry, index) => {
                    const isSelected = activeNode?.id === entry.id;
                    const isRoot = entry.role === 'root_cause';
                    const isErr = entry.role === 'error_site' || entry.status === 'error';
                    const isImp = entry.role === 'impacted';

                    let fillColor = '#0EA5E9'; // Cyan
                    if (isRoot) fillColor = '#F59E0B'; // Amber
                    if (isErr) fillColor = '#EF4444'; // Red
                    if (isImp) fillColor = '#F97316'; // Orange

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillColor}
                        opacity={isSelected ? 1 : 0.75}
                        stroke={isSelected ? '#FFFFFF' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                        className="transition-all cursor-pointer hover:opacity-100"
                      />
                    );
                  })}
                </Bar>

                {/* Call Depth Line */}
                <Line
                  yAxisId="left"
                  type="stepAfter"
                  dataKey="callDepth"
                  name="Call Depth"
                  stroke="#A855F7"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />

                {/* Reference Line at Critical Failure Trigger */}
                {rootCauseNode && (
                  <ReferenceLine
                    yAxisId="right"
                    x={`#${rootCauseNode.sequenceOrder} ${rootCauseNode.label.split(' ')[0]}`}
                    stroke="#F59E0B"
                    strokeDasharray="3 3"
                    label={{
                      value: '⚡ ROOT CAUSE TRIGGER',
                      fill: '#FCD34D',
                      fontSize: 10,
                      position: 'top',
                      fontFamily: 'monospace',
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'waterfall' && (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sequenceNodes}
                margin={{ top: 10, right: 30, left: 80, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const node = e.activePayload[0].payload;
                    setActiveNode(node);
                    const idx = sequenceNodes.findIndex((n) => n.id === node.id);
                    if (idx >= 0) setPlaybackIndex(idx);
                    if (onSelectNode) onSelectNode(node);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={10} unit="ms" fontFamily="monospace" />
                <YAxis
                  dataKey="displayName"
                  type="category"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  fontFamily="monospace"
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Stacked offset bar to simulate waterfall start point */}
                <Bar dataKey="startOffsetMs" stackId="waterfall" fill="transparent" />

                {/* Execution duration bar */}
                <Bar
                  dataKey="executionTimeMs"
                  stackId="waterfall"
                  name="Execution Duration"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                >
                  {sequenceNodes.map((entry, index) => {
                    const isSelected = activeNode?.id === entry.id;
                    const isRoot = entry.role === 'root_cause';
                    const isErr = entry.role === 'error_site' || entry.status === 'error';
                    let fillColor = '#0284C7';
                    if (isRoot) fillColor = '#F59E0B';
                    if (isErr) fillColor = '#EF4444';
                    return (
                      <Cell
                        key={`wf-${index}`}
                        fill={fillColor}
                        stroke={isSelected ? '#FFFFFF' : 'none'}
                        strokeWidth={2}
                        className="cursor-pointer"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'radar' && (
          <div className="w-full h-[320px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#1E293B" />
                <PolarAngleAxis dataKey="module" stroke="#94A3B8" fontSize={10} fontFamily="monospace" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                <Radar name="Error Risk" dataKey="risk" stroke="#EF4444" fill="#EF4444" fillOpacity={0.35} />
                <Radar name="Blast Impact" dataKey="impact" stroke="#F97316" fill="#F97316" fillOpacity={0.25} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Deep-Dive Active Module Inspector Drawer */}
      {activeNode && (
        <div className="p-4 border-t border-[#1E293B] bg-[#0C101A] text-xs font-mono flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-sm font-sans flex items-center gap-1.5">
                {activeNode.label}
              </span>

              {activeNode.role === 'root_cause' ? (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  ROOT CAUSE TRIGGER
                </span>
              ) : activeNode.role === 'error_site' || activeNode.status === 'error' ? (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  FATAL EXECUTION LOCUS
                </span>
              ) : activeNode.role === 'impacted' ? (
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold">
                  CASCADE IMPACTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                  {activeNode.role.toUpperCase()}
                </span>
              )}

              <span className="text-slate-400 text-[11px]">
                Step #{activeNode.sequenceOrder} in call chain
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-slate-300 text-[11px]">
              <span>
                File: <strong className="text-white">{activeNode.file}</strong>
                {activeNode.line && <span className="text-amber-400 font-bold">:{activeNode.line}</span>}
              </span>
              {activeNode.functionName && (
                <span>
                  Function: <strong className="text-amber-300">{activeNode.functionName}</strong>
                </span>
              )}
              <span>
                Latency: <strong className="text-cyan-400">{activeNode.executionTimeMs}ms</strong>
              </span>
              <span>
                Risk Score: <strong className="text-rose-400">{activeNode.errorProbability}%</strong>
              </span>
            </div>

            <p className="text-slate-300 text-xs font-sans leading-relaxed">
              {activeNode.details || activeNode.triggerReason || 'Module participates in the failure propagation sequence.'}
            </p>

            {/* Inbound & Outbound Dependency links */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-[#1E293B]">
              <span className="flex items-center gap-1">
                <span className="text-slate-500">Called by:</span>
                <span className="text-slate-200">
                  {activeNode.incoming && activeNode.incoming.length > 0
                    ? activeNode.incoming.join(', ')
                    : 'External Trigger / Ingress'}
                </span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500">Propagates to:</span>
                <span className="text-slate-200">
                  {activeNode.outgoing && activeNode.outgoing.length > 0
                    ? activeNode.outgoing.join(', ')
                    : 'Terminal Exception Halt'}
                </span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {onOpenFileInExplorer && (
              <button
                type="button"
                onClick={() => onOpenFileInExplorer(activeNode.file, activeNode.line)}
                className="px-3.5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Jump to Code Line</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
