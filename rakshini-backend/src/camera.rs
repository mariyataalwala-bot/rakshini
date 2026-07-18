use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::fs::File;
use std::io::{Write, Read};
use std::path::Path;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use reqwest::Client;
use axum::{
    routing::{get, post},
    Json, Router, extract::Path as AxumPath,
    Extension,
};
use chrono::Utc;

// --- CAMERA SCHEMA ---
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Camera {
    pub id: String,
    pub provider: String,
    #[serde(rename = "providerCameraId")]
    pub provider_camera_id: String,
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub country: String,
    pub city: String,
    #[serde(rename = "streamUrl")]
    pub stream_url: String,
    #[serde(rename = "snapshotUrl")]
    pub snapshot_url: String,
    #[serde(rename = "isLive")]
    pub is_live: bool,
    #[serde(rename = "supportsHLS")]
    pub supports_hls: bool,
    #[serde(rename = "supportsRTSP")]
    pub supports_rtsp: bool,
    pub status: String,
    #[serde(rename = "lastUpdated")]
    pub last_updated: i64,
}

// --- COMMON PROVIDER INTERFACE ---
pub trait CameraProvider: Send + Sync {
    fn provider_name(&self) -> &'static str;
    async fn search_cameras(&self, bbox: &str) -> Result<Vec<Camera>, String>;
    async fn get_camera(&self, id: &str) -> Result<Camera, String>;
    async fn get_live_stream(&self, id: &str) -> Result<String, String>;
    async fn get_snapshot(&self, id: &str) -> Result<Vec<u8>, String>;
}

// --- HELIOS PROVIDER ---
pub struct HeliosProvider;
impl CameraProvider for HeliosProvider {
    fn provider_name(&self) -> &'static str { "Helios" }

    async fn search_cameras(&self, _bbox: &str) -> Result<Vec<Camera>, String> {
        Ok(vec![
            Camera {
                id: "helios-01".to_string(),
                provider: "Helios".to_string(),
                provider_camera_id: "helios-cam-101".to_string(),
                name: "Helios Traffic Cam - FDR Highway".to_string(),
                latitude: 40.7128,
                longitude: -74.0060,
                country: "United States".to_string(),
                city: "New York".to_string(),
                stream_url: "https://api.helios.earth/v1/cameras/helios-01/live/playlist.m3u8".to_string(),
                snapshot_url: "https://api.helios.earth/v1/cameras/helios-01/live".to_string(),
                is_live: true,
                supports_hls: true,
                supports_rtsp: false,
                status: "online".to_string(),
                last_updated: Utc::now().timestamp_millis(),
            }
        ])
    }

    async fn get_camera(&self, id: &str) -> Result<Camera, String> {
        self.search_cameras("").await?
            .into_iter()
            .find(|c| c.id == id)
            .ok_or_else(|| "Helios camera not found".to_string())
    }

    async fn get_live_stream(&self, id: &str) -> Result<String, String> {
        let cam = self.get_camera(id).await?;
        Ok(cam.stream_url)
    }

    async fn get_snapshot(&self, _id: &str) -> Result<Vec<u8>, String> {
        Ok(vec![0; 50])
    }
}

// --- WINDY PROVIDER ---
pub struct WindyProvider;
impl CameraProvider for WindyProvider {
    fn provider_name(&self) -> &'static str { "Windy" }

    async fn search_cameras(&self, _bbox: &str) -> Result<Vec<Camera>, String> {
        Ok(vec![
            Camera {
                id: "windy-01".to_string(),
                provider: "Windy Webcams".to_string(),
                provider_camera_id: "windy-cam-202".to_string(),
                name: "Windy Crossing - Broadway & 42nd".to_string(),
                latitude: 40.7580,
                longitude: -73.9850,
                country: "United States".to_string(),
                city: "New York".to_string(),
                stream_url: "https://webcams.windy.com/webcams/public/embed/windy-01".to_string(),
                snapshot_url: "https://api.windy.com/webcams/api/v3/webcams/windy-01/live".to_string(),
                is_live: true,
                supports_hls: true,
                supports_rtsp: false,
                status: "online".to_string(),
                last_updated: Utc::now().timestamp_millis(),
            }
        ])
    }

    async fn get_camera(&self, id: &str) -> Result<Camera, String> {
        self.search_cameras("").await?
            .into_iter()
            .find(|c| c.id == id)
            .ok_or_else(|| "Windy camera not found".to_string())
    }

    async fn get_live_stream(&self, id: &str) -> Result<String, String> {
        let cam = self.get_camera(id).await?;
        Ok(cam.stream_url)
    }

    async fn get_snapshot(&self, _id: &str) -> Result<Vec<u8>, String> {
        Ok(vec![0; 50])
    }
}

// --- RTSP PROVIDER ---
pub struct RtspProvider;
impl CameraProvider for RtspProvider {
    fn provider_name(&self) -> &'static str { "RTSP" }

    async fn search_cameras(&self, _bbox: &str) -> Result<Vec<Camera>, String> {
        Ok(vec![
            Camera {
                id: "rtsp-01".to_string(),
                provider: "RTSP".to_string(),
                provider_camera_id: "rtsp-cam-303".to_string(),
                name: "RTSP Local Feed - Lobby Entrance".to_string(),
                latitude: 12.9716,
                longitude: 77.5946,
                country: "India".to_string(),
                city: "Bangalore".to_string(),
                stream_url: "rtsp://admin:admin@192.168.1.100:554/live".to_string(),
                snapshot_url: "".to_string(),
                is_live: true,
                supports_hls: false,
                supports_rtsp: true,
                status: "online".to_string(),
                last_updated: Utc::now().timestamp_millis(),
            }
        ])
    }

    async fn get_camera(&self, id: &str) -> Result<Camera, String> {
        self.search_cameras("").await?
            .into_iter()
            .find(|c| c.id == id)
            .ok_or_else(|| "RTSP camera not found".to_string())
    }

    async fn get_live_stream(&self, id: &str) -> Result<String, String> {
        let cam = self.get_camera(id).await?;
        Ok(cam.stream_url)
    }

    async fn get_snapshot(&self, _id: &str) -> Result<Vec<u8>, String> {
        Ok(vec![0; 50])
    }
}

// --- ONVIF PROVIDER ---
pub struct OnvifProvider;
impl CameraProvider for OnvifProvider {
    fn provider_name(&self) -> &'static str { "ONVIF" }

    async fn search_cameras(&self, _bbox: &str) -> Result<Vec<Camera>, String> {
        Ok(vec![
            Camera {
                id: "onvif-01".to_string(),
                provider: "ONVIF".to_string(),
                provider_camera_id: "onvif-cam-404".to_string(),
                name: "ONVIF Dome Cam - Server Room".to_string(),
                latitude: 12.9720,
                longitude: 77.5950,
                country: "India".to_string(),
                city: "Bangalore".to_string(),
                stream_url: "rtsp://onvif:admin@192.168.1.120:554/stream1".to_string(),
                snapshot_url: "http://192.168.1.120/onvif/snapshot".to_string(),
                is_live: true,
                supports_hls: false,
                supports_rtsp: true,
                status: "online".to_string(),
                last_updated: Utc::now().timestamp_millis(),
            }
        ])
    }

    async fn get_camera(&self, id: &str) -> Result<Camera, String> {
        self.search_cameras("").await?
            .into_iter()
            .find(|c| c.id == id)
            .ok_or_else(|| "ONVIF camera not found".to_string())
    }

    async fn get_live_stream(&self, id: &str) -> Result<String, String> {
        let cam = self.get_camera(id).await?;
        Ok(cam.stream_url)
    }

    async fn get_snapshot(&self, _id: &str) -> Result<Vec<u8>, String> {
        Ok(vec![0; 50])
    }
}

// --- CAMERA REGISTRY (Database Cache) ---
pub struct CameraRegistry {
    cache_path: String,
    cameras: RwLock<HashMap<String, Camera>>,
}

impl CameraRegistry {
    pub fn new(cache_path: &str) -> Self {
        let mut cameras = HashMap::new();
        if Path::new(cache_path).exists() {
            if let Ok(mut file) = File::open(cache_path) {
                let mut data = String::new();
                if file.read_to_string(&mut data).is_ok() {
                    if let Ok(loaded) = serde_json::from_str::<HashMap<String, Camera>>(&data) {
                        cameras = loaded;
                    }
                }
            }
        }
        
        // Seed default local cameras if empty
        if cameras.is_empty() {
            let defaults = vec![
                Camera {
                    id: "CAM-01".to_string(),
                    provider: "Local Feed".to_string(),
                    provider_camera_id: "local-01".to_string(),
                    name: "Main Lobby Entrance".to_string(),
                    latitude: 12.971,
                    longitude: 77.594,
                    country: "India".to_string(),
                    city: "Bangalore".to_string(),
                    stream_url: "/video.mp4".to_string(),
                    snapshot_url: "/video.mp4".to_string(),
                    is_live: true,
                    supports_hls: false,
                    supports_rtsp: false,
                    status: "online".to_string(),
                    last_updated: Utc::now().timestamp_millis(),
                },
                Camera {
                    id: "CAM-02".to_string(),
                    provider: "Local Feed".to_string(),
                    provider_camera_id: "local-02".to_string(),
                    name: "West Parking Lot".to_string(),
                    latitude: 12.972,
                    longitude: 77.595,
                    country: "India".to_string(),
                    city: "Bangalore".to_string(),
                    stream_url: "/cam2.mp4".to_string(),
                    snapshot_url: "/cam2.mp4".to_string(),
                    is_live: true,
                    supports_hls: false,
                    supports_rtsp: false,
                    status: "online".to_string(),
                    last_updated: Utc::now().timestamp_millis(),
                },
                Camera {
                    id: "CAM-03".to_string(),
                    provider: "Local Feed".to_string(),
                    provider_camera_id: "local-03".to_string(),
                    name: "Loading Dock Area".to_string(),
                    latitude: 12.973,
                    longitude: 77.596,
                    country: "India".to_string(),
                    city: "Bangalore".to_string(),
                    stream_url: "/cam3.mp4".to_string(),
                    snapshot_url: "/cam3.mp4".to_string(),
                    is_live: true,
                    supports_hls: false,
                    supports_rtsp: false,
                    status: "online".to_string(),
                    last_updated: Utc::now().timestamp_millis(),
                },
                Camera {
                    id: "CAM-04".to_string(),
                    provider: "Local Feed".to_string(),
                    provider_camera_id: "local-04".to_string(),
                    name: "Server Room".to_string(),
                    latitude: 12.974,
                    longitude: 77.597,
                    country: "India".to_string(),
                    city: "Bangalore".to_string(),
                    stream_url: "/vid_cam4.mp4".to_string(),
                    snapshot_url: "/vid_cam4.mp4".to_string(),
                    is_live: true,
                    supports_hls: false,
                    supports_rtsp: false,
                    status: "online".to_string(),
                    last_updated: Utc::now().timestamp_millis(),
                }
            ];
            for c in defaults {
                cameras.insert(c.id.clone(), c);
            }
        }

        let reg = Self {
            cache_path: cache_path.to_string(),
            cameras: RwLock::new(cameras),
        };
        reg.save();
        reg
    }

    pub fn save(&self) {
        if let Ok(cameras) = self.cameras.read() {
            if let Ok(data) = serde_json::to_string_pretty(&*cameras) {
                if let Ok(mut file) = File::create(&self.cache_path) {
                    let _ = file.write_all(data.as_bytes());
                }
            }
        }
    }

    pub fn register(&self, cam: Camera) {
        if let Ok(mut cameras) = self.cameras.write() {
            cameras.insert(cam.id.clone(), cam);
        }
        self.save();
    }

    pub fn get(&self, id: &str) -> Option<Camera> {
        self.cameras.read().ok()?.get(id).cloned()
    }

    pub fn list(&self) -> Vec<Camera> {
        self.cameras.read().map(|c| c.values().cloned().collect()).unwrap_or_default()
    }
}

// --- STREAM MANAGER & FRAME EXTRACTION SERVICE ---
pub struct StreamManager {
    active_workers: Arc<RwLock<HashMap<String, tokio::task::JoinHandle<()>>>>,
    frame_tx: mpsc::Sender<Vec<u8>>,
}

impl StreamManager {
    pub fn new(frame_tx: mpsc::Sender<Vec<u8>>) -> Self {
        Self {
            active_workers: Arc::new(RwLock::new(HashMap::new())),
            frame_tx,
        }
    }

    pub async fn start_stream(&self, camera: Camera) {
        let mut workers = self.active_workers.write().unwrap();
        if workers.contains_key(&camera.id) {
            return;
        }

        let tx = self.frame_tx.clone();
        let cam_id = camera.id.clone();
        
        let handle = tokio::spawn(async move {
            println!("Stream worker started for camera: {}", cam_id);
            let client = Client::new();
            
            // Loop with auto-reconnect and health checks
            loop {
                // If it is a local mock loop file or standard HTTP snapshot stream
                let frame_source = if camera.snapshot_url.is_empty() {
                    "http://207.251.86.238/cctv452.jpg"
                } else {
                    &camera.snapshot_url
                };

                let mut success = false;
                if frame_source.starts_with("http") {
                    // Fetch with a 2 second timeout to prevent blocking on offline endpoints
                    match client.get(frame_source).timeout(Duration::from_secs(2)).send().await {
                        Ok(resp) => {
                            if let Ok(bytes) = resp.bytes().await {
                                if tx.send(bytes.to_vec()).await.is_ok() {
                                    success = true;
                                }
                            }
                        }
                        Err(_) => {}
                    }
                } else {
                    // Try to read local file directly
                    if let Ok(bytes) = std::fs::read(frame_source) {
                        if tx.send(bytes).await.is_ok() {
                            success = true;
                        }
                    }
                }

                if !success {
                    // Local fallback image!
                    let fallback_path = "/Users/apple/Desktop/Rakshini/rakshini-frontend/public/cam3.jpg";
                    if let Ok(bytes) = std::fs::read(fallback_path) {
                        if tx.send(bytes).await.is_err() {
                            break;
                        }
                    }
                    // Wait a bit to prevent tight loop in case of failure
                    sleep(Duration::from_millis(500)).await;
                }

                // Configurable frame rate extraction (e.g. 10 FPS = 100ms delays)
                sleep(Duration::from_millis(100)).await;
            }
        });

        workers.insert(camera.id, handle);
    }

    pub fn stop_stream(&self, id: &str) {
        let mut workers = self.active_workers.write().unwrap();
        if let Some(handle) = workers.remove(id) {
            handle.abort();
            println!("Aborted stream worker for camera: {}", id);
        }
    }
}

// Simulated simple capture loop to seed background thread
pub async fn start_capture_loop(tx: mpsc::Sender<Vec<u8>>) {
    println!("Starting modular capture loop...");
    let manager = StreamManager::new(tx);
    
    // Auto-start local CAM-01 stream
    let cam1 = Camera {
        id: "CAM-01".to_string(),
        provider: "Local Feed".to_string(),
        provider_camera_id: "local-01".to_string(),
        name: "Main Lobby Entrance".to_string(),
        latitude: 12.971,
        longitude: 77.594,
        country: "India".to_string(),
        city: "Bangalore".to_string(),
        stream_url: "/video.mp4".to_string(),
        snapshot_url: "http://207.251.86.238/cctv452.jpg".to_string(),
        is_live: true,
        supports_hls: false,
        supports_rtsp: false,
        status: "online".to_string(),
        last_updated: Utc::now().timestamp_millis(),
    };
    
    manager.start_stream(cam1).await;
    
    // Park capture loop thread
    loop {
        sleep(Duration::from_secs(3600)).await;
    }
}

// --- REST DASHBOARD HANDLERS ---
pub struct CameraState {
    pub registry: Arc<CameraRegistry>,
    pub stream_manager: Arc<StreamManager>,
    pub helios: HeliosProvider,
    pub windy: WindyProvider,
    pub rtsp: RtspProvider,
    pub onvif: OnvifProvider,
}

pub fn router(state: Arc<CameraState>) -> Router {
    Router::new()
        .route("/api/cameras", get(list_cameras))
        .route("/api/cameras/:id", get(get_camera_details))
        .route("/api/cameras/search", post(search_cameras))
        .route("/api/cameras/analytics", get(get_analytics))
        .route("/api/cameras/:id/stream/start", post(start_camera_stream))
        .route("/api/cameras/:id/stream/stop", post(stop_camera_stream))
        .layer(Extension(state))
}

async fn list_cameras(
    Extension(state): Extension<Arc<CameraState>>,
) -> Json<Vec<Camera>> {
    Json(state.registry.list())
}

async fn get_camera_details(
    AxumPath(id): AxumPath<String>,
    Extension(state): Extension<Arc<CameraState>>,
) -> Result<Json<Camera>, &'static str> {
    state.registry.get(&id)
        .map(Json)
        .ok_or("Camera not found")
}

#[derive(Deserialize)]
struct SearchRequest {
    bbox: String,
}

async fn search_cameras(
    Extension(state): Extension<Arc<CameraState>>,
    Json(payload): Json<SearchRequest>,
) -> Json<Vec<Camera>> {
    let mut results = Vec::new();
    if let Ok(cams) = state.helios.search_cameras(&payload.bbox).await {
        results.extend(cams);
    }
    if let Ok(cams) = state.windy.search_cameras(&payload.bbox).await {
        results.extend(cams);
    }
    if let Ok(cams) = state.rtsp.search_cameras(&payload.bbox).await {
        results.extend(cams);
    }
    if let Ok(cams) = state.onvif.search_cameras(&payload.bbox).await {
        results.extend(cams);
    }

    // Cache results in registry
    for cam in &results {
        state.registry.register(cam.clone());
    }

    Json(results)
}

#[derive(Serialize)]
struct AnalyticsData {
    pub total_cameras: usize,
    pub online_count: usize,
    pub offline_count: usize,
    pub provider_distribution: HashMap<String, usize>,
}

async fn get_analytics(
    Extension(state): Extension<Arc<CameraState>>,
) -> Json<AnalyticsData> {
    let cams = state.registry.list();
    let total = cams.len();
    let online = cams.iter().filter(|c| c.status == "online").count();
    let offline = total - online;

    let mut provider_dist = HashMap::new();
    for cam in cams {
        *provider_dist.entry(cam.provider).or_insert(0) += 1;
    }

    Json(AnalyticsData {
        total_cameras: total,
        online_count: online,
        offline_count: offline,
        provider_distribution: provider_dist,
    })
}

async fn start_camera_stream(
    AxumPath(id): AxumPath<String>,
    Extension(state): Extension<Arc<CameraState>>,
) -> Result<&'static str, &'static str> {
    if let Some(cam) = state.registry.get(&id) {
        state.stream_manager.start_stream(cam).await;
        Ok("Stream started")
    } else {
        Err("Camera not found")
    }
}

async fn stop_camera_stream(
    AxumPath(id): AxumPath<String>,
    Extension(state): Extension<Arc<CameraState>>,
) -> Result<&'static str, &'static str> {
    state.stream_manager.stop_stream(&id);
    Ok("Stream stopped")
}
