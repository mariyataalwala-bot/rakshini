import React, { Suspense, useState } from 'react';
import { useWebSocketConnection } from './services/websocket';
import { useStore } from './store/useStore';
import { LiveCamera } from './features/dashboard/LiveCamera';
import { Shield } from 'lucide-react';

const IncidentFeed = React.lazy(() => import('./features/dashboard/IncidentFeed').then(m => ({ default: m.IncidentFeed })));
const AIAssistant = React.lazy(() => import('./features/dashboard/AIAssistant').then(m => ({ default: m.AIAssistant })));
const EvidenceViewer = React.lazy(() => import('./features/dashboard/EvidenceViewer').then(m => ({ default: m.EvidenceViewer })));
const AnalyticsDashboard = React.lazy(() => import('./features/dashboard/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

const WS_URL = 'ws://localhost:3000/ws';

function App() {
  useWebSocketConnection(WS_URL);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCameraId, setActiveCameraId] = useState('CAM-01');
  const [multiView, setMultiView] = useState(false);
  const [windyPlan, setWindyPlan] = useState<'free' | 'professional' | 'enterprise'>('free');
  const [windyRequestCount, setWindyRequestCount] = useState(148);
  
  const wsConnected = useStore(state => state.wsConnected);
  const cameraTelemetry = useStore(state => state.cameraTelemetry[activeCameraId]);
  
  const telemetry = cameraTelemetry || { latency: 0, fps: 0, cpu: 0, gpu: 0, memory: 0 };
  
  const incidentsCount = useStore(state => state.incidents.length);
  
  const activeCamerasCount = useStore(state => {
    const list = Object.values(state.cameras);
    if (list.length === 0) return 3;
    return list.filter(c => c.status === 'online').length;
  });

  const getCameraVideoSrc = (id: string) => {
    switch(id) {
      case 'CAM-01': return '/video.mp4';
      case 'CAM-02': return '/cam2.mp4';
      case 'CAM-03': return '/cam3.mp4';
      case 'CAM-04': return '/vid_cam4.mp4';
      default: return '/video.mp4';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-3 gap-8 h-[calc(100vh-10rem)]">
            {/* Left Column: Camera Feeds */}
            <div className="col-span-2 flex flex-col gap-6 overflow-hidden">
              <section className="panel flex-1 p-0 overflow-hidden ring-1 ring-white/5 shadow-2xl">
                {multiView ? (
                  <div className="grid grid-cols-2 gap-4 p-4 h-full bg-slate-950/40 overflow-y-auto">
                    {['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map((id) => (
                      <div 
                        key={id} 
                        onClick={() => setActiveCameraId(id)}
                        className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-300 ${
                          id === activeCameraId ? 'border-blue-500 shadow-lg' : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <LiveCamera cameraId={id} className="h-48" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <LiveCamera cameraId={activeCameraId} />
                )}
              </section>

              {/* Minimal Camera Selector Grid */}
              <section className="panel">
                <div className="panel-header flex justify-between items-center">
                  <h2 className="panel-title">Available Feeds</h2>
                  <button 
                    onClick={() => setMultiView(!multiView)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all duration-300 ${
                      multiView 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {multiView ? 'DISPLAY: SINGLE VIEW' : 'DISPLAY: 2X2 GRID VIEW'}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map((id) => {
                    const src = getCameraVideoSrc(id);
                    const isImage = src.endsWith('.jpg') || src.endsWith('.png');
                    return (
                      <div 
                        key={id}
                        onClick={() => setActiveCameraId(id)}
                        className={`relative aspect-video rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden group ${
                          id === activeCameraId ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50 scale-[1.02]' : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                        }`}
                        style={{ background: '#000' }}
                      >
                        {isImage ? (
                          <img
                            src={src}
                            alt={id}
                            className="w-full h-full object-cover transition-opacity duration-300"
                          />
                        ) : (
                          <video
                            src={src}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover transition-opacity duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[0.65rem] text-white font-medium border border-white/10 z-10">{id}</div>
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]"></div>
                          <span className="text-[0.55rem] text-white/90 tracking-widest font-mono">LIVE</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            
            {/* Right Column: Stats & AI Assistant */}
            <div className="col-span-1 flex flex-col gap-6 overflow-hidden">
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Metrics</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-item group p-5 bg-slate-800/30 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Inference</div>
                    <div className="text-2xl font-light tracking-tight text-white group-hover:text-blue-400 transition-colors drop-shadow-sm">{telemetry.latency}ms</div>
                  </div>
                  <div className="stat-item group p-5 bg-slate-800/30 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">FPS</div>
                    <div className="text-2xl font-light tracking-tight text-white group-hover:text-blue-400 transition-colors drop-shadow-sm">{telemetry.fps}</div>
                  </div>
                  <div className="stat-item group p-5 bg-slate-800/30 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Active Cameras</div>
                    <div className="text-2xl font-light tracking-tight text-white group-hover:text-blue-400 transition-colors drop-shadow-sm">{activeCamerasCount}</div>
                  </div>
                  <div className="stat-item group p-5 bg-slate-800/30 rounded-xl border border-white/5 hover:border-rose-500/30 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
                    <div className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Incidents Today</div>
                    <div className={`text-2xl font-light tracking-tight transition-colors drop-shadow-sm ${incidentsCount > 0 ? 'text-rose-500 font-normal animate-pulse-fast' : 'text-white'}`}>{incidentsCount}</div>
                  </div>
                </div>
              </section>

              <Suspense fallback={<div className="panel flex-1 flex items-center justify-center text-slate-500 animate-pulse">Loading AI Core...</div>}>
                <AIAssistant className="flex-1 shadow-2xl ring-1 ring-white/5" />
              </Suspense>
            </div>
          </div>
        );
      
      case 'incidents':
        return (
          <Suspense fallback={<div className="panel flex-1 flex items-center justify-center text-slate-500 animate-pulse">Loading DB...</div>}>
            <IncidentFeed className="h-full shadow-2xl ring-1 ring-white/5" />
          </Suspense>
        );

      case 'evidence':
        return (
          <Suspense fallback={<div className="panel flex-1 flex items-center justify-center text-slate-500 animate-pulse">Loading Evidence...</div>}>
            <EvidenceViewer />
          </Suspense>
        );
      
      case 'analytics':
        return (
          <Suspense fallback={<div className="panel flex-1 flex items-center justify-center text-slate-500 animate-pulse">Loading Analytics...</div>}>
            <AnalyticsDashboard />
          </Suspense>
        );

      case 'authorities':
        return (
          <section className="panel flex-1 shadow-2xl ring-1 ring-white/5">
            <div className="panel-header"><h2 className="panel-title">Authorities Integration</h2></div>
            <div className="text-slate-400 text-sm mt-4">
              Local Police dispatch and Emergency Medical Services integrated. Pending authorization codes for radio transmission.
            </div>
          </section>
        );

      case 'settings':
        return (
          <div className="grid grid-cols-3 gap-8 h-[calc(100vh-10rem)] overflow-y-auto">
            {/* Left Column: API Credentials & Billing Plans */}
            <div className="col-span-2 flex flex-col gap-6">
              {/* Credentials */}
              <section className="panel p-6">
                <div className="panel-header mb-4">
                  <h2 className="panel-title">Windy & Helios API Configurations</h2>
                  <p className="text-xs text-slate-400 mt-1">Configure camera credentials and manage platform streaming modes.</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Helios API Key</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-900 border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Enter Helios Developer Key to stream live cameras..."
                      value={useStore.getState().heliosApiKey || ''}
                      onChange={(e) => useStore.getState().setHeliosApiKey(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Windy Webcams API Key</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-900 border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Enter Windy Webcams Key to fetch real-world streams..."
                      value={useStore.getState().windyApiKey || ''}
                      onChange={(e) => useStore.getState().setWindyApiKey(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">511NY Traffic API Key</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-900 border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Enter 511NY Developer Key as alternative traffic API..."
                      value={useStore.getState().fiveOneOneNyApiKey || ''}
                      onChange={(e) => useStore.getState().setFiveOneOneNyApiKey(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Roboflow Private API Key</label>
                    <input 
                      type="password" 
                      className="w-full bg-slate-900 border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="Enter Roboflow Private API Key (rf_...)"
                      value={useStore((state) => state.roboflowApiKey) || ''}
                      onChange={(e) => useStore.getState().setRoboflowApiKey(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Roboflow Model ID / Version</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="Enter Model ID (e.g. wpns/weapons-s4k8n/1)"
                      value={useStore((state) => state.roboflowModelUrl) || ''}
                      onChange={(e) => useStore.getState().setRoboflowModelUrl(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Pricing Cards */}
              <section className="panel p-6">
                <div className="panel-header mb-6">
                  <h2 className="panel-title">Windy Webcams API Subscription Plans</h2>
                  <p className="text-xs text-slate-400 mt-1">Select the pricing tier mapped to your developer subscription.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Free */}
                  <div 
                    onClick={() => setWindyPlan('free')}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      windyPlan === 'free' 
                        ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'border-white/5 bg-slate-900/40 hover:border-white/10 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Developer / Free</div>
                      <div className="text-2xl font-light text-white mb-4">$0 <span className="text-xs text-slate-500">/ mo</span></div>
                      <ul className="text-xs text-slate-400 space-y-2 mb-6">
                        <li>• Snapshot token lifetime: <b>10 min</b></li>
                        <li>• Search limit: <b>500 req / day</b></li>
                        <li>• HLS stream: Not Supported</li>
                      </ul>
                    </div>
                    {windyPlan === 'free' && <span className="text-[10px] text-blue-400 font-mono tracking-widest text-center">ACTIVE PLAN</span>}
                  </div>

                  {/* Professional */}
                  <div 
                    onClick={() => setWindyPlan('professional')}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      windyPlan === 'professional' 
                        ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'border-white/5 bg-slate-900/40 hover:border-white/10 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Professional</div>
                      <div className="text-2xl font-light text-white mb-4">$99 <span className="text-xs text-slate-500">/ mo</span></div>
                      <ul className="text-xs text-slate-400 space-y-2 mb-6">
                        <li>• Snapshot token lifetime: <b>24 hours</b></li>
                        <li>• Search limit: <b>50,000 req / day</b></li>
                        <li>• HLS stream: Unlocked</li>
                      </ul>
                    </div>
                    {windyPlan === 'professional' && <span className="text-[10px] text-blue-400 font-mono tracking-widest text-center">ACTIVE PLAN</span>}
                  </div>

                  {/* Enterprise */}
                  <div 
                    onClick={() => setWindyPlan('enterprise')}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      windyPlan === 'enterprise' 
                        ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'border-white/5 bg-slate-900/40 hover:border-white/10 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Enterprise</div>
                      <div className="text-2xl font-light text-white mb-4">Custom <span className="text-xs text-slate-500">/ mo</span></div>
                      <ul className="text-xs text-slate-400 space-y-2 mb-6">
                        <li>• Snapshot token lifetime: <b>Infinite</b></li>
                        <li>• Search limit: <b>Unlimited</b></li>
                        <li>• RTSP & HLS streams: Unlocked</li>
                      </ul>
                    </div>
                    {windyPlan === 'enterprise' && <span className="text-[10px] text-blue-400 font-mono tracking-widest text-center">ACTIVE PLAN</span>}
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Quota Telemetry & Policies */}
            <div className="col-span-1 flex flex-col gap-6">
              {/* Quota Telemetry */}
              <section className="panel p-6 flex flex-col justify-between">
                <div>
                  <div className="panel-header mb-4">
                    <h2 className="panel-title">Quota Consumption</h2>
                  </div>
                  
                  {/* Limit meter */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                      <span>Search Requests</span>
                      <span>{windyRequestCount} / {windyPlan === 'free' ? 500 : windyPlan === 'professional' ? 50000 : 'Unlimited'} used</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-500"
                        style={{ 
                          width: `${windyPlan === 'enterprise' ? 2 : Math.min(100, (windyRequestCount / (windyPlan === 'free' ? 500 : 50000)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-white/5 rounded-lg p-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Token Lifetime Warning</div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {windyPlan === 'free' 
                        ? "Currently on Free Plan. Snapshot tokens expire every 10 minutes. Live streams will require periodic page refreshes to re-verify authentication." 
                        : windyPlan === 'professional' 
                        ? "Professional tier active. Image snapshot tokens are cached safely for 24 hours. Enjoy continuous monitoring without interruption." 
                        : "Enterprise tier active. Stream connections and snapshot tokens are unrestricted. Full RTSP pipeline is fully operational."
                      }
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setWindyRequestCount(148)}
                  className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs font-mono border border-white/5 transition-colors"
                >
                  Reset Daily Metrics Counter
                </button>
              </section>
            </div>
          </div>
        );
      
      default: return null;
    }
  };

  return (
    <div className="app-container relative">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <aside className="sidebar z-10 relative bg-slate-950/80 backdrop-blur-xl">
        <div className="brand font-display text-xl flex items-center gap-3 mb-8">
          <Shield className="text-blue-500" size={24} />
          <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">RAKSHINI OS</span>
        </div>
        
        <nav className="nav-menu">
          <button className={`nav-item w-full text-left font-display tracking-wide ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </button>
          <button className={`nav-item w-full text-left font-display tracking-wide ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>
            Incidents
          </button>
          <button className={`nav-item w-full text-left font-display tracking-wide ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>
            Evidence
          </button>
          <button className={`nav-item w-full text-left font-display tracking-wide ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
          <button className={`nav-item w-full text-left font-display tracking-wide ${activeTab === 'authorities' ? 'active' : ''}`} onClick={() => setActiveTab('authorities')}>
            Authorities
          </button>
          <button className={`nav-item w-full text-left font-display tracking-wide ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            Settings
          </button>
        </nav>
      </aside>
      
      <main className="main-content z-10 relative">
        <header className="header border-white/5 pb-6">
          <h1 className="capitalize font-display text-3xl font-light tracking-wide text-white drop-shadow-md">
            {activeTab === 'dashboard' ? 'System Overview' : activeTab.replace('-', ' ')}
          </h1>
          <div className="status-badge bg-black/40 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
            <div className={`status-dot ${!wsConnected && 'bg-rose-500'}`}></div>
            <span className="text-slate-300 uppercase tracking-widest text-[0.7rem]">
              {wsConnected ? 'Core Active' : 'Offline'}
            </span>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}

export default App;
