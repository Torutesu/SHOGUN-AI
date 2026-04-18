//! Local JSON memory index for `shogun_memory_search` / `shogun_memory_fetch`.

use crate::paths;
use serde_json::{json, Value};
use std::fs;

const MEMORY_FILE: &str = "memory_items.json";

fn memory_path() -> Result<std::path::PathBuf, String> {
  Ok(paths::app_data_dir()?.join(MEMORY_FILE))
}

fn default_catalog() -> Value {
  json!({
    "items": [
      {
        "id": "m_seed_1",
        "title": "Filters · timeline",
        "snippet": "Memory river filters for screen, audio, and input capture.",
        "kinds": ["screen", "input"],
        "source": "capture",
        "created_at": 1713398400000u64
      },
      {
        "id": "m_seed_2",
        "title": "Meeting notes · standup",
        "snippet": "Audio transcript summary from team sync.",
        "kinds": ["audio"],
        "source": "meetings",
        "created_at": 1713484800000u64
      },
      {
        "id": "m_seed_3",
        "title": "Work documents and tasks",
        "snippet": "Links to Linear issues and Notion pages for the sprint.",
        "kinds": ["screen"],
        "source": "work",
        "created_at": 1713571200000u64
      },
      {
        "id": "m_seed_4",
        "title": "Chat composer memory",
        "snippet": "Context loaded from memory.search for reply drafting.",
        "kinds": ["input", "screen"],
        "source": "chat",
        "created_at": 1713657600000u64
      },
      {
        "id": "m_seed_5",
        "title": "Creativity briefing",
        "snippet": "Notes from article on creative process and deep work.",
        "kinds": ["screen"],
        "source": "reading",
        "created_at": 1713744000000u64
      }
    ]
  })
}

fn load_catalog() -> Result<Value, String> {
  let path = memory_path()?;
  if !path.exists() {
    let doc = default_catalog();
    fs::write(
      &path,
      serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    return Ok(doc);
  }
  let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
  serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn item_kinds(item: &Value) -> Vec<String> {
  item
    .get("kinds")
    .and_then(|k| k.as_array())
    .map(|a| {
      a.iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect()
    })
    .unwrap_or_default()
}

fn matches_kinds_filter(item: &Value, want: &[String]) -> bool {
  if want.is_empty() {
    return true;
  }
  let have = item_kinds(item);
  want.iter().any(|w| have.iter().any(|h| h == w))
}

fn matches_query(hay: &str, query: &str) -> bool {
  let hay_l = hay.to_lowercase();
  let q = query.trim().to_lowercase();
  if q.is_empty() {
    return true;
  }
  let tokens: Vec<&str> = q.split_whitespace().filter(|t| !t.is_empty()).collect();
  if tokens.is_empty() {
    return hay_l.contains(&q);
  }
  tokens.iter().all(|t| hay_l.contains(*t))
}

/// Search indexed memories. Payload: `{ query?, kinds?, limit? }`.
pub fn search(payload: &Value) -> Result<Value, String> {
  let query = payload
    .get("query")
    .and_then(|q| q.as_str())
    .unwrap_or("")
    .to_string();
  let limit = payload
    .get("limit")
    .and_then(|l| l.as_u64())
    .unwrap_or(20)
    .clamp(1, 200) as usize;

  let kinds_want: Vec<String> = payload
    .get("kinds")
    .and_then(|k| k.as_array())
    .map(|arr| {
      arr.iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect()
    })
    .unwrap_or_default();

  let doc = load_catalog()?;
  let items = doc
    .get("items")
    .and_then(|i| i.as_array())
    .ok_or_else(|| "memory catalog missing items array".to_string())?;

  let mut matched: Vec<Value> = Vec::new();
  for item in items {
    let title = item.get("title").and_then(|t| t.as_str()).unwrap_or("");
    let snippet = item.get("snippet").and_then(|t| t.as_str()).unwrap_or("");
    let source = item.get("source").and_then(|t| t.as_str()).unwrap_or("");
    let hay = format!("{} {} {}", title, snippet, source);
    if !matches_query(&hay, &query) {
      continue;
    }
    if !matches_kinds_filter(item, &kinds_want) {
      continue;
    }
    matched.push(item.clone());
  }

  let total = matched.len();
  let hits: Vec<Value> = matched.into_iter().take(limit).collect();
  Ok(json!({
    "hits": hits,
    "total": total,
    "echo": payload,
    "stub": false,
  }))
}

/// Fetch by `id` or `ids`. Payload: `{ id?: string, ids?: string[] }`.
pub fn fetch(payload: &Value) -> Result<Value, String> {
  let mut id_list: Vec<String> = Vec::new();
  if let Some(arr) = payload.get("ids").and_then(|x| x.as_array()) {
    id_list.extend(
      arr.iter()
        .filter_map(|v| v.as_str().map(String::from)),
    );
  }
  if let Some(s) = payload.get("id").and_then(|x| x.as_str()) {
    id_list.push(s.to_string());
  }

  if id_list.is_empty() {
    return Ok(json!({
      "items": [],
      "echo": payload,
      "stub": false,
    }));
  }

  let doc = load_catalog()?;
  let items = doc
    .get("items")
    .and_then(|i| i.as_array())
    .ok_or_else(|| "memory catalog missing items array".to_string())?;

  let mut out = Vec::new();
  for want in &id_list {
    if let Some(found) = items.iter().find(|it| {
      it.get("id")
        .and_then(|i| i.as_str())
        .map(|id| id == want.as_str())
        .unwrap_or(false)
    }) {
      out.push(found.clone());
    }
  }

  Ok(json!({
    "items": out,
    "echo": payload,
    "stub": false,
  }))
}
