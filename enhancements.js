(() => {
  const organizeBtn = document.getElementById('organizeBtn');
  const feature = document.getElementById('feature');
  const requirement = document.getElementById('requirement');
  if (!organizeBtn || !feature || !requirement) return;

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
})();
