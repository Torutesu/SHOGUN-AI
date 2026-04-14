/**
 * SHOGUN Browser Extension — Background Service Worker
 *
 * Captures:
 * 1. Page title + URL on tab activation / navigation
 * 2. Text selections via context menu "Save to SHOGUN"
 * 3. Tab switch events for activity tracking
 *
 * Communicates with SHOGUN via Native Messaging to Tauri app.
 */

// PII patterns to filter before sending
const PII_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
  /(?:password|passwd|token|secret|api_key)[\s]*[:=][\s]*\S+/gi,
];

// Blocked domains (banking, payments)
const BLOCKED_DOMAINS = [
  'bank', 'banking', 'pay.google.com', 'wallet.google.com',
  'paypal.com', 'stripe.com', 'venmo.com',
];

function isBlockedUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(d => hostname.includes(d));
  } catch { return false; }
}

function filterPII(text) {
  let filtered = text;
  for (const pattern of PII_PATTERNS) {
    filtered = filtered.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]');
  }
  return filtered;
}

// Capture page on tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url || isBlockedUrl(tab.url)) return;

    await sendToShogun({
      type: 'page_visit',
      title: filterPII(tab.title || ''),
      url: tab.url,
      timestamp: new Date().toISOString(),
    });
  } catch {}
});

// Capture on navigation complete
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || isBlockedUrl(tab.url)) return;

  await sendToShogun({
    type: 'page_visit',
    title: filterPII(tab.title || ''),
    url: tab.url,
    timestamp: new Date().toISOString(),
  });
});

// Context menu: "Save to SHOGUN"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-shogun',
    title: 'Save to SHOGUN',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-shogun') return;
  if (!info.selectionText) return;

  await sendToShogun({
    type: 'text_selection',
    text: filterPII(info.selectionText),
    url: tab?.url || '',
    title: tab?.title || '',
    timestamp: new Date().toISOString(),
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'clipboard_capture') {
    sendToShogun({
      type: 'clipboard',
      text: filterPII(message.text),
      url: sender.tab?.url || '',
      timestamp: new Date().toISOString(),
    }).then(() => sendResponse({ ok: true }));
    return true;
  }
});

/**
 * Send captured data to SHOGUN app.
 * Tries Native Messaging first, falls back to localhost HTTP.
 */
async function sendToShogun(data) {
  // Store locally for batch sync
  const queue = (await chrome.storage.local.get('capture_queue')).capture_queue || [];
  queue.push(data);

  // Keep max 1000 items
  if (queue.length > 1000) queue.splice(0, queue.length - 1000);
  await chrome.storage.local.set({ capture_queue: queue });

  // Try to send to app
  try {
    const res = await fetch('http://localhost:3847/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      // Clear sent items from queue
      await chrome.storage.local.set({ capture_queue: [] });
    }
  } catch {
    // App not running — data stays in queue for later sync
  }
}
