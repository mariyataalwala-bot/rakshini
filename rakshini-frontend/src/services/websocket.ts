import { useEffect } from 'react';
import type { WebSocketPayload } from '../types';
import { useStore } from '../store/useStore';

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectDelay: number = 5000;
  private readonly heartbeatMs: number = 30000;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect(url: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.url = url;
    this.isConnecting = true;
    useStore.getState().setWsStatus(false, null);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (err) {
      this.isConnecting = false;
      this.handleError(err as Event);
    }
  }

  public disconnect() {
    this.clearTimers();
    if (this.ws) {
      // Remove listeners so close doesn't trigger reconnect
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
    useStore.getState().setWsStatus(false, null);
  }

  private handleOpen() {
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    useStore.getState().setWsStatus(true, null);
    
    console.log(`[WebSocket] Connected to ${this.url}`);
    
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent) {
    // If it's just a pong response from the heartbeat
    if (event.data === 'pong') {
      return;
    }

    try {
      const payload = JSON.parse(event.data) as WebSocketPayload;
      
      // Calculate basic latency if the backend sends a timestamp
      if (payload.timestamp && payload.camera_id) {
        const latency = Date.now() - (payload.timestamp * 1000); // Assuming seconds, adapt if ms
        useStore.getState().updateCameraTelemetry(payload.camera_id, { latency: latency > 0 ? latency : 45 }); // fallback 45ms
      }

      // Broadcast update to the Zustand store
      useStore.getState().processPayload(payload);
    } catch (err) {
      console.error("[WebSocket] Failed to parse message:", err);
    }
  }

  private handleClose(event: CloseEvent) {
    this.isConnecting = false;
    this.clearTimers();
    useStore.getState().setWsStatus(false, `Connection closed (Code: ${event.code})`);
    
    console.log(`[WebSocket] Disconnected from ${this.url}. Reconnecting...`);
    this.scheduleReconnect();
  }

  private handleError(event: Event) {
    this.isConnecting = false;
    useStore.getState().setWsStatus(false, "WebSocket encountered an error");
    console.error("[WebSocket] Error:", event);
    
    // The socket will generally fire onclose after an onerror, so reconnect logic lives in onclose.
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    
    // Exponential backoff capped at maxReconnectDelay
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(this.url);
    }, delay);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, this.heartbeatMs);
  }

  private clearTimers() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Export a singleton instance method directly if needed outside React
export const wsService = WebSocketService.getInstance();

// Custom hook to expose the connection lifecycle to React components
export function useWebSocketConnection(url: string) {
  useEffect(() => {
    wsService.connect(url);

    return () => {
      wsService.disconnect();
    };
  }, [url]);
}
