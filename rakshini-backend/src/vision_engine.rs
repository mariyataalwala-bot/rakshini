use tokio::sync::mpsc;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::path::Path;
use std::fs::File;
use std::io::Write;
use ort::session::Session;
use ort::value::Value;
use ndarray::Array;
use image::{imageops::FilterType, GenericImageView};

use crate::models::{Detection, BoundingBox, VisionEvent};

pub struct VisionEngine {
    session: Arc<Mutex<Option<Session>>>,
}

impl VisionEngine {
    pub async fn new() -> Self {
        println!("Initializing Vision Engine (ort)...");
        
        let model_path = "yolov8n.onnx";
        
        // Download model if it doesn't exist
        if !Path::new(model_path).exists() {
            println!("Downloading yolov8n.onnx...");
            let url = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.onnx";
            if let Ok(resp) = reqwest::get(url).await {
                if let Ok(bytes) = resp.bytes().await {
                    let mut file = File::create(model_path).unwrap();
                    file.write_all(&bytes).unwrap();
                    println!("Download complete.");
                }
            }
        }

        // Initialize ORT Session
        let session = match (|| {
            let session = Session::builder()?
                .with_intra_threads(4)?
                .commit_from_file(model_path)?;
            Ok::<_, ort::Error>(session)
        })() {
            Ok(sess) => Some(sess),
            Err(e) => {
                println!("Failed to load ONNX model: {}", e);
                None
            }
        };

        Self {
            session: Arc::new(Mutex::new(session)),
        }
    }

    pub async fn process_frame(&self, frame_bytes: &[u8]) -> (Vec<Detection>, Option<VisionEvent>) {
        let mut detections = Vec::new();
        let mut event = None;

        // 1. Decode JPEG
        let img = match image::load_from_memory(frame_bytes) {
            Ok(i) => i,
            Err(_) => return (detections, event),
        };
        
        let (orig_width, orig_height) = img.dimensions();
        
        // 2. Preprocess for YOLOv8 (640x640)
        let resized = img.resize_exact(640, 640, FilterType::Triangle);
        let mut input_tensor = Array::<f32, _>::zeros((1, 3, 640, 640));
        for pixel in resized.pixels() {
            let x = pixel.0 as usize;
            let y = pixel.1 as usize;
            let rgba = pixel.2;
            input_tensor[[0, 0, y, x]] = (rgba[0] as f32) / 255.0;
            input_tensor[[0, 1, y, x]] = (rgba[1] as f32) / 255.0;
            input_tensor[[0, 2, y, x]] = (rgba[2] as f32) / 255.0;
        }

        let mut session_lock = self.session.lock().await;
        if let Some(session) = &mut *session_lock {
            // 3. Inference
            if let Ok(input_val) = Value::from_array(input_tensor) {
                if let Ok(outputs) = session.run(ort::inputs![input_val]) {
                    // 4. Post-process
                    if let Ok(view) = outputs[0].try_extract_array::<f32>() {
                        // YOLOv8 output shape is [1, 84, 8400]
                        if view.shape().len() == 3 && view.shape()[1] == 84 && view.shape()[2] == 8400 {
                            for col in 0..8400 {
                                let mut max_prob = 0.0;
                                let mut class_id = 0;
                                for c in 0..80 {
                                    let prob = view[[0, c + 4, col]];
                                    if prob > max_prob {
                                        max_prob = prob;
                                        class_id = c;
                                    }
                                }

                                if max_prob > 0.5 {
                                    let cx = view[[0, 0, col]];
                                    let cy = view[[0, 1, col]];
                                    let w = view[[0, 2, col]];
                                    let h = view[[0, 3, col]];

                                    // Scale back to original resolution
                                    let scale_x = orig_width as f32 / 640.0;
                                    let scale_y = orig_height as f32 / 640.0;
                                    
                                    let x1 = (cx - w / 2.0) * scale_x;
                                    let y1 = (cy - h / 2.0) * scale_y;
                                    
                                    let label = if class_id == 0 { "Person" } else if class_id == 2 { "Vehicle" } else { "Object" };
                                    
                                    // For now, if someone brings a "Weapon" (e.g. knife = 43, baseball bat = 34), trigger violence
                                    if class_id == 43 || class_id == 34 {
                                        event = Some(VisionEvent {
                                            description: format!("Weapon detected: {}", label),
                                            confidence: max_prob,
                                            location: "CAM-LIVE".to_string(),
                                        });
                                    }

                                    detections.push(Detection {
                                        label: label.to_string(),
                                        confidence: max_prob,
                                        bounding_box: BoundingBox {
                                            x: x1 as u32,
                                            y: y1 as u32,
                                            width: (w * scale_x) as u32,
                                            height: (h * scale_y) as u32,
                                        },
                                    });
                                }
                            }
                            
                            // (A real implementation would apply Non-Maximum Suppression (NMS) here to deduplicate boxes)
                        }
                    }
                }
            }
        }
        
        (detections, event)
    }
}

pub async fn run_vision_loop(
    mut raw_rx: mpsc::Receiver<Vec<u8>>,
    processed_tx: mpsc::Sender<(Vec<u8>, Vec<Detection>)>,
    event_tx: mpsc::Sender<VisionEvent>,
) {
    let engine = VisionEngine::new().await;
    
    while let Some(frame) = raw_rx.recv().await {
        let (detections, event) = engine.process_frame(&frame).await;
        
        if let Some(e) = event {
            let _ = event_tx.send(e).await;
        }
        
        if processed_tx.send((frame, detections)).await.is_err() {
            break;
        }
    }
}
