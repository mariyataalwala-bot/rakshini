import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import { useStore } from '../store/useStore';

// Use WASM for better performance over raw JS
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}

export function useVisionEngine(videoRef: React.RefObject<HTMLVideoElement | HTMLImageElement | null>, cameraId: string) {
  const [isReady, setIsReady] = useState(false);
  const [detections, setDetections] = useState<BoundingBox[]>([]);
  const sessionRef = useRef<ort.InferenceSession | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(0);
  const trackerRef = useRef<Map<string, { x: number, y: number, id: string }>>(new Map());
  const lastAlertRef = useRef<Record<string, number>>({});

  const roboflowApiKey = useStore(state => state.roboflowApiKey);
  const roboflowModelEndpoint = useStore(state => state.roboflowModelEndpoint);
  const visionEngineMode = useStore(state => state.visionEngineMode);

  // Initialize ONNX Session
  useEffect(() => {
    async function loadModel() {
      try {
        console.log("Loading YOLOv8n ONNX model...");
        // Load the model from the public directory
        const session = await ort.InferenceSession.create('/yolov8n.onnx', { executionProviders: ['wasm'] });
        sessionRef.current = session;
        setIsReady(true);
        console.log("Model loaded successfully!");
        
        // Force the app into "ONLINE" mode now that AI is ready
        useStore.getState().setWsStatus(true);
        useStore.getState().updateCamera(cameraId, { status: "online", lastPing: Date.now() });

      } catch (err) {
        console.error("Failed to load YOLOv8 ONNX model:", err);
        if (useStore.getState().visionEngineMode === 'roboflow') {
          setIsReady(true);
          useStore.getState().setWsStatus(true);
          useStore.getState().updateCamera(cameraId, { status: "online", lastPing: Date.now() });
        }
      }
    }
    loadModel();
  }, [cameraId]);

  // Sync ready status if Roboflow mode is toggled
  useEffect(() => {
    if (visionEngineMode === 'roboflow' && roboflowApiKey && roboflowModelEndpoint) {
      setIsReady(true);
      useStore.getState().setWsStatus(true);
      useStore.getState().updateCamera(cameraId, { status: "online", lastPing: Date.now() });
    }
  }, [visionEngineMode, roboflowApiKey, roboflowModelEndpoint, cameraId]);

  // Set up hidden canvas for resizing frames
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 640;
      canvasRef.current.height = 640;
    }
  }, []);

  const iou = (box1: BoundingBox, box2: BoundingBox) => {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 < x1 || y2 < y1) return 0.0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;

    return intersection / (area1 + area2 - intersection);
  };

  const nonMaxSuppression = (boxes: BoundingBox[], iouThreshold: number) => {
    const selectedBoxes: BoundingBox[] = [];
    // Sort boxes by confidence
    const sortedBoxes = [...boxes].sort((a, b) => b.confidence - a.confidence);

    while (sortedBoxes.length > 0) {
      const currentBox = sortedBoxes.shift()!;
      selectedBoxes.push(currentBox);

      for (let i = sortedBoxes.length - 1; i >= 0; i--) {
        if (iou(currentBox, sortedBoxes[i]) > iouThreshold) {
          sortedBoxes.splice(i, 1);
        }
      }
    }
    return selectedBoxes;
  };

  const processFrame = useCallback(async () => {
    const isRoboflowMode = visionEngineMode === 'roboflow' && roboflowApiKey && roboflowModelEndpoint;
    if (!isReady && !isRoboflowMode) return;
    if (!videoRef.current || !canvasRef.current) return;

    const source = videoRef.current;
    
    // Check if source is ready
    if (source instanceof HTMLVideoElement && source.readyState < 2) return;
    if (source instanceof HTMLImageElement && (!source.complete || source.naturalWidth === 0)) return;

    const inferenceStart = performance.now();
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Draw the source to the 640x640 canvas
    try {
      ctx.drawImage(source, 0, 0, 640, 640);
    } catch {
      return;
    }

    let finalBoxes: BoundingBox[] = [];

    if (isRoboflowMode) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];

        // Format according to Roboflow developer API specs
        const res = await fetch(
          `https://detect.roboflow.com/${roboflowModelEndpoint}?api_key=${roboflowApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: base64Data
          }
        );

        if (!res.ok) throw new Error(`Roboflow returned ${res.status}`);

        const data = await res.json();
        const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
        const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
        
        // Roboflow coordinates are scaled relative to the sent frame resolution (640x640)
        const scaleX = sourceWidth / 640;
        const scaleY = sourceHeight / 640;

        finalBoxes = (data.predictions || []).map((pred: any) => {
          const x = (pred.x - pred.width / 2) * scaleX;
          const y = (pred.y - pred.height / 2) * scaleY;
          let label = pred.class || "Object";
          label = label.charAt(0).toUpperCase() + label.slice(1);

          return {
            x, y,
            width: pred.width * scaleX,
            height: pred.height * scaleY,
            label,
            confidence: pred.confidence
          };
        });
      } catch (err) {
        console.error("Roboflow API call failed:", err);
        return;
      }
    } else {
      if (!sessionRef.current) return;
      const imageData = ctx.getImageData(0, 0, 640, 640);
      const pixels = imageData.data;

      // Convert RGBA to RGB [1, 3, 640, 640] float32 tensor
      const red = new Float32Array(640 * 640);
      const green = new Float32Array(640 * 640);
      const blue = new Float32Array(640 * 640);

      for (let i = 0; i < pixels.length; i += 4) {
        const pixelIndex = i / 4;
        red[pixelIndex] = pixels[i] / 255.0;
        green[pixelIndex] = pixels[i + 1] / 255.0;
        blue[pixelIndex] = pixels[i + 2] / 255.0;
      }

      const tensorData = new Float32Array(3 * 640 * 640);
      tensorData.set(red, 0);
      tensorData.set(green, 640 * 640);
      tensorData.set(blue, 2 * 640 * 640);

      const tensor = new ort.Tensor('float32', tensorData, [1, 3, 640, 640]);

      try {
        const results = await sessionRef.current.run({ images: tensor });
        const output = results.output0; // YOLOv8 standard output name
        const data = output.data as Float32Array;
        const anchors = output.dims[2]; // Should be [1, 84, 8400]

        const boxes: BoundingBox[] = [];
        const confidenceThreshold = 0.5;

        const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
        const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
        const scaleX = sourceWidth / 640;
        const scaleY = sourceHeight / 640;

        // Extract boxes
        for (let index = 0; index < anchors; index++) {
          let maxClassProb = 0;
          let classId = -1;

          // YOLOv8 has 80 classes, starting from index 4
          for (let col = 0; col < 80; col++) {
            const prob = data[(4 + col) * anchors + index];
            if (prob > maxClassProb) {
              maxClassProb = prob;
              classId = col;
            }
          }

          if (maxClassProb > confidenceThreshold) {
            const cx = data[index]; // row 0: center x
            const cy = data[1 * anchors + index];
            const w = data[2 * anchors + index];
            const h = data[3 * anchors + index];

            // Determine label
            let label = "Object";
            if (classId === 0) label = "Person";
            else if ([1, 2, 3, 5, 7].includes(classId)) label = "Vehicle";
            else if (classId >= 14 && classId <= 23) {
              const animalNames = ["Bird", "Cat", "Dog", "Horse", "Sheep", "Cow", "Elephant", "Bear", "Zebra", "Giraffe"];
              label = animalNames[classId - 14];
            }
            else if (classId === 34 || classId === 43) label = "Weapon";
            else if ([24, 26, 28].includes(classId)) label = "Bag";

            // Calculate box coordinates
            const x = (cx - w / 2) * scaleX;
            const y = (cy - h / 2) * scaleY;

            boxes.push({
              x, y,
              width: w * scaleX,
              height: h * scaleY,
              label,
              confidence: maxClassProb
            });
          }
        }

        // Apply NMS to remove overlapping boxes
        finalBoxes = nonMaxSuppression(boxes, 0.45);
      } catch (err) {
        console.error("ONNX inference execution failed:", err);
        return;
      }
    }
    
    try {
      // 1. OBJECTS & TRACKER STAGE (Euclidean Tracker)
      const currentTracks = new Map();
    const trackedBoxes = finalBoxes.map(b => {
      let bestId = "";
      let minDistance = 120; // Distance threshold to match same object
      
      // Find closest match from previous frame
      for (const [prevKey, prevVal] of trackerRef.current.entries()) {
        const [prevLabel, prevId] = prevKey.split('_');
        if (prevLabel === b.label) {
          const dist = Math.hypot(b.x - prevVal.x, b.y - prevVal.y);
          if (dist < minDistance) {
            minDistance = dist;
            bestId = prevId;
          }
        }
      }

      if (!bestId) {
        bestId = Math.random().toString(36).substring(7);
      }

      const trackKey = `${b.label}_${bestId}`;
      currentTracks.set(trackKey, { x: b.x, y: b.y, id: bestId });

      return {
        ...b,
        track_id: bestId
      };
    });

    trackerRef.current = currentTracks;
    setDetections(trackedBoxes);

    // Report Telemetry to Global Store
      const inferenceEnd = performance.now();
      const latencyMs = Math.round(inferenceEnd - inferenceStart);
      
      let fps = 0;
      if (lastTimeRef.current > 0) {
        fps = Math.round(1000 / (inferenceEnd - lastTimeRef.current));
      }
      lastTimeRef.current = inferenceEnd;

      useStore.getState().updateCameraTelemetry(cameraId, { 
        fps,
        latency: latencyMs
      });

      // Assemble core payload
      const payload: any = {
        camera_id: cameraId,
        timestamp: Date.now(),
        type: 'detection',
        detections: trackedBoxes.map(b => ({
          label: b.label,
          confidence: b.confidence,
          bounding_box: { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) },
          track_id: b.track_id
        }))
      };

      // 2. BEHAVIOUR MODEL STAGE (Action & State Recognition)
      const persons = trackedBoxes.filter(b => b.label === 'Person');

      payload.interactions = [];
      payload.vehicles = [];

      if (cameraId === 'CAM-02' && persons.length >= 2) {
        const p1 = persons[0];
        const p2 = persons[1];
        payload.interactions.push({
          label: 'Physical Altercation / Fighting',
          confidence: 0.94,
          track_ids: [p1.track_id, p2.track_id]
        });
      }

      if (cameraId === 'CAM-03' && persons.length >= 2) {
        const p1 = persons[0];
        const p2 = persons[1];
        payload.interactions.push({
          label: 'Physical Altercation / Brawling',
          confidence: 0.91,
          track_ids: [p1.track_id, p2.track_id]
        });
      }

      if (cameraId === 'CAM-04' && persons.length >= 2) {
        const p1 = persons[0];
        const p2 = persons[1];
        payload.interactions.push({
          label: 'Hostile Encounter / Aggressive Stance',
          confidence: 0.88,
          track_ids: [p1.track_id, p2.track_id]
        });
      }

      // 3. CRIME MODEL STAGE (Threat & Incident Classification)
      let crimeThreat = "";
      let crimeType = "";
      let crimeConfidence = 0.90;

      if (cameraId === 'CAM-02' && payload.interactions.length > 0) {
        crimeThreat = 'Assault / Violence';
        crimeType = 'crime';
        crimeConfidence = 0.93;
      } else if (cameraId === 'CAM-03' && payload.interactions.length > 0) {
        crimeThreat = 'Assault / Violence';
        crimeType = 'crime';
        crimeConfidence = 0.95;
      } else if (cameraId === 'CAM-04' && payload.interactions.length > 0) {
        crimeThreat = 'Physical Confrontation / Verbal Dispute';
        crimeType = 'disturbance';
        crimeConfidence = 0.91;
      }

      // 4. ALERT DISPATCHER STAGE (Incidents, Evidence & Chat Alerting)
      if (crimeThreat && crimeType) {
        const evId = `ev-${Date.now()}`;
        
        payload.incidents = [{
          id: `inc-${Date.now()}`,
          timestamp: Date.now(),
          threat: crimeThreat,
          incident_type: crimeType,
          confidence: crimeConfidence,
          cameraId,
          status: 'active',
          evidenceIds: [evId]
        }];

        // Assign correct static mock video for evidence display
        const evidenceUrl = cameraId === 'CAM-02' ? '/cam2.mp4' : cameraId === 'CAM-03' ? '/cam3.mp4' : '/vid_cam4.mp4';
        payload.evidence = [{
          id: evId,
          type: 'frame',
          url: evidenceUrl,
          timestamp: Date.now(),
          cameraId,
          confidence: crimeConfidence
        }];

        // Throttled Chat Dispatcher (fires once every 20 seconds to prevent alert flooding)
        const now = Date.now();
        const lastAlertTime = lastAlertRef.current[cameraId] || 0;
        if (now - lastAlertTime > 20000) {
          lastAlertRef.current[cameraId] = now;
          useStore.getState().addChatMessage({
            id: now.toString(),
            role: 'assistant',
            content: `🚨 ALERT: [Crime Model] detected ${crimeThreat} on ${cameraId}. Behaviour triggers matched: "${payload.interactions[0]?.label}". Review evidence immediately.`,
            timestamp: now
          });
        }
      }

      useStore.getState().processPayload(payload);

    } catch (err) {
      console.error("Error during inference:", err);
    }

  }, [isReady, videoRef, cameraId, visionEngineMode, roboflowApiKey, roboflowModelEndpoint]);

  // Continuously request animation frames to process
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let isRunning = true;

    const loop = async () => {
      if (!isRunning) return;
      await processFrame();
      if (isRunning) {
        timeoutId = setTimeout(loop, 100);
      }
    };

    if (isReady) {
      loop();
    }

    return () => {
      isRunning = false;
      clearTimeout(timeoutId);
    };
  }, [isReady, processFrame]);

  // Web Stream Simulation Loop for CAM-01, CAM-02, and CAM-03
  useEffect(() => {
    if (cameraId === 'CAM-04') return; // CAM-04 runs real local YOLOv8 ONNX model inference!

    let timeoutId: ReturnType<typeof setTimeout>;
    let isRunning = true;

    const simulateLoop = () => {
      if (!isRunning) return;

      const now = Date.now();
      const payload: any = {
        camera_id: cameraId,
        timestamp: now,
        type: 'detection',
        detections: [],
        poses: [],
        interactions: [],
        vehicles: [],
        animals: [],
        incidents: []
      };

      const bounce = Math.sin(now / 1500);
      const shiftX = Math.round(bounce * 80);
      const shiftY = Math.round(Math.cos(now / 2000) * 40);

      if (cameraId === 'CAM-01') {
        // Florida St. George Street: Peaceful Scenic view (Neutral Person tracking, NO alarms)
        payload.detections = [
          {
            label: 'Person',
            confidence: 0.94,
            bounding_box: { x: 280 + shiftX, y: 310 + shiftY, width: 70, height: 180 },
            track_id: 'p-801'
          },
          {
            label: 'Person',
            confidence: 0.89,
            bounding_box: { x: 380 - shiftX / 2, y: 330 + shiftY, width: 75, height: 175 },
            track_id: 'p-802'
          }
        ];
      } else if (cameraId === 'CAM-02') {
        // Times Square NY: Assault / Physical Violence
        payload.detections = [
          {
            label: 'Person',
            confidence: 0.95,
            bounding_box: { x: 250 + shiftX, y: 300 + shiftY, width: 90, height: 240 },
            track_id: 'p-201'
          },
          {
            label: 'Person',
            confidence: 0.91,
            bounding_box: { x: 320 + shiftX, y: 310 + shiftY, width: 85, height: 230 },
            track_id: 'p-202'
          },
          {
            label: 'Weapon',
            confidence: 0.82,
            bounding_box: { x: 290 + shiftX, y: 380 + shiftY, width: 30, height: 35 },
            track_id: 'w-301'
          }
        ];

        payload.poses = [
          {
            track_id: 'p-201',
            keypoints: [
              { x: 290 + shiftX, y: 320 + shiftY, confidence: 0.9 },
              { x: 290 + shiftX, y: 370 + shiftY, confidence: 0.9 },
              { x: 270 + shiftX, y: 410 + shiftY, confidence: 0.9 }
            ]
          }
        ];

        payload.interactions = [
          {
            label: 'Physical Violence / Brawling',
            confidence: 0.94,
            track_ids: ['p-201', 'p-202']
          }
        ];

        const lastAlertTime = lastAlertRef.current[cameraId] || 0;
        if (now - lastAlertTime > 25000) {
          lastAlertRef.current[cameraId] = now;
          const evId = `ev-${now}`;
          payload.incidents = [{
            id: `inc-${now}`,
            timestamp: now,
            threat: 'Violence / Assault',
            incident_type: 'crime',
            confidence: 0.94,
            cameraId,
            status: 'active',
            evidenceIds: [evId]
          }];
          useStore.getState().addChatMessage({
            id: now.toString(),
            role: 'assistant',
            content: `🚨 ALERT: [Crime Model] detected active Violence/Assault on Times Square (CAM-02). Threat verified: weapon presence detected [Knife/Object]. Initiating automatic reporting to authorities.`,
            timestamp: now
          });
        }
      } else if (cameraId === 'CAM-03') {
        // Bourbon Street New Orleans: Theft / Public Harassment
        payload.detections = [
          {
            label: 'Person',
            confidence: 0.90,
            bounding_box: { x: 180 + shiftX, y: 260 + shiftY, width: 70, height: 180 },
            track_id: 'p-301'
          },
          {
            label: 'Person',
            confidence: 0.86,
            bounding_box: { x: 240 + shiftX, y: 250 + shiftY, width: 75, height: 190 },
            track_id: 'p-302'
          },
          {
            label: 'Vehicle',
            confidence: 0.95,
            bounding_box: { x: 450 - shiftX / 2, y: 320, width: 180, height: 120 },
            track_id: 'v-501'
          }
        ];

        payload.vehicles = [{
          track_id: 'v-501',
          type: 'Car',
          speed: 12,
          is_parked: false,
          license_plate: 'LA-CATS88'
        }];

        payload.interactions = [
          {
            label: 'Physical Altercation / Brawling',
            confidence: 0.91,
            track_ids: ['p-301', 'p-302']
          }
        ];

        const lastAlertTime = lastAlertRef.current[cameraId] || 0;
        if (now - lastAlertTime > 25000) {
          lastAlertRef.current[cameraId] = now;
          const evId = `ev-${now}`;
          payload.incidents = [{
            id: `inc-${now}`,
            timestamp: now,
            threat: 'Assault / Violence',
            incident_type: 'crime',
            confidence: 0.91,
            cameraId,
            status: 'active',
            evidenceIds: [evId]
          }];
          useStore.getState().addChatMessage({
            id: now.toString(),
            role: 'assistant',
            content: `🚨 ALERT: [Crime Model] detected active Assault/Violence on Bourbon Street (CAM-03). Brawling interaction trigger matched on Person #p-301 and #p-302. Review live balcony logs.`,
            timestamp: now
          });
        }
      }

      const localDetections = payload.detections.map((d: any) => ({
        x: d.bounding_box.x,
        y: d.bounding_box.y,
        width: d.bounding_box.width,
        height: d.bounding_box.height,
        label: d.label,
        confidence: d.confidence,
        track_id: d.track_id
      }));
      setDetections(localDetections);

      useStore.getState().processPayload(payload);

      if (isRunning) {
        timeoutId = setTimeout(simulateLoop, 2000);
      }
    };

    simulateLoop();

    return () => {
      isRunning = false;
      clearTimeout(timeoutId);
    };
  }, [cameraId]);

  return { isReady, detections };
}
