import type { Camera, CameraProvider } from './types';

export class LocalCameraProvider implements CameraProvider {
  private mockCameras: Camera[] = [
    {
      id: 'CAM-01',
      provider: 'Local Feed',
      providerCameraId: 'local-01',
      name: 'Front Desk',
      latitude: 12.971,
      longitude: 77.594,
      country: 'India',
      city: 'Bangalore',
      streamUrl: 'https://www.youtube.com/embed/ZksWoEAhmTU?autoplay=1&mute=1',
      snapshotUrl: 'https://www.youtube.com/embed/ZksWoEAhmTU?autoplay=1&mute=1',
      isLive: true,
      supportsHLS: false,
      supportsRTSP: false,
      status: 'active',
      lastUpdated: Date.now()
    },
    {
      id: 'CAM-02',
      provider: 'Local Feed',
      providerCameraId: 'local-02',
      name: 'Main Entrance',
      latitude: 12.972,
      longitude: 77.595,
      country: 'India',
      city: 'Bangalore',
      streamUrl: '/cam2.mp4',
      snapshotUrl: '/cam2.mp4',
      isLive: true,
      supportsHLS: false,
      supportsRTSP: false,
      status: 'active',
      lastUpdated: Date.now()
    },
    {
      id: 'CAM-03',
      provider: 'Local Feed',
      providerCameraId: 'local-03',
      name: 'Parking Lot A',
      latitude: 12.973,
      longitude: 77.596,
      country: 'India',
      city: 'Bangalore',
      streamUrl: '/cam3.mp4',
      snapshotUrl: '/cam3.mp4',
      isLive: true,
      supportsHLS: false,
      supportsRTSP: false,
      status: 'active',
      lastUpdated: Date.now()
    },
    {
      id: 'CAM-04',
      provider: 'Local Feed',
      providerCameraId: 'local-04',
      name: 'Alleyway',
      latitude: 12.974,
      longitude: 77.597,
      country: 'India',
      city: 'Bangalore',
      streamUrl: 'http://localhost:8888/cam4/index.m3u8',
      snapshotUrl: 'http://localhost:8888/cam4/index.m3u8',
      isLive: true,
      supportsHLS: true,
      supportsRTSP: false,
      status: 'active',
      lastUpdated: Date.now()
    }
  ];

  async searchCameras(_filters?: any): Promise<Camera[]> {
    return this.mockCameras;
  }

  async getCamera(id: string): Promise<Camera> {
    const cam = this.mockCameras.find(c => c.id === id);
    if (!cam) throw new Error("Camera not found");
    return cam;
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
