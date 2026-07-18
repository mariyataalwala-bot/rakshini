// ---------------------------------------------------------
// Core Enums and Shared Types
// ---------------------------------------------------------

export type CameraStatus = 'online' | 'offline' | 'error' | 'maintenance';
export type IncidentStatus = 'active' | 'acknowledged' | 'resolved' | 'false_positive';
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'system' | 'security' | 'network' | 'ai';
export type ChatRole = 'user' | 'assistant' | 'system';

// ---------------------------------------------------------
// Interfaces
// ---------------------------------------------------------

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string; // Dynamic classes like Person, Vehicle, Weapon, Fire, etc.
  confidence: number; // 0.0 to 1.0
  bounding_box: BoundingBox;
  track_id?: string;
}

export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
  label?: string; // Optional label for specific joints
}

export interface Pose {
  track_id: string;
  keypoints: Keypoint[];
}

export interface Camera {
  id: string;
  name: string;
  status: CameraStatus;
  location?: string;
  lastPing: number; // Unix timestamp in ms
  resolution?: string; // e.g., '1920x1080'
  fps?: number;
  provider?: string;
  providerCameraId?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
  streamUrl?: string;
  snapshotUrl?: string;
  isLive?: boolean;
  supportsHLS?: boolean;
  supportsRTSP?: boolean;
  lastUpdated?: number;
}

export interface Threat {
  id: string;
  type: string;
  severity: ThreatSeverity;
  description: string;
  mitigationSteps?: string[];
}

export interface Evidence {
  id: string;
  type: 'frame' | 'face_crop' | 'video_clip' | 'object_crop';
  url: string; // Base64 or remote URL
  timestamp: number;
  cameraId: string;
  incidentId?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface Interaction {
  label: string; // Dynamic e.g. Talking, Fighting, Pushing
  confidence: number;
  track_ids: string[];
}

export interface VehicleData {
  track_id: string;
  type: string;
  direction?: string;
  speed?: number;
  is_parked?: boolean;
  license_plate?: string;
}

export interface AnimalData {
  track_id: string;
  species: string;
}

export interface FaceData {
  track_id: string;
  crop_url?: string;
  confidence: number;
  timestamp: number;
}

export interface Incident {
  id: string;
  timestamp: number;
  threat: string; // e.g., 'Theft', 'Fight', 'Fire'
  incident_type?: 'crime' | 'accident' | 'interaction' | 'anomaly' | 'standard'; 
  confidence: number;
  cameraId: string;
  status: IncidentStatus;
  thumbnailUrl?: string; // Base64 string or URL
  evidenceIds?: string[];
}

export interface Telemetry {
  cpu: number; 
  gpu: number; 
  memory: number;
  fps: number;
  latency: number;
  temperature?: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: number;
  isRead: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface AssistantMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------
// WebSocket Payloads
// ---------------------------------------------------------

export interface WebSocketPayload {
  type: 'frame' | 'detection' | 'tracking' | 'pose' | 'interaction' | 'incident' | 'evidence' | 'telemetry' | 'status' | 'assistant' | 'notification' | 'full_sync';
  timestamp: number;
  camera_id: string;
  
  // Conditionally populated based on `type`
  frame_data?: string; 
  detections?: Detection[];
  poses?: Pose[];
  incidents?: Incident[];
  interactions?: Interaction[];
  vehicles?: VehicleData[];
  animals?: AnimalData[];
  faces?: FaceData[];
  evidence?: Evidence[];
  telemetry?: Telemetry;
  camera_status?: CameraStatus;
  assistantMessage?: AssistantMessage;
  notification?: Alert;
}

// ---------------------------------------------------------
// App State Types
// ---------------------------------------------------------

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
}
