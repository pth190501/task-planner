(() => {
  const organizeBtn = document.getElementById('organizeBtn');
  const feature = document.getElementById('feature');
  const requirement = document.getElementById('requirement');

  if (organizeBtn && feature && requirement) {
    const deriveFeature = text => {
      let title = (text || '').split(/\r?\n/).map(v => v.trim()).find(Boolean) || '';
      title = title
        .replace(/^[-*•#\s]+/, '')
        .replace(/^(tôi\s+)?(đang\s+)?(muốn|cần|cần tạo|muốn tạo|xây dựng|tạo)\s+/i, '')
        .replace(/[.!?]+$/, '')
        .trim();
      if (title.length > 72) title = title.slice(0, 69).trimEnd() + '...';
      return title || 'New feature';
    };

    organizeBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (!feature.value.trim() && requirement.value.trim()) {
          feature.value = deriveFeature(requirement.value);
          feature.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 0);
    });
  }

  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = './manifest.webmanifest';
  document.head.appendChild(manifest);

  const theme = document.createElement('meta');
  theme.name = 'theme-color';
  theme.content = '#0b1020';
  document.head.appendChild(theme);

  const heroActions = document.querySelector('.hero-actions');
  const networkBadge = document.createElement('div');
  networkBadge.className = 'privacy';
  networkBadge.id = 'networkStatus';

  const updateNetworkStatus = () => {
    const online = navigator.onLine;
    networkBadge.textContent = online ? 'Online · Offline cache ready after first load' : 'Offline · Planner available locally';
    networkBadge.title = online
      ? 'Planner is online. After the service worker caches the app, it can be reopened offline.'
      : 'Requirement input, routing, generation, history, profiles and export still work. External links and ChatGPT need internet.';
  };

  if (heroActions) {
    heroActions.prepend(networkBadge);
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        await registration.update();
      } catch (error) {
        console.warn('Offline cache unavailable:', error);
      }
    });
  }
})();
