import type { Camera, CameraProvider } from './types';
import { useStore } from '../../store/useStore';

export class HeliosCameraProvider implements CameraProvider {
  private getApiKey(): string {
    const key = useStore.getState().heliosApiKey;
    if (!key) throw new Error("Helios API Key not configured");
    return key.startsWith('Bearer ') ? key : `Bearer ${key}`;
  }

  async searchCameras(filters?: any): Promise<Camera[]> {
    const apiKey = this.getApiKey();
    const query = filters?.bbox ? `bbox=${filters.bbox}` : 'bbox=-77.636,43.142,-77.582,43.171';
    
    const res = await fetch(`https://api.helios.earth/v1/cameras?${query}`, {
      headers: { 'Authorization': apiKey }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API Key");
      throw new Error("Failed to search Helios cameras");
    }

    const data = await res.json();
    if (!data.features) return [];

    return data.features.map((f: any) => this.mapHeliosToCamera(f));
  }

  async getCamera(id: string): Promise<Camera> {
    const apiKey = this.getApiKey();
    const res = await fetch(`https://api.helios.earth/v1/cameras/${id}`, {
      headers: { 'Authorization': apiKey }
    });

    if (!res.ok) throw new Error(`Failed to fetch camera details for ${id}`);
    
    const f = await res.json();
    return this.mapHeliosToCamera(f);
  }

  async getLiveStream(id: string): Promise<string> {
    const apiKey = this.getApiKey();
    return `https://api.helios.earth/v1/cameras/${id}/live/playlist.m3u8?api_key=${apiKey.replace('Bearer ', '')}`;
  }

  async getSnapshot(id: string): Promise<string> {
    const apiKey = this.getApiKey();
    const res = await fetch(`https://api.helios.earth/v1/cameras/${id}/live`, {
      headers: { 'Authorization': apiKey }
    });

    if (!res.ok) throw new Error(`Failed to fetch snapshot for ${id}`);

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  private mapHeliosToCamera(f: any): Camera {
    const apiKey = useStore.getState().heliosApiKey || "";
    return {
      id: f.id,
      provider: 'Helios',
      providerCameraId: f.id,
      name: f.properties.description || `Helios Camera ${f.id}`,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      country: f.properties.country || 'United States',
      city: f.properties.city || '',
      streamUrl: `https://api.helios.earth/v1/cameras/${f.id}/live/playlist.m3u8?api_key=${apiKey.replace('Bearer ', '')}`,
      snapshotUrl: `https://api.helios.earth/v1/cameras/${f.id}/live?api_key=${apiKey.replace('Bearer ', '')}`,
      isLive: true,
      supportsHLS: f.properties.video || false,
      supportsRTSP: false,
      status: 'active',
      lastUpdated: Date.now()
    };
  }
}
