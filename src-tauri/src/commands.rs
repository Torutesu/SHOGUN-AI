use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{BufRead, BufReader, Write};
use std::process::{ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri_plugin_store::StoreExt;

// ─── Bridge Process Communication ──────────────────────────
// Design: stdin lock held only during write (brief), responses
// dispatched via mpsc channel from a reader thread (no deadlock).

static BRIDGE_STDIN: Mutex<Option<ChildStdin>> = Mutex::new(None);
static RESPONSE_RX: Mutex<Option<std::sync::mpsc::Receiver<(u64, String)>>> = Mutex::new(None);
static REQUEST_ID: AtomicU64 = AtomicU64::new(1);

/// Initialize the Node.js bridge sidecar.
pub fn init_bridge(
    data_dir: &str,
    pii_removal: bool,
    openai_key: Option<&str>,
    anthropic_key: Option<&str>,
    embedding_tier: &str,
    encryption_passphrase: Option<&str>,
) -> Result<(), String> {
    let mut stdin_guard = BRIDGE_STDIN.lock().map_err(|e| e.to_string())?;
    if stdin_guard.is_some() {
        return Ok(());
    }

    // Resolve bridge path using absolute path from executable location
    // cargo tauri dev CWD is src-tauri/, so relative paths break.
    // We find the project root by looking for package.json.
    let project_root = {
        let mut dir = std::env::current_dir().unwrap_or_default();
        // Walk up until we find package.json (project root marker)
        for _ in 0..5 {
            if dir.join("package.json").exists() {
                break;
            }
            if let Some(parent) = dir.parent() {
                dir = parent.to_path_buf();
            } else {
                break;
            }
        }
        dir
    };

    let bridge_path = project_root.join("dist/bridge/server.js");
    if !bridge_path.exists() {
        return Err(format!(
            "Bridge not found at {}. Run 'npm run build' in project root.",
            bridge_path.display()
        ));
    }

    let mut cmd = Command::new("node");
    cmd.arg(&bridge_path)
        .current_dir(&project_root) // Set CWD to project root
        .env("SHOGUN_DATA_DIR", data_dir)
        .env("SHOGUN_PII_REMOVAL", if pii_removal { "true" } else { "false" })
        .env("SHOGUN_LOG_LEVEL", "warn")
        .env("SHOGUN_EMBEDDING_TIER", embedding_tier);

    if let Some(key) = openai_key { cmd.env("OPENAI_API_KEY", key); }
    if let Some(key) = anthropic_key { cmd.env("ANTHROPIC_API_KEY", key); }
    if let Some(p) = encryption_passphrase { cmd.env("SHOGUN_ENCRYPTION_PASSPHRASE", p); }

    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Failed to spawn bridge: {}", e))?;

    let child_stdin = child.stdin.take().ok_or("No stdin")?;
    let child_stdout = child.stdout.take().ok_or("No stdout")?;

    let (tx, rx) = std::sync::mpsc::channel::<(u64, String)>();

    // Reader thread: reads bridge stdout, dispatches (id, line) to channel
    std::thread::spawn(move || {
        let reader = BufReader::new(child_stdout);
        for line in reader.lines().flatten() {
            if let Ok(val) = serde_json::from_str::<Value>(&line) {
                if let Some(id) = val.get("id").and_then(|v| v.as_u64()) {
                    if tx.send((id, line)).is_err() { break; }
                }
            }
        }
        // Bridge process exited — child will be reaped by OS
    });

    *stdin_guard = Some(child_stdin);
    let mut rx_guard = RESPONSE_RX.lock().map_err(|e| e.to_string())?;
    *rx_guard = Some(rx);

    Ok(())
}

/// Send a JSON-RPC request and wait for matching response.
/// Also exposed publicly for main.rs auto-start calls.
pub fn bridge_call_pub(method: &str, params: Value) -> Result<Value, String> {
    bridge_call(method, params)
}

fn bridge_call(method: &str, params: Value) -> Result<Value, String> {
    let id = REQUEST_ID.fetch_add(1, Ordering::Relaxed);
    let request = serde_json::json!({ "id": id, "method": method, "params": params });
    let line = serde_json::to_string(&request).map_err(|e| e.to_string())?;

    // Brief lock: write to stdin then release
    {
        let mut stdin_guard = BRIDGE_STDIN.lock().map_err(|e| e.to_string())?;
        let stdin = stdin_guard.as_mut().ok_or("Bridge not initialized. Restart the app.")?;
        writeln!(stdin, "{}", line).map_err(|e| format!("Bridge write failed: {}. Restart the app.", e))?;
        stdin.flush().map_err(|e| e.to_string())?;
    }

    // Wait for our response (30s timeout)
    let rx_guard = RESPONSE_RX.lock().map_err(|e| e.to_string())?;
    let rx = rx_guard.as_ref().ok_or("Response channel not initialized")?;

    let deadline = std::time::Duration::from_secs(30);
    loop {
        match rx.recv_timeout(deadline) {
            Ok((resp_id, resp_line)) => {
                if resp_id == id {
                    let response: Value = serde_json::from_str(&resp_line)
                        .map_err(|e| format!("Invalid response: {}", e))?;
                    if let Some(error) = response.get("error") {
                        return Err(error.get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("Unknown bridge error")
                            .to_string());
                    }
                    return Ok(response.get("result").cloned().unwrap_or(Value::Null));
                }
                // Not our response — belongs to another concurrent call.
                // In the single-reader model, this is dropped. For full
                // concurrency support, a response-map would be needed.
            }
            Err(_) => return Err("Bridge request timed out (30s). The memory engine may be busy.".to_string()),
        }
    }
}

// ─── Data Types ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub data_dir: String,
    pub embedding_tier: String,
    pub encryption_enabled: bool,
    pub pii_removal: bool,
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
            pii_removal: true,
            dream_cycle_enabled: true,
            language: "ja".to_string(),
            onboarding_completed: false,
        }
    }
}

// ─── IPC Commands ──────────────────────────────────────────

#[tauri::command]
pub async fn get_brain_stats() -> Result<Value, String> {
    bridge_call("get_brain_stats", serde_json::json!({}))
}

#[tauri::command]
pub async fn search_memory(query: String, limit: Option<u32>) -> Result<Value, String> {
    bridge_call("search_memory", serde_json::json!({ "query": query, "limit": limit.unwrap_or(20) }))
}

#[tauri::command]
pub async fn hybrid_search(query: String, limit: Option<u32>) -> Result<Value, String> {
    bridge_call("hybrid_search", serde_json::json!({ "query": query, "limit": limit.unwrap_or(10) }))
}

#[tauri::command]
pub async fn get_page(slug: String) -> Result<Value, String> {
    bridge_call("get_page", serde_json::json!({ "slug": slug }))
}

#[tauri::command]
pub async fn put_page(slug: String, title: String, page_type: String, compiled_truth: String, tags: Vec<String>) -> Result<Value, String> {
    bridge_call("put_page", serde_json::json!({ "slug": slug, "title": title, "page_type": page_type, "compiled_truth": compiled_truth, "tags": tags }))
}

#[tauri::command]
pub async fn delete_page(slug: String) -> Result<Value, String> {
    bridge_call("delete_page", serde_json::json!({ "slug": slug }))
}

#[tauri::command]
pub async fn list_pages(page_type: Option<String>, tag: Option<String>, limit: Option<u32>) -> Result<Value, String> {
    bridge_call("list_pages", serde_json::json!({ "type": page_type, "tag": tag, "limit": limit.unwrap_or(50) }))
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
    bridge_call("add_clipboard_entry", serde_json::json!({ "text": text, "source": "clipboard" }))
}

#[tauri::command]
pub async fn add_window_entry(app_name: String, window_title: String) -> Result<Value, String> {
    bridge_call("add_window_entry", serde_json::json!({ "app_name": app_name, "window_title": window_title }))
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
    bridge_call("start_capture", serde_json::json!({ "interval_ms": interval_ms.unwrap_or(5000) }))
}

// ─── Missing commands (were in bridge but not registered in Tauri) ───

#[tauri::command]
pub async fn chat(message: String) -> Result<Value, String> {
    bridge_call("chat", serde_json::json!({ "message": message }))
}

#[tauri::command]
pub async fn pause_capture() -> Result<Value, String> {
    bridge_call("pause_capture", serde_json::json!({}))
}

#[tauri::command]
pub async fn resume_capture() -> Result<Value, String> {
    bridge_call("resume_capture", serde_json::json!({}))
}

#[tauri::command]
pub async fn start_ocr_capture(interval_ms: Option<u32>) -> Result<Value, String> {
    bridge_call("start_ocr_capture", serde_json::json!({ "interval_ms": interval_ms.unwrap_or(3000) }))
}

#[tauri::command]
pub async fn start_audio_capture() -> Result<Value, String> {
    bridge_call("start_audio_capture", serde_json::json!({}))
}

#[tauri::command]
pub async fn get_timeline_range(start_date: String, end_date: String, limit: Option<u32>) -> Result<Value, String> {
    bridge_call("get_timeline_range", serde_json::json!({ "start_date": start_date, "end_date": end_date, "limit": limit.unwrap_or(30) }))
}

#[tauri::command]
pub async fn get_today_timeline() -> Result<Value, String> {
    bridge_call("get_today_timeline", serde_json::json!({}))
}

#[tauri::command]
pub async fn delete_timeline_range(range: String) -> Result<Value, String> {
    bridge_call("delete_timeline_range", serde_json::json!({ "range": range }))
}

#[tauri::command]
pub async fn list_pipes() -> Result<Value, String> {
    bridge_call("list_pipes", serde_json::json!({}))
}

#[tauri::command]
pub async fn set_pipe_enabled(id: String, enabled: bool) -> Result<Value, String> {
    bridge_call("set_pipe_enabled", serde_json::json!({ "id": id, "enabled": enabled }))
}

#[tauri::command]
pub async fn run_pipe(id: String) -> Result<Value, String> {
    bridge_call("run_pipe", serde_json::json!({ "id": id }))
}

#[tauri::command]
pub async fn ingest_slack(token: String, channel_id: String) -> Result<Value, String> {
    bridge_call("ingest_slack", serde_json::json!({ "token": token, "channel_id": channel_id }))
}

#[tauri::command]
pub async fn ingest_github(token: String, owner: String, repo: String) -> Result<Value, String> {
    bridge_call("ingest_github", serde_json::json!({ "token": token, "owner": owner, "repo": repo }))
}

#[tauri::command]
pub async fn ingest_notion(token: String) -> Result<Value, String> {
    bridge_call("ingest_notion", serde_json::json!({ "token": token }))
}

#[tauri::command]
pub async fn ingest_linear(api_key: String) -> Result<Value, String> {
    bridge_call("ingest_linear", serde_json::json!({ "api_key": api_key }))
}

#[tauri::command]
pub async fn ingest_gmail(access_token: String, refresh_token: String, client_id: String, client_secret: String) -> Result<Value, String> {
    bridge_call("ingest_gmail", serde_json::json!({ "access_token": access_token, "refresh_token": refresh_token, "client_id": client_id, "client_secret": client_secret }))
}

#[tauri::command]
pub async fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
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
