import { useRef, useState, useEffect } from 'react';
import { Camera, AlertTriangle, Key } from 'lucide-react';
import { BoundingBox } from '../../components/BoundingBox';
import { useStore } from '../../store/useStore';
import { useVisionEngine } from '../../hooks/useVisionEngine';
import { useCameraFeed } from '../../hooks/useCameraFeed';
import Hls from 'hls.js';

interface LiveCameraProps {
  cameraId: string;
  className?: string;
}

export function LiveCamera({ cameraId, className = '' }: LiveCameraProps) {
  const imgRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ width: 640, height: 640 });
  
  // Attach local AI Fallback Engine
  const { isReady, detections } = useVisionEngine(imgRef, cameraId);

  // Helios Integration (Map CAM-02, 03, 04 to require API Key)
  const isHelios = cameraId === 'CAM-02' || cameraId === 'CAM-03' || cameraId === 'CAM-04';
  const heliosApiKey = useStore(state => state.heliosApiKey);
  const setHeliosApiKey = useStore(state => state.setHeliosApiKey);
  const heliosIndex = cameraId === 'CAM-02' ? 0 : cameraId === 'CAM-03' ? 1 : 2;
  
  const roboflowApiKey = useStore(state => state.roboflowApiKey);
  const useRoboflowCloud = useStore(state => state.useRoboflowCloud);
  const setUseRoboflowCloud = useStore(state => state.setUseRoboflowCloud);
  
  // Unified Camera Feed hook using CameraProvider pattern
  const { streamUrl, activeCamera } = useCameraFeed(cameraId, isHelios ? heliosIndex : -1);
  const [tempKey, setTempKey] = useState('');

  // Connect dynamically to the backend state for this specific camera
  const poses = useStore(state => state.poses[cameraId]) || [];
  const interactions = useStore(state => state.interactions[cameraId]) || [];
  const vehicles = useStore(state => state.vehicles[cameraId]) || [];
  const animals = useStore(state => state.animals[cameraId]) || [];
  
  // Also check if there are active incidents on this camera to show a threat overlay
  const incidents = useStore(state => state.incidents);
  const activeIncidents = incidents.filter(inc => inc.cameraId === cameraId && inc.status === 'active');
  const hasThreat = activeIncidents.length > 0;

  const src = streamUrl || '';
  const isHlsStream = src.endsWith('.m3u8') || src.includes('index.m3u8');
  const isIframe = !isHlsStream && (src.includes('windy.com') || src.includes('earthcam.com') || src.includes('earthlive.tv') || src.includes('embed') || src.includes('player') || src.includes('html') || src.includes('youtube.com') || src.includes('youtube-nocookie.com') || src.includes('8888') || src.includes('8889'));
  // It is an image if we have a valid Helios image blob or standard image file extension
  const isImage = !isIframe && (src.startsWith('blob:') || src.includes('.jpg') || src.includes('.png'));

  const handleImageLoad = () => {
    if (imgRef.current) {
      const el = imgRef.current as any;
      setImgSize({
        width: el.videoWidth || el.naturalWidth || 1920,
        height: el.videoHeight || el.naturalHeight || 1080,
      });
    }
  };

  useEffect(() => {
    let hls: Hls | null = null;
    
    if (isHlsStream && imgRef.current && imgRef.current instanceof HTMLVideoElement) {
      const videoEl = imgRef.current;
      
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 10,
          enableWorker: true
        });
        hls.loadSource(src);
        hls.attachMedia(videoEl);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoEl.play().catch(e => console.log("Play failed:", e));
        });
        
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Fatal network error encountered, try to recover...");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Fatal media error encountered, try to recover...");
                hls?.recoverMediaError();
                break;
              default:
                console.log("Unrecoverable error, destroying Hls...");
                hls?.destroy();
                break;
            }
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = src;
        videoEl.play().catch(e => console.log("Native play failed:", e));
      }
    }
    
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, isHlsStream]);

  const getDetailedLabel = (det: any) => {
    const baseLabel = det.label;
    const trackId = det.track_id;
    const box = det.bounding_box || det;
    
    let behavior = "";
    
    if (trackId) {
      // 1. Check active interactions
      const matchedInteraction = interactions.find(inter => inter.track_ids.includes(trackId));
      if (matchedInteraction) {
        behavior = matchedInteraction.label;
      }
      
      // 2. Human Behavior from Pose Activity
      if (baseLabel.toLowerCase() === 'person') {
        const matchedPose = poses.find(p => p.track_id === trackId);
        if (matchedPose) {
          const validKps = matchedPose.keypoints.filter(k => k.confidence > 0.5);
          if (validKps.length >= 4) {
            const xs = validKps.map(k => k.x);
            const ys = validKps.map(k => k.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const widthDiff = maxX - minX;
            const heightDiff = maxY - minY;
            
            if (widthDiff > heightDiff * 1.5) {
              behavior = behavior ? `${behavior} (Lying Down)` : "Lying Down";
            } else if (heightDiff < (imgSize.height * 0.18)) {
              behavior = behavior ? `${behavior} (Crouching)` : "Crouching";
            } else {
              behavior = behavior ? `${behavior} (Active)` : "Active";
            }
          } else {
            behavior = behavior ? `${behavior} (Standing)` : "Standing";
          }
        } else {
          behavior = behavior ? `${behavior} (Active)` : "Active";
        }
      }
      
      // 3. Vehicle Behavior
      if (baseLabel.toLowerCase() === 'vehicle' || baseLabel.toLowerCase() === 'car') {
        const matchedVehicle = vehicles.find(v => v.track_id === trackId);
        if (matchedVehicle) {
          const typeStr = matchedVehicle.type || baseLabel;
          const plateStr = matchedVehicle.license_plate ? ` [${matchedVehicle.license_plate}]` : '';
          const speedStr = matchedVehicle.is_parked 
            ? 'Stationary (Parked)' 
            : (matchedVehicle.speed ? `Moving at ${matchedVehicle.speed}mph` : 'Moving');
          return `${typeStr} #${trackId}${plateStr}: ${speedStr}`;
        }
      }
      
      // 4. Animal Behavior
      const matchedAnimal = animals.find(a => a.track_id === trackId);
      if (matchedAnimal) {
        const speciesStr = matchedAnimal.species || baseLabel;
        return `${speciesStr} #${trackId}: Active / Moving`;
      }
    }
    
    // 5. Stationary Interacted Objects
    const stationaryLabels = ['bag', 'backpack', 'suitcase', 'handbag', 'laptop', 'chair', 'cup', 'bottle', 'phone', 'cell phone'];
    if (stationaryLabels.includes(baseLabel.toLowerCase())) {
      const intersectingPerson = detections.find(other => {
        if (other === det || other.label.toLowerCase() !== 'person') return false;
        const otherBox = other;
        return !(
          box.x > otherBox.x + otherBox.width ||
          box.x + box.width < otherBox.x ||
          box.y > otherBox.y + otherBox.height ||
          box.y + box.height < otherBox.y
        );
      });
      
      if (intersectingPerson) {
        const personId = intersectingPerson.track_id ? ` #${intersectingPerson.track_id}` : '';
        const action = baseLabel.toLowerCase() === 'laptop' ? 'In Use' : 'Carried / Interacted';
        behavior = `${action} by Person${personId}`;
      } else {
        behavior = "Stationary (Unused)";
      }
    }
    
    const trackStr = trackId ? ` #${trackId}` : '';
    const behaviorStr = behavior ? `: ${behavior}` : '';
    return `${baseLabel}${trackStr}${behaviorStr}`;
  };

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden group ${className}`}>
      {/* Video / Image / Iframe Element */}
      {isIframe ? (
        <iframe
          src={src}
          className="w-full h-full border-0 object-cover"
          allow="autoplay; encrypted-media; picture-in-picture"
          title={`Camera ${cameraId}`}
        />
      ) : isImage ? (
        <img
          ref={imgRef as any}
          crossOrigin="anonymous"
          src={src}
          className="w-full h-full object-cover transition-all duration-700"
          onLoad={handleImageLoad}
          alt={`Camera ${cameraId}`}
        />
      ) : (
        <video
          ref={imgRef as any}
          crossOrigin="anonymous"
          src={isHlsStream ? undefined : src}
          autoPlay
          muted
          loop={!isHlsStream}
          playsInline
          className="w-full h-full object-cover transition-all duration-700"
          onLoadedMetadata={handleImageLoad}
        />
      )}
      
      {/* Subtle dark vignette around edges */}
      <div className={`absolute inset-0 pointer-events-none z-10 transition-colors duration-300 ${hasThreat ? 'shadow-[inset_0_0_120px_rgba(225,29,72,0.6)]' : 'shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]'}`}></div>
      
      {/* SVG Layer for Detections & Poses */}
      {isReady && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-20" 
          viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Pose Skeletons */}
          {poses.map((pose, pIdx) => (
            <g key={`pose-${pIdx}`}>
              {/* Connecting Lines (Assume standard backend structure sends pairs of keypoints if pre-processed, or we just draw points) */}
              {pose.keypoints.map((kp, kIdx) => (
                kp.confidence > 0.5 && (
                  <circle 
                    key={`kp-${kIdx}`} 
                    cx={kp.x} 
                    cy={kp.y} 
                    r="4" 
                    fill="#38bdf8" 
                    stroke="#0284c7" 
                    strokeWidth="2" 
                    className="animate-pulse"
                  />
                )
              ))}
              {/* Optional: Add tracking ID text near the first keypoint */}
              {pose.keypoints[0] && (
                <text x={pose.keypoints[0].x} y={pose.keypoints[0].y - 10} fill="#38bdf8" fontSize="14" fontWeight="bold">
                  ID:{pose.track_id}
                </text>
              )}
            </g>
          ))}

          {/* Bounding Boxes */}
          {detections.map((det: any, idx) => {
            const box = det.bounding_box || det;
            const labelStr = getDetailedLabel(det);
            
            return (
              <BoundingBox
                key={`box-${idx}`}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                label={labelStr}
                confidence={det.confidence}
              />
            );
          })}
        </svg>
      )}

      {/* Loading Overlay */}
      {!isReady && (
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 text-slate-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-lg">
          <Camera size={14} className="opacity-50 animate-pulse" />
          <div className="font-mono text-[0.65rem] tracking-widest uppercase">Connecting to AI Core...</div>
        </div>
      )}

      {/* Helios Configuration Overlay */}
      {isHelios && !heliosApiKey && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Key size={20} />
              </div>
              <h3 className="text-white font-bold text-lg">Helios API Key Required</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Please enter your Helios Developer API Key to stream live traffic cameras.
            </p>
            <input 
              type="password" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm mb-4 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter any key to unlock..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tempKey) {
                  setHeliosApiKey(tempKey);
                }
              }}
            />
            <button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              onClick={() => tempKey && setHeliosApiKey(tempKey)}
            >
              Connect to Helios
            </button>
          </div>
        </div>
      )}

      {/* Top Left OSD */}
      <div className="absolute top-4 left-4 z-30 flex flex-wrap gap-2 items-center bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-lg max-w-[80%]">
        <Camera size={14} className="text-white/70" />
        <span className="font-medium text-sm text-white/90 font-mono">{activeCamera?.name || cameraId}</span>
        {activeCamera && (
          <span className="text-[10px] text-slate-300 font-mono bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
            {activeCamera.provider} {activeCamera.city ? `(${activeCamera.city}, ${activeCamera.country})` : ''}
          </span>
        )}
        {isHelios && heliosApiKey && (
          <button 
            onClick={() => setHeliosApiKey(null)} 
            className="ml-2 px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded text-[10px] text-rose-300 font-mono transition-colors"
          >
            Lock Cameras
          </button>
        )}
        {roboflowApiKey && (
          <button 
            onClick={() => setUseRoboflowCloud(!useRoboflowCloud)} 
            className={`ml-2 px-2 py-0.5 border rounded text-[10px] font-mono transition-all duration-300 ${
              useRoboflowCloud
                ? 'bg-purple-600/30 hover:bg-purple-600/50 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                : 'bg-black/60 hover:bg-white/5 border-white/5 text-slate-400'
            }`}
          >
            {useRoboflowCloud ? 'ROBOFLOW: ON' : 'ROBOFLOW: OFF'}
          </button>
        )}
      </div>

      {/* Top Right REC Status */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 items-end">
        <div className="flex gap-2 items-center bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] text-rose-500 font-bold text-xs tracking-widest uppercase">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse-fast shadow-[0_0_8px_rgba(244,63,94,1)]"></div>
          REC
        </div>
        
        {/* Threat Alert Badge */}
        {hasThreat && (
          <div className="flex gap-2 items-center bg-rose-600/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(225,29,72,0.6)] text-white font-bold text-xs tracking-widest uppercase animate-pulse">
            <AlertTriangle size={14} />
            {activeIncidents[0].threat}
          </div>
        )}
      </div>

      {/* Advanced AI Overlays from Backend */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2 max-w-xs">
        {interactions.map((interaction, idx) => (
          <div key={`int-${idx}`} className="bg-blue-900/60 backdrop-blur-md px-3 py-2 rounded-lg border border-blue-500/30 shadow-lg animate-fade-in">
            <div className="text-[0.65rem] text-blue-300 font-mono uppercase tracking-widest mb-1">Human Interaction</div>
            <div className="text-sm font-medium text-white flex justify-between items-center gap-4">
              <span>{interaction.label}</span>
              <span className="text-blue-400 text-xs font-mono">{(interaction.confidence * 100).toFixed(0)}%</span>
            </div>
            {interaction.track_ids.length > 0 && (
              <div className="text-xs text-blue-400 mt-1">IDs: {interaction.track_ids.join(', ')}</div>
            )}
          </div>
        ))}
        {vehicles.map((v, idx) => (
          <div key={`veh-${idx}`} className="bg-emerald-900/60 backdrop-blur-md px-3 py-2 rounded-lg border border-emerald-500/30 shadow-lg animate-fade-in">
            <div className="text-[0.65rem] text-emerald-300 font-mono uppercase tracking-widest mb-1">Vehicle Intel</div>
            <div className="text-sm font-medium text-white flex justify-between items-center gap-4">
              <span>{v.type} {v.license_plate ? `(${v.license_plate})` : ''}</span>
              <span className="text-emerald-400 text-xs font-mono">{v.speed ? `${v.speed}mph` : (v.is_parked ? 'PARKED' : '')}</span>
            </div>
          </div>
        ))}
        {animals.map((a, idx) => (
          <div key={`ani-${idx}`} className="bg-amber-900/60 backdrop-blur-md px-3 py-2 rounded-lg border border-amber-500/30 shadow-lg animate-fade-in">
            <div className="text-[0.65rem] text-amber-300 font-mono uppercase tracking-widest mb-1">Animal Detected</div>
            <div className="text-sm font-medium text-white flex justify-between items-center gap-4">
              <span>{a.species}</span>
              {a.track_id && <span className="text-amber-400 text-xs font-mono">ID:{a.track_id}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
