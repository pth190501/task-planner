const STORAGE_KEY = 'task-planner:draft:v3';
const HISTORY_KEY = 'task-planner:history:v3';
const MODE_KEY = 'task-planner:mode:v3';
const PROFILE_KEY = 'task-planner:profiles:v3';
const PROFILE_SELECTED_KEY = 'task-planner:selected-profile:v3';
const HISTORY_LIMIT = 12;

const form = document.getElementById('taskForm');
const preview = document.getElementById('preview');
const requestIdEl = document.getElementById('requestId');
const copyBtn = document.getElementById('copyBtn');
const openChatBtn = document.getElementById('openChatBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyEl = document.getElementById('history');
const saveState = document.getElementById('saveState');
const toast = document.getElementById('toast');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const requirementCount = document.getElementById('requirementCount');
const sourceStatus = document.getElementById('sourceStatus');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const rawInput = document.getElementById('rawInput');
const organizeBtn = document.getElementById('organizeBtn');
const clearRawBtn = document.getElementById('clearRawBtn');
const rawStatus = document.getElementById('rawStatus');
const rawFileInput = document.getElementById('rawFileInput');
const profileSelect = document.getElementById('profileSelect');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');

const fields = ['feature', 'project', 'requirement', 'docs', 'figma', 'team', 'ownership', 'constraints', 'notes'];
let currentMarkdown = '';
let currentRequestId = '';
let saveTimer;
let mode = localStorage.getItem(MODE_KEY) || 'quick';

const getValues = () => Object.fromEntries(fields.map(id => [id, document.getElementById(id).value.trim()]));
const setValues = values => fields.forEach(id => document.getElementById(id).value = values?.[id] || '');
const setActions = enabled => [copyBtn, openChatBtn, downloadBtn].forEach(button => button.disabled = !enabled);

const showToast = message => {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
};

const makeRequestId = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `REQ-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const uniqueLines = value => [...new Set((value || '').split('\n').map(v => v.trim()).filter(Boolean))];
const mergeLines = (existing, incoming) => [...new Set([...uniqueLines(existing), ...incoming.filter(Boolean)])].join('\n');

const asBulletLines = value => uniqueLines(value)
  .map(v => v.startsWith('- ') ? v : `- ${v}`)
  .join('\n');

const section = (title, value, bullets = false) => {
  if (!value) return '';
  return `\n## ${title}\n${bullets ? asBulletLines(value) : value}\n`;
};

const buildMarkdown = values => {
  const id = makeRequestId();
  const quickRules = [
    '- Keep the task count as small as practical.',
    '- Do not over-analyze or split into tiny implementation steps.',
    '- Prefer 2–5 meaningful tasks for a normal-sized feature.',
    '- Only create dependencies that are technically necessary.'
  ];
  const standardRules = [
    '- Break work into independently reviewable tasks without excessive granularity.',
    '- Include enough detail for developers to start without re-reading the full source material.',
    '- Call out meaningful technical dependencies and integration points.'
  ];

  const lines = [
    `# Task Breakdown Request — ${values.feature}`,
    '',
    `**Request ID:** ${id}`,
    `**Break mode:** ${mode === 'quick' ? 'Quick' : 'Standard'}`,
    values.project ? `**Project:** ${values.project}` : '',
    values.team ? `**Team:** ${values.team}` : '',
    values.ownership ? `**Preferred ownership:** ${values.ownership}` : '',
    '',
    '## Goal',
    'Break this work into clear developer tasks that can be assigned in parallel where practical, with minimal ownership overlap and merge conflicts.',
    '',
    '## Requirement',
    values.requirement,
    section('Docs / References', values.docs, true),
    section('Figma', values.figma, true),
    section('Constraints / Shared Areas', values.constraints),
    section('Additional Notes', values.notes),
    '## Breakdown Rules',
    ...(mode === 'quick' ? quickRules : standardRules),
    '- Understand the complete feature before splitting.',
    '- Split by independent ownership, not by individual functions, files, or small UI elements.',
    '- Maximize safe parallel work.',
    '- Prefer one primary owner for each important shared screen/module/file area.',
    '- If two tasks would heavily modify the same shared area, merge them or assign one integration owner.',
    '- Do not invent exact file names, modules, architecture, API behavior, or Figma details that are not supported by the supplied context.',
    '- Separate confirmed information from assumptions when assumptions materially affect the plan.',
    '- If a linked Doc/Figma cannot be accessed, say so and use only the available context instead of hallucinating.',
    '- Make reasonable assumptions when details are minor; ask questions only when they materially change scope or ownership.',
    '- Keep the final output concise, in Vietnamese, and directly shareable with the team.',
    '',
    '## Expected Output',
    '- Short scope summary',
    '- Task list with owner, dependency, ownership area, and done criteria',
    '- What can run in parallel',
    '- Shared ownership / likely conflict points',
    '- Recommended merge order',
    '- Only material open questions'
  ].filter(line => line !== '');

  return { id, markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n' };
};

const aiPrompt = markdown => `Break task theo request dưới đây. Không overthinking. Ưu tiên số task ít nhất nhưng vẫn đủ để chia ownership rõ, làm song song an toàn và hạn chế dẫm code. Không tự bịa chi tiết không có trong source. Trả về Markdown tiếng Việt dễ gửi thẳng cho team.\n\n${markdown}`;

const updateIndicators = () => {
  const values = getValues();
  const status = [Boolean(values.requirement), Boolean(values.docs), Boolean(values.figma), Boolean(values.team)];
  [...sourceStatus.children].forEach((node, index) => node.classList.toggle('ready', status[index]));
  requirementCount.textContent = `${document.getElementById('requirement').value.length.toLocaleString()} chars`;
};

const saveDraft = () => {
  const payload = { raw: rawInput.value, values: getValues() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  saveState.textContent = 'Draft saved locally';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState.textContent = 'Draft autosaved locally', 1200);
};

const loadDraft = () => {
  try {
    const v3 = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const v2 = JSON.parse(localStorage.getItem('task-planner:draft:v2') || 'null');
    const v1 = JSON.parse(localStorage.getItem('task-planner:draft:v1') || 'null');
    if (v3?.values) {
      setValues(v3.values);
      rawInput.value = v3.raw || '';
    } else if (v2 || v1) {
      setValues(v2 || v1);
    }
  } catch (_) {}
};

const readHistory = () => {
  try {
    const v3 = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    const v2 = JSON.parse(localStorage.getItem('task-planner:history:v2') || 'null');
    const v1 = JSON.parse(localStorage.getItem('task-planner:history:v1') || '[]');
    return v3 || v2 || v1 || [];
  } catch (_) { return []; }
};

const writeHistory = history => localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));

const addHistory = (values, id, markdown) => {
  const history = readHistory().filter(item => item.id !== id);
  history.unshift({ id, feature: values.feature, project: values.project, createdAt: new Date().toISOString(), values, markdown, mode });
  writeHistory(history);
  renderHistory();
};

const loadGenerated = (markdown, id) => {
  currentMarkdown = markdown;
  currentRequestId = id;
  preview.textContent = markdown;
  requestIdEl.textContent = id;
  setActions(true);
};

const deleteHistoryItem = id => {
  writeHistory(readHistory().filter(item => item.id !== id));
  renderHistory();
  showToast('Draft removed');
};

const renderHistory = () => {
  const history = readHistory();
  historyEl.innerHTML = '';

  if (!history.length) {
    historyEl.className = 'history empty';
    historyEl.textContent = 'Chưa có draft nào.';
    return;
  }

  historyEl.className = 'history';
  history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';

    const main = document.createElement('div');
    main.className = 'history-main';
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = item.feature || 'Untitled';
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `${item.id}${item.project ? ` · ${item.project}` : ''}${item.mode ? ` · ${item.mode}` : ''}`;
    main.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'history-actions';

    const load = document.createElement('button');
    load.type = 'button';
    load.textContent = 'Load';
    load.addEventListener('click', () => {
      setValues(item.values);
      if (item.mode) setMode(item.mode);
      loadGenerated(item.markdown, item.id);
      saveDraft();
      updateIndicators();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Draft loaded');
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = '×';
    remove.title = 'Delete';
    remove.addEventListener('click', () => deleteHistoryItem(item.id));

    actions.append(load, remove);
    row.append(main, actions);
    historyEl.append(row);
  });
};

const setMode = nextMode => {
  mode = nextMode === 'standard' ? 'standard' : 'quick';
  localStorage.setItem(MODE_KEY, mode);
  modeButtons.forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
};

const copyPrompt = async () => {
  if (!currentMarkdown) return false;
  try {
    await navigator.clipboard.writeText(aiPrompt(currentMarkdown));
    showToast('Prompt copied');
    return true;
  } catch (_) {
    showToast('Không copy được — copy từ preview');
    return false;
  }
};

const classifyRaw = raw => {
  const result = {
    feature: '', project: '', requirement: [], docs: [], figma: [], team: '', ownership: '', constraints: [], notes: []
  };
  let urlCount = 0;
  const lines = raw.split(/\r?\n/).map(v => v.trim()).filter(Boolean);

  const pushUnique = (key, value) => {
    if (!value) return;
    if (!result[key].includes(value)) result[key].push(value);
  };

  const prefixMap = [
    { keys: ['feature', 'title', 'task', 'work item', 'tính năng', 'công việc'], target: 'feature' },
    { keys: ['project', 'dự án'], target: 'project' },
    { keys: ['team', 'dev', 'devs', 'developers', 'nhân sự'], target: 'team' },
    { keys: ['ownership', 'owner', 'phân công'], target: 'ownership' },
    { keys: ['constraint', 'constraints', 'shared', 'ràng buộc', 'lưu ý code'], target: 'constraints' },
    { keys: ['note', 'notes', 'ghi chú'], target: 'notes' },
    { keys: ['figma', 'design'], target: 'figma' },
    { keys: ['doc', 'docs', 'jira', 'ticket', 'api', 'reference', 'references', 'ref', 'tài liệu'], target: 'docs' }
  ];

  lines.forEach((original, index) => {
    const urls = original.match(/https?:\/\/[^\s)\]}>,]+/gi) || [];
    urls.forEach(url => {
      urlCount += 1;
      if (/figma\.com/i.test(url)) pushUnique('figma', url);
      else pushUnique('docs', url);
    });

    let text = original;
    urls.forEach(url => { text = text.replace(url, ''); });
    text = text.replace(/^[-*•]\s*/, '').trim();
    if (!text) return;

    const match = text.match(/^([^:：]{1,30})[:：]\s*(.*)$/);
    if (match) {
      const label = match[1].trim().toLowerCase();
      const value = match[2].trim();
      const mapping = prefixMap.find(item => item.keys.includes(label));
      if (mapping) {
        if (['feature', 'project', 'team', 'ownership'].includes(mapping.target)) {
          if (value) result[mapping.target] = value;
        } else if (value) {
          pushUnique(mapping.target, value);
        }
        return;
      }
    }

    if (!result.feature && index === 0 && /^#{1,3}\s+/.test(text)) {
      result.feature = text.replace(/^#{1,3}\s+/, '').trim();
      return;
    }

    pushUnique('requirement', text);
  });

  return { result, lineCount: lines.length, urlCount };
};

const organizeRaw = (notify = true) => {
  const raw = rawInput.value.trim();
  if (!raw) {
    if (notify) showToast('Chưa có raw context');
    return false;
  }

  const { result, lineCount, urlCount } = classifyRaw(raw);
  const current = getValues();

  if (!current.feature && result.feature) document.getElementById('feature').value = result.feature;
  if (!current.project && result.project) document.getElementById('project').value = result.project;
  if (!current.team && result.team) document.getElementById('team').value = result.team;
  if (!current.ownership && result.ownership) document.getElementById('ownership').value = result.ownership;

  document.getElementById('requirement').value = mergeLines(current.requirement, result.requirement);
  document.getElementById('docs').value = mergeLines(current.docs, result.docs);
  document.getElementById('figma').value = mergeLines(current.figma, result.figma);
  document.getElementById('constraints').value = mergeLines(current.constraints, result.constraints);
  document.getElementById('notes').value = mergeLines(current.notes, result.notes);

  rawStatus.textContent = `Organized ${lineCount} lines · ${result.figma.length} Figma · ${Math.max(0, result.docs.length)} refs · ${urlCount} URLs detected`;
  saveDraft();
  updateIndicators();
  if (notify) showToast('Context organized');
  return true;
};

const readProfiles = () => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {}; }
  catch (_) { return {}; }
};

const writeProfiles = profiles => localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));

const renderProfiles = () => {
  const profiles = readProfiles();
  const selected = localStorage.getItem(PROFILE_SELECTED_KEY) || '';
  profileSelect.innerHTML = '<option value="">No profile</option>';
  Object.keys(profiles).sort((a, b) => a.localeCompare(b)).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    profileSelect.appendChild(option);
  });
  profileSelect.value = profiles[selected] ? selected : '';
  deleteProfileBtn.disabled = !profileSelect.value;
};

const applyProfile = name => {
  const profile = readProfiles()[name];
  if (!profile) return;
  ['project', 'team', 'ownership', 'constraints'].forEach(id => {
    if (profile[id] !== undefined) document.getElementById(id).value = profile[id];
  });
  if (profile.mode) setMode(profile.mode);
  localStorage.setItem(PROFILE_SELECTED_KEY, name);
  deleteProfileBtn.disabled = false;
  saveDraft();
  updateIndicators();
  showToast(`Profile loaded: ${name}`);
};

const saveCurrentProfile = () => {
  const values = getValues();
  const defaultName = values.project || profileSelect.value || '';
  const name = (defaultName || window.prompt('Tên project profile?') || '').trim();
  if (!name) {
    showToast('Nhập Project hoặc tên profile trước');
    return;
  }
  const profiles = readProfiles();
  profiles[name] = {
    project: values.project || name,
    team: values.team,
    ownership: values.ownership,
    constraints: values.constraints,
    mode
  };
  writeProfiles(profiles);
  localStorage.setItem(PROFILE_SELECTED_KEY, name);
  renderProfiles();
  profileSelect.value = name;
  deleteProfileBtn.disabled = false;
  showToast(`Profile saved: ${name}`);
};

form.addEventListener('input', () => { saveDraft(); updateIndicators(); });
rawInput.addEventListener('input', saveDraft);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!document.getElementById('requirement').value.trim() && rawInput.value.trim()) organizeRaw(false);
  if (!form.reportValidity()) return;
  const values = getValues();
  const output = buildMarkdown(values);
  loadGenerated(output.markdown, output.id);
  addHistory(values, output.id, output.markdown);
  saveDraft();
  showToast('Request generated');
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    form.requestSubmit();
  }
});

modeButtons.forEach(button => button.addEventListener('click', () => {
  setMode(button.dataset.mode);
  saveDraft();
  showToast(`${button.textContent} mode`);
}));

organizeBtn.addEventListener('click', () => organizeRaw(true));
clearRawBtn.addEventListener('click', () => {
  rawInput.value = '';
  rawStatus.textContent = 'Paste raw context then Auto organize.';
  saveDraft();
  showToast('Quick Paste cleared');
});

rawFileInput.addEventListener('change', async event => {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  try {
    const blocks = [];
    for (const file of files) {
      const text = await file.text();
      blocks.push(`\n--- ${file.name} ---\n${text}`);
    }
    rawInput.value = `${rawInput.value.trim()}${blocks.join('\n')}`.trim();
    saveDraft();
    rawStatus.textContent = `${files.length} local file(s) added. Auto organize when ready.`;
    showToast('Local files added');
  } catch (_) {
    showToast('Không đọc được file');
  } finally {
    rawFileInput.value = '';
  }
});

profileSelect.addEventListener('change', () => {
  const name = profileSelect.value;
  deleteProfileBtn.disabled = !name;
  if (name) applyProfile(name);
  else localStorage.removeItem(PROFILE_SELECTED_KEY);
});
saveProfileBtn.addEventListener('click', saveCurrentProfile);
deleteProfileBtn.addEventListener('click', () => {
  const name = profileSelect.value;
  if (!name) return;
  const profiles = readProfiles();
  delete profiles[name];
  writeProfiles(profiles);
  localStorage.removeItem(PROFILE_SELECTED_KEY);
  renderProfiles();
  showToast(`Profile deleted: ${name}`);
});

copyBtn.addEventListener('click', copyPrompt);
openChatBtn.addEventListener('click', async () => {
  if (await copyPrompt()) window.open('https://chatgpt.com/', '_blank', 'noopener');
});

downloadBtn.addEventListener('click', () => {
  if (!currentMarkdown) return;
  const safeName = (getValues().feature || 'task-request')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'task-request';
  const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Markdown downloaded');
});

exportBtn.addEventListener('click', () => {
  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    mode,
    raw: rawInput.value,
    draft: getValues(),
    history: readHistory(),
    profiles: readProfiles(),
    selectedProfile: profileSelect.value
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `task-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Data exported');
});

importInput.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (!payload || typeof payload !== 'object') throw new Error('Invalid file');
    if (payload.draft) setValues(payload.draft);
    if (typeof payload.raw === 'string') rawInput.value = payload.raw;
    if (Array.isArray(payload.history)) writeHistory(payload.history);
    if (payload.profiles && typeof payload.profiles === 'object') writeProfiles(payload.profiles);
    if (payload.selectedProfile) localStorage.setItem(PROFILE_SELECTED_KEY, payload.selectedProfile);
    if (payload.mode) setMode(payload.mode);
    saveDraft();
    renderHistory();
    renderProfiles();
    updateIndicators();
    showToast('Data imported');
  } catch (_) {
    showToast('Invalid backup file');
  } finally {
    importInput.value = '';
  }
});

clearBtn.addEventListener('click', () => {
  form.reset();
  localStorage.removeItem(STORAGE_KEY);
  currentMarkdown = '';
  currentRequestId = '';
  preview.textContent = 'Paste vào Quick Paste hoặc nhập form, sau đó Generate request.';
  requestIdEl.textContent = '—';
  setActions(false);
  updateIndicators();
  showToast('Form cleared');
});

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('History cleared');
});

setMode(mode);
loadDraft();
renderHistory();
renderProfiles();
updateIndicators();
