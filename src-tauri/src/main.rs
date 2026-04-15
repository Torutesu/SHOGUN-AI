// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod capture;

use std::sync::Arc;
use tauri::Manager;
use capture::scheduler::CaptureState;

fn main() {
    let capture_state = Arc::new(CaptureState::new());

    let cs_for_tauri = Arc::clone(&capture_state);
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(cs_for_tauri)
        .setup(|app| {
            use tauri_plugin_store::StoreExt;
            let store = app.store("settings.json").ok();

            let mut data_dir = "./pgdata".to_string();
            let mut pii_removal = true;
            let mut openai_key: Option<String> = None;
            let mut anthropic_key: Option<String> = None;
            let mut embedding_tier = "balanced".to_string();
            let mut encryption_passphrase: Option<String> = None;

            if let Some(ref s) = store {
                if let Some(val) = s.get("settings") {
                    if let Some(dir) = val.get("data_dir").and_then(|v| v.as_str()) {
                        data_dir = dir.to_string();
                    }
                    if let Some(pii) = val.get("pii_removal").and_then(|v| v.as_bool()) {
                        pii_removal = pii;
                    }
                    if let Some(key) = val.get("openai_api_key").and_then(|v| v.as_str()) {
                        if !key.is_empty() { openai_key = Some(key.to_string()); }
                    }
                    if let Some(key) = val.get("anthropic_api_key").and_then(|v| v.as_str()) {
                        if !key.is_empty() { anthropic_key = Some(key.to_string()); }
                    }
                    if let Some(tier) = val.get("embedding_tier").and_then(|v| v.as_str()) {
                        embedding_tier = tier.to_string();
                    }
                    if val.get("encryption_enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                        encryption_passphrase = Some("keychain".to_string());
                    }
                }
            }

            // Start the Node.js HTTP bridge server
            let bridge_path = find_bridge_http_path();
            if let Some(path) = bridge_path {
                eprintln!("[SHOGUN] Starting HTTP bridge: {}", path.display());
                let mut cmd = std::process::Command::new("node");
                cmd.arg(&path)
                    .env("SHOGUN_DATA_DIR", &data_dir)
                    .env("SHOGUN_PII_REMOVAL", if pii_removal { "true" } else { "false" })
                    .env("SHOGUN_LOG_LEVEL", "info")
                    .env("SHOGUN_PORT", "3847")
                    .env("SHOGUN_EMBEDDING_TIER", &embedding_tier);

                if let Some(ref key) = openai_key { cmd.env("OPENAI_API_KEY", key); }
                if let Some(ref key) = anthropic_key { cmd.env("ANTHROPIC_API_KEY", key); }

                match cmd.spawn() {
                    Ok(_child) => eprintln!("[SHOGUN] HTTP bridge started on port 3847"),
                    Err(e) => eprintln!("[SHOGUN] Bridge start failed: {}", e),
                }
            } else {
                eprintln!("[SHOGUN] Warning: bridge http-server.js not found. Run 'npm run build'.");
            }

            // Auto-start capture after bridge is ready
            let capture: Arc<CaptureState> = app.handle().state::<Arc<CaptureState>>().inner().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(5));
                eprintln!("[SHOGUN] Starting capture...");
                capture.start();
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Core
            commands::get_brain_stats,
            commands::search_memory,
            commands::hybrid_search,
            commands::get_page,
            commands::put_page,
            commands::delete_page,
            commands::list_pages,
            commands::get_health,
            commands::run_dream_cycle,
            // Capture
            commands::add_clipboard_entry,
            commands::add_window_entry,
            commands::start_capture,
            commands::pause_capture,
            commands::resume_capture,
            commands::start_ocr_capture,
            commands::start_audio_capture,
            // Native capture commands
            commands::native_start_capture,
            commands::native_stop_capture,
            commands::get_capture_status,
            commands::check_permissions,
            commands::open_accessibility_settings,
            // Chat
            commands::chat,
            // Export/Import
            commands::export_brain,
            commands::import_brain,
            // Timeline
            commands::get_timeline_range,
            commands::get_today_timeline,
            commands::delete_timeline_range,
            // Pipes
            commands::list_pipes,
            commands::set_pipe_enabled,
            commands::run_pipe,
            // Integrations
            commands::ingest_slack,
            commands::ingest_github,
            commands::ingest_notion,
            commands::ingest_linear,
            commands::ingest_gmail,
            // Settings
            commands::save_settings,
            commands::load_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SHOGUN");
}

/// Find the HTTP bridge server script.
fn find_bridge_http_path() -> Option<std::path::PathBuf> {
    let mut dir = std::env::current_dir().unwrap_or_default();
    for _ in 0..5 {
        let candidate = dir.join("dist/bridge/http-server.js");
        if candidate.exists() {
            return Some(candidate);
        }
        if let Some(parent) = dir.parent() {
            dir = parent.to_path_buf();
        } else {
            break;
        }
    }
    None
}
