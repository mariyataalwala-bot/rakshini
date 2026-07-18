use tokio::sync::mpsc;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::path::Path;
use std::fs::File;
use std::io::Write;
use ort::session::{builder::GraphOptimizationLevel, Session};
use ort::value::TensorRef;
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

        // Initialize ORT Session (ort 2.0 API)
        let session = Session::builder()
            .and_then(|b| b.with_optimization_level(GraphOptimizationLevel::Level3))
            .and_then(|b| b.with_intra_threads(4))
            .and_then(|b| b.commit_from_file(model_path))
            .map_err(|e| println!("Failed to load ONNX model: {}", e))
            .ok();

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
        if let Some(session) = session_lock.as_mut() {
            // 3. Inference (ort 2.0 API)
            if let Ok(input_value) = TensorRef::from_array_view(&input_tensor) {
                if let Ok(outputs) = session.run(ort::inputs![input_value]) {
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
                                    
                                    // COCO class ids: 0 = person, 1/2/3/5/7 = vehicles, 34 = baseball bat, 43 = knife
                                    let label = match class_id {
                                        0 => "Person",
                                        1 | 2 | 3 | 5 | 7 => "Vehicle",
                                        34 | 43 => "Weapon",
                                        _ => "Object",
                                    };

                                    // If a weapon-class object appears (knife = 43, baseball bat = 34), raise an event
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
                                            x: x1 as i32,
                                            y: y1 as i32,
                                            width: (w * scale_x) as i32,
                                            height: (h * scale_y) as i32,
                                        },
                                    });
                                }
                            }
                            
                        }
                    }
                }
            }
        }

        // 5. Non-Maximum Suppression to deduplicate overlapping boxes (IoU > 0.45)
        let detections = non_max_suppression(detections, 0.45);

        (detections, event)
    }
}

/// Greedy NMS: keep highest-confidence boxes, drop lower-confidence ones that
/// overlap an already-kept box of the same label beyond `iou_threshold`.
fn non_max_suppression(mut dets: Vec<Detection>, iou_threshold: f32) -> Vec<Detection> {
    dets.sort_by(|a, b| {
        b.confidence
            .partial_cmp(&a.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut kept: Vec<Detection> = Vec::new();
    for cand in dets {
        let overlaps = kept.iter().any(|k| {
            k.label == cand.label && iou(&k.bounding_box, &cand.bounding_box) > iou_threshold
        });
        if !overlaps {
            kept.push(cand);
        }
    }
    kept
}

/// Intersection-over-Union for two axis-aligned boxes.
fn iou(a: &BoundingBox, b: &BoundingBox) -> f32 {
    let ax2 = a.x + a.width;
    let ay2 = a.y + a.height;
    let bx2 = b.x + b.width;
    let by2 = b.y + b.height;

    let ix1 = a.x.max(b.x);
    let iy1 = a.y.max(b.y);
    let ix2 = ax2.min(bx2);
    let iy2 = ay2.min(by2);

    let iw = (ix2 - ix1).max(0);
    let ih = (iy2 - iy1).max(0);
    let inter = (iw * ih) as f32;

    let area_a = (a.width * a.height).max(0) as f32;
    let area_b = (b.width * b.height).max(0) as f32;
    let union = area_a + area_b - inter;

    if union <= 0.0 {
        0.0
    } else {
        inter / union
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
