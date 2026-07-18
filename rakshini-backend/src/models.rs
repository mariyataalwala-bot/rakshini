use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Detection {
    pub label: String,
    pub confidence: f32,
    pub bounding_box: BoundingBox,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsPayload {
    pub timestamp: i64,
    pub camera_id: String,
    pub frame_data: String, // base64 encoded jpeg
    pub detections: Vec<Detection>,
}

#[derive(Debug, Clone)]
pub struct VisionEvent {
    pub description: String,
    pub confidence: f32,
    pub location: String,
}
