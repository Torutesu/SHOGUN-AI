use serde::{Deserialize, Serialize};
#[cfg(target_os = "macos")]
use std::process::Command;

/// Captured text content from the active window.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturedContent {
    pub app_name: String,
    pub window_title: String,
    pub text_content: String,
    pub url: Option<String>,
    pub timestamp: String,
}

/// Check if macOS Accessibility permission is granted.
/// Uses AppleScript to test — if it fails, permission is not granted.
pub fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        let result = Command::new("osascript")
            .arg("-e")
            .arg(r#"tell application "System Events" to get name of first application process whose frontmost is true"#)
            .output();

        match result {
            Ok(output) => output.status.success(),
            Err(_) => false,
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

/// Open macOS System Preferences → Privacy → Accessibility.
pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
    }
}

/// Capture text from the currently focused window using Accessibility API.
///
/// Uses AppleScript + System Events to traverse the UI element tree.
/// This is the same approach as Screenpipe's accessibility.rs but
/// via osascript instead of raw AXUIElement FFI.
///
/// Returns None if:
/// - No focused window
/// - Accessibility permission not granted
/// - App is in the exclusion list
pub fn capture_active_window(exclude_apps: &[String]) -> Option<CapturedContent> {
    #[cfg(target_os = "macos")]
    {
        capture_macos(exclude_apps)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = exclude_apps;
        None
    }
}

#[cfg(target_os = "macos")]
fn capture_macos(exclude_apps: &[String]) -> Option<CapturedContent> {
    // Step 1: Get active app name + window title
    let info = Command::new("osascript")
        .arg("-e")
        .arg(r#"
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set appName to name of frontApp
                set winTitle to ""
                try
                    set winTitle to title of front window of frontApp
                end try
                return appName & "|||" & winTitle
            end tell
        "#)
        .output()
        .ok()?;

    if !info.status.success() {
        return None;
    }

    let info_str = String::from_utf8_lossy(&info.stdout).trim().to_string();
    let parts: Vec<&str> = info_str.splitn(2, "|||").collect();
    let app_name = parts.first().unwrap_or(&"").to_string();
    let window_title = parts.get(1).unwrap_or(&"").to_string();

    if app_name.is_empty() {
        return None;
    }

    // Check exclusion list
    let app_lower = app_name.to_lowercase();
    for excluded in exclude_apps {
        if app_lower.contains(&excluded.to_lowercase()) {
            return None;
        }
    }

    // Step 2: Get text content from UI elements
    let text_result = Command::new("osascript")
        .arg("-e")
        .arg(&format!(r#"
            tell application "System Events"
                tell process "{}"
                    set allText to ""
                    try
                        set winElems to every UI element of window 1
                        repeat with elem in winElems
                            try
                                set v to value of elem
                                if v is not missing value and v is not "" and (class of v) is text then
                                    set allText to allText & v & linefeed
                                end if
                            end try
                            -- One level of children
                            try
                                set childElems to every UI element of elem
                                repeat with child in childElems
                                    try
                                        set cv to value of child
                                        if cv is not missing value and cv is not "" and (class of cv) is text then
                                            set allText to allText & cv & linefeed
                                        end if
                                    end try
                                end repeat
                            end try
                        end repeat
                    end try
                    return allText
                end tell
            end tell
        "#, app_name))
        .output();

    let text_content = match text_result {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        _ => String::new(),
    };

    // Step 3: Try to get URL if it's a browser
    let url = get_browser_url(&app_name);

    let timestamp = chrono::Utc::now().to_rfc3339();

    Some(CapturedContent {
        app_name,
        window_title,
        text_content,
        url,
        timestamp,
    })
}

#[cfg(target_os = "macos")]
fn get_browser_url(app_name: &str) -> Option<String> {
    let app_lower = app_name.to_lowercase();

    let script = if app_lower.contains("chrome") || app_lower.contains("chromium") || app_lower.contains("brave") || app_lower.contains("edge") {
        format!(r#"tell application "{}" to get URL of active tab of front window"#, app_name)
    } else if app_lower.contains("safari") {
        r#"tell application "Safari" to get URL of current tab of front window"#.to_string()
    } else if app_lower.contains("firefox") {
        // Firefox doesn't support direct URL access via AppleScript
        return None;
    } else if app_lower.contains("arc") {
        format!(r#"tell application "{}" to get URL of active tab of front window"#, app_name)
    } else {
        return None;
    };

    let result = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .ok()?;

    if result.status.success() {
        let url = String::from_utf8_lossy(&result.stdout).trim().to_string();
        if url.starts_with("http") {
            Some(url)
        } else {
            None
        }
    } else {
        None
    }
}
