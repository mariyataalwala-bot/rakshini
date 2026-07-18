# Rakshini Frontend

React 19 + TypeScript + Vite dashboard for the Rakshini AI surveillance system. Runs YOLOv8n object detection in the browser (onnxruntime-web) or via the Roboflow hosted API, and renders live camera feeds, detections, incidents, evidence, and analytics.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

Provider API keys (Helios, Windy, 511NY, Roboflow) are entered at runtime in the Settings tab. See the root README for backend integration details.
