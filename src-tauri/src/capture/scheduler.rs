use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use sha2::{Sha256, Digest};

use super::accessibility::{capture_active_window, CapturedContent};
use super::pipeline::write_to_memory;

/// Global capture state.
pub struct CaptureState {
    pub running: AtomicBool,
    pub interval_secs: AtomicU64,
    pub last_captured_at: Mutex<Option<String>>,
    pub capture_count: AtomicU64,
    last_content_hash: Mutex<String>,
    exclude_apps: Mutex<Vec<String>>,
}

impl CaptureState {
    pub fn new() -> Self {
        Self {
            running: AtomicBool::new(false),
            interval_secs: AtomicU64::new(30),
            last_captured_at: Mutex::new(None),
            capture_count: AtomicU64::new(0),
            last_content_hash: Mutex::new(String::new()),
            exclude_apps: Mutex::new(vec![
                "1Password".into(), "Bitwarden".into(), "KeePass".into(),
                "LastPass".into(), "Keychain Access".into(),
                "Terminal".into(), "iTerm2".into(), "Alacritty".into(),
            ]),
        }
    }

    /// Start the background capture loop.
    pub fn start(self: &Arc<Self>) {
        if self.running.load(Ordering::Relaxed) {
            return; // Already running
        }
        self.running.store(true, Ordering::Relaxed);

        let state = Arc::clone(self);
        thread::spawn(move || {
            eprintln!("[SHOGUN] Capture started (interval: {}s)", state.interval_secs.load(Ordering::Relaxed));

            while state.running.load(Ordering::Relaxed) {
                let interval = state.interval_secs.load(Ordering::Relaxed);
                thread::sleep(Duration::from_secs(interval));

                if !state.running.load(Ordering::Relaxed) {
                    break;
                }

                // Capture
                let exclude = state.exclude_apps.lock().unwrap().clone();
                if let Some(content) = capture_active_window(&exclude) {
                    // Dedup: skip if same content as last capture
                    let hash = compute_hash(&content.text_content);
                    {
                        let mut last_hash = state.last_content_hash.lock().unwrap();
                        if *last_hash == hash && !hash.is_empty() {
                            continue;
                        }
                        *last_hash = hash;
                    }

                    // Skip if content is too short
                    if content.text_content.len() < 10 && content.url.is_none() {
                        continue;
                    }

                    // Write to Memory Layer
                    match write_to_memory(&content) {
                        Ok(_) => {
                            state.capture_count.fetch_add(1, Ordering::Relaxed);
                            let mut last = state.last_captured_at.lock().unwrap();
                            *last = Some(content.timestamp.clone());
                            eprintln!(
                                "[SHOGUN] Captured: {} — {} ({} chars)",
                                content.app_name,
                                content.window_title,
                                content.text_content.len()
                            );
                        }
                        Err(e) => {
                            eprintln!("[SHOGUN] Write failed: {}", e);
                        }
                    }
                }
            }

            eprintln!("[SHOGUN] Capture stopped");
        });
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::Relaxed);
    }

    pub fn set_interval(&self, secs: u64) {
        self.interval_secs.store(secs.max(5), Ordering::Relaxed);
    }
}

fn compute_hash(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    let mut hasher = Sha256::new();
    hasher.update(text.as_bytes());
    hex::encode(hasher.finalize())
}
