import type { Camera, CameraProvider } from './types';

export class OnvifCameraProvider implements CameraProvider {
  async searchCameras(_filters?: any): Promise<Camera[]> {
    return [
      {
        id: 'onvif-mock-01',
        provider: 'ONVIF',
        providerCameraId: 'onvif-cam-404',
        name: 'ONVIF Dome Cam - Server Room',
        latitude: 12.9720,
        longitude: 77.5950,
        country: 'India',
        city: 'Bangalore',
        streamUrl: 'rtsp://onvif:admin@192.168.1.120:554/stream1',
        snapshotUrl: '/vid_cam4.mp4', // local mock video loop fallback
        isLive: true,
        supportsHLS: false,
        supportsRTSP: true,
        status: 'online',
        lastUpdated: Date.now(),
      }
    ];
  }

  async getCamera(id: string): Promise<Camera> {
    const list = await this.searchCameras();
    const found = list.find(c => c.id === id);
    if (!found) throw new Error("ONVIF camera not found");
    return found;
  }

  async getLiveStream(id: string): Promise<string> {
    const cam = await this.getCamera(id);
    return cam.streamUrl;
  }

  async getSnapshot(id: string): Promise<string> {
    const cam = await this.getCamera(id);
    return cam.snapshotUrl;
  }
}
