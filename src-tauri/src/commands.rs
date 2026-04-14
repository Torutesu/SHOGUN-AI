use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

/// Brain statistics returned to the frontend.
#[derive(Debug, Serialize, Deserialize)]
pub struct BrainStats {
    pub total_pages: u32,
    pub total_chunks: u32,
    pub embedded_chunks: u32,
    pub total_links: u32,
    pub total_tags: u32,
}

/// Search result returned to the frontend.
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub slug: String,
    pub title: String,
    pub page_type: String,
    pub score: f64,
    pub snippet: String,
}

/// Page data for frontend display.
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

/// Health report for the frontend.
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthReport {
    pub embed_coverage: f64,
    pub stale_pages: u32,
    pub orphan_pages: u32,
}

/// Settings stored via tauri-plugin-store.
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

// ─── IPC Commands ───────────────────────────────────────────

/// Get brain statistics.
/// Called from the frontend via `invoke("get_brain_stats")`.
#[tauri::command]
pub async fn get_brain_stats() -> Result<BrainStats, String> {
    // TODO: Bridge to TypeScript ShogunBrain via sidecar or Node child process
    Ok(BrainStats {
        total_pages: 0,
        total_chunks: 0,
        embedded_chunks: 0,
        total_links: 0,
        total_tags: 0,
    })
}

/// Search memory using the hybrid search pipeline.
#[tauri::command]
pub async fn search_memory(query: String, limit: Option<u32>) -> Result<Vec<SearchResult>, String> {
    let _limit = limit.unwrap_or(20);
    // TODO: Bridge to TypeScript SearchPipeline
    let _ = query;
    Ok(vec![])
}

/// Get a page by slug.
#[tauri::command]
pub async fn get_page(slug: String) -> Result<Option<PageData>, String> {
    // TODO: Bridge to TypeScript PageStore
    let _ = slug;
    Ok(None)
}

/// Create or update a page.
#[tauri::command]
pub async fn put_page(
    slug: String,
    title: String,
    page_type: String,
    compiled_truth: String,
    tags: Vec<String>,
) -> Result<PageData, String> {
    // TODO: Bridge to TypeScript PageStore
    Ok(PageData {
        slug,
        title,
        page_type,
        compiled_truth,
        timeline: String::new(),
        tags,
        updated_at: chrono_now(),
    })
}

/// Delete a page.
#[tauri::command]
pub async fn delete_page(slug: String) -> Result<bool, String> {
    let _ = slug;
    Ok(true)
}

/// Get health report.
#[tauri::command]
pub async fn get_health() -> Result<HealthReport, String> {
    Ok(HealthReport {
        embed_coverage: 0.0,
        stale_pages: 0,
        orphan_pages: 0,
    })
}

/// Run dream cycle manually.
#[tauri::command]
pub async fn run_dream_cycle() -> Result<String, String> {
    Ok("Dream cycle completed".to_string())
}

/// Save settings to the Tauri store.
#[tauri::command]
pub async fn save_settings(
    app: tauri::AppHandle,
    settings: AppSettings,
) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store
        .set("settings", serde_json::to_value(&settings).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Load settings from the Tauri store.
#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    match store.get("settings") {
        Some(value) => {
            serde_json::from_value(value.clone()).map_err(|e| e.to_string())
        }
        None => Ok(AppSettings::default()),
    }
}

fn chrono_now() -> String {
    // Simple ISO timestamp without chrono dependency
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", now)
}
