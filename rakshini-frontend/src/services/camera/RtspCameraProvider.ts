import type { Camera, CameraProvider } from './types';

export class RtspCameraProvider implements CameraProvider {
  async searchCameras(_filters?: any): Promise<Camera[]> {
    return [
      {
        id: 'rtsp-mock-01',
        provider: 'RTSP',
        providerCameraId: 'rtsp-cam-303',
        name: 'RTSP Local Feed - Lobby Entrance',
        latitude: 12.9716,
        longitude: 77.5946,
        country: 'India',
        city: 'Bangalore',
        streamUrl: 'http://localhost:8888/cam1/',
        snapshotUrl: '/video.mp4', // local mock video loop fallback
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
    if (!found) throw new Error("RTSP camera not found");
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
