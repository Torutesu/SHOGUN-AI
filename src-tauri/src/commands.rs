use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri_plugin_store::StoreExt;

/// Global Node.js bridge process — spawned once on app start.
static BRIDGE: Mutex<Option<BridgeProcess>> = Mutex::new(None);
static REQUEST_ID: AtomicU64 = AtomicU64::new(1);

struct BridgeProcess {
    child: Child,
}

/// Initialize the Node.js bridge sidecar.
pub fn init_bridge(data_dir: &str, pii_removal: bool) -> Result<(), String> {
    let mut bridge = BRIDGE.lock().map_err(|e| e.to_string())?;
    if bridge.is_some() {
        return Ok(()); // Already running
    }

    let child = Command::new("node")
        .arg("dist/bridge/server.js")
        .env("SHOGUN_DATA_DIR", data_dir)
        .env("SHOGUN_PII_REMOVAL", if pii_removal { "true" } else { "false" })
        .env("SHOGUN_LOG_LEVEL", "warn")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Failed to spawn bridge: {}", e))?;

    *bridge = Some(BridgeProcess { child });
    Ok(())
}

/// Send a JSON-RPC request to the bridge and get the response.
fn bridge_call(method: &str, params: Value) -> Result<Value, String> {
    let mut guard = BRIDGE.lock().map_err(|e| e.to_string())?;
    let bridge = guard.as_mut().ok_or("Bridge not initialized")?;

    let id = REQUEST_ID.fetch_add(1, Ordering::Relaxed);
    let request = serde_json::json!({
        "id": id,
        "method": method,
        "params": params
    });

    // Write request to stdin
    let stdin = bridge.child.stdin.as_mut().ok_or("No stdin")?;
    let line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    writeln!(stdin, "{}", line).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;

    // Read response from stdout
    let stdout = bridge.child.stdout.as_mut().ok_or("No stdout")?;
    let mut reader = BufReader::new(stdout);
    let mut response_line = String::new();
    reader.read_line(&mut response_line).map_err(|e| e.to_string())?;

    let response: Value = serde_json::from_str(&response_line)
        .map_err(|e| format!("Invalid bridge response: {}", e))?;

    if let Some(error) = response.get("error") {
        return Err(error.get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown bridge error")
            .to_string());
    }

    Ok(response.get("result").cloned().unwrap_or(Value::Null))
}

// ─── Data Types ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct BrainStats {
    pub total_pages: u32,
    pub total_chunks: u32,
    pub embedded_chunks: u32,
    pub total_links: u32,
    pub total_tags: u32,
    pub total_timeline_entries: u32,
    pub pages_by_type: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub slug: String,
    pub title: String,
    pub page_type: String,
    pub score: f64,
    pub snippet: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PageData {
    pub slug: String,
    pub title: String,
    pub page_type: String,
    pub compiled_truth: String,
    pub timeline: String,
    pub tags: Vec<String>,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthReport {
    pub embed_coverage: f64,
    pub stale_pages: u32,
    pub orphan_pages: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub data_dir: String,
    pub embedding_tier: String,
    pub encryption_enabled: bool,
    pub dream_cycle_enabled: bool,
    pub language: String,
    pub onboarding_completed: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            openai_api_key: None,
            anthropic_api_key: None,
            data_dir: "./pgdata".to_string(),
            embedding_tier: "balanced".to_string(),
            encryption_enabled: false,
            dream_cycle_enabled: true,
            language: "ja".to_string(),
            onboarding_completed: false,
        }
    }
}

// ─── IPC Commands (all bridge to TypeScript) ───────────────

#[tauri::command]
pub async fn get_brain_stats() -> Result<Value, String> {
    bridge_call("get_brain_stats", serde_json::json!({}))
}

#[tauri::command]
pub async fn search_memory(query: String, limit: Option<u32>) -> Result<Value, String> {
    bridge_call("search_memory", serde_json::json!({
        "query": query,
        "limit": limit.unwrap_or(20)
    }))
}

#[tauri::command]
pub async fn hybrid_search(query: String, limit: Option<u32>) -> Result<Value, String> {
    bridge_call("hybrid_search", serde_json::json!({
        "query": query,
        "limit": limit.unwrap_or(10)
    }))
}

#[tauri::command]
pub async fn get_page(slug: String) -> Result<Value, String> {
    bridge_call("get_page", serde_json::json!({ "slug": slug }))
}

#[tauri::command]
pub async fn put_page(
    slug: String,
    title: String,
    page_type: String,
    compiled_truth: String,
    tags: Vec<String>,
) -> Result<Value, String> {
    bridge_call("put_page", serde_json::json!({
        "slug": slug,
        "title": title,
        "page_type": page_type,
        "compiled_truth": compiled_truth,
        "tags": tags
    }))
}

#[tauri::command]
pub async fn delete_page(slug: String) -> Result<Value, String> {
    bridge_call("delete_page", serde_json::json!({ "slug": slug }))
}

#[tauri::command]
pub async fn list_pages(
    page_type: Option<String>,
    tag: Option<String>,
    limit: Option<u32>,
) -> Result<Value, String> {
    bridge_call("list_pages", serde_json::json!({
        "type": page_type,
        "tag": tag,
        "limit": limit.unwrap_or(50)
    }))
}

#[tauri::command]
pub async fn get_health() -> Result<Value, String> {
    bridge_call("get_health", serde_json::json!({}))
}

#[tauri::command]
pub async fn run_dream_cycle() -> Result<Value, String> {
    bridge_call("run_dream_cycle", serde_json::json!({}))
}

#[tauri::command]
pub async fn add_clipboard_entry(text: String) -> Result<Value, String> {
    bridge_call("add_clipboard_entry", serde_json::json!({
        "text": text,
        "source": "clipboard"
    }))
}

#[tauri::command]
pub async fn add_window_entry(app_name: String, window_title: String) -> Result<Value, String> {
    bridge_call("add_window_entry", serde_json::json!({
        "app_name": app_name,
        "window_title": window_title
    }))
}

#[tauri::command]
pub async fn export_brain() -> Result<Value, String> {
    bridge_call("export_brain", serde_json::json!({}))
}

#[tauri::command]
pub async fn import_brain(data: Value) -> Result<Value, String> {
    bridge_call("import_brain", serde_json::json!({ "data": data }))
}

#[tauri::command]
pub async fn start_capture(interval_ms: Option<u32>) -> Result<Value, String> {
    bridge_call("start_capture", serde_json::json!({
        "interval_ms": interval_ms.unwrap_or(5000)
    }))
}

#[tauri::command]
pub async fn save_settings(
    app: tauri::AppHandle,
    settings: AppSettings,
) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("settings", serde_json::to_value(&settings).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone()).map_err(|e| e.to_string()),
        None => Ok(AppSettings::default()),
    }
}
