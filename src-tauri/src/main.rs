// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Read settings from store to configure the bridge
            use tauri_plugin_store::StoreExt;
            let store = app.store("settings.json").ok();

            let mut data_dir = "./pgdata".to_string();
            let mut pii_removal = true; // Default ON for privacy-first
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
                        // Signal bridge to use OS keychain for encryption key
                        encryption_passphrase = Some("keychain".to_string());
                    }
                }
            }

            if let Err(e) = commands::init_bridge(
                &data_dir, pii_removal,
                openai_key.as_deref(),
                anthropic_key.as_deref(),
                &embedding_tier,
                encryption_passphrase.as_deref(),
            ) {
                eprintln!("Warning: Bridge init failed: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_brain_stats,
            commands::search_memory,
            commands::hybrid_search,
            commands::get_page,
            commands::put_page,
            commands::delete_page,
            commands::list_pages,
            commands::get_health,
            commands::run_dream_cycle,
            commands::add_clipboard_entry,
            commands::add_window_entry,
            commands::export_brain,
            commands::import_brain,
            commands::start_capture,
            commands::save_settings,
            commands::load_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SHOGUN");
}
