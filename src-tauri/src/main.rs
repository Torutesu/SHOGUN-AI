// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Initialize the Node.js bridge sidecar
            let _ = app; // app handle available for future use
            if let Err(e) = commands::init_bridge("./pgdata", false) {
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
            commands::save_settings,
            commands::load_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SHOGUN");
}
