# Project Transfer & Folder Guide: Rakshini OS (migrating to macOS)

This document maps all folders, files, and architectures within this codebase to enable a seamless transfer and execution of the Rakshini V1 + Operator OS system on macOS.

---

## 1. Project Overview & Directories

The workspace is split into three main modules:
1.  **`/rakshini-frontend` (React UI):** A React/TypeScript application running in the browser. It houses the YOLOv8 WebAssembly AI inference pipelines, camera manager providers, and dashboard multi-grid overlays.
2.  **`/rakshini-backend` (Rust Backend):** An Axum-based HTTP & WebSocket server. Holds camera traits, DB caching registries, stream workers, and websocket relays.
3.  **`/` (Root Electron Shell):** The Electron container running the Operator OS browser agent, desktop navigation automation, and local LLM execution.

---

## 2. Key Code Locations (Custom Systems)

If you are modifying the Camera Management or AI core pipelines, these are the key files we created/edited:

### Frontend (`/rakshini-frontend`)
*   [`src/services/camera/`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/services/camera/) — **Modular Camera Registry & Adapters:**
    *   [`types.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/services/camera/types.ts): Interface for all camera providers.
    *   [`CameraManager.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/services/camera/CameraManager.ts): Queries all active providers in a waterfall chain (Helios → 511NY → Windy → RTSP → ONVIF → Local).
    *   [`WindyCameraProvider.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/services/camera/WindyCameraProvider.ts): Connects to Windy Webcams API v3 with a CORS proxy bypass (`corsproxy.io`) to enable live API fetches on localhost.
    *   [`FiveOneOneNyCameraProvider.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/services/camera/FiveOneOneNyCameraProvider.ts): Connects to the 511NY traffic camera API using a CORS proxy.
    *   [`RtspCameraProvider.ts` / `OnvifCameraProvider.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/services/camera/RtspCameraProvider.ts): RTSP & ONVIF camera discovery mock profiles.
*   [`src/hooks/useCameraFeed.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/hooks/useCameraFeed.ts) — Resolves the active provider, initiates retry/backoff timers, and handles stream buffering.
*   [`src/hooks/useVisionEngine.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/hooks/useVisionEngine.ts) — **5-Stage AI Inference Pipeline:** YOLOv8 → Bounding Box Euclidean Tracker → Behavior Model → Crime Predictor → Alert logs.
*   [`src/features/dashboard/LiveCamera.tsx`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/features/dashboard/LiveCamera.tsx) — Main OSD player. Dynamically switches between standard `<video>` tags for streams, `<img>` tags for snapshot loops, and `<iframe>` for embedded external streams (like Windy).
*   [`src/store/useStore.ts`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/store/useStore.ts) — Zustand global store holding developer API Keys and incident states.
*   [`src/App.tsx`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-frontend/src/App.tsx) — Renders the **2x2 Multi-View Grid** (running 4 parallel local YOLO models) and the **Settings Quota & Pricing panel**.

### Backend (`/rakshini-backend`)
*   [`src/camera.rs`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-backend/src/camera.rs) — Holds the Rust backend implementations for `CameraProvider` traits, database cached registry, and Axum REST endpoints.
*   [`src/main.rs`](file:///c:/Users/maria/Downloads/Operator%20OS/Operator%20OS/rakshini-backend/src/main.rs) — Configures routing, logs, and websocket telemetry broadcaster.

---

## 3. Running the Project on macOS

Migrating this project to macOS resolves all C++ toolchain and linker errors! macOS comes with native C++ compilation capabilities (via Apple Clang/Xcode) and does not encounter the Windows MinGW linker block.

### Step 1: Install System Prerequisites
Install **Homebrew** (if not present), then install Node.js and Rust:
```bash
# 1. Install Node.js
brew install node

# 2. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. Install Xcode Command Line Tools (provides Clang for Rust builds)
xcode-select --install
```

### Step 2: Running the Frontend
```bash
cd rakshini-frontend
npm install
npm run dev
```
The React frontend dashboard will start at `http://localhost:5173`.

### Step 3: Running the Rust Backend
```bash
cd rakshini-backend
cargo run
```
The Axum backend server will spin up and start listening on port `8080` (or the configured port).

### Step 4: Running the Electron Container
```bash
# In the root project folder
npm install
npm start
```
This opens the Electron container running Operator OS.
