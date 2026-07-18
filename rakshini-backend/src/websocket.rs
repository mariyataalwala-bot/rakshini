use tokio::sync::broadcast;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    Extension,
};
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use std::sync::Arc;

use crate::models::{WsPayload, Detection};

pub struct AppState {
    pub tx: broadcast::Sender<WsPayload>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    let rx = state.tx.subscribe();
    ws.on_upgrade(move |socket| handle_socket(socket, rx))
}

async fn handle_socket(mut socket: WebSocket, mut rx: broadcast::Receiver<WsPayload>) {
    println!("New WebSocket connection established.");
    loop {
        tokio::select! {
            // Outgoing: broadcast payloads to this client
            result = rx.recv() => {
                match result {
                    Ok(payload) => {
                        if let Ok(json) = serde_json::to_string(&payload) {
                            if socket.send(Message::Text(json)).await.is_err() {
                                println!("Client disconnected.");
                                break;
                            }
                        }
                    }
                    // Slow client fell behind the broadcast buffer: skip missed frames, keep the connection
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        println!("Client lagged, skipped {} frames.", skipped);
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            // Incoming: answer heartbeat pings and detect disconnects
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) if text == "ping" => {
                        if socket.send(Message::Text("pong".to_string())).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        println!("Client disconnected.");
                        break;
                    }
                    Some(Err(_)) => break,
                    _ => {} // ignore other message types
                }
            }
        }
    }
}

pub async fn run_encoder_loop(
    mut processed_rx: tokio::sync::mpsc::Receiver<(Vec<u8>, Vec<Detection>)>,
    tx: broadcast::Sender<WsPayload>,
) {
    while let Some((raw_frame, detections)) = processed_rx.recv().await {
        // In a real scenario, compress raw_frame to JPEG here.
        // For mock, just pretend we encode it.
        let base64_jpeg = general_purpose::STANDARD.encode(&raw_frame);
        
        let payload = WsPayload {
            timestamp: Utc::now().timestamp(),
            camera_id: "CAM-01".to_string(),
            frame_data: format!("data:image/jpeg;base64,{}", base64_jpeg),
            detections,
        };
        
        // Broadcast to all connected clients
        let _ = tx.send(payload);
    }
}
