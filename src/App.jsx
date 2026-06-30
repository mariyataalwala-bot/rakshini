import { useState } from 'react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Camera State
  const [cameras] = useState([
    { id: 'CAM-01', name: 'Front Desk', status: 'REC', frame: 'STREAM_INIT' },
    { id: 'CAM-02', name: 'Main Entrance', status: 'REC', frame: 'AWAITING_FEED' },
    { id: 'CAM-03', name: 'Parking Lot A', status: 'IDLE', frame: 'OFFLINE' },
    { id: 'CAM-04', name: 'Alleyway', status: 'REC', frame: 'CONNECTING' },
  ]);
  const [activeCamera, setActiveCamera] = useState(cameras[0]);

  const [alerts] = useState([
    { id: 1, title: 'Violence Detected', time: 'Just now', loc: 'Camera 02 · Main Entrance', severity: 'high' },
    { id: 2, title: 'Suspicious Behavior', time: '15m ago', loc: 'Camera 04 · Alleyway', severity: 'med' },
  ]);

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            
            {/* Left Column: Active Camera & Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Primary Feed */}
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Live Monitoring: {activeCamera.name}</h2>
                </div>
                <div className="video-container" style={{ aspectRatio: '16/9', border: '1px solid var(--border-active)' }}>
                  <div className="cam-badge">{activeCamera.id}</div>
                  {activeCamera.status === 'REC' && (
                    <div className="rec-badge">
                      <div className="rec-dot"></div>
                      REC
                    </div>
                  )}
                  {/* Mock Bounding Box for active camera */}
                  {activeCamera.id === 'CAM-01' && (
                    <div className="bounding-box" style={{ width: '180px', height: '380px', top: '25%', left: '42%' }}>
                      <span className="bb-label">Person 98%</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', fontSize: '0.875rem', letterSpacing: '0.1em' }}>
                    {activeCamera.frame}
                  </div>
                </div>
              </section>

              {/* Camera Selector Grid */}
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Available Feeds</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {cameras.map(cam => (
                    <div 
                      key={cam.id} 
                      onClick={() => setActiveCamera(cam)}
                      style={{ 
                        background: '#000', 
                        aspectRatio: '16/9', 
                        borderRadius: '6px', 
                        border: `1px solid ${activeCamera.id === cam.id ? '#FFF' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        opacity: cam.status === 'IDLE' ? 0.5 : 1
                      }}
                    >
                      <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '0.6rem', color: '#FFF' }}>
                        {cam.id}
                      </div>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.6rem', color: '#555' }}>
                        {cam.status === 'IDLE' ? 'OFFLINE' : 'LIVE'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
            
            {/* Right Column: Stats & Alerts & AI Assistant */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <section className="panel">
                <div className="panel-header"><h2 className="panel-title">Metrics</h2></div>
                <div className="stats-grid">
                  <div className="stat-item"><div className="stat-label">Inference</div><div className="stat-value">12ms</div></div>
                  <div className="stat-item"><div className="stat-label">FPS</div><div className="stat-value">60</div></div>
                  <div className="stat-item"><div className="stat-label">Active Cameras</div><div className="stat-value">3</div></div>
                  <div className="stat-item"><div className="stat-label">Incidents Today</div><div className="stat-value" style={{ color: '#EF4444' }}>2</div></div>
                </div>
              </section>

              <section className="panel" style={{ flexGrow: 1 }}>
                <div className="panel-header"><h2 className="panel-title">AI Assistant Log</h2></div>
                <div className="alert-list" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-med)' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: '2px solid var(--text-high)' }}>
                    [15:42:10] Llama-3-Agent: "I am tracking one person at the Front Desk (CAM-01). No suspicious behavior detected."
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: '2px solid var(--alert)', color: '#FFF' }}>
                    [15:40:05] Llama-3-Agent: "WARNING: YOLO detected an altercation on CAM-04. I am drafting a dispatch report for the authorities."
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: '2px solid var(--text-high)' }}>
                    [15:35:12] Llama-3-Agent: "System online. YOLO vision model running at 60FPS. Awaiting detections."
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 'live-feeds':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {cameras.map(cam => (
              <section key={cam.id} className="panel" style={{ padding: '1rem' }}>
                <div className="video-container" style={{ aspectRatio: '16/9' }}>
                  <div className="cam-badge">{cam.id} · {cam.name}</div>
                  {cam.status === 'REC' && (
                    <div className="rec-badge"><div className="rec-dot"></div>REC</div>
                  )}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', fontSize: '0.875rem', letterSpacing: '0.1em' }}>
                    {cam.frame}
                  </div>
                </div>
              </section>
            ))}
          </div>
        );

      case 'incidents':
        return (
          <section className="panel">
            <div className="panel-header"><h2 className="panel-title">Incident Forensics Database</h2></div>
            <div style={{ color: 'var(--text-med)', fontSize: '0.9rem', marginTop: '1rem' }}>
              Loading forensic clip data... (Pending backend connection)
            </div>
          </section>
        );

      case 'authorities':
        return (
          <section className="panel">
            <div className="panel-header"><h2 className="panel-title">Agentic Reporting System</h2></div>
            <div style={{ color: 'var(--text-med)', fontSize: '0.9rem', marginTop: '1rem' }}>
              System idle. AI agent standing by to dispatch alerts.
            </div>
          </section>
        );

      case 'settings':
        return (
          <section className="panel">
            <div className="panel-header"><h2 className="panel-title">System Settings</h2></div>
            <div style={{ color: 'var(--text-med)', fontSize: '0.9rem', marginTop: '1rem' }}>
              Configuration panel restricted.
            </div>
          </section>
        );
      
      default: return null;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#FFF' }}></div>
          Rakshini
        </div>
        
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
            Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'live-feeds' ? 'active' : ''}`} onClick={() => setActiveTab('live-feeds')} style={{ cursor: 'pointer' }}>
            Live Feeds
          </div>
          <div className={`nav-item ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')} style={{ cursor: 'pointer' }}>
            Incidents
          </div>
          <div className={`nav-item ${activeTab === 'authorities' ? 'active' : ''}`} onClick={() => setActiveTab('authorities')} style={{ cursor: 'pointer' }}>
            Authorities
          </div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>
            Settings
          </div>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="header">
          <h1>
            {activeTab === 'dashboard' && 'Overview'}
            {activeTab === 'live-feeds' && 'Camera Grid'}
            {activeTab === 'incidents' && 'Incident History'}
            {activeTab === 'authorities' && 'Authority Dispatch'}
            {activeTab === 'settings' && 'Settings'}
          </h1>
          <div className="status-badge">
            <div className="status-dot"></div>
            Core Active
          </div>
        </header>

        {renderContent()}

      </main>
    </div>
  );
}

export default App;
