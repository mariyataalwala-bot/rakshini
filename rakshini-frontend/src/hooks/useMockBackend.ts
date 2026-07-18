import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { Detection } from '../types';

export function useMockBackend() {
  useEffect(() => {
    // We force wsConnected to true so the UI thinks it's online
    useStore.getState().setWsStatus(true);
    
    // Set all cameras to online
    ['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].forEach(id => {
      useStore.getState().updateCamera(id, { status: 'online' });
    });

    const mockInterval = setInterval(() => {
      const now = Date.now();
      
      // Simulate CAM-03: Force a "Bag" detection (Non-living object)
      const cam3Detections: Detection[] = [
        { label: 'Bag', confidence: 0.95, bounding_box: { x: 300, y: 300, width: 100, height: 100 }, track_id: 'b1' }
      ];

      useStore.getState().processPayload({
        type: 'detection',
        camera_id: 'CAM-03',
        timestamp: now,
        detections: cam3Detections,
        telemetry: { fps: 24, latency: 42, cpu: 12, gpu: 34, memory: 512 }
      });

      // Simulate CAM-04: Force "Person" + "Bag" = Theft
      const cam4Detections: Detection[] = [
        { label: 'Person', confidence: 0.98, bounding_box: { x: 150, y: 150, width: 200, height: 400 }, track_id: 'p1' },
        { label: 'Bag', confidence: 0.92, bounding_box: { x: 200, y: 300, width: 80, height: 100 }, track_id: 'b2' }
      ];
      
      useStore.getState().processPayload({
        type: 'detection',
        camera_id: 'CAM-04',
        timestamp: now,
        detections: cam4Detections,
        telemetry: { fps: 30, latency: 38, cpu: 15, gpu: 40, memory: 600 }
      });

      // Generate the Theft incident on CAM-04 rarely so it doesn't spam endlessly, but definitely do it once
      if (Math.random() > 0.98) {
        useStore.getState().processPayload({
          type: 'incident',
          camera_id: 'CAM-04',
          timestamp: now,
          incidents: [{
            id: `inc-${now}`,
            timestamp: now,
            threat: 'Theft / Pickpocketing',
            incident_type: 'crime',
            confidence: 0.96,
            cameraId: 'CAM-04',
            status: 'active',
            evidenceIds: [`ev-${now}`]
          }],
          evidence: [{
            id: `ev-${now}`,
            type: 'frame',
            url: '/vid_cam4.mp4', // Use the video as a placeholder
            timestamp: now,
            cameraId: 'CAM-04',
            confidence: 0.96
          }],
          assistantMessage: {
            id: `msg-${now}`,
            role: 'assistant',
            content: 'CRITICAL ALERT: High confidence Theft / Pickpocketing detected on CAM-04. Immediate review of evidence required.',
            timestamp: now
          }
        });
      }

    }, 200); // 5 FPS updates

    return () => clearInterval(mockInterval);
  }, []);
}
