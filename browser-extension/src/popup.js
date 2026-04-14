document.addEventListener('DOMContentLoaded', async () => {
  const { capture_queue = [], paused = false } = await chrome.storage.local.get(['capture_queue', 'paused']);

  document.getElementById('queue-count').textContent = capture_queue.length;

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = capture_queue.filter(e => e.timestamp?.startsWith(today)).length;
  document.getElementById('today-count').textContent = todayCount;

  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const btn = document.getElementById('toggle');

  if (paused) {
    dot.classList.add('off');
    text.textContent = 'Paused';
    btn.textContent = 'Resume Capture';
  }

  btn.addEventListener('click', async () => {
    const current = (await chrome.storage.local.get('paused')).paused || false;
    await chrome.storage.local.set({ paused: !current });

    if (current) {
      dot.classList.remove('off');
      text.textContent = 'Capturing';
      btn.textContent = 'Pause Capture';
    } else {
      dot.classList.add('off');
      text.textContent = 'Paused';
      btn.textContent = 'Resume Capture';
    }
  });
});
