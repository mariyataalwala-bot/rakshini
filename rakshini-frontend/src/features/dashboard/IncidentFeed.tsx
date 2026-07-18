
import { useState, useMemo, useRef, useCallback } from 'react';
import type { IncidentStatus, Incident } from '../../types';
import { Search, Filter, AlertTriangle, CheckCircle2, Clock, ShieldAlert, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useVirtualizer } from '@tanstack/react-virtual';

interface IncidentFeedProps {
  className?: string;
}

export function IncidentFeed({ className = '' }: IncidentFeedProps) {
  const incidents = useStore((state) => state.incidents);
  const acknowledgeIncident = useStore((state) => state.acknowledgeIncident);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch = 
        incident.threat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.cameraId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [incidents, searchQuery, statusFilter]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredIncidents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  const IncidentRow = useCallback(({ incident }: { incident: Incident }) => {
    const isActive = incident.status === 'active';
    const isHighConfidence = incident.confidence >= 0.8;
    
    // Dynamic styling based on backend incident_type
    const getTypeStyles = (type?: string) => {
      switch(type) {
        case 'crime': return 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/60 text-rose-400';
        case 'accident': return 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60 text-amber-400';
        case 'interaction': return 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/60 text-blue-400';
        case 'anomaly': return 'bg-purple-500/5 border-purple-500/30 hover:border-purple-500/60 text-purple-400';
        default: return 'bg-slate-800/40 border-white/5 hover:border-white/10 text-slate-300';
      }
    };

    const typeStyle = isActive ? getTypeStyles(incident.incident_type) : 'bg-slate-800/20 border-white/5 opacity-70 text-slate-500';

    return (
      <div 
        className={`flex gap-4 p-3 rounded-xl border transition-all duration-300 h-[100px] hover:-translate-y-0.5 shadow-sm hover:shadow-md group ${typeStyle}`}
      >
        {/* Thumbnail */}
        <div className="w-20 h-20 shrink-0 bg-black/60 border border-white/5 rounded-lg overflow-hidden relative flex items-center justify-center shadow-inner">
          {incident.thumbnailUrl ? (
            <img 
              src={incident.thumbnailUrl} 
              alt="Threat" 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" 
            />
          ) : (
            <AlertTriangle className={`opacity-40`} size={24} />
          )}
          {isActive && (
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping shadow-lg bg-current" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className={`font-semibold truncate text-[0.85rem] tracking-wide`}>
                {incident.threat.toUpperCase()}
              </h3>
              <span className="text-[0.65rem] text-slate-500 shrink-0 flex items-center gap-1 font-mono">
                <Clock size={10} />
                {new Date(incident.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            
            <div className="text-[0.65rem] text-slate-400 flex items-center gap-2 mb-2">
              <span className="bg-black/40 px-2 py-0.5 rounded font-mono border border-white/5">
                {incident.cameraId}
              </span>
              <span className="text-slate-600">•</span>
              <span className={`font-mono font-medium ${isHighConfidence ? 'opacity-100' : 'opacity-70'}`}>
                {(incident.confidence * 100).toFixed(1)}% CONF
              </span>
              {incident.evidenceIds && incident.evidenceIds.length > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-emerald-500/20">
                    {incident.evidenceIds.length} EVID
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions & Status */}
          <div className="flex justify-between items-center mt-auto">
            <span className={`text-[0.6rem] uppercase font-bold px-2 py-1 rounded-md tracking-wider ${
              incident.status === 'active' ? 'bg-current/10 border border-current/20' :
              incident.status === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              'bg-white/5 text-slate-400 border border-white/5'
            }`}>
              {incident.status}
            </span>
            
            {isActive && (
              <button
                onClick={() => acknowledgeIncident(incident.id)}
                className="flex items-center gap-1.5 text-[0.6rem] uppercase font-bold bg-white/5 hover:bg-white/10 text-current border border-current/20 px-3 py-1.5 rounded-md transition-all duration-300"
              >
                <Check size={10} />
                ACKNOWLEDGE
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }, [acknowledgeIncident]);

  return (
    <section className={`panel flex flex-col h-full ${className}`}>
      {/* Header & Controls */}
      <div className="shrink-0 flex flex-col gap-4 border-b border-white/5 pb-5">
        <div className="panel-header">
          <h2 className="panel-title flex items-center gap-2 text-rose-500">
            <ShieldAlert size={18} />
            INCIDENT FEED
          </h2>
          <span className="text-xs bg-black/40 px-2 py-1 rounded-md text-slate-400 font-mono border border-white/5">
            {filteredIncidents.length} EVENTS
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH EVENTS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 text-white text-[0.75rem] font-mono rounded-lg py-2.5 pl-9 pr-3 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800/80 transition-all shadow-inner"
            />
          </div>
          
          <div className="flex gap-2 text-[0.7rem] font-bold tracking-wider">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'text-slate-400 bg-slate-800/30 border border-transparent hover:bg-slate-800/60'}`}
            >
              <Filter size={12} /> ALL
            </button>
            <button 
              onClick={() => setStatusFilter('active')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${statusFilter === 'active' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : 'text-slate-400 bg-slate-800/30 border border-transparent hover:bg-slate-800/60'}`}
            >
              <AlertTriangle size={12} /> ACTIVE
            </button>
            <button 
              onClick={() => setStatusFilter('acknowledged')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${statusFilter === 'acknowledged' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-slate-400 bg-slate-800/30 border border-transparent hover:bg-slate-800/60'}`}
            >
              <CheckCircle2 size={12} /> ACK'D
            </button>
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-y-auto pt-5 custom-scrollbar pr-2"
      >
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <CheckCircle2 size={32} className="mb-3 opacity-30" />
            <p className="font-mono text-[0.75rem] tracking-widest uppercase">No Incidents Found</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const incident = filteredIncidents[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '12px'
                  }}
                >
                  <IncidentRow incident={incident} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
