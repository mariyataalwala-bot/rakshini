import type { Camera, CameraProvider } from './types';
import { useStore } from '../../store/useStore';

export class FiveOneOneNyCameraProvider implements CameraProvider {
  private getApiKey(): string {
    const key = useStore.getState().fiveOneOneNyApiKey;
    if (!key) throw new Error("511NY API Key not configured");
    return key;
  }

  async searchCameras(_filters?: any): Promise<Camera[]> {
    let apiKey = "";
    try {
      apiKey = this.getApiKey();
    } catch (e) {
      return this.getMockNyCameras();
    }

    const format = 'json';
    try {
      const targetUrl = `https://511ny.org/api/getcameras?key=${apiKey}&format=${format}`;
      const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch 511NY cameras");
      
      const data = await res.json();
      if (!Array.isArray(data)) return this.getMockNyCameras();

      return data.map((c: any) => ({
        id: `511ny-${c.ID}`,
        provider: '511NY Traffic',
        providerCameraId: String(c.ID),
        name: c.Name || `511NY Camera ${c.ID}`,
        latitude: c.Latitude || 40.7128,
        longitude: c.Longitude || -74.0060,
        country: 'United States',
        city: 'New York',
        streamUrl: c.VideoUrl || '',
        snapshotUrl: c.ImageUrl || '',
        isLive: true,
        supportsHLS: !!c.VideoUrl,
        supportsRTSP: false,
        status: 'online',
        lastUpdated: Date.now(),
      }));
    } catch (e) {
      console.warn("511NY query failed, falling back to mock NY cameras...", e);
      return this.getMockNyCameras();
    }
  }

  async getCamera(id: string): Promise<Camera> {
    const list = await this.searchCameras();
    const found = list.find(c => c.id === id);
    if (!found) throw new Error(`511NY camera not found: ${id}`);
    return found;
  }

  async getLiveStream(id: string): Promise<string> {
    const cam = await this.getCamera(id);
    return cam.streamUrl || cam.snapshotUrl;
  }

  async getSnapshot(id: string): Promise<string> {
    const cam = await this.getCamera(id);
    return cam.snapshotUrl;
  }

  private getMockNyCameras(): Camera[] {
    return [
      {
        id: '511ny-mock-01',
        provider: '511NY Traffic',
        providerCameraId: '511ny-cam-501',
        name: 'Brooklyn Bridge Approach (511NY Mock)',
        latitude: 40.7061,
        longitude: -73.9969,
        country: 'United States',
        city: 'New York',
        streamUrl: '/video.mp4',
        snapshotUrl: '/video.mp4',
        isLive: true,
        supportsHLS: false,
        supportsRTSP: false,
        status: 'online',
        lastUpdated: Date.now(),
      },
      {
        id: '511ny-mock-02',
        provider: '511NY Traffic',
        providerCameraId: '511ny-cam-502',
        name: 'FDR Drive North (511NY Mock)',
        latitude: 40.7301,
        longitude: -73.9741,
        country: 'United States',
        city: 'New York',
        streamUrl: '/cam2.mp4',
        snapshotUrl: '/cam2.mp4',
        isLive: true,
        supportsHLS: false,
        supportsRTSP: false,
        status: 'online',
        lastUpdated: Date.now(),
      },
      {
        id: '511ny-mock-03',
        provider: '511NY Traffic',
        providerCameraId: '511ny-cam-503',
        name: 'Times Square Central (511NY Mock)',
        latitude: 40.7580,
        longitude: -73.9855,
        country: 'United States',
        city: 'New York',
        streamUrl: '/cam3.mp4',
        snapshotUrl: '/cam3.mp4',
        isLive: true,
        supportsHLS: false,
        supportsRTSP: false,
        status: 'online',
        lastUpdated: Date.now(),
      }
    ];
  }
}
