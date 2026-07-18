import { create } from 'zustand';
import type { 
  Incident, 
  Telemetry, 
  AuthState, 
  AssistantMessage,
  WebSocketPayload,
  Detection,
  Evidence,
  Interaction,
  VehicleData,
  AnimalData,
  Pose,
  FaceData,
  Camera
} from '../types';

interface AppState {
  // Authentication
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  logout: () => void;

  // WebSocket Connection
  wsConnected: boolean;
  wsError: string | null;
  setWsStatus: (connected: boolean, error?: string | null) => void;

  // Live Data (keyed by camera_id)
  frames: Record<string, string>;
  detections: Record<string, Detection[]>;
  poses: Record<string, Pose[]>;
  interactions: Record<string, Interaction[]>;
  vehicles: Record<string, VehicleData[]>;
  animals: Record<string, AnimalData[]>;
  faces: Record<string, FaceData[]>;
  
  processPayload: (payload: WebSocketPayload) => void;

  // Incident History & Evidence
  incidents: Incident[];
  evidence: Evidence[];
  addIncident: (incident: Incident) => void;
  acknowledgeIncident: (id: string) => void;

  // Telemetry (Now keyed by camera_id)
  cameraTelemetry: Record<string, Telemetry>;
  updateCameraTelemetry: (id: string, data: Partial<Telemetry>) => void;

  // Camera Status
  cameras: Record<string, Camera>;
  updateCamera: (id: string, status: Partial<Camera>) => void;

  // AI Assistant Chat
  chatMessages: AssistantMessage[];
  chatIsStreaming: boolean;
  addChatMessage: (msg: AssistantMessage) => void;
  setChatStreaming: (isStreaming: boolean) => void;

  // Helios API
  heliosApiKey: string | null;
  setHeliosApiKey: (key: string | null) => void;

  // Windy API
  windyApiKey: string | null;
  setWindyApiKey: (key: string | null) => void;

  // 511NY API
  fiveOneOneNyApiKey: string | null;
  setFiveOneOneNyApiKey: (key: string | null) => void;

  // Roboflow API
  roboflowApiKey: string | null;
  setRoboflowApiKey: (key: string | null) => void;
  roboflowModelUrl: string;
  setRoboflowModelUrl: (url: string) => void;
  useRoboflowCloud: boolean;
  setUseRoboflowCloud: (val: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  auth: {
    isAuthenticated: false,
    token: null,
    user: null,
  },
  setAuth: (newAuth) => set((state) => ({ auth: { ...state.auth, ...newAuth } })),
  logout: () => set({ auth: { isAuthenticated: false, token: null, user: null } }),

  // WebSocket
  wsConnected: false,
  wsError: null,
  setWsStatus: (connected, error = null) => set({ wsConnected: connected, wsError: error }),

  // Data
  frames: {},
  detections: {},
  poses: {},
  interactions: {},
  vehicles: {},
  animals: {},
  faces: {},
  
  processPayload: (payload) => set((state) => {
    const cameraId = payload.camera_id;
    if (!cameraId) return state;

    const updates: Partial<AppState> = {};

    if (payload.frame_data) {
      updates.frames = { ...state.frames, [cameraId]: payload.frame_data };
    }
    
    if (payload.detections) {
      updates.detections = { ...state.detections, [cameraId]: payload.detections };
    }
    
    if (payload.poses) {
      updates.poses = { ...state.poses, [cameraId]: payload.poses };
    }
    
    if (payload.interactions) {
      updates.interactions = { ...state.interactions, [cameraId]: payload.interactions };
    }
    
    if (payload.vehicles) {
      updates.vehicles = { ...state.vehicles, [cameraId]: payload.vehicles };
    }
    
    if (payload.animals) {
      updates.animals = { ...state.animals, [cameraId]: payload.animals };
    }

    if (payload.faces) {
      updates.faces = { ...state.faces, [cameraId]: payload.faces };
    }

    if (payload.incidents && payload.incidents.length > 0) {
      updates.incidents = [...payload.incidents, ...state.incidents].slice(0, 100);
    }
    
    if (payload.evidence && payload.evidence.length > 0) {
      updates.evidence = [...payload.evidence, ...state.evidence].slice(0, 200);
    }

    if (payload.telemetry) {
      updates.cameraTelemetry = { ...state.cameraTelemetry, [cameraId]: payload.telemetry };
    }

    if (payload.camera_status) {
      const existing = state.cameras[cameraId] || { id: cameraId, name: cameraId, status: 'online', lastPing: Date.now() };
      updates.cameras = {
        ...state.cameras,
        [cameraId]: { ...existing, status: payload.camera_status, lastPing: Date.now() }
      };
    } else {
      const existing = state.cameras[cameraId] || { id: cameraId, name: cameraId, status: 'online', lastPing: Date.now() };
      updates.cameras = {
        ...state.cameras,
        [cameraId]: { ...existing, lastPing: Date.now() }
      };
    }

    if (payload.assistantMessage) {
      updates.chatMessages = [...state.chatMessages, payload.assistantMessage];
    }

    return updates;
  }),

  // Incidents
  incidents: [],
  evidence: [],
  addIncident: (incident) => set((state) => ({ incidents: [incident, ...state.incidents] })),
  acknowledgeIncident: (id) => set((state) => ({
    incidents: state.incidents.map(inc => inc.id === id ? { ...inc, status: 'acknowledged' } : inc)
  })),

  // Telemetry
  cameraTelemetry: {},
  updateCameraTelemetry: (id, data) => set((state) => ({
    cameraTelemetry: {
      ...state.cameraTelemetry,
      [id]: { ...(state.cameraTelemetry[id] || { cpu: 0, gpu: 0, memory: 0, fps: 0, latency: 0 }), ...data }
    }
  })),

  // Cameras
  cameras: {},
  updateCamera: (id, status) => set((state) => {
    const existing = state.cameras[id] || { id, name: id, status: 'online', lastPing: Date.now() };
    return {
      cameras: {
        ...state.cameras,
        [id]: Object.assign({}, existing, status)
      }
    };
  }),

  // Chat
  chatMessages: [
    {
      id: 'init-1',
      role: 'assistant',
      content: 'System online. YOLO vision model running at 60FPS. Awaiting detections.',
      timestamp: Date.now() - 600000
    },
    {
      id: 'init-2',
      role: 'assistant',
      content: 'WARNING: YOLO detected an altercation on CAM-04. I am drafting a dispatch report for the authorities.',
      timestamp: Date.now() - 300000
    },
    {
      id: 'init-3',
      role: 'assistant',
      content: 'I am tracking one person at the Front Desk (CAM-01). No suspicious behavior detected.',
      timestamp: Date.now() - 60000
    }
  ],
  chatIsStreaming: false,
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  setChatStreaming: (isStreaming) => set({ chatIsStreaming: isStreaming }),

  // Helios
  heliosApiKey: 'pYrfLoY1Z0Fdj68DEOoX8FkQWzQxh63G',
  setHeliosApiKey: (key) => set({ heliosApiKey: key }),

  // Windy
  windyApiKey: 'pYrfLoY1Z0Fdj68DEOoX8FkQWzQxh63G',
  setWindyApiKey: (key) => set({ windyApiKey: key }),

  // 511NY
  fiveOneOneNyApiKey: null,
  setFiveOneOneNyApiKey: (key) => set({ fiveOneOneNyApiKey: key }),

  // Roboflow
  roboflowApiKey: null,
  setRoboflowApiKey: (key) => set({ roboflowApiKey: key }),
  roboflowModelUrl: 'weapons-s4k8n/1',
  setRoboflowModelUrl: (url) => set({ roboflowModelUrl: url }),
  useRoboflowCloud: false,
  setUseRoboflowCloud: (val) => set({ useRoboflowCloud: val }),
}));
