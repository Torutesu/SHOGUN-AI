use super::accessibility::CapturedContent;
use crate::commands::bridge_call_pub;

/// Write captured content to the Memory Layer via the bridge.
///
/// Creates a session page: sessions/YYYY-MM-DD
/// Adds a timeline entry with the captured text.
pub fn write_to_memory(content: &CapturedContent) -> Result<(), String> {
    let date = &content.timestamp[..10]; // "2026-04-14"
    let slug = format!("sessions/{}", date);

    // Ensure session page exists
    let _ = bridge_call_pub(
        "put_page",
        serde_json::json!({
            "slug": slug,
            "type": "session",
            "title": format!("Session {}", date),
            "compiled_truth": "Daily activity log.",
        }),
    );

    // Build timeline entry content
    let mut entry_text = format!("[{}] {}", content.app_name, content.window_title);
    if let Some(url) = &content.url {
        entry_text.push_str(&format!(" ({})", url));
    }
    if !content.text_content.is_empty() {
        // Truncate to 2000 chars to avoid huge entries
        let text = if content.text_content.len() > 2000 {
            &content.text_content[..2000]
        } else {
            &content.text_content
        };
        entry_text.push_str(&format!("\n{}", text));
    }

    // Add timeline entry
    bridge_call_pub(
        "add_clipboard_entry",
        serde_json::json!({
            "text": entry_text,
            "source": "accessibility_capture",
        }),
    )?;

    Ok(())
}
