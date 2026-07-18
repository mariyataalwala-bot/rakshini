mod models;
mod camera;
mod vision_engine;
mod llm_engine;
mod websocket;
mod forensics;

use axum::{routing::get, Router, Extension};
use std::sync::Arc;
use tokio::sync::{mpsc, broadcast};
use tower::ServiceBuilder;

use models::{Detection, VisionEvent, WsPayload};
use websocket::AppState;

#[tokio::main]
async fn main() {
    println!("Starting Rakshini Backend...");

    // Channels for inter-thread communication
    // Camera raw frames -> Vision Engine & Forensics Buffer
    let (raw_tx, raw_rx) = mpsc::channel::<Vec<u8>>(100);
    // Needed to duplicate raw frames for forensics
    let (raw_forensics_tx, raw_forensics_rx) = mpsc::channel::<Vec<u8>>(100);
    
    // Vision Engine -> WebSocket Encoder
    let (processed_tx, processed_rx) = mpsc::channel::<(Vec<u8>, Vec<Detection>)>(100);
    
    // Vision Engine -> LLM Engine
    let (event_tx, event_rx) = mpsc::channel::<VisionEvent>(10);
    
    // Vision Engine -> Forensics Engine
    let (event_forensics_tx, event_forensics_rx) = mpsc::channel::<VisionEvent>(10);
    
    // WebSocket Encoder -> Clients (Broadcast)
    let (ws_tx, _ws_rx) = broadcast::channel::<WsPayload>(100);

    // Split raw frames to both vision and forensics
    let (raw_split_tx, mut raw_split_rx) = mpsc::channel::<Vec<u8>>(100);
    let raw_tx_clone = raw_tx.clone();
    
    // Mux task to duplicate raw frames
    tokio::spawn(async move {
        while let Some(frame) = raw_split_rx.recv().await {
            let _ = raw_tx_clone.send(frame.clone()).await;
            let _ = raw_forensics_tx.send(frame).await;
        }
    });

    // Mux task to duplicate events
    let (event_split_tx, mut event_split_rx) = mpsc::channel::<VisionEvent>(10);
    tokio::spawn(async move {
        while let Some(event) = event_split_rx.recv().await {
            let _ = event_tx.send(event.clone()).await;
            let _ = event_forensics_tx.send(event).await;
        }
    });
    // Spawn AI pipelines
    tokio::spawn(camera::start_capture_loop(raw_split_tx.clone()));
    tokio::spawn(vision_engine::run_vision_loop(raw_rx, processed_tx, event_split_tx));
    tokio::spawn(llm_engine::run_llm_loop(event_rx));
    tokio::spawn(forensics::run_forensics_loop(raw_forensics_rx, event_forensics_rx));
    
    // Spawn encoder
    let ws_tx_clone = ws_tx.clone();
    tokio::spawn(websocket::run_encoder_loop(processed_rx, ws_tx_clone));

    // Setup Camera Registry and Stream Manager
    let registry = Arc::new(camera::CameraRegistry::new("camera_registry.json"));
    // Frame Sender to seed manager streams
    let (frame_tx, mut frame_rx) = mpsc::channel::<Vec<u8>>(100);
    let raw_split_tx_clone = raw_split_tx.clone();
    tokio::spawn(async move {
        while let Some(frame) = frame_rx.recv().await {
            let _ = raw_split_tx_clone.send(frame).await;
        }
    });

    let stream_manager = Arc::new(camera::StreamManager::new(frame_tx));
    let camera_state = Arc::new(camera::CameraState {
        registry,
        stream_manager,
        helios: camera::HeliosProvider,
        windy: camera::WindyProvider,
        rtsp: camera::RtspProvider,
        onvif: camera::OnvifProvider,
    });

    // Setup Axum WebServer
    let app_state = Arc::new(AppState { tx: ws_tx });

    use axum::http::header;
    use axum::http::HeaderValue;
    use axum::middleware::{self, Next};
    use axum::response::Response;

    async fn add_cors(request: axum::extract::Request, next: Next) -> Response {
        let mut response = next.run(request).await;
        response.headers_mut().insert(
            header::ACCESS_CONTROL_ALLOW_ORIGIN,
            HeaderValue::from_static("*"),
        );
        response.headers_mut().insert(
            header::ACCESS_CONTROL_ALLOW_HEADERS,
            HeaderValue::from_static("*"),
        );
        response.headers_mut().insert(
            header::ACCESS_CONTROL_ALLOW_METHODS,
            HeaderValue::from_static("*"),
        );
        response
    }

    let app = Router::new()
        .route("/ws", get(websocket::ws_handler))
        .merge(camera::router(camera_state))
        .layer(middleware::from_fn(add_cors))
        .layer(
            ServiceBuilder::new()
                .layer(Extension(app_state))
        );

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Listening on ws://0.0.0.0:3000/ws");
    println!("REST API server listening at http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
