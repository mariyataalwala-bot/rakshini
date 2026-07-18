# Rakshini

AI-powered security surveillance dashboard. A React frontend runs real-time object detection (YOLOv8 via ONNX Runtime Web, or optionally the Roboflow hosted API) over camera feeds and raises incident alerts; a Rust backend provides a camera registry, a REST API, and a WebSocket pipeline for server-side inference.

## Repository layout

```
rakshini-frontend/   React 19 + TypeScript + Vite dashboard (in-browser AI vision)
rakshini-backend/    Rust (Axum + Tokio + ort) camera/vision/WebSocket server
```

## Frontend

```bash
cd rakshini-frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks and produces dist/
npm run lint       # oxlint
```

Features:
- Live camera grid (local mock feeds, plus Helios / Windy / 511NY providers when API keys are set in Settings)
- In-browser YOLOv8n inference (onnxruntime-web, WASM) with NMS and a simple Euclidean tracker
- Optional Roboflow hosted-inference mode (configure API key + model endpoint in Settings)
- Incident feed, evidence viewer, analytics dashboard, and AI assistant panels

API keys are entered at runtime in **Settings** and are held only in memory — none are committed to the repository.

## Backend

Requires Rust 1.85+ (edition-2024 transitive dependencies).

```bash
cd rakshini-backend
cargo run          # serves on 0.0.0.0:3000
```

- `GET  /api/cameras`, `GET /api/cameras/:id`, `POST /api/cameras/search`
- `GET  /api/cameras/analytics`
- `POST /api/cameras/:id/stream/start`, `POST /api/cameras/:id/stream/stop`
- `ws://localhost:3000/ws` — broadcasts frames + detections; answers `ping` heartbeats with `pong`

The vision engine downloads `yolov8n.onnx` on first run and uses `ort` with the `load-dynamic` feature, so an ONNX Runtime shared library must be available at runtime (set `ORT_DYLIB_PATH` to your `libonnxruntime` if it is not on the default search path). If the model or runtime is unavailable the server still runs; inference is simply skipped.

The frontend connects to the backend WebSocket at `ws://localhost:3000/ws` (see `rakshini-frontend/src/App.tsx`). The frontend also works standalone without the backend, using its in-browser vision engine.
