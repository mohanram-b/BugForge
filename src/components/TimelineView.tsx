import React from 'react';
import { Clock, Play, Database, Key, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { TimelineEvent } from '../types';

interface TimelineViewProps {
  events: TimelineEvent[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ events }) => {
  return (
    <div className="p-6 rounded-xl bg-[#0D131F] border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Execution Timeline & Crash Chronology</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">{events.length} Recorded Sequence Events</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {events.map((event, idx) => {
          const isFatal = event.type === 'fatal' || event.type === 'error';
          const isWarn = event.type === 'warning';
          const isAuth = event.type === 'auth';
          const isDb = event.type === 'db';

          return (
            <div key={event.id || idx} className="relative group">
              {/* Dot Icon on Timeline Line */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isFatal
                    ? 'bg-red-950 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'
                    : isWarn
                    ? 'bg-amber-950 border-amber-500 text-amber-400'
                    : isDb
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-400'
                    : isAuth
                    ? 'bg-purple-950 border-purple-500 text-purple-400'
                    : 'bg-slate-900 border-slate-600 text-slate-400'
                }`}
              >
                {isFatal ? (
                  <XCircle className="w-3 h-3" />
                ) : isWarn ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : isDb ? (
                  <Database className="w-3 h-3" />
                ) : (
                  <Play className="w-2.5 h-2.5 fill-current" />
                )}
              </div>

              {/* Event Box */}
              <div
                className={`p-3.5 rounded-lg border transition-all ${
                  isFatal
                    ? 'bg-red-950/20 border-red-500/40 text-red-100'
                    : 'bg-[#141C2B] border-slate-800/80 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs font-mono">{event.title}</span>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="text-amber-400 font-semibold">{event.timeOffset}</span>
                    <span>({event.timestamp})</span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                  <span>Source: <strong className="text-slate-300">{event.source}</strong></span>
                </div>

                {event.details && (
                  <p className="text-xs text-slate-300 font-sans mt-2 leading-relaxed">
                    {event.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
