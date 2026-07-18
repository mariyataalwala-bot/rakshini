# Rakshini OS

Rakshini OS is an AI-powered security surveillance desktop application built using Electron, React, and a native Rust vision telemetry pipeline. It runs frame-by-frame object tracking and human pose estimations natively or via cloud-hosted Roboflow inference.

---

## 🏗️ Repository Architecture

```text
├── main.js                  # Electron main process (header bypass & LLM spawn)
├── preload.js               # Electron IPC security bridge
├── package.json             # Root dependencies & scripts
├── README.md                # System documentation
├── rakshini-frontend/       # React 19 + TypeScript + Vite Dashboard
│   ├── src/                 # Component views, vision hooks, and telemetry stores
│   └── public/              # static assets (altercation video loops, ONNX model)
└── rakshini-backend/        # Rust native vision telemetry server (Axum + Ort)
```

---

## ⚡ Quick Start

### Prerequisites
*   **Node.js**: v22+
*   **Rust**: v1.85+ (Edition 2024 compiler)

### Installation
From the repository root, install dependencies for both the Electron shell and React dashboard:
```bash
# Install root Electron dependencies
npm install

# Install React frontend dependencies
cd rakshini-frontend
npm install
npm run build
cd ..
```

---

## 🚀 Running the Application

To start the complete environment (MediaMTX streaming + Rust telemetry backend + React dev server + Electron client wrapper):

### 1. Launch MediaMTX Live Stream Server
```bash
cd mediamtx
./mediamtx
```

### 2. Launch Rust Native Vision Pipeline
```bash
cd rakshini-backend
cargo run
```

### 3. Launch Vite Dev Server & Electron Desktop Container
From the root folder:
```bash
npm start
```

---

## 📺 Camera Stream Configuration

*   **CAM-01 (Front Desk)**: Mapped to a peaceful St. George Street public webcam livestream. All simulated alerts are disabled to keep scenic cams clean.
*   **CAM-02 (Times Square, NY)**: Plays a Times Square street fight video loop (`/cam2.mp4`). Runs frame-by-frame local YOLOv8 ONNX client-side model inference.
*   **CAM-03 (Parking Lot A)**: Plays a Bourbon Street brawl video loop (`/cam3.mp4`), running frame-by-frame local YOLOv8 ONNX client-side model inference.
*   **CAM-04 (Alleyway)**: Runs your server room altercation video loop (`/vid_cam4.mp4`), running local YOLOv8 ONNX model inference.

---

## 🔒 Iframe Security & Header Bypass
EarthCam and YouTube livestreams standardly utilize `X-Frame-Options` and `Content-Security-Policy` frames blocking. The Electron wrapper in `main.js` interceptor strips these headers in the request pipeline to allow seamless dashboard embeds.
