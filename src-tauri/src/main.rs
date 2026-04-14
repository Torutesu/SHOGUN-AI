// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
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

            // 1. Start the bridge
            if let Err(e) = commands::init_bridge(
                &data_dir, pii_removal,
                openai_key.as_deref(),
                anthropic_key.as_deref(),
                &embedding_tier,
                encryption_passphrase.as_deref(),
            ) {
                eprintln!("Warning: Bridge init failed: {}", e);
            } else {
                // 2. Auto-start capture after bridge is ready
                std::thread::spawn(|| {
                    // Wait for bridge to initialize
                    std::thread::sleep(std::time::Duration::from_secs(3));

                    // Start passive capture (clipboard + window title)
                    if let Err(e) = commands::bridge_call_pub("start_capture", serde_json::json!({ "interval_ms": 5000 })) {
                        eprintln!("Warning: Capture start failed: {}", e);
                    }

                    // Start OCR capture (accessibility API)
                    if let Err(e) = commands::bridge_call_pub("start_ocr_capture", serde_json::json!({ "interval_ms": 3000 })) {
                        eprintln!("Warning: OCR capture start failed: {}", e);
                    }

                    // Start audio capture (meeting detection)
                    if let Err(e) = commands::bridge_call_pub("start_audio_capture", serde_json::json!({})) {
                        eprintln!("Warning: Audio capture start failed: {}", e);
                    }
                });
            }

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
