export interface Camera {
  id: string;
  provider: string;
  providerCameraId: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  streamUrl: string;
  snapshotUrl: string;
  isLive: boolean;
  supportsHLS: boolean;
  supportsRTSP: boolean;
  status: string;
  lastUpdated: number;
}

export interface CameraProvider {
  searchCameras(filters?: any): Promise<Camera[]>;
  getCamera(id: string): Promise<Camera>;
  getLiveStream(id: string): Promise<string>;
  getSnapshot(id: string): Promise<string>;
}
