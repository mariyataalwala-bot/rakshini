
import { useStore } from '../../store/useStore';
import { PieChart, Activity, Car, Users, AlertTriangle } from 'lucide-react';

export function AnalyticsDashboard() {
  const incidents = useStore(state => state.incidents);
  
  // Basic distribution stats
  const crimeCount = incidents.filter(i => i.incident_type === 'crime').length;
  const accidentCount = incidents.filter(i => i.incident_type === 'accident').length;
  const interactionCount = incidents.filter(i => i.incident_type === 'interaction').length;
  const standardCount = incidents.filter(i => !i.incident_type || i.incident_type === 'standard').length;

  return (
    <section className="panel flex-1 flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/5 p-6">
      <div className="panel-header border-b border-white/10 pb-4 mb-6 shrink-0">
        <h2 className="panel-title text-xl text-white font-light tracking-wide flex items-center gap-2">
          <PieChart className="text-blue-500" /> Advanced Analytics
        </h2>
        <p className="text-sm text-slate-400 mt-2">Dynamic statistics generated from backend payload events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/30 p-5 rounded-xl border border-white/5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Crimes / Threats</div>
            <div className="text-2xl font-light text-white">{crimeCount}</div>
          </div>
        </div>
        
        <div className="bg-slate-800/30 p-5 rounded-xl border border-white/5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Accidents</div>
            <div className="text-2xl font-light text-white">{accidentCount}</div>
          </div>
        </div>

        <div className="bg-slate-800/30 p-5 rounded-xl border border-white/5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Interactions</div>
            <div className="text-2xl font-light text-white">{interactionCount}</div>
          </div>
        </div>

        <div className="bg-slate-800/30 p-5 rounded-xl border border-white/5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
            <Car size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Standard / Object</div>
            <div className="text-2xl font-light text-white">{standardCount}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-center">
        <div className="text-center text-slate-500 max-w-md">
          <PieChart size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">Detailed interactive charts will populate here as more historical data is aggregated from the backend stream.</p>
        </div>
      </div>
    </section>
  );
}
