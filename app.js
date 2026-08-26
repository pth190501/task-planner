const STORAGE_KEY = 'task-planner:draft:v2';
const HISTORY_KEY = 'task-planner:history:v2';
const MODE_KEY = 'task-planner:mode:v2';
const HISTORY_LIMIT = 10;

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
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1700);
};

const makeRequestId = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `REQ-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const asBulletLines = value => value
  .split('\n')
  .map(v => v.trim())
  .filter(Boolean)
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
    '- Split by independent ownership, not by individual functions or UI elements.',
    '- Maximize safe parallel work.',
    '- Prefer one primary owner for each important shared screen/module/file area.',
    '- If two tasks would heavily modify the same shared area, merge them or assign one integration owner.',
    '- Make reasonable assumptions when details are minor; ask questions only when they materially change scope or ownership.',
    '- Keep the final output concise and directly shareable with the team.',
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

const aiPrompt = markdown => `Break task theo request dưới đây. Không overthinking. Ưu tiên số task ít nhất nhưng vẫn đủ để chia ownership rõ, làm song song an toàn và hạn chế dẫm code. Trả về Markdown dễ gửi thẳng cho team.\n\n${markdown}`;

const updateIndicators = () => {
  const values = getValues();
  const status = [Boolean(values.requirement), Boolean(values.docs), Boolean(values.figma), Boolean(values.team)];
  [...sourceStatus.children].forEach((node, index) => node.classList.toggle('ready', status[index]));
  requirementCount.textContent = `${document.getElementById('requirement').value.length.toLocaleString()} chars`;
};

const saveDraft = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getValues()));
  saveState.textContent = 'Draft saved locally';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState.textContent = 'Draft autosaved locally', 1200);
};

const loadDraft = () => {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const legacy = JSON.parse(localStorage.getItem('task-planner:draft:v1') || 'null');
    if (current || legacy) setValues(current || legacy);
  } catch (_) {}
};

const readHistory = () => {
  try {
    const current = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    const legacy = JSON.parse(localStorage.getItem('task-planner:history:v1') || '[]');
    return current || legacy || [];
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

form.addEventListener('input', () => { saveDraft(); updateIndicators(); });

form.addEventListener('submit', event => {
  event.preventDefault();
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
    version: 2,
    exportedAt: new Date().toISOString(),
    mode,
    draft: getValues(),
    history: readHistory()
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
    if (Array.isArray(payload.history)) writeHistory(payload.history);
    if (payload.mode) setMode(payload.mode);
    saveDraft();
    renderHistory();
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
  preview.textContent = 'Điền thông tin bên trái rồi chọn “Generate request”.';
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
updateIndicators();
