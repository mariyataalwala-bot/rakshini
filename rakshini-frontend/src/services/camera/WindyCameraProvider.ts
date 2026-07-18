import type { Camera, CameraProvider } from './types';
import { useStore } from '../../store/useStore';

export class WindyCameraProvider implements CameraProvider {
  private getApiKey(): string {
    const key = useStore.getState().windyApiKey;
    if (!key) throw new Error("Windy API Key not configured");
    return key;
  }

  private convertBboxToWindy(geojsonBbox: string): string {
    const parts = geojsonBbox.split(',');
    if (parts.length !== 4) return "43.142,-77.636,43.171,-77.582";
    const [minLon, minLat, maxLon, maxLat] = parts;
    return `${minLat},${minLon},${maxLat},${maxLon}`;
  }

  async searchCameras(filters?: any): Promise<Camera[]> {
    let apiKey = "";
    try {
      apiKey = this.getApiKey();
    } catch (e) {
      return this.getMockWindyCameras();
    }

    // If filters has bbox, use it; otherwise, fetch general active webcams globally
    const targetUrl = filters?.bbox
      ? `https://api.windy.com/webcams/api/v3/webcams?bbox=${this.convertBboxToWindy(filters.bbox)}&include=location,images,player,urls&limit=20`
      : `https://api.windy.com/webcams/api/v3/webcams?limit=20&include=location,images,player,urls`;
    
    // Route through corsproxy.io to bypass browser cross-origin security block and preserve custom headers
    const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    const res = await fetch(url, {
      headers: { 'x-windy-api-key': apiKey }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid Windy API Key");
      throw new Error("Failed to search Windy cameras");
    }

    const data = await res.json();
    if (!data.webcams) return [];

    return data.webcams.map((w: any) => this.mapWindyToCamera(w));
  }

  async getCamera(id: string): Promise<Camera> {
    let apiKey = "";
    try {
      apiKey = this.getApiKey();
    } catch (e) {
      const mock = this.getMockWindyCameras().find(c => c.id === id);
      if (mock) return mock;
      throw e;
    }

    const res = await fetch(`https://api.windy.com/webcams/api/v3/webcams/${id}?include=location,images,player,urls`, {
      headers: { 'x-windy-api-key': apiKey }
    });

    if (!res.ok) throw new Error(`Failed to fetch camera details for Windy ID ${id}`);
    
    const data = await res.json();
    return this.mapWindyToCamera(data);
  }

  async getLiveStream(id: string): Promise<string> {
    if (id.startsWith('windy-mock-')) {
       const mock = this.getMockWindyCameras().find(c => c.id === id);
       return mock?.streamUrl || '';
    }
    const cam = await this.getCamera(id);
    return cam.streamUrl;
  }

  async getSnapshot(id: string): Promise<string> {
    if (id.startsWith('windy-mock-')) {
       const mock = this.getMockWindyCameras().find(c => c.id === id);
       return mock?.snapshotUrl || '';
    }
    const cam = await this.getCamera(id);
    return cam.snapshotUrl;
  }

  private mapWindyToCamera(w: any): Camera {
    return {
      id: String(w.webcamId),
      provider: 'Windy Webcams',
      providerCameraId: String(w.webcamId),
      name: w.title || `Windy Camera ${w.webcamId}`,
      latitude: w.location?.latitude || 0,
      longitude: w.location?.longitude || 0,
      country: w.location?.country || '',
      city: w.location?.city || '',
      streamUrl: w.player?.live || w.player?.day || w.urls?.detail || '',
      snapshotUrl: w.images?.current?.preview || w.images?.current?.thumbnail || '',
      isLive: w.status === 'active',
      supportsHLS: true,
      supportsRTSP: false,
      status: w.status || 'active',
      lastUpdated: Date.now(),
    };
  }

  private getMockWindyCameras(): Camera[] {
    return [
      {
        id: 'windy-mock-01',
        provider: 'Windy Webcams',
        providerCameraId: '1179853037',
        name: 'Windy Live - Times Square, New York',
        latitude: 40.7580,
        longitude: -73.9855,
        country: 'United States',
        city: 'New York',
        streamUrl: '/cam2.mp4',
        snapshotUrl: '/cam2.mp4',
        isLive: true,
        supportsHLS: true,
        supportsRTSP: false,
        status: 'active',
        lastUpdated: Date.now(),
      },
      {
        id: 'windy-mock-02',
        provider: 'Windy Webcams',
        providerCameraId: '1359567990',
        name: 'Windy Live - Piccadilly Circus, London',
        latitude: 51.5101,
        longitude: -0.1349,
        country: 'United Kingdom',
        city: 'London',
        streamUrl: '/cam3.mp4',
        snapshotUrl: '/cam3.mp4',
        isLive: true,
        supportsHLS: true,
        supportsRTSP: false,
        status: 'active',
        lastUpdated: Date.now(),
      },
      {
        id: 'windy-mock-03',
        provider: 'Windy Webcams',
        providerCameraId: '1018598991',
        name: 'Windy Live - Shibuya Crossing, Tokyo',
        latitude: 35.6595,
        longitude: 139.7005,
        country: 'Japan',
        city: 'Tokyo',
        streamUrl: '/vid_cam4.mp4',
        snapshotUrl: '/vid_cam4.mp4',
        isLive: true,
        supportsHLS: true,
        supportsRTSP: false,
        status: 'active',
        lastUpdated: Date.now(),
      }
    ];
  }
}
