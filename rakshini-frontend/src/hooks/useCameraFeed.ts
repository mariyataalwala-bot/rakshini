import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cameraManager } from '../services/camera/CameraManager';
import type { Camera, CameraProvider } from '../services/camera/types';

async function checkMediaMtxStream(url: string): Promise<boolean> {
  try {
    const playlistUrl = url.endsWith('.m3u8') 
      ? url 
      : (url.endsWith('/') ? `${url}index.m3u8` : `${url}/index.m3u8`);
    const res = await fetch(playlistUrl);
    return res.ok;
  } catch (e) {
    return false;
  }
}

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
      let finalUrl = "";
      let finalCamera: Camera | null = null;
      let activeId = cameraId;

      try {
        const isExternalGate = cameraId === 'CAM-02' || cameraId === 'CAM-03' || cameraId === 'CAM-04';
        let provider: CameraProvider = cameraManager.localProvider;

        if (isExternalGate) {
          // Run search chain: Helios -> 511NY -> Windy -> Local
          const result = await cameraManager.searchCamerasChain();
          provider = result.provider;
          
          if (cameraIndex >= 0 && result.cameras && result.cameras.length > cameraIndex) {
            finalCamera = result.cameras[cameraIndex];
            activeId = finalCamera.id;
          } else {
            throw new Error("No cameras found in active providers");
          }
        } else {
          // Standard local camera
          const localCams = await provider.searchCameras();
          finalCamera = localCams.find(c => c.id === cameraId) || null;
        }

        if (provider === cameraManager.localProvider) {
          finalUrl = await provider.getLiveStream(activeId);
        } else {
          finalUrl = await provider.getSnapshot(activeId);
        }
      } catch (err: any) {
        console.warn("Camera feed fetch failed, loading local fallback:", err);
        try {
          finalUrl = await cameraManager.localProvider.getLiveStream(cameraId);
          finalCamera = await cameraManager.localProvider.getCamera(cameraId);
          setError(err.message || "Failed to load feed");
        } catch (e) {
          console.error("Local fallback failed:", e);
        }
      }

      // Check MediaMTX active publishing status before committing
      if (finalUrl && finalUrl.includes('localhost:8888')) {
        const isActive = await checkMediaMtxStream(finalUrl);
        console.log(`[CameraFeed] checking MediaMTX path: ${finalUrl} | isActive: ${isActive}`);
        if (!isActive) {
          // Fallback to local mock loop files
          finalUrl = cameraId === 'CAM-01' ? '/video.mp4' :
                     cameraId === 'CAM-02' ? '/cam2.mp4' :
                     cameraId === 'CAM-03' ? '/cam3.mp4' : '/vid_cam4.mp4';
          console.log(`[CameraFeed] fallback applied for ${cameraId}: ${finalUrl}`);
        }
      }

      if (isSubscribed) {
        setStreamUrl(prev => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return finalUrl;
        });
        setActiveCamera(finalCamera);
        if (finalUrl && !finalUrl.includes('localhost:8888')) {
          setError(null);
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
