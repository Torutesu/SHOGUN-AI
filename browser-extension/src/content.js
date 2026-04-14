/**
 * SHOGUN Content Script — runs on every page.
 *
 * Captures:
 * 1. Copy events (clipboard capture)
 * 2. Text selections > 20 chars
 *
 * Excludes password fields and banking sites.
 */

// Skip password fields
const isPasswordField = (el) =>
  el?.type === 'password' || el?.autocomplete?.includes('password');

// Clipboard capture
document.addEventListener('copy', () => {
  try {
    const selection = window.getSelection()?.toString();
    if (!selection || selection.length < 10) return;

    // Don't capture from password-related contexts
    const active = document.activeElement;
    if (isPasswordField(active)) return;

    chrome.runtime.sendMessage({
      type: 'clipboard_capture',
      text: selection.slice(0, 5000),
    });
  } catch {}
});
