import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cameraManager } from '../services/camera/CameraManager';
import type { Camera, CameraProvider } from '../services/camera/types';

export function useCameraFeed(cameraId: string, cameraIndex: number) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [activeCamera, setActiveCamera] = useState<Camera | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heliosApiKey = useStore(state => state.heliosApiKey);
  const windyApiKey = useStore(state => state.windyApiKey);
  const fiveOneOneNyApiKey = useStore(state => state.fiveOneOneNyApiKey);
  
  useEffect(() => {
    let isSubscribed = true;
    let timerId: ReturnType<typeof setTimeout>;

    async function fetchFeed() {
      try {
        let activeId = cameraId;
        const isExternalGate = cameraId === 'CAM-02' || cameraId === 'CAM-03' || cameraId === 'CAM-04';
        
        let provider: CameraProvider = cameraManager.localProvider;
        let matchedCamera: Camera | null = null;

        if (isExternalGate) {
          // Run search chain: Helios -> 511NY -> Windy -> Local
          const result = await cameraManager.searchCamerasChain();
          provider = result.provider;
          
          if (cameraIndex >= 0 && result.cameras && result.cameras.length > cameraIndex) {
            matchedCamera = result.cameras[cameraIndex];
            activeId = matchedCamera.id;
          } else {
            throw new Error("No cameras found in active providers");
          }
        } else {
          // Standard local camera
          const localCams = await provider.searchCameras();
          matchedCamera = localCams.find(c => c.id === cameraId) || null;
        }

        let url = "";
        const isLocal = provider === cameraManager.localProvider;
        if (isLocal) {
          url = await provider.getLiveStream(activeId);
        } else {
          url = await provider.getSnapshot(activeId);
        }

        if (isSubscribed) {
          setStreamUrl(prev => {
            if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return url;
          });
          setActiveCamera(matchedCamera);
          setError(null);
        }
      } catch (err: any) {
        console.error("Camera feed fetch failed:", err);
        if (isSubscribed) {
          setError(err.message || "Failed to load feed");
          try {
            const localUrl = await cameraManager.localProvider.getLiveStream(cameraId);
            setStreamUrl(localUrl);
            const localCam = await cameraManager.localProvider.getCamera(cameraId);
            setActiveCamera(localCam);
          } catch { /* local fallback also unavailable */ }
        }
      }

      const hasExternalKeys = !!heliosApiKey || !!windyApiKey || !!fiveOneOneNyApiKey;
      const isExternalGate = cameraId === 'CAM-02' || cameraId === 'CAM-03' || cameraId === 'CAM-04';
      if (isSubscribed && isExternalGate && hasExternalKeys) {
        timerId = setTimeout(fetchFeed, 5000);
      }
    }

    fetchFeed();

    return () => {
      isSubscribed = false;
      clearTimeout(timerId);
    };
  }, [cameraId, cameraIndex, heliosApiKey, windyApiKey, fiveOneOneNyApiKey]);

  return { streamUrl, activeCamera, error };
}
