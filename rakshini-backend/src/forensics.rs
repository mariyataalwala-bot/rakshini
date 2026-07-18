use std::collections::VecDeque;
use tokio::sync::mpsc;
use crate::models::VisionEvent;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct RollingBuffer {
    buffer: VecDeque<Vec<u8>>,
    max_frames: usize,
}

impl RollingBuffer {
    pub fn new(max_frames: usize) -> Self {
        Self {
            buffer: VecDeque::with_capacity(max_frames),
            max_frames,
        }
    }
    
    pub fn push(&mut self, frame: Vec<u8>) {
        if self.buffer.len() >= self.max_frames {
            self.buffer.pop_front();
        }
        self.buffer.push_back(frame);
    }
    
    pub fn save_to_disk(&self, _event: &VisionEvent) {
        println!("Saving {} frames to /incidents/video_{}.mp4", self.buffer.len(), chrono::Utc::now().timestamp());
        // In real app, encode VecDeque to mp4 using FFMPEG or similar
    }
}

pub async fn run_forensics_loop(
    mut raw_rx: mpsc::Receiver<Vec<u8>>,
    mut event_rx: mpsc::Receiver<VisionEvent>,
) {
    // 60 FPS * 10 seconds = 600 frames
    let buffer = Arc::new(Mutex::new(RollingBuffer::new(600)));
    
    let buffer_clone = Arc::clone(&buffer);
    
    // Task to ingest raw frames into the rolling buffer
    tokio::spawn(async move {
        while let Some(frame) = raw_rx.recv().await {
            let mut b = buffer_clone.lock().await;
            b.push(frame);
        }
    });
    
    // Task to dump buffer on events
    while let Some(event) = event_rx.recv().await {
        let b = buffer.lock().await;
        b.save_to_disk(&event);
    }
}
