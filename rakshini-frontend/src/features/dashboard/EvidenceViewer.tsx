import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Camera, Image as ImageIcon, Video, Filter, Download, Calendar } from 'lucide-react';

export function EvidenceViewer() {
  const evidence = useStore(state => state.evidence);
  const [filterType, setFilterType] = useState<string>('all');

  const filteredEvidence = evidence.filter(e => filterType === 'all' || e.type === filterType);

  const getIcon = (type: string) => {
    if (type === 'frame') return <ImageIcon size={16} />;
    if (type === 'face_crop') return <Camera size={16} />;
    if (type === 'object_crop') return <Camera size={16} />;
    return <Video size={16} />;
  };

  return (
    <section className="panel flex-1 flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/5">
      <div className="panel-header border-b border-white/10 pb-4 flex justify-between items-center shrink-0">
        <h2 className="panel-title text-xl text-white font-light tracking-wide">Evidence Collection</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilterType('frame')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filterType === 'frame' ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            Frames
          </button>
          <button 
            onClick={() => setFilterType('face_crop')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filterType === 'face_crop' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            Faces
          </button>
          <button 
            onClick={() => setFilterType('object_crop')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filterType === 'object_crop' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            Objects
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {filteredEvidence.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <Filter size={48} className="opacity-20" />
            <p>No evidence collected yet. Awaiting backend events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredEvidence.map((item) => (
              <div key={item.id} className="group relative bg-slate-800/40 rounded-xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300">
                <div className="aspect-square bg-black relative">
                  <img src={item.url} alt="Evidence" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[0.65rem] text-white flex items-center gap-1 border border-white/10">
                    {getIcon(item.type)}
                    <span className="uppercase tracking-widest">{item.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-xs text-slate-300 font-mono mb-1">{item.cameraId}</div>
                  <div className="text-[0.65rem] text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  {item.confidence && (
                    <div className="mt-2 flex items-center justify-between text-[0.65rem]">
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-emerald-400">{(item.confidence * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                  <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg pointer-events-auto" title="Download">
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
