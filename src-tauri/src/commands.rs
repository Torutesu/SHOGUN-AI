//! IPC handlers aligned with `hifi/lib/shogun-api.js` invoke names.
//! Stubs return JSON the Hi-Fi UI can consume; replace with PGLite / real pipelines later.

use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};

fn ts() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_millis() as u64)
    .unwrap_or(0)
}

#[tauri::command]
pub fn shogun_memory_search(payload: Value) -> Result<Value, String> {
  Ok(json!({
    "hits": [],
    "total": 0,
    "echo": payload,
    "stub": true,
  }))
}

#[tauri::command]
pub fn shogun_memory_fetch(payload: Value) -> Result<Value, String> {
  Ok(json!({ "items": [], "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn shogun_entity_query(payload: Value) -> Result<Value, String> {
  Ok(json!({ "entities": [], "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn shogun_brief_get(payload: Value) -> Result<Value, String> {
  Ok(json!({
    "sections": [],
    "generatedAt": ts(),
    "echo": payload,
    "stub": true,
  }))
}

#[tauri::command]
pub fn shogun_draft(payload: Value) -> Result<Value, String> {
  Ok(json!({
    "id": format!("draft-{}", ts()),
    "status": "queued",
    "echo": payload,
    "stub": true,
  }))
}

#[tauri::command]
pub fn shogun_schedule_action(payload: Value) -> Result<Value, String> {
  Ok(json!({
    "id": format!("sched-{}", ts()),
    "scheduled": true,
    "echo": payload,
    "stub": true,
  }))
}

#[tauri::command]
pub fn shogun_stats(payload: Value) -> Result<Value, String> {
  Ok(json!({
    "eventsToday": "1,248",
    "memoriesToday": "23",
    "appCoverage": [],
    "echo": payload,
    "stub": true,
  }))
}

#[tauri::command]
pub fn app_open_hummingbird(payload: Value) -> Result<Value, String> {
  Ok(json!({ "opened": true, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_create_share_link(payload: Value) -> Result<Value, String> {
  Ok(json!({
    "url": format!("https://share.shogun.ai/stub/{}", ts()),
    "echo": payload,
    "stub": true,
  }))
}

#[tauri::command]
pub fn app_settings_load(payload: Value) -> Result<Value, String> {
  Ok(json!({
    "settings": {},
    "echo": payload,
    "stub": true,
  }))
}

#[tauri::command]
pub fn app_settings_save(payload: Value) -> Result<Value, String> {
  Ok(json!({ "saved": true, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_integration_connect(payload: Value) -> Result<Value, String> {
  Ok(json!({ "connected": true, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_integration_toggle(payload: Value) -> Result<Value, String> {
  Ok(json!({ "enabled": true, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_capture_pause(payload: Value) -> Result<Value, String> {
  Ok(json!({ "paused": true, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_capture_resume(payload: Value) -> Result<Value, String> {
  Ok(json!({ "paused": false, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_permissions_manage(payload: Value) -> Result<Value, String> {
  Ok(json!({ "opened": true, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_diagnostics_report(payload: Value) -> Result<Value, String> {
  Ok(json!({ "reportId": format!("diag-{}", ts()), "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_delete_data_range(payload: Value) -> Result<Value, String> {
  Ok(json!({ "deleted": false, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_delete_all_data(payload: Value) -> Result<Value, String> {
  Ok(json!({ "deleted": false, "echo": payload, "stub": true }))
}

#[tauri::command]
pub fn app_delete_account(payload: Value) -> Result<Value, String> {
  Ok(json!({ "deleted": false, "echo": payload, "stub": true }))
}
