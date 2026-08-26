(() => {
  const banner = document.getElementById('updateBanner');
  const status = document.getElementById('updateStatus');
  const applyBtn = document.getElementById('applyUpdateBtn');
  const checkBtn = document.getElementById('checkUpdateBtn');
  const clearBtn = document.getElementById('clearCacheBtn');
  const versionEl = document.getElementById('appVersion');
  const APP_VERSION = '2.0.0';
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;

  if (!('serviceWorker' in navigator)) {
    if (status) status.textContent = 'Service Worker unsupported';
    return;
  }

  let registration;
  let refreshing = false;

  const setStatus = text => { if (status) status.textContent = text; };
  const showUpdate = () => {
    if (banner) banner.classList.add('show');
    setStatus('New version available');
  };

  function watch(reg) {
    registration = reg;
    if (reg.waiting) showUpdate();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      setStatus('Checking update…');
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          if (navigator.serviceWorker.controller) showUpdate();
          else setStatus('Offline cache ready');
        }
      });
    });
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });

  navigator.serviceWorker.register('./sw.js').then(reg => {
    watch(reg);
    setStatus(navigator.onLine ? 'Online · update ready' : 'Offline · local planner ready');
    reg.update().catch(() => {});
  }).catch(() => setStatus('Offline cache registration failed'));

  applyBtn?.addEventListener('click', () => {
    if (registration?.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    else location.reload();
  });

  checkBtn?.addEventListener('click', async () => {
    setStatus('Checking update…');
    try {
      const reg = registration || await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
      if (reg?.waiting) showUpdate();
      else setStatus(`v${APP_VERSION} · latest checked`);
    } catch (_) { setStatus('Update check failed'); }
  });

  clearBtn?.addEventListener('click', async () => {
    setStatus('Clearing cache…');
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('task-planner-')).map(k => caches.delete(k)));
      localStorage.setItem('task-planner:last-cache-clear', new Date().toISOString());
      const reg = registration || await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update().catch(() => {});
      location.reload();
    } catch (_) { setStatus('Clear cache failed'); }
  });

  window.addEventListener('online', () => setStatus(`v${APP_VERSION} · online`));
  window.addEventListener('offline', () => setStatus(`v${APP_VERSION} · offline`));
})();