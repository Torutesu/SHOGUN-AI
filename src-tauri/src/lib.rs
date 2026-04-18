mod commands;
mod settings_store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::shogun_memory_search,
      commands::shogun_memory_fetch,
      commands::shogun_entity_query,
      commands::shogun_brief_get,
      commands::shogun_draft,
      commands::shogun_schedule_action,
      commands::shogun_stats,
      commands::app_open_hummingbird,
      commands::app_create_share_link,
      commands::app_settings_load,
      commands::app_settings_save,
      commands::app_integration_connect,
      commands::app_integration_toggle,
      commands::app_capture_pause,
      commands::app_capture_resume,
      commands::app_permissions_manage,
      commands::app_diagnostics_report,
      commands::app_delete_data_range,
      commands::app_delete_all_data,
      commands::app_delete_account,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
