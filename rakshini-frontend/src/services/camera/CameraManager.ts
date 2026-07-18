import type { Camera, CameraProvider } from './types';
import { LocalCameraProvider } from './LocalCameraProvider';
import { HeliosCameraProvider } from './HeliosCameraProvider';
import { WindyCameraProvider } from './WindyCameraProvider';
import { RtspCameraProvider } from './RtspCameraProvider';
import { OnvifCameraProvider } from './OnvifCameraProvider';
import { FiveOneOneNyCameraProvider } from './FiveOneOneNyCameraProvider';
import { useStore } from '../../store/useStore';

class CameraManager {
  public localProvider = new LocalCameraProvider();
  public heliosProvider = new HeliosCameraProvider();
  public windyProvider = new WindyCameraProvider();
  public rtspProvider = new RtspCameraProvider();
  public onvifProvider = new OnvifCameraProvider();
  public fiveOneOneNyProvider = new FiveOneOneNyCameraProvider();

  async searchCamerasChain(filters?: any): Promise<{ cameras: Camera[], provider: CameraProvider }> {
    const hasHeliosKey = !!useStore.getState().heliosApiKey;
    const hasFiveOneOneNyKey = !!useStore.getState().fiveOneOneNyApiKey;

    // 1. Try Helios first
    if (hasHeliosKey) {
      try {
        const cameras = await this.heliosProvider.searchCameras(filters);
        if (cameras && cameras.length > 0) {
          return { cameras, provider: this.heliosProvider };
        }
      } catch (e) {
        console.warn("Helios search failed, falling back...", e);
      }
    }

    // 2. Try 511NY next (alternative traffic API)
    if (hasFiveOneOneNyKey) {
      try {
        const cameras = await this.fiveOneOneNyProvider.searchCameras(filters);
        if (cameras && cameras.length > 0) {
          return { cameras, provider: this.fiveOneOneNyProvider };
        }
      } catch (e) {
        console.warn("511NY search failed, falling back...", e);
      }
    }

    // 2. Fallback to Windy (API Key or mock list)
    try {
      const cameras = await this.windyProvider.searchCameras(filters);
      if (cameras && cameras.length > 0) {
        return { cameras, provider: this.windyProvider };
      }
    } catch (e) {
      console.warn("Windy search failed, falling back...", e);
    }

    // 3. Fallback to RTSP
    try {
      const cameras = await this.rtspProvider.searchCameras(filters);
      if (cameras && cameras.length > 0) {
        return { cameras, provider: this.rtspProvider };
      }
    } catch (e) {
      console.warn("RTSP search failed, falling back...", e);
    }

    // 4. Fallback to ONVIF
    try {
      const cameras = await this.onvifProvider.searchCameras(filters);
      if (cameras && cameras.length > 0) {
        return { cameras, provider: this.onvifProvider };
      }
    } catch (e) {
      console.warn("ONVIF search failed, falling back...", e);
    }

    // 5. Fallback to Local Mock Cameras
    const cameras = await this.localProvider.searchCameras(filters);
    return { cameras, provider: this.localProvider };
  }
}

export const cameraManager = new CameraManager();
